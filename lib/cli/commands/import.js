'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.Import = void 0;
exports.hasWrapper = hasWrapper;
exports.noArguments = void 0;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _install = require('./install.js');
var _check = require('./check.js');
var _errors = require('../../errors.js');
var _index = require('../../resolvers/index.js');
var _baseResolver = _interopRequireDefault(require('../../resolvers/base-resolver.js'));
var _hostedGitResolver = _interopRequireWildcard(require('../../resolvers/exotics/hosted-git-resolver.js'));
var _gistResolver = _interopRequireWildcard(require('../../resolvers/exotics/gist-resolver.js'));
var _gitResolver = _interopRequireDefault(require('../../resolvers/exotics/git-resolver.js'));
var _fileResolver = _interopRequireDefault(require('../../resolvers/exotics/file-resolver.js'));
var _packageResolver = _interopRequireDefault(require('../../package-resolver.js'));
var _packageRequest = _interopRequireDefault(require('../../package-request.js'));
var _packageReference = _interopRequireDefault(require('../../package-reference.js'));
var fetcher = _interopRequireWildcard(require('../../package-fetcher.js'));
var _packageLinker = _interopRequireDefault(require('../../package-linker.js'));
var compatibility = _interopRequireWildcard(require('../../package-compatibility.js'));
var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _normalizePattern9 = require('../../util/normalize-pattern.js');
var _logicalDependencyTree = require('../../util/logical-dependency-tree');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var util = _interopRequireWildcard(require('../../util/misc.js'));
var _constants = require('../../constants.js');

var semver = require('semver');

var invariant = require('invariant');
var path = require('path');
var uuid = require('uuid');
var ssri = require('ssri');
var nodeVersion = process.versions.node.split('-')[0];

var noArguments = true;
exports.noArguments = noArguments;

class ImportResolver extends _baseResolver.default {
  getCwd() {
    if (this.request.parentRequest) {
      var parent = this.resolver.getStrictResolvedPattern(this.request.parentRequest.pattern);
      invariant(parent._loc, 'expected package location');
      return path.dirname(parent._loc);
    }
    return this.config.cwd;
  }

