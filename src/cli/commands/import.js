import {Install} from './install.js';
import {verifyTreeCheck} from './check.js';
import {MessageError} from '../../errors.js';
import {getExoticResolver} from '../../resolvers/index.js';
import BaseResolver from '../../resolvers/base-resolver.js';
import HostedGitResolver, {explodeHostedGitFragment} from '../../resolvers/exotics/hosted-git-resolver.js';
import GistResolver, {explodeGistFragment} from '../../resolvers/exotics/gist-resolver.js';
import GitResolver from '../../resolvers/exotics/git-resolver.js';
import FileResolver from '../../resolvers/exotics/file-resolver.js';
import PackageResolver from '../../package-resolver.js';
import PackageRequest from '../../package-request.js';
import PackageReference from '../../package-reference.js';
import * as fetcher from '../../package-fetcher.js';
import PackageLinker from '../../package-linker.js';
import * as compatibility from '../../package-compatibility.js';
import Lockfile from '../../lockfile';
import {normalizePattern} from '../../util/normalize-pattern.js';
import {LogicalDependencyTree} from '../../util/logical-dependency-tree';
import * as fs from '../../util/fs.js';
import * as util from '../../util/misc.js';
import {
  YARN_REGISTRY,
  NPM_REGISTRY_RE,
  LOCKFILE_FILENAME,
  NODE_PACKAGE_JSON,
  NPM_LOCK_FILENAME,
} from '../../constants.js';
const semver = require('semver');

const invariant = require('invariant');
const path = require('path');
const uuid = require('uuid');
const ssri = require('ssri');
const nodeVersion = process.versions.node.split('-')[0];

export const noArguments = true;

class ImportResolver extends BaseResolver {
  getCwd() {
    if (this.request.parentRequest) {
      const parent = this.resolver.getStrictResolvedPattern(this.request.parentRequest.pattern);
      invariant(parent._loc, 'expected package location');
      return path.dirname(parent._loc);
    }
    return this.config.cwd;
  }

  resolveHostedGit(info, Resolver) {
    const {range} = normalizePattern(this.pattern);
    const exploded = explodeHostedGitFragment(range, this.reporter);
    const hash = info.gitHead;
    invariant(hash, 'expected package gitHead');
    const url = Resolver.getTarballUrl(exploded, hash);
    info._uid = hash;
    info._remote = {
      resolved: url,
      type: 'tarball',
      registry: this.registry,
      reference: url,
      hash: null,
    };
    return info;
  }

  resolveGist(info, Resolver) {
    const {range} = normalizePattern(this.pattern);
    const {id} = explodeGistFragment(range, this.reporter);
    const hash = info.gitHead;
    invariant(hash, 'expected package gitHead');
    const url = `https://gist.github.com/${id}.git`;
    info._uid = hash;
    info._remote = {
      resolved: `${url}#${hash}`,
      type: 'git',
      registry: this.registry,
      reference: url,
      hash,
    };
    return info;
  }

  resolveGit(info, Resolver) {
    const url = info._resolved;
    const hash = info.gitHead;
    invariant(url, 'expected package _resolved');
    invariant(hash, 'expected package gitHead');
    info._uid = hash;
    info._remote = {
      resolved: `${url}#${hash}`,
      type: 'git',
      registry: this.registry,
      reference: url,
      hash,
    };
    return info;
  }

  resolveFile(info, Resolver) {
    const {range} = normalizePattern(this.pattern);
    let loc = util.removePrefix(range, 'file:');
    if (!path.isAbsolute(loc)) {
      loc = path.join(this.config.cwd, loc);
    }
    info._uid = info.version;
    info._remote = {
      type: 'copy',
      registry: this.registry,
      hash: `${uuid.v4()}-${new Date().getTime()}`,
      reference: loc,
    };
    return info;
  }

  resolveRegistry(info) {
    let url = info._resolved;
    const hash = info._shasum;
    invariant(url, 'expected package _resolved');
    invariant(hash, 'expected package _shasum');
    if (this.config.getOption('registry') === YARN_REGISTRY) {
      url = url.replace(NPM_REGISTRY_RE, YARN_REGISTRY);
    }
    info._uid = info.version;
    info._remote = {
      resolved: `${url}#${hash}`,
      type: 'tarball',
      registry: this.registry,
      reference: url,
      integrity: info._integrity ? ssri.parse(info._integrity) : ssri.fromHex(hash, 'sha1'),
      hash,
    };
    return info;
  }

