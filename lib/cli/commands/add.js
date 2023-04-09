'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.Add = void 0;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));

var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _normalizePattern2 = require('../../util/normalize-pattern.js');
var _workspaceLayout = _interopRequireDefault(require('../../workspace-layout.js'));
var _index = require('../../resolvers/index.js');
var _list = require('./list.js');
var _install = require('./install.js');
var _errors = require('../../errors.js');
var constants = _interopRequireWildcard(require('../../constants.js'));
var fs = _interopRequireWildcard(require('../../util/fs.js'));

var invariant = require('invariant');
var path = require('path');
var semver = require('semver');

var SILENCE_DEPENDENCY_TYPE_WARNINGS = ['upgrade', 'upgrade-interactive'];

class Add extends _install.Install {
  constructor(args, flags, config, reporter, lockfile) {
    var workspaceRootIsCwd = config.cwd === config.lockfileFolder;
    var _flags = flags ? (0, _extends2.default)({}, flags, {workspaceRootIsCwd}) : {workspaceRootIsCwd};
    super(_flags, config, reporter, lockfile);
    this.addedPatterns = void 0;

    this.args = args;
    // only one flag is supported, so we can figure out which one was passed to `yarn add`
    this.flagToOrigin = [
      flags.dev && 'devDependencies',
      flags.optional && 'optionalDependencies',
      flags.peer && 'peerDependencies',
      'dependencies',
    ]
      .filter(Boolean)
      .shift();
  }

  /**
   * TODO
   */

  prepareRequests(requests) {
    var requestsWithArgs = requests.slice();

    for (var pattern of this.args) {
      requestsWithArgs.push({
        pattern,
        registry: 'npm',
        optional: false,
      });
    }
    return requestsWithArgs;
  }

  /**
   * returns version for a pattern based on Manifest
   */
  getPatternVersion(pattern, pkg) {
    var tilde = this.flags.tilde;
    var configPrefix = String(this.config.getOption('save-prefix'));
    var exact = this.flags.exact || Boolean(this.config.getOption('save-exact')) || configPrefix === '';
    var _normalizePattern = (0, _normalizePattern2.normalizePattern)(pattern), hasVersion = _normalizePattern.hasVersion, range = _normalizePattern.range;
    var version;

    if ((0, _index.getExoticResolver)(pattern)) {
      // wasn't a name/range tuple so this is just a raw exotic pattern
      version = pattern;
    } else if (hasVersion && range && (semver.satisfies(pkg.version, range) || (0, _index.getExoticResolver)(range))) {
      // if the user specified a range then use it verbatim
      version = range;
    }

    if (!version || semver.valid(version)) {
      var prefix = configPrefix || '^';

      if (tilde) {
        prefix = '~';
      } else if (version || exact) {
        prefix = '';
      }
      version = `${prefix}${pkg.version}`;
    }

    return version;
  }

  preparePatterns(patterns) {
    var preparedPatterns = patterns.slice();
    for (var pattern of this.resolver.dedupePatterns(this.args)) {
      var pkg = this.resolver.getResolvedPattern(pattern);
      invariant(pkg, `missing package ${pattern}`);
      var version = this.getPatternVersion(pattern, pkg);
      var newPattern = `${pkg.name}@${version}`;
      preparedPatterns.push(newPattern);
      this.addedPatterns.push(newPattern);
      if (newPattern === pattern) {
        continue;
      }
      this.resolver.replacePattern(pattern, newPattern);
    }
    return preparedPatterns;
  }

  preparePatternsForLinking(patterns, cwdManifest, cwdIsRoot) {
    // remove the newly added patterns if cwd != root and update the in-memory package dependency instead
    if (cwdIsRoot) {
      return patterns;
    }

    var manifest;
    var cwdPackage = `${cwdManifest.name}@${cwdManifest.version}`;
    try {
      manifest = this.resolver.getStrictResolvedPattern(cwdPackage);
    } catch (e) {
      this.reporter.warn(this.reporter.lang('unknownPackage', cwdPackage));
      return patterns;
    }

    var newPatterns = patterns;
    this._iterateAddedPackages((pattern, registry, dependencyType, pkgName, version) => {
      // remove added package from patterns list
      var filtered = newPatterns.filter(p => p !== pattern);
      invariant(
        newPatterns.length - filtered.length > 0,
        `expect added pattern '${pattern}' in the list: ${patterns.toString()}`
      );
      newPatterns = filtered;

      // add new package into in-memory manifest so they can be linked properly
      manifest[dependencyType] = manifest[dependencyType] || {};
      if (manifest[dependencyType][pkgName] === version) {
        // package already existed
        return;
      }

      // update dependencies in the manifest
      invariant(manifest._reference, 'manifest._reference should not be null');
      var ref = manifest._reference;

      ref['dependencies'] = ref['dependencies'] || [];
      ref['dependencies'].push(pattern);
    });

    return newPatterns;
  }

