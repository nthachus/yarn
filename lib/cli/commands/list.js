'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.buildTree = buildTree;
exports.filterTree = filterTree;
exports.getDevDeps = getDevDeps;
exports.getParent = getParent;
exports.getReqDepth = getReqDepth;
exports.hasWrapper = hasWrapper;
exports.requireLockfile = void 0;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _install = require('./install.js');

var _lockfile = _interopRequireDefault(require('../../lockfile'));

var invariant = require('invariant');
var micromatch = require('micromatch');

var requireLockfile = true;
exports.requireLockfile = requireLockfile;

function buildCount(trees) {
  if (!trees || !trees.length) {
    return 0;
  }

  var count = 0;

  for (var tree of trees) {
    if (tree.shadow) {
      continue;
    }

    count++;
    count += buildCount(tree.children);
  }

  return count;
}

function buildTree() {
  return _buildTree.apply(this, arguments);
}
function _buildTree() {
  _buildTree = (0, _asyncToGenerator2.default)(function* (
    resolver,
    linker,
    patterns,
    opts,
    onlyFresh,
    ignoreHoisted
  ) {
    var treesByKey = {};
    var trees = [];
    var flatTree = yield linker.getFlatHoistedTree(patterns);

    // If using workspaces, filter out the virtual manifest
    var workspaceLayout = resolver.workspaceLayout;
    var hoisted =
      workspaceLayout && workspaceLayout.virtualManifestName
        ? flatTree.filter(_ref => {
            var key = _ref[0];
            return key.indexOf(workspaceLayout.virtualManifestName) === -1;
          })
        : flatTree;

    var hoistedByKey = {};
    for (var _ref2 of hoisted) {
      var key = _ref2[0], info = _ref2[1];
      hoistedByKey[key] = info;
    }

    // build initial trees
    for (var _ref3 of hoisted) {
      var _info = _ref3[1];
      var ref = _info.pkg._reference;
      var hint = null;
      var parent = getParent(_info.key, treesByKey);
      var children = [];
      var depth = 0;
      var color = 'bold';
      invariant(ref, 'expected reference');

      if (onlyFresh) {
        var isFresh = false;
        for (var pattern of ref.patterns) {
          if (resolver.isNewPattern(pattern)) {
            isFresh = true;
            break;
          }
        }
        if (!isFresh) {
          continue;
        }
      }

      if (_info.originalKey !== _info.key || opts.reqDepth === 0) {
        // was hoisted
        color = null;
      }
      // check parent to obtain next depth
      if (parent && parent.depth > 0) {
        depth = parent.depth + 1;
      } else {
        depth = 0;
      }

      var topLevel = opts.reqDepth === 0 && !parent;
      var showAll = opts.reqDepth === -1;
      var nextDepthIsValid = depth + 1 <= Number(opts.reqDepth);

      if (topLevel || nextDepthIsValid || showAll) {
        treesByKey[_info.key] = {
          name: `${_info.pkg.name}@${_info.pkg.version}`,
          children,
          hint,
          color,
          depth,
        };
      }

      // add in dummy children for hoisted dependencies
      var nextChildDepthIsValid = depth + 1 < Number(opts.reqDepth);
      invariant(ref, 'expected reference');
      if ((!ignoreHoisted && nextDepthIsValid) || showAll) {
        for (var _pattern of resolver.dedupePatterns(ref.dependencies)) {
          var pkg = resolver.getStrictResolvedPattern(_pattern);

          if (!hoistedByKey[`${_info.key}#${pkg.name}`] && (nextChildDepthIsValid || showAll)) {
            children.push({
              name: _pattern,
              color: 'dim',
              shadow: true,
            });
          }
        }
      }
    }

    // add children
    for (var _ref4 of hoisted) {
      var _info2 = _ref4[1];
      var tree = treesByKey[_info2.key];
      var _parent = getParent(_info2.key, treesByKey);
      if (!tree) {
        continue;
      }

      if (_info2.key.split('#').length === 1) {
        trees.push(tree);
        continue;
      }

      if (_parent) {
        _parent.children.push(tree);
      }
    }

    return {trees, count: buildCount(trees)};
  });

  return _buildTree.apply(this, arguments);
}

function getParent(key, treesByKey) {
  var parentKey = key.slice(0, key.lastIndexOf('#'));
  return treesByKey[parentKey];
}

function hasWrapper(commander, args) {
  return true;
}

function setFlags(commander) {
  commander.description('Lists installed packages.');
  commander.option('--depth [depth]', 'Limit the depth of the shown dependencies');
  commander.option('--pattern [pattern]', 'Filter dependencies by pattern');
}

function getReqDepth(inputDepth) {
  return inputDepth && /^\d+$/.test(inputDepth) ? Number(inputDepth) : -1;
}

function filterTree(tree, filters, pattern) {
  if (pattern === void 0) pattern = '';
  if (tree.children) {
    tree.children = tree.children.filter(child => filterTree(child, filters, pattern));
  }

  var notDim = tree.color !== 'dim';
  var hasChildren = tree.children == null ? false : tree.children.length > 0;
  var name = tree.name.slice(0, tree.name.lastIndexOf('@'));
  var found = micromatch.any(name, filters) || micromatch.contains(name, pattern);

  return notDim && (found || hasChildren);
}

function getDevDeps(manifest) {
  if (manifest.devDependencies) {
    return new Set(Object.keys(manifest.devDependencies).map(key => `${key}@${manifest.devDependencies[key]}`));
  } else {
    return new Set();
  }
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder, reporter);
    var install = new _install.Install(flags, config, reporter, lockfile);

    var _yield$install$fetchR = yield install.fetchRequestFromCwd(), depRequests = _yield$install$fetchR.requests, patterns = _yield$install$fetchR.patterns, manifest = _yield$install$fetchR.manifest, workspaceLayout = _yield$install$fetchR.workspaceLayout;
    yield install.resolver.init(depRequests, {
      isFlat: install.flags.flat,
      isFrozen: install.flags.frozenLockfile,
      workspaceLayout,
    });

    var activePatterns = [];
    if (config.production) {
      var devDeps = getDevDeps(manifest);
      activePatterns = patterns.filter(pattern => !devDeps.has(pattern));
    } else {
      activePatterns = patterns;
    }

    var opts = {
      reqDepth: getReqDepth(flags.depth),
    };

    var _yield$buildTree = yield buildTree(install.resolver, install.linker, activePatterns, opts), trees = _yield$buildTree.trees;

    if (args.length) {
      reporter.warn(reporter.lang('deprecatedListArgs'));
    }
    if (args.length || flags.pattern) {
      trees = trees.filter(tree => filterTree(tree, args, flags.pattern));
    }

    reporter.tree('list', trees, {force: true});
  });

  return _run.apply(this, arguments);
}