  resolveImport(info) {
    const {range} = normalizePattern(this.pattern);
    const Resolver = getExoticResolver(range);
    if (Resolver && Resolver.prototype instanceof HostedGitResolver) {
      return this.resolveHostedGit(info, Resolver);
    } else if (Resolver && Resolver === GistResolver) {
      return this.resolveGist(info, Resolver);
    } else if (Resolver && Resolver === GitResolver) {
      return this.resolveGit(info, Resolver);
    } else if (Resolver && Resolver === FileResolver) {
      return this.resolveFile(info, Resolver);
    }
    return this.resolveRegistry(info);
  }

  async resolveLocation(loc) {
    const info = await this.config.tryManifest(loc, 'npm', false);
    if (!info) {
      return null;
    }
    return this.resolveImport(info);
  }

  async resolveFixedVersion(fixedVersionPattern) {
    const {range} = normalizePattern(fixedVersionPattern);
    const exoticResolver = getExoticResolver(range);
    const manifest = exoticResolver
      ? await this.request.findExoticVersionInfo(exoticResolver, range)
      : await this.request.findVersionOnRegistry(fixedVersionPattern);
    return manifest;
  }

  async _resolveFromFixedVersions() {
    invariant(this.request instanceof ImportPackageRequest, 'request must be ImportPackageRequest');
    const {name} = normalizePattern(this.pattern);
    invariant(
      this.request.dependencyTree instanceof LogicalDependencyTree,
      'dependencyTree on request must be LogicalDependencyTree',
    );
    const fixedVersionPattern = this.request.dependencyTree.getFixedVersionPattern(name, this.request.parentNames);
    const info = await this.config.getCache(`import-resolver-${fixedVersionPattern}`, () =>
      this.resolveFixedVersion(fixedVersionPattern),
    );
    if (info) {
      return info;
    }
    throw new MessageError(this.reporter.lang('importResolveFailed', name, this.getCwd()));
  }

  async _resolveFromNodeModules() {
    const {name} = normalizePattern(this.pattern);
    let cwd = this.getCwd();
    while (!path.relative(this.config.cwd, cwd).startsWith('..')) {
      const loc = path.join(cwd, 'node_modules', name);
      const info = await this.config.getCache(`import-resolver-${loc}`, () => this.resolveLocation(loc));
      if (info) {
        return info;
      }
      cwd = path.resolve(cwd, '../..');
    }
    throw new MessageError(this.reporter.lang('importResolveFailed', name, this.getCwd()));
  }

  resolve() {
    if (this.request instanceof ImportPackageRequest && this.request.dependencyTree) {
      return this._resolveFromFixedVersions();
    } else {
      return this._resolveFromNodeModules();
    }
  }
}

class ImportPackageRequest extends PackageRequest {
  constructor(req, dependencyTree, resolver) {
    super(req, resolver);
    this.import = this.parentRequest instanceof ImportPackageRequest ? this.parentRequest.import : true;
    this.dependencyTree = dependencyTree;
  }

  getRootName() {
    return (this.resolver instanceof ImportPackageResolver && this.resolver.rootName) || 'root';
  }

  getParentHumanName() {
    return [this.getRootName()].concat(this.parentNames).join(' > ');
  }

  reportResolvedRangeMatch(info, resolved) {
    if (info.version === resolved.version) {
      return;
    }
    this.reporter.warn(
      this.reporter.lang(
        'importResolvedRangeMatch',
        resolved.version,
        resolved.name,
        info.version,
        this.getParentHumanName(),
      ),
    );
  }

  _findResolvedManifest(info) {
    const {range, name} = normalizePattern(this.pattern);
    const solvedRange = semver.validRange(range) ? info.version : range;
    const resolved = this.resolver.getExactVersionMatch(name, solvedRange, info);
    if (resolved) {
      return resolved;
    }
    invariant(info._remote, 'expected package remote');
    const ref = new PackageReference(this, info, info._remote);
    info._reference = ref;
    return info;
  }

  resolveToExistingVersion(info) {
    const resolved = this._findResolvedManifest(info);
    invariant(resolved, 'should have found a resolved reference');
    const ref = resolved._reference;
    invariant(ref, 'should have a package reference');
    ref.addRequest(this);
    ref.addPattern(this.pattern, resolved);
    ref.addOptional(this.optional);
  }

  findVersionInfo() {
    if (!this.import) {
      this.reporter.verbose(this.reporter.lang('skippingImport', this.pattern, this.getParentHumanName()));
      return super.findVersionInfo();
    }
    const resolver = new ImportResolver(this, this.pattern);
    return resolver.resolve().catch(() => {
      this.import = false;
      this.reporter.warn(this.reporter.lang('importFailed', this.pattern, this.getParentHumanName()));
      return super.findVersionInfo();
    });
  }
}