  bailout(patterns, workspaceLayout) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var lockfileCache = _this.lockfile.cache;
      if (!lockfileCache) {
        return false;
      }
      var match = yield _this.integrityChecker.check(patterns, lockfileCache, _this.flags, workspaceLayout);
      var haveLockfile = yield fs.exists(path.join(_this.config.lockfileFolder, constants.LOCKFILE_FILENAME));
      if (match.integrityFileMissing && haveLockfile) {
        // Integrity file missing, force script installations
        _this.scripts.setForce(true);
      }
      return false;
    })();
  }

  /**
   * Description
   */

  init() {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var isWorkspaceRoot = _this2.config.workspaceRootFolder && _this2.config.cwd === _this2.config.workspaceRootFolder;

      // running "yarn add something" in a workspace root is often a mistake
      if (isWorkspaceRoot && !_this2.flags.ignoreWorkspaceRootCheck) {
        throw new _errors.MessageError(_this2.reporter.lang('workspacesAddRootCheck'));
      }

      _this2.addedPatterns = [];
      var patterns = yield _install.Install.prototype.init.call(_this2);
      yield _this2.maybeOutputSaveTree(patterns);
      return patterns;
    })();
  }

  applyChanges(manifests) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      yield _install.Install.prototype.applyChanges.call(_this3, manifests);

      // fill rootPatternsToOrigin without `excludePatterns`
      yield _install.Install.prototype.fetchRequestFromCwd.call(_this3);

      _this3._iterateAddedPackages((pattern, registry, dependencyType, pkgName, version) => {
        // add it to manifest
        var object = manifests[registry].object;

        object[dependencyType] = object[dependencyType] || {};
        object[dependencyType][pkgName] = version;
        if (
          SILENCE_DEPENDENCY_TYPE_WARNINGS.indexOf(_this3.config.commandName) === -1 &&
          dependencyType !== _this3.flagToOrigin
        ) {
          _this3.reporter.warn(_this3.reporter.lang('moduleAlreadyInManifest', pkgName, dependencyType, _this3.flagToOrigin));
        }
      });

      return true;
    })();
  }

  /**
   * Description
   */

  fetchRequestFromCwd() {
    return _install.Install.prototype.fetchRequestFromCwd.call(this, this.args);
  }

  /**
   * Output a tree of any newly added dependencies.
   */

  maybeOutputSaveTree(patterns) {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // don't limit the shown tree depth
      var opts = {
        reqDepth: 0,
      };

      // restore the original patterns
      var merged = [].concat(patterns, _this4.addedPatterns);

      var _yield$buildTree = yield (0, _list.buildTree)(_this4.resolver, _this4.linker, merged, opts, true, true), trees = _yield$buildTree.trees, count = _yield$buildTree.count;

      if (count === 1) {
        _this4.reporter.success(_this4.reporter.lang('savedNewDependency'));
      } else {
        _this4.reporter.success(_this4.reporter.lang('savedNewDependencies', count));
      }

      if (!count) {
        return;
      }

      var resolverPatterns = new Set();
      for (var pattern of patterns) {
        var _ref = _this4.resolver.getResolvedPattern(pattern) || {}, version = _ref.version, name = _ref.name;
        resolverPatterns.add(`${name}@${version}`);
      }
      var directRequireDependencies = trees.filter(_ref2 => {
        var name = _ref2.name;
        return resolverPatterns.has(name);
      });

      _this4.reporter.info(_this4.reporter.lang('directDependencies'));
      _this4.reporter.tree('newDirectDependencies', directRequireDependencies);
      _this4.reporter.info(_this4.reporter.lang('allDependencies'));
      _this4.reporter.tree('newAllDependencies', trees);
    })();
  }

  /**
   * Save added packages to manifest if any of the --save flags were used.
   */

  savePackages() {
    return (0, _asyncToGenerator2.default)(function* () {})();
  }

  _iterateAddedPackages(f) {
    var _this5 = this;
    var patternOrigins = Object.keys(this.rootPatternsToOrigin);

    // add new patterns to their appropriate registry manifest
    var _loop = function(pattern) {
      var pkg = _this5.resolver.getResolvedPattern(pattern);
      invariant(pkg, `missing package ${pattern}`);
      var version = _this5.getPatternVersion(pattern, pkg);
      var ref = pkg._reference;
      invariant(ref, 'expected package reference');
      // lookup the package to determine dependency type; used during `yarn upgrade`
      var depType = patternOrigins.reduce((acc, prev) => {
        if (prev.indexOf(`${pkg.name}@`) === 0) {
          return _this5.rootPatternsToOrigin[prev];
        }
        return acc;
      }, null);

      // depType is calculated when `yarn upgrade` command is used
      var target = depType || _this5.flagToOrigin;

      f(pattern, ref.registry, target, pkg.name, version);
    };
    for (var pattern of this.addedPatterns) {
      _loop(pattern);
    }
  }
}
exports.Add = Add;

function hasWrapper(commander) {
  return true;
}

function setFlags(commander) {
  commander.description('Installs a package and any packages that it depends on.');
  commander.usage('add [packages ...] [flags]');
  commander.option('-W, --ignore-workspace-root-check', 'required to run yarn add inside a workspace root');
  commander.option('-D, --dev', 'save package to your `devDependencies`');
  commander.option('-P, --peer', 'save package to your `peerDependencies`');
  commander.option('-O, --optional', 'save package to your `optionalDependencies`');
  commander.option('-E, --exact', 'install exact version');
  commander.option('-T, --tilde', 'install most recent release with the same minor version');
  commander.option('-A, --audit', 'Run vulnerability audit on installed packages');
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (!args.length) {
      throw new _errors.MessageError(reporter.lang('missingAddDependencies'));
    }

    var lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder, reporter);

    yield (0, _install.wrapLifecycle)(config, flags, /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
      var install = new Add(args, flags, config, reporter, lockfile);
      yield install.init();
    }));
  });

  return _run.apply(this, arguments);
}
