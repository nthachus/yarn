import {Install} from './install.js';

import Lockfile from '../../lockfile';

const invariant = require('invariant');
const micromatch = require('micromatch');

export const requireLockfile = true;

function buildCount(trees) {
  if (!trees || !trees.length) {
    return 0;
  }

  let count = 0;

  for (const tree of trees) {
    if (tree.shadow) {
      continue;
    }

    count++;
    count += buildCount(tree.children);
  }

  return count;
}

export async function buildTree(
  resolver,
  linker,
  patterns,
  opts,
  onlyFresh,
  ignoreHoisted,
) {
  const treesByKey = {};
  const trees = [];
  const flatTree = await linker.getFlatHoistedTree(patterns);

  // If using workspaces, filter out the virtual manifest
  const {workspaceLayout} = resolver;
  const hoisted =
    workspaceLayout && workspaceLayout.virtualManifestName
      ? flatTree.filter(([key]) => key.indexOf(workspaceLayout.virtualManifestName) === -1)
      : flatTree;

  const hoistedByKey = {};
  for (const [key, info] of hoisted) {
    hoistedByKey[key] = info;
  }

  // build initial trees
  for (const [, info] of hoisted) {
    const ref = info.pkg._reference;
    const hint = null;
    const parent = getParent(info.key, treesByKey);
    const children = [];
    let depth = 0;
    let color = 'bold';
    invariant(ref, 'expected reference');

    if (onlyFresh) {
      let isFresh = false;
      for (const pattern of ref.patterns) {
        if (resolver.isNewPattern(pattern)) {
          isFresh = true;
          break;
        }
      }
      if (!isFresh) {
        continue;
      }
    }

    if (info.originalKey !== info.key || opts.reqDepth === 0) {
      // was hoisted
      color = null;
    }
    // check parent to obtain next depth
    if (parent && parent.depth > 0) {
      depth = parent.depth + 1;
    } else {
      depth = 0;
    }

    const topLevel = opts.reqDepth === 0 && !parent;
    const showAll = opts.reqDepth === -1;
    const nextDepthIsValid = depth + 1 <= Number(opts.reqDepth);

    if (topLevel || nextDepthIsValid || showAll) {
      treesByKey[info.key] = {
        name: `${info.pkg.name}@${info.pkg.version}`,
        children,
        hint,
        color,
        depth,
      };
    }

    // add in dummy children for hoisted dependencies
    const nextChildDepthIsValid = depth + 1 < Number(opts.reqDepth);
    invariant(ref, 'expected reference');
    if ((!ignoreHoisted && nextDepthIsValid) || showAll) {
      for (const pattern of resolver.dedupePatterns(ref.dependencies)) {
        const pkg = resolver.getStrictResolvedPattern(pattern);

        if (!hoistedByKey[`${info.key}#${pkg.name}`] && (nextChildDepthIsValid || showAll)) {
          children.push({
            name: pattern,
            color: 'dim',
            shadow: true,
          });
        }
      }
    }
  }

  // add children
  for (const [, info] of hoisted) {
    const tree = treesByKey[info.key];
    const parent = getParent(info.key, treesByKey);
    if (!tree) {
      continue;
    }

    if (info.key.split('#').length === 1) {
      trees.push(tree);
      continue;
    }

    if (parent) {
      parent.children.push(tree);
    }
  }

  return {trees, count: buildCount(trees)};
}

export function getParent(key, treesByKey) {
  const parentKey = key.slice(0, key.lastIndexOf('#'));
  return treesByKey[parentKey];
}

export function hasWrapper(commander, args) {
  return true;
}

export function setFlags(commander) {
  commander.description('Lists installed packages.');
  commander.option('--depth [depth]', 'Limit the depth of the shown dependencies');
  commander.option('--pattern [pattern]', 'Filter dependencies by pattern');
}

export function getReqDepth(inputDepth) {
  return inputDepth && /^\d+$/.test(inputDepth) ? Number(inputDepth) : -1;
}

export function filterTree(tree, filters, pattern = '') {
  if (tree.children) {
    tree.children = tree.children.filter(child => filterTree(child, filters, pattern));
  }

  const notDim = tree.color !== 'dim';
  const hasChildren = tree.children == null ? false : tree.children.length > 0;
  const name = tree.name.slice(0, tree.name.lastIndexOf('@'));
  const found = micromatch.any(name, filters) || micromatch.contains(name, pattern);

  return notDim && (found || hasChildren);
}

export function getDevDeps(manifest) {
  if (manifest.devDependencies) {
    return new Set(Object.keys(manifest.devDependencies).map(key => `${key}@${manifest.devDependencies[key]}`));
  } else {
    return new Set();
  }
}

export async function run(config, reporter, flags, args) {
  const lockfile = await Lockfile.fromDirectory(config.lockfileFolder, reporter);
  const install = new Install(flags, config, reporter, lockfile);

  const {requests: depRequests, patterns, manifest, workspaceLayout} = await install.fetchRequestFromCwd();
  await install.resolver.init(depRequests, {
    isFlat: install.flags.flat,
    isFrozen: install.flags.frozenLockfile,
    workspaceLayout,
  });

  let activePatterns = [];
  if (config.production) {
    const devDeps = getDevDeps(manifest);
    activePatterns = patterns.filter(pattern => !devDeps.has(pattern));
  } else {
    activePatterns = patterns;
  }

  const opts = {
    reqDepth: getReqDepth(flags.depth),
  };

  let {trees} = await buildTree(install.resolver, install.linker, activePatterns, opts);

  if (args.length) {
    reporter.warn(reporter.lang('deprecatedListArgs'));
  }
  if (args.length || flags.pattern) {
    trees = trees.filter(tree => filterTree(tree, args, flags.pattern));
  }

  reporter.tree('list', trees, {force: true});
}