class ImportPackageResolver extends PackageResolver {
  constructor(config, lockfile) {
    super(config, lockfile);
    this.next = [];
    this.rootName = 'root';
  }

  dependencyTree;

  find(req) {
    this.next.push(req);
    return Promise.resolve();
  }

  async findOne(req) {
    if (this.activity) {
      this.activity.tick(req.pattern);
    }
    const request = new ImportPackageRequest(req, this.dependencyTree, this);
    await request.find({fresh: false});
  }

  async findAll(deps) {
    await Promise.all(deps.map(dep => this.findOne(dep)));
    deps = this.next;
    this.next = [];
    if (!deps.length) {
      // all required package versions have been discovered, so now packages that
      // resolved to existing versions can be resolved to their best available version
      this.resolvePackagesWithExistingVersions();
      return;
    }
    await this.findAll(deps);
  }

  resetOptional() {
    for (const pattern in this.patterns) {
      const ref = this.patterns[pattern]._reference;
      invariant(ref, 'expected reference');
      ref.optional = null;
      for (const req of ref.requests) {
        ref.addOptional(req.optional);
      }
    }
  }

  async init(
    deps,
    {isFlat, isFrozen, workspaceLayout} = {isFlat: false, isFrozen: false, workspaceLayout: undefined},
  ) {
    this.flat = Boolean(isFlat);
    const activity = (this.activity = this.reporter.activity());
    await this.findAll(deps);
    this.resetOptional();
    activity.end();
    this.activity = null;
  }
}

export class Import extends Install {
  constructor(flags, config, reporter, lockfile) {
    super(flags, config, reporter, lockfile);
    this.resolver = new ImportPackageResolver(this.config, this.lockfile);
    this.linker = new PackageLinker(config, this.resolver);
  }
  createLogicalDependencyTree(packageJson, packageLock) {
    invariant(packageJson, 'package.json should exist');
    invariant(packageLock, 'package-lock.json should exist');
    invariant(this.resolver instanceof ImportPackageResolver, 'resolver should be an ImportPackageResolver');
    try {
      this.resolver.dependencyTree = new LogicalDependencyTree(packageJson, packageLock);
    } catch (e) {
      throw new MessageError(this.reporter.lang('importSourceFilesCorrupted'));
    }
  }
  async getExternalLockfileContents() {
    try {
      const [packageJson, packageLock] = await Promise.all([
        fs.readFile(path.join(this.config.cwd, NODE_PACKAGE_JSON)),
        fs.readFile(path.join(this.config.cwd, NPM_LOCK_FILENAME)),
      ]);
      return {packageJson, packageLock};
    } catch (e) {
      return {packageJson: null, packageLock: null};
    }
  }
  async init() {
    if (await fs.exists(path.join(this.config.cwd, LOCKFILE_FILENAME))) {
      throw new MessageError(this.reporter.lang('lockfileExists'));
    }
    const {packageJson, packageLock} = await this.getExternalLockfileContents();
    const importSource =
      packageJson && packageLock && semver.satisfies(nodeVersion, '>=5.0.0') ? 'package-lock.json' : 'node_modules';
    if (importSource === 'package-lock.json') {
      this.reporter.info(this.reporter.lang('importPackageLock'));
      this.createLogicalDependencyTree(packageJson, packageLock);
    }
    if (importSource === 'node_modules') {
      this.reporter.info(this.reporter.lang('importNodeModules'));
      await verifyTreeCheck(this.config, this.reporter, {}, []);
    }
    const {requests, patterns, manifest} = await this.fetchRequestFromCwd();
    if (manifest.name && this.resolver instanceof ImportPackageResolver) {
      this.resolver.rootName = manifest.name;
    }
    await this.resolver.init(requests, {isFlat: this.flags.flat, isFrozen: this.flags.frozenLockfile});
    const manifests = await fetcher.fetch(this.resolver.getManifests(), this.config);
    this.resolver.updateManifests(manifests);
    await compatibility.check(this.resolver.getManifests(), this.config, this.flags.ignoreEngines);
    await this.linker.resolvePeerModules();
    await this.saveLockfileAndIntegrity(patterns);
    return patterns;
  }
}

export function setFlags(commander) {
  commander.description(
    'Generates yarn.lock from an npm package-lock.json file or an existing npm-installed node_modules folder.',
  );
}

export function hasWrapper(commander, args) {
  return true;
}

export async function run(config, reporter, flags, args) {
  const imp = new Import(flags, config, reporter, new Lockfile({cache: {}}));
  await imp.init();
}