  resolveHostedGit(info, Resolver) {
    var _normalizePattern = (0, _normalizePattern9.normalizePattern)(this.pattern), range = _normalizePattern.range;
    var exploded = (0, _hostedGitResolver.explodeHostedGitFragment)(range, this.reporter);
    var hash = info.gitHead;
    invariant(hash, 'expected package gitHead');
    var url = Resolver.getTarballUrl(exploded, hash);
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
    var _normalizePattern2 = (0, _normalizePattern9.normalizePattern)(this.pattern), range = _normalizePattern2.range;
    var _explodeGistFragment = (0, _gistResolver.explodeGistFragment)(range, this.reporter), id = _explodeGistFragment.id;
    var hash = info.gitHead;
    invariant(hash, 'expected package gitHead');
    var url = `https://gist.github.com/${id}.git`;
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
    var url = info._resolved;
    var hash = info.gitHead;
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
    var _normalizePattern3 = (0, _normalizePattern9.normalizePattern)(this.pattern), range = _normalizePattern3.range;
    var loc = util.removePrefix(range, 'file:');
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
    var url = info._resolved;
    var hash = info._shasum;
    invariant(url, 'expected package _resolved');
    invariant(hash, 'expected package _shasum');
    if (this.config.getOption('registry') === _constants.YARN_REGISTRY) {
      url = url.replace(_constants.NPM_REGISTRY_RE, _constants.YARN_REGISTRY);
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
    var _normalizePattern4 = (0, _normalizePattern9.normalizePattern)(this.pattern), range = _normalizePattern4.range;
    var Resolver = (0, _index.getExoticResolver)(range);
    if (Resolver && Resolver.prototype instanceof _hostedGitResolver.default) {
      return this.resolveHostedGit(info, Resolver);
    } else if (Resolver && Resolver === _gistResolver.default) {
      return this.resolveGist(info, Resolver);
    } else if (Resolver && Resolver === _gitResolver.default) {
      return this.resolveGit(info, Resolver);
    } else if (Resolver && Resolver === _fileResolver.default) {
      return this.resolveFile(info, Resolver);
    }
    return this.resolveRegistry(info);
  }

  resolveLocation(loc) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var info = yield _this.config.tryManifest(loc, 'npm', false);
      if (!info) {
        return null;
      }
      return _this.resolveImport(info);
    })();
  }

  resolveFixedVersion(fixedVersionPattern) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _normalizePattern5 = (0, _normalizePattern9.normalizePattern)(fixedVersionPattern), range = _normalizePattern5.range;
      var exoticResolver = (0, _index.getExoticResolver)(range);
      var manifest = exoticResolver
        ? yield _this2.request.findExoticVersionInfo(exoticResolver, range)
        : yield _this2.request.findVersionOnRegistry(fixedVersionPattern);
      return manifest;
    })();
  }

  _resolveFromFixedVersions() {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      invariant(_this3.request instanceof ImportPackageRequest, 'request must be ImportPackageRequest');
      var _normalizePattern6 = (0, _normalizePattern9.normalizePattern)(_this3.pattern), name = _normalizePattern6.name;
      invariant(
        _this3.request.dependencyTree instanceof _logicalDependencyTree.LogicalDependencyTree,
        'dependencyTree on request must be LogicalDependencyTree'
      );
      var fixedVersionPattern = _this3.request.dependencyTree.getFixedVersionPattern(name, _this3.request.parentNames);
      var info = yield _this3.config.getCache(`import-resolver-${fixedVersionPattern}`, () =>
        _this3.resolveFixedVersion(fixedVersionPattern)
      );
      if (info) {
        return info;
      }
      throw new _errors.MessageError(_this3.reporter.lang('importResolveFailed', name, _this3.getCwd()));
    })();
  }

  _resolveFromNodeModules() {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _normalizePattern7 = (0, _normalizePattern9.normalizePattern)(_this4.pattern), name = _normalizePattern7.name;
      var cwd = _this4.getCwd();
      var _loop = function* () {
        var loc = path.join(cwd, 'node_modules', name);
        var info = yield _this4.config.getCache(`import-resolver-${loc}`, () => _this4.resolveLocation(loc));
        if (info) {
          return {v: info};
        }
        cwd = path.resolve(cwd, '../..');
      };
      while (!path.relative(_this4.config.cwd, cwd).startsWith('..')) {
        var _ret = yield* _loop();
        if (typeof _ret === 'object') return _ret.v;
      }
      throw new _errors.MessageError(_this4.reporter.lang('importResolveFailed', name, _this4.getCwd()));
    })();
  }

  resolve() {
    if (this.request instanceof ImportPackageRequest && this.request.dependencyTree) {
      return this._resolveFromFixedVersions();
    } else {
      return this._resolveFromNodeModules();
    }
  }
}

class ImportPackageRequest extends _packageRequest.default {
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
        this.getParentHumanName()
      )
    );
  }

  _findResolvedManifest(info) {
    var _normalizePattern8 = (0, _normalizePattern9.normalizePattern)(this.pattern), range = _normalizePattern8.range, name = _normalizePattern8.name;
    var solvedRange = semver.validRange(range) ? info.version : range;
    var resolved = this.resolver.getExactVersionMatch(name, solvedRange, info);
    if (resolved) {
      return resolved;
    }
    invariant(info._remote, 'expected package remote');
    var ref = new _packageReference.default(this, info, info._remote);
    info._reference = ref;
    return info;
  }

  resolveToExistingVersion(info) {
    var resolved = this._findResolvedManifest(info);
    invariant(resolved, 'should have found a resolved reference');
    var ref = resolved._reference;
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
    var resolver = new ImportResolver(this, this.pattern);
    return resolver.resolve().catch(() => {
      this.import = false;
      this.reporter.warn(this.reporter.lang('importFailed', this.pattern, this.getParentHumanName()));
      return super.findVersionInfo();
    });
  }
}

class ImportPackageResolver extends _packageResolver.default {
  constructor(config, lockfile) {
    super(config, lockfile);
    this.dependencyTree = void 0;

    this.next = [];
    this.rootName = 'root';
  }

  find(req) {
    this.next.push(req);
    return Promise.resolve();
  }

  findOne(req) {
    var _this5 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (_this5.activity) {
        _this5.activity.tick(req.pattern);
      }
      var request = new ImportPackageRequest(req, _this5.dependencyTree, _this5);
      yield request.find({fresh: false});
    })();
  }

  findAll(deps) {
    var _this6 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      yield Promise.all(deps.map(dep => _this6.findOne(dep)));
      deps = _this6.next;
      _this6.next = [];
      if (!deps.length) {
        // all required package versions have been discovered, so now packages that
        // resolved to existing versions can be resolved to their best available version
        _this6.resolvePackagesWithExistingVersions();
        return;
      }
      yield _this6.findAll(deps);
    })();
  }

  resetOptional() {
    for (var pattern in this.patterns) {
      var ref = this.patterns[pattern]._reference;
      invariant(ref, 'expected reference');
      ref.optional = null;
      for (var req of ref.requests) {
        ref.addOptional(req.optional);
      }
    }
  }

  init(
    deps,
    _temp
  ) {
    var _this7 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _ref = _temp === void 0 ? {isFlat: false, isFrozen: false, workspaceLayout: undefined} : _temp, isFlat = _ref.isFlat, isFrozen = _ref.isFrozen, workspaceLayout = _ref.workspaceLayout;
      _this7.flat = Boolean(isFlat);
      var activity = (_this7.activity = _this7.reporter.activity());
      yield _this7.findAll(deps);
      _this7.resetOptional();
      activity.end();
      _this7.activity = null;
    })();
  }
}

class Import extends _install.Install {
  constructor(flags, config, reporter, lockfile) {
    super(flags, config, reporter, lockfile);
    this.resolver = new ImportPackageResolver(this.config, this.lockfile);
    this.linker = new _packageLinker.default(config, this.resolver);
  }
  createLogicalDependencyTree(packageJson, packageLock) {
    invariant(packageJson, 'package.json should exist');
    invariant(packageLock, 'package-lock.json should exist');
    invariant(this.resolver instanceof ImportPackageResolver, 'resolver should be an ImportPackageResolver');
    try {
      this.resolver.dependencyTree = new _logicalDependencyTree.LogicalDependencyTree(packageJson, packageLock);
    } catch (e) {
      throw new _errors.MessageError(this.reporter.lang('importSourceFilesCorrupted'));
    }
  }
  getExternalLockfileContents() {
    var _this8 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      try {
        var _yield$Promise$all = yield Promise.all([
          fs.readFile(path.join(_this8.config.cwd, _constants.NODE_PACKAGE_JSON)),
          fs.readFile(path.join(_this8.config.cwd, _constants.NPM_LOCK_FILENAME)),
        ]);
        var packageJson = _yield$Promise$all[0], packageLock = _yield$Promise$all[1];
        return {packageJson, packageLock};
      } catch (e) {
        return {packageJson: null, packageLock: null};
      }
    })();
  }
  init() {
    var _this9 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (yield fs.exists(path.join(_this9.config.cwd, _constants.LOCKFILE_FILENAME))) {
        throw new _errors.MessageError(_this9.reporter.lang('lockfileExists'));
      }
      var _yield$_this9$getExte = yield _this9.getExternalLockfileContents(), packageJson = _yield$_this9$getExte.packageJson, packageLock = _yield$_this9$getExte.packageLock;
      var importSource =
        packageJson && packageLock && semver.satisfies(nodeVersion, '>=5.0.0') ? 'package-lock.json' : 'node_modules';
      if (importSource === 'package-lock.json') {
        _this9.reporter.info(_this9.reporter.lang('importPackageLock'));
        _this9.createLogicalDependencyTree(packageJson, packageLock);
      }
      if (importSource === 'node_modules') {
        _this9.reporter.info(_this9.reporter.lang('importNodeModules'));
        yield (0, _check.verifyTreeCheck)(_this9.config, _this9.reporter, {}, []);
      }
      var _yield$_this9$fetchRe = yield _this9.fetchRequestFromCwd(), requests = _yield$_this9$fetchRe.requests, patterns = _yield$_this9$fetchRe.patterns, manifest = _yield$_this9$fetchRe.manifest;
      if (manifest.name && _this9.resolver instanceof ImportPackageResolver) {
        _this9.resolver.rootName = manifest.name;
      }
      yield _this9.resolver.init(requests, {isFlat: _this9.flags.flat, isFrozen: _this9.flags.frozenLockfile});
      var manifests = yield fetcher.fetch(_this9.resolver.getManifests(), _this9.config);
      _this9.resolver.updateManifests(manifests);
      yield compatibility.check(_this9.resolver.getManifests(), _this9.config, _this9.flags.ignoreEngines);
      yield _this9.linker.resolvePeerModules();
      yield _this9.saveLockfileAndIntegrity(patterns);
      return patterns;
    })();
  }
}
exports.Import = Import;

function setFlags(commander) {
  commander.description(
    'Generates yarn.lock from an npm package-lock.json file or an existing npm-installed node_modules folder.'
  );
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var imp = new Import(flags, config, reporter, new _lockfile.default({cache: {}}));
    yield imp.init();
  });

  return _run.apply(this, arguments);
}
