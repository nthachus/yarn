'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.Install = void 0;
exports.hasWrapper = hasWrapper;
exports.install = install;
exports.run = run;
exports.setFlags = setFlags;
exports.wrapLifecycle = wrapLifecycle;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var objectPath = require('object-path');
var _hooks = require('../../util/hooks.js');
var _index = _interopRequireDefault(require('../../util/normalize-manifest/index.js'));
var _errors = require('../../errors.js');
var _integrityChecker = _interopRequireDefault(require('../../integrity-checker.js'));
var _lockfile = _interopRequireWildcard(require('../../lockfile'));
var fetcher = _interopRequireWildcard(require('../../package-fetcher.js'));
var _packageInstallScripts = _interopRequireDefault(require('../../package-install-scripts.js'));
var compatibility = _interopRequireWildcard(require('../../package-compatibility.js'));
var _packageResolver = _interopRequireDefault(require('../../package-resolver.js'));
var _packageLinker = _interopRequireDefault(require('../../package-linker.js'));
var _index2 = require('../../registries/index.js');
var _index3 = require('../../resolvers/index.js');
var _autoclean = require('./autoclean.js');
var constants = _interopRequireWildcard(require('../../constants.js'));
var _normalizePattern = require('../../util/normalize-pattern.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _map = _interopRequireDefault(require('../../util/map.js'));
var _yarnVersion = require('../../util/yarn-version.js');
var _generatePnpMap = require('../../util/generate-pnp-map.js');
var _workspaceLayout = _interopRequireDefault(require('../../workspace-layout.js'));
var _resolutionMap = _interopRequireDefault(require('../../resolution-map.js'));
var _guessName = _interopRequireDefault(require('../../util/guess-name'));
var _audit = _interopRequireDefault(require('./audit'));

var deepEqual = require('deep-equal');
var emoji = require('node-emoji');
var invariant = require('invariant');
var path = require('path');
var semver = require('semver');
var uuid = require('uuid');
var ssri = require('ssri');

var ONE_DAY = 1000 * 60 * 60 * 24;

/**
 * Try and detect the installation method for Yarn and provide a command to update it with.
 */

function getUpdateCommand(installationMethod) {
  if (installationMethod === 'tar') {
    return `curl --compressed -o- -L ${constants.YARN_INSTALLER_SH} | bash`;
  }

  if (installationMethod === 'homebrew') {
    return 'brew upgrade yarn';
  }

  if (installationMethod === 'deb') {
    return 'sudo apt-get update && sudo apt-get install yarn';
  }

  if (installationMethod === 'rpm') {
    return 'sudo yum install yarn';
  }

  if (installationMethod === 'npm') {
    return 'npm install --global yarn';
  }

  if (installationMethod === 'chocolatey') {
    return 'choco upgrade yarn';
  }

  if (installationMethod === 'apk') {
    return 'apk update && apk add -u yarn';
  }

  if (installationMethod === 'portage') {
    return 'sudo emerge --sync && sudo emerge -au sys-apps/yarn';
  }

  return null;
}

function getUpdateInstaller(installationMethod) {
  // Windows
  if (installationMethod === 'msi') {
    return constants.YARN_INSTALLER_MSI;
  }

  return null;
}

function normalizeFlags(config, rawFlags) {
  var flags = {
    // install
    har: !!rawFlags.har,
    ignorePlatform: !!rawFlags.ignorePlatform,
    ignoreEngines: !!rawFlags.ignoreEngines,
    ignoreScripts: !!rawFlags.ignoreScripts,
    ignoreOptional: !!rawFlags.ignoreOptional,
    force: !!rawFlags.force,
    flat: !!rawFlags.flat,
    lockfile: rawFlags.lockfile !== false,
    pureLockfile: !!rawFlags.pureLockfile,
    updateChecksums: !!rawFlags.updateChecksums,
    skipIntegrityCheck: !!rawFlags.skipIntegrityCheck,
    frozenLockfile: !!rawFlags.frozenLockfile,
    linkDuplicates: !!rawFlags.linkDuplicates,
    checkFiles: !!rawFlags.checkFiles,
    audit: !!rawFlags.audit,

    // add
    peer: !!rawFlags.peer,
    dev: !!rawFlags.dev,
    optional: !!rawFlags.optional,
    exact: !!rawFlags.exact,
    tilde: !!rawFlags.tilde,
    ignoreWorkspaceRootCheck: !!rawFlags.ignoreWorkspaceRootCheck,

    // outdated, update-interactive
    includeWorkspaceDeps: !!rawFlags.includeWorkspaceDeps,

    // add, remove, update
    workspaceRootIsCwd: rawFlags.workspaceRootIsCwd !== false,
  };

  if (config.getOption('ignore-scripts')) {
    flags.ignoreScripts = true;
  }

  if (config.getOption('ignore-platform')) {
    flags.ignorePlatform = true;
  }

  if (config.getOption('ignore-engines')) {
    flags.ignoreEngines = true;
  }

  if (config.getOption('ignore-optional')) {
    flags.ignoreOptional = true;
  }

  if (config.getOption('force')) {
    flags.force = true;
  }

  return flags;
}

class Install {
  constructor(flags, config, reporter, lockfile) {
    this.registries = void 0;

    this.rootManifestRegistries = [];
    this.rootPatternsToOrigin = (0, _map.default)();
    this.lockfile = lockfile;
    this.reporter = reporter;
    this.config = config;
    this.flags = normalizeFlags(config, flags);
    this.resolutions = (0, _map.default)(); // Legacy resolutions field used for flat install mode
    this.resolutionMap = new _resolutionMap.default(config); // Selective resolutions for nested dependencies
    this.resolver = new _packageResolver.default(config, lockfile, this.resolutionMap);
    this.integrityChecker = new _integrityChecker.default(config);
    this.linker = new _packageLinker.default(config, this.resolver);
    this.scripts = new _packageInstallScripts.default(config, this.resolver, this.flags.force);
  }

  /**
   * Create a list of dependency requests from the current directories manifests.
   */

  fetchRequestFromCwd(
    excludePatterns,
    ignoreUnusedPatterns
  ) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (excludePatterns === void 0) excludePatterns = [];
      if (ignoreUnusedPatterns === void 0) ignoreUnusedPatterns = false;
      var patterns = [];
      var deps = [];
      var resolutionDeps = [];
      var manifest = {};

      var ignorePatterns = [];
      var usedPatterns = [];
      var workspaceLayout;

      // some commands should always run in the context of the entire workspace
      var cwd =
        _this.flags.includeWorkspaceDeps || _this.flags.workspaceRootIsCwd ? _this.config.lockfileFolder : _this.config.cwd;

      // non-workspaces are always root, otherwise check for workspace root
      var cwdIsRoot = !_this.config.workspaceRootFolder || _this.config.lockfileFolder === cwd;

      // exclude package names that are in install args
      var excludeNames = [];
      for (var pattern of excludePatterns) {
        if ((0, _index3.getExoticResolver)(pattern)) {
          excludeNames.push((0, _guessName.default)(pattern));
        } else {
          // extract the name
          var parts = (0, _normalizePattern.normalizePattern)(pattern);
          excludeNames.push(parts.name);
        }
      }

      var stripExcluded = (manifest) => {
        for (var exclude of excludeNames) {
          if (manifest.dependencies && manifest.dependencies[exclude]) {
            delete manifest.dependencies[exclude];
          }
          if (manifest.devDependencies && manifest.devDependencies[exclude]) {
            delete manifest.devDependencies[exclude];
          }
          if (manifest.optionalDependencies && manifest.optionalDependencies[exclude]) {
            delete manifest.optionalDependencies[exclude];
          }
        }
      };

      var _loop = function* (registry) {
        var filename = _index2.registries[registry].filename;
        var loc = path.join(cwd, filename);
        if (!(yield fs.exists(loc))) {
          return 'continue';
        }

        _this.rootManifestRegistries.push(registry);

        var projectManifestJson = yield _this.config.readJson(loc);
        yield (0, _index.default)(projectManifestJson, cwd, _this.config, cwdIsRoot);

        Object.assign(_this.resolutions, projectManifestJson.resolutions);
        Object.assign(manifest, projectManifestJson);

        _this.resolutionMap.init(_this.resolutions);
        for (var packageName of Object.keys(_this.resolutionMap.resolutionsByPackage)) {
          var optional = objectPath.has(manifest.optionalDependencies, packageName) && _this.flags.ignoreOptional;
          for (var _ref of _this.resolutionMap.resolutionsByPackage[packageName]) {
            var _pattern = _ref.pattern;
            resolutionDeps = [].concat(resolutionDeps, [{registry, pattern: _pattern, optional, hint: 'resolution'}]);
          }
        }

        var pushDeps = (
          depType,
          manifest,
          _ref2,
          isUsed
        ) => {
          var hint = _ref2.hint, optional = _ref2.optional;
          if (ignoreUnusedPatterns && !isUsed) {
            return;
          }
          // We only take unused dependencies into consideration to get deterministic hoisting.
          // Since flat mode doesn't care about hoisting and everything is top level and specified then we can safely
          // leave these out.
          if (_this.flags.flat && !isUsed) {
            return;
          }
          var depMap = manifest[depType];
          for (var name in depMap) {
            if (excludeNames.indexOf(name) >= 0) {
              continue;
            }

            var _pattern2 = name;
            if (!_this.lockfile.getLocked(_pattern2)) {
              // when we use --save we save the dependency to the lockfile with just the name rather than the
              // version combo
              _pattern2 += '@' + depMap[name];
            }

            // normalization made sure packages are mentioned only once
            if (isUsed) {
              usedPatterns.push(_pattern2);
            } else {
              ignorePatterns.push(_pattern2);
            }

            _this.rootPatternsToOrigin[_pattern2] = depType;
            patterns.push(_pattern2);
            deps.push({pattern: _pattern2, registry, hint, optional, workspaceName: manifest.name, workspaceLoc: manifest._loc});
          }
        };

        if (cwdIsRoot) {
          pushDeps('dependencies', projectManifestJson, {hint: null, optional: false}, true);
          pushDeps('devDependencies', projectManifestJson, {hint: 'dev', optional: false}, !_this.config.production);
          pushDeps('optionalDependencies', projectManifestJson, {hint: 'optional', optional: true}, true);
        }

        if (_this.config.workspaceRootFolder) {
          var workspaceLoc = cwdIsRoot ? loc : path.join(_this.config.lockfileFolder, filename);
          var workspacesRoot = path.dirname(workspaceLoc);

          var workspaceManifestJson = projectManifestJson;
          if (!cwdIsRoot) {
            // the manifest we read before was a child workspace, so get the root
            workspaceManifestJson = yield _this.config.readJson(workspaceLoc);
            yield (0, _index.default)(workspaceManifestJson, workspacesRoot, _this.config, true);
          }

          var workspaces = yield _this.config.resolveWorkspaces(workspacesRoot, workspaceManifestJson);
          workspaceLayout = new _workspaceLayout.default(workspaces, _this.config);

          // add virtual manifest that depends on all workspaces, this way package hoisters and resolvers will work fine
          var workspaceDependencies = (0, _extends2.default)({}, workspaceManifestJson.dependencies);
          for (var workspaceName of Object.keys(workspaces)) {
            var workspaceManifest = workspaces[workspaceName].manifest;
            workspaceDependencies[workspaceName] = workspaceManifest.version;

            // include dependencies from all workspaces
            if (_this.flags.includeWorkspaceDeps) {
              pushDeps('dependencies', workspaceManifest, {hint: null, optional: false}, true);
              pushDeps('devDependencies', workspaceManifest, {hint: 'dev', optional: false}, !_this.config.production);
              pushDeps('optionalDependencies', workspaceManifest, {hint: 'optional', optional: true}, true);
            }
          }
          var virtualDependencyManifest = {
            _uid: '',
            name: `workspace-aggregator-${uuid.v4()}`,
            version: '1.0.0',
            _registry: 'npm',
            _loc: workspacesRoot,
            dependencies: workspaceDependencies,
            devDependencies: (0, _extends2.default)({}, workspaceManifestJson.devDependencies),
            optionalDependencies: (0, _extends2.default)({}, workspaceManifestJson.optionalDependencies),
            private: workspaceManifestJson.private,
            workspaces: workspaceManifestJson.workspaces,
          };
          workspaceLayout.virtualManifestName = virtualDependencyManifest.name;
          var virtualDep = {};
          virtualDep[virtualDependencyManifest.name] = virtualDependencyManifest.version;
          workspaces[virtualDependencyManifest.name] = {loc: workspacesRoot, manifest: virtualDependencyManifest};

          // ensure dependencies that should be excluded are stripped from the correct manifest
          stripExcluded(cwdIsRoot ? virtualDependencyManifest : workspaces[projectManifestJson.name].manifest);

          pushDeps('workspaces', {workspaces: virtualDep}, {hint: 'workspaces', optional: false}, true);

          var implicitWorkspaceDependencies = (0, _extends2.default)({}, workspaceDependencies);

          for (var type of constants.OWNED_DEPENDENCY_TYPES) {
            for (var dependencyName of Object.keys(projectManifestJson[type] || {})) {
              delete implicitWorkspaceDependencies[dependencyName];
            }
          }

          pushDeps(
            'dependencies',
            {dependencies: implicitWorkspaceDependencies},
            {hint: 'workspaces', optional: false},
            true
          );
        }

        return 'break';
      };
      for (var registry of Object.keys(_index2.registries)) {
        var _ret = yield* _loop(registry);
        if (_ret === 'continue') continue;
        if (_ret === 'break') break;
      }

      // inherit root flat flag
      if (manifest.flat) {
        _this.flags.flat = true;
      }

      return {
        requests: [].concat(resolutionDeps, deps),
        patterns,
        manifest,
        usedPatterns,
        ignorePatterns,
        workspaceLayout,
      };
    })();
  }

  /**
   * TODO description
   */

  prepareRequests(requests) {
    return requests;
  }

  preparePatterns(patterns) {
    return patterns;
  }
  preparePatternsForLinking(patterns, cwdManifest, cwdIsRoot) {
    return patterns;
  }

  prepareManifests() {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var manifests = yield _this2.config.getRootManifests();
      return manifests;
    })();
  }

  bailout(patterns, workspaceLayout) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // We don't want to skip the audit - it could yield important errors
      if (_this3.flags.audit) {
        return false;
      }
      // PNP is so fast that the integrity check isn't pertinent
      if (_this3.config.plugnplayEnabled) {
        return false;
      }
      if (_this3.flags.skipIntegrityCheck || _this3.flags.force) {
        return false;
      }
      var lockfileCache = _this3.lockfile.cache;
      if (!lockfileCache) {
        return false;
      }
      var lockfileClean = _this3.lockfile.parseResultType === 'success';
      var match = yield _this3.integrityChecker.check(patterns, lockfileCache, _this3.flags, workspaceLayout);
      if (_this3.flags.frozenLockfile && (!lockfileClean || match.missingPatterns.length > 0)) {
        throw new _errors.MessageError(_this3.reporter.lang('frozenLockfileError'));
      }

      var haveLockfile = yield fs.exists(path.join(_this3.config.lockfileFolder, constants.LOCKFILE_FILENAME));

      var lockfileIntegrityPresent = !_this3.lockfile.hasEntriesExistWithoutIntegrity();
      var integrityBailout = lockfileIntegrityPresent || !_this3.config.autoAddIntegrity;

      if (match.integrityMatches && haveLockfile && lockfileClean && integrityBailout) {
        _this3.reporter.success(_this3.reporter.lang('upToDate'));
        return true;
      }

      if (match.integrityFileMissing && haveLockfile) {
        // Integrity file missing, force script installations
        _this3.scripts.setForce(true);
        return false;
      }

      if (match.hardRefreshRequired) {
        // e.g. node version doesn't match, force script installations
        _this3.scripts.setForce(true);
        return false;
      }

      if (!patterns.length && !match.integrityFileMissing) {
        _this3.reporter.success(_this3.reporter.lang('nothingToInstall'));
        yield _this3.createEmptyManifestFolders();
        yield _this3.saveLockfileAndIntegrity(patterns, workspaceLayout);
        return true;
      }

      return false;
    })();
  }

  /**
   * Produce empty folders for all used root manifests.
   */

  createEmptyManifestFolders() {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (_this4.config.modulesFolder) {
        // already created
        return;
      }

      for (var registryName of _this4.rootManifestRegistries) {
        var folder = _this4.config.registries[registryName].folder;
        yield fs.mkdirp(path.join(_this4.config.lockfileFolder, folder));
      }
    })();
  }

  /**
   * TODO description
   */

  markIgnored(patterns) {
    for (var pattern of patterns) {
      var manifest = this.resolver.getStrictResolvedPattern(pattern);
      var ref = manifest._reference;
      invariant(ref, 'expected package reference');

      // just mark the package as ignored. if the package is used by a required package, the hoister
      // will take care of that.
      ref.ignore = true;
    }
  }

  /**
   * helper method that gets only recent manifests
   * used by global.ls command
   */
  getFlattenedDeps() {
    var _this5 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _yield$_this5$fetchRe = yield _this5.fetchRequestFromCwd(), depRequests = _yield$_this5$fetchRe.requests, rawPatterns = _yield$_this5$fetchRe.patterns;

      yield _this5.resolver.init(depRequests, {});

      var manifests = yield fetcher.fetch(_this5.resolver.getManifests(), _this5.config);
      _this5.resolver.updateManifests(manifests);

      return _this5.flatten(rawPatterns);
    })();
  }

  /**
   * TODO description
   */

  init() {
    var _this6 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      _this6.checkUpdate();

      // warn if we have a shrinkwrap
      if (yield fs.exists(path.join(_this6.config.lockfileFolder, constants.NPM_SHRINKWRAP_FILENAME))) {
        _this6.reporter.warn(_this6.reporter.lang('shrinkwrapWarning'));
      }

      // warn if we have an npm lockfile
      if (yield fs.exists(path.join(_this6.config.lockfileFolder, constants.NPM_LOCK_FILENAME))) {
        _this6.reporter.warn(_this6.reporter.lang('npmLockfileWarning'));
      }

      if (_this6.config.plugnplayEnabled) {
        _this6.reporter.info(_this6.reporter.lang('plugnplaySuggestV2L1'));
        _this6.reporter.info(_this6.reporter.lang('plugnplaySuggestV2L2'));
      }

      var flattenedTopLevelPatterns = [];
      var steps = [];
      var _yield$_this6$fetchRe = yield _this6.fetchRequestFromCwd(),
        depRequests = _yield$_this6$fetchRe.requests,
        rawPatterns = _yield$_this6$fetchRe.patterns,
        ignorePatterns = _yield$_this6$fetchRe.ignorePatterns,
        workspaceLayout = _yield$_this6$fetchRe.workspaceLayout,
        manifest = _yield$_this6$fetchRe.manifest;
      var topLevelPatterns = [];

      var artifacts = yield _this6.integrityChecker.getArtifacts();
      if (artifacts) {
        _this6.linker.setArtifacts(artifacts);
        _this6.scripts.setArtifacts(artifacts);
      }

      if (compatibility.shouldCheck(manifest, _this6.flags)) {
        steps.push(/*#__PURE__*/ (function() {
          var _ref3 = (0, _asyncToGenerator2.default)(function* (curr, total) {
            _this6.reporter.step(curr, total, _this6.reporter.lang('checkingManifest'), emoji.get('mag'));
            yield _this6.checkCompatibility();
          });

          return function() {
            return _ref3.apply(this, arguments);
          };
        })());
      }

      var audit = new _audit.default(_this6.config, _this6.reporter, {groups: constants.OWNED_DEPENDENCY_TYPES});
      var auditFoundProblems = false;

      steps.push((curr, total) =>
        (0, _hooks.callThroughHook)('resolveStep', /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
          _this6.reporter.step(curr, total, _this6.reporter.lang('resolvingPackages'), emoji.get('mag'));
          yield _this6.resolver.init(_this6.prepareRequests(depRequests), {
            isFlat: _this6.flags.flat,
            isFrozen: _this6.flags.frozenLockfile,
            workspaceLayout,
          });
          topLevelPatterns = _this6.preparePatterns(rawPatterns);
          flattenedTopLevelPatterns = yield _this6.flatten(topLevelPatterns);
          return {bailout: !_this6.flags.audit && (yield _this6.bailout(topLevelPatterns, workspaceLayout))};
        }))
      );

      if (_this6.flags.audit) {
        steps.push((curr, total) =>
          (0, _hooks.callThroughHook)('auditStep', /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
            _this6.reporter.step(curr, total, _this6.reporter.lang('auditRunning'), emoji.get('mag'));
            if (_this6.flags.offline) {
              _this6.reporter.warn(_this6.reporter.lang('auditOffline'));
              return {bailout: false};
            }
            var preparedManifests = yield _this6.prepareManifests();
            // $FlowFixMe - Flow considers `m` in the map operation to be "mixed", so does not recognize `m.object`
            var mergedManifest = Object.assign.apply(Object, [{}].concat(Object.values(preparedManifests).map(m => m.object)));
            var auditVulnerabilityCounts = yield audit.performAudit(
              mergedManifest,
              _this6.lockfile,
              _this6.resolver,
              _this6.linker,
              topLevelPatterns
            );
            auditFoundProblems =
              auditVulnerabilityCounts.info ||
              auditVulnerabilityCounts.low ||
              auditVulnerabilityCounts.moderate ||
              auditVulnerabilityCounts.high ||
              auditVulnerabilityCounts.critical;
            return {bailout: yield _this6.bailout(topLevelPatterns, workspaceLayout)};
          }))
        );
      }

      steps.push((curr, total) =>
        (0, _hooks.callThroughHook)('fetchStep', /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
          _this6.markIgnored(ignorePatterns);
          _this6.reporter.step(curr, total, _this6.reporter.lang('fetchingPackages'), emoji.get('truck'));
          var manifests = yield fetcher.fetch(_this6.resolver.getManifests(), _this6.config);
          _this6.resolver.updateManifests(manifests);
          yield compatibility.check(_this6.resolver.getManifests(), _this6.config, _this6.flags.ignoreEngines);
        }))
      );

      steps.push((curr, total) =>
        (0, _hooks.callThroughHook)('linkStep', /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
          // remove integrity hash to make this operation atomic
          yield _this6.integrityChecker.removeIntegrityFile();
          _this6.reporter.step(curr, total, _this6.reporter.lang('linkingDependencies'), emoji.get('link'));
          flattenedTopLevelPatterns = _this6.preparePatternsForLinking(
            flattenedTopLevelPatterns,
            manifest,
            _this6.config.lockfileFolder === _this6.config.cwd
          );
          yield _this6.linker.init(flattenedTopLevelPatterns, workspaceLayout, {
            linkDuplicates: _this6.flags.linkDuplicates,
            ignoreOptional: _this6.flags.ignoreOptional,
          });
        }))
      );

      if (_this6.config.plugnplayEnabled) {
        steps.push((curr, total) =>
          (0, _hooks.callThroughHook)('pnpStep', /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
            var pnpPath = `${_this6.config.lockfileFolder}/${constants.PNP_FILENAME}`;

            var code = yield (0, _generatePnpMap.generatePnpMap)(_this6.config, flattenedTopLevelPatterns, {
              resolver: _this6.resolver,
              reporter: _this6.reporter,
              targetPath: pnpPath,
              workspaceLayout,
            });

            try {
              var file = yield fs.readFile(pnpPath);
              if (file === code) {
                return;
              }
            } catch (error) {}

            yield fs.writeFile(pnpPath, code);
            yield fs.chmod(pnpPath, 0o755);
          }))
        );
      }

      steps.push((curr, total) =>
        (0, _hooks.callThroughHook)('buildStep', /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
          _this6.reporter.step(
            curr,
            total,
            _this6.flags.force ? _this6.reporter.lang('rebuildingPackages') : _this6.reporter.lang('buildingFreshPackages'),
            emoji.get('hammer')
          );

          if (_this6.config.ignoreScripts) {
            _this6.reporter.warn(_this6.reporter.lang('ignoredScripts'));
          } else {
            yield _this6.scripts.init(flattenedTopLevelPatterns);
          }
        }))
      );

      if (_this6.flags.har) {
        steps.push(/*#__PURE__*/ (function() {
          var _ref10 = (0, _asyncToGenerator2.default)(function* (curr, total) {
            var formattedDate = new Date().toISOString().replace(/:/g, '-');
            var filename = `yarn-install_${formattedDate}.har`;
            _this6.reporter.step(
              curr,
              total,
              _this6.reporter.lang('savingHar', filename),
              emoji.get('black_circle_for_record')
            );
            yield _this6.config.requestManager.saveHar(filename);
          });

          return function() {
            return _ref10.apply(this, arguments);
          };
        })());
      }

      if (yield _this6.shouldClean()) {
        steps.push(/*#__PURE__*/ (function() {
          var _ref11 = (0, _asyncToGenerator2.default)(function* (curr, total) {
            _this6.reporter.step(curr, total, _this6.reporter.lang('cleaningModules'), emoji.get('recycle'));
            yield (0, _autoclean.clean)(_this6.config, _this6.reporter);
          });

          return function() {
            return _ref11.apply(this, arguments);
          };
        })());
      }

      var currentStep = 0;
      for (var step of steps) {
        var stepResult = yield step(++currentStep, steps.length);
        if (stepResult && stepResult.bailout) {
          if (_this6.flags.audit) {
            audit.summary();
          }
          if (auditFoundProblems) {
            _this6.reporter.warn(_this6.reporter.lang('auditRunAuditForDetails'));
          }
          _this6.maybeOutputUpdate();
          return flattenedTopLevelPatterns;
        }
      }

      // fin!
      if (_this6.flags.audit) {
        audit.summary();
      }
      if (auditFoundProblems) {
        _this6.reporter.warn(_this6.reporter.lang('auditRunAuditForDetails'));
      }
      yield _this6.saveLockfileAndIntegrity(topLevelPatterns, workspaceLayout);
      yield _this6.persistChanges();
      _this6.maybeOutputUpdate();
      _this6.config.requestManager.clearCache();
      return flattenedTopLevelPatterns;
    })();
  }

  checkCompatibility() {
    var _this7 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _yield$_this7$fetchRe = yield _this7.fetchRequestFromCwd(), manifest = _yield$_this7$fetchRe.manifest;
      yield compatibility.checkOne(manifest, _this7.config, _this7.flags.ignoreEngines);
    })();
  }

  persistChanges() {
    var _this8 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // get all the different registry manifests in this folder
      var manifests = yield _this8.config.getRootManifests();

      if (yield _this8.applyChanges(manifests)) {
        yield _this8.config.saveRootManifests(manifests);
      }
    })();
  }

  applyChanges(manifests) {
    var hasChanged = false;

    if (this.config.plugnplayPersist) {
      var object = manifests.npm.object;

      if (typeof object.installConfig !== 'object') {
        object.installConfig = {};
      }

      if (this.config.plugnplayEnabled && object.installConfig.pnp !== true) {
        object.installConfig.pnp = true;
        hasChanged = true;
      } else if (!this.config.plugnplayEnabled && typeof object.installConfig.pnp !== 'undefined') {
        delete object.installConfig.pnp;
        hasChanged = true;
      }

      if (Object.keys(object.installConfig).length === 0) {
        delete object.installConfig;
      }
    }

    return Promise.resolve(hasChanged);
  }

  /**
   * Check if we should run the cleaning step.
   */

  shouldClean() {
    return fs.exists(path.join(this.config.lockfileFolder, constants.CLEAN_FILENAME));
  }

  /**
   * TODO
   */

  flatten(patterns) {
    var _this9 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (!_this9.flags.flat) {
        return patterns;
      }

      var flattenedPatterns = [];

      for (var name of _this9.resolver.getAllDependencyNamesByLevelOrder(patterns)) {
        var infos = _this9.resolver.getAllInfoForPackageName(name).filter((manifest) => {
          var ref = manifest._reference;
          invariant(ref, 'expected package reference');
          return !ref.ignore;
        });

        if (infos.length === 0) {
          continue;
        }

        if (infos.length === 1) {
          // single version of this package
          // take out a single pattern as multiple patterns may have resolved to this package
          flattenedPatterns.push(_this9.resolver.patternsByPackage[name][0]);
          continue;
        }

        var options = infos.map((info) => {
          var ref = info._reference;
          invariant(ref, 'expected reference');
          return {
            // TODO `and is required by {PARENT}`,
            name: _this9.reporter.lang('manualVersionResolutionOption', ref.patterns.join(', '), info.version),

            value: info.version,
          };
        });
        var versions = infos.map((info) => info.version);
        var version;

        var resolutionVersion = _this9.resolutions[name];
        if (resolutionVersion && versions.indexOf(resolutionVersion) >= 0) {
          // use json `resolution` version
          version = resolutionVersion;
        } else {
          version = yield _this9.reporter.select(
            _this9.reporter.lang('manualVersionResolution', name),
            _this9.reporter.lang('answer'),
            options
          );
          _this9.resolutions[name] = version;
        }

        flattenedPatterns.push(_this9.resolver.collapseAllVersionsOfPackage(name, version));
      }

      // save resolutions to their appropriate root manifest
      if (Object.keys(_this9.resolutions).length) {
        var manifests = yield _this9.config.getRootManifests();

        for (var _name in _this9.resolutions) {
          var _version = _this9.resolutions[_name];

          var _patterns = _this9.resolver.patternsByPackage[_name];
          if (!_patterns) {
            continue;
          }

          var manifest = void 0;
          for (var pattern of _patterns) {
            manifest = _this9.resolver.getResolvedPattern(pattern);
            if (manifest) {
              break;
            }
          }
          invariant(manifest, 'expected manifest');

          var ref = manifest._reference;
          invariant(ref, 'expected reference');

          var object = manifests[ref.registry].object;
          object.resolutions = object.resolutions || {};
          object.resolutions[_name] = _version;
        }

        yield _this9.config.saveRootManifests(manifests);
      }

      return flattenedPatterns;
    })();
  }

  /**
   * Remove offline tarballs that are no longer required
   */

  pruneOfflineMirror(lockfile) {
    var _this10 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var mirror = _this10.config.getOfflineMirrorPath();
      if (!mirror) {
        return;
      }

      var requiredTarballs = new Set();
      for (var dependency in lockfile) {
        var resolved = lockfile[dependency].resolved;
        if (resolved) {
          var basename = path.basename(resolved.split('#')[0]);
          if (dependency[0] === '@' && basename[0] !== '@') {
            requiredTarballs.add(`${dependency.split('/')[0]}-${basename}`);
          }
          requiredTarballs.add(basename);
        }
      }

      var mirrorFiles = yield fs.walk(mirror);
      for (var file of mirrorFiles) {
        var isTarball = path.extname(file.basename) === '.tgz';
        // if using experimental-pack-script-packages-in-mirror flag, don't unlink prebuilt packages
        var hasPrebuiltPackage = file.relative.startsWith('prebuilt/');
        if (isTarball && !hasPrebuiltPackage && !requiredTarballs.has(file.basename)) {
          yield fs.unlink(file.absolute);
        }
      }
    })();
  }

  /**
   * Save updated integrity and lockfiles.
   */

  saveLockfileAndIntegrity(patterns, workspaceLayout) {
    var _this11 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var resolvedPatterns = {};
      Object.keys(_this11.resolver.patterns).forEach(pattern => {
        if (!workspaceLayout || !workspaceLayout.getManifestByPattern(pattern)) {
          resolvedPatterns[pattern] = _this11.resolver.patterns[pattern];
        }
      });

      // TODO this code is duplicated in a few places, need a common way to filter out workspace patterns from lockfile
      patterns = patterns.filter(p => !workspaceLayout || !workspaceLayout.getManifestByPattern(p));

      var lockfileBasedOnResolver = _this11.lockfile.getLockfile(resolvedPatterns);

      if (_this11.config.pruneOfflineMirror) {
        yield _this11.pruneOfflineMirror(lockfileBasedOnResolver);
      }

      // write integrity hash
      if (!_this11.config.plugnplayEnabled) {
        yield _this11.integrityChecker.save(
          patterns,
          lockfileBasedOnResolver,
          _this11.flags,
          workspaceLayout,
          _this11.scripts.getArtifacts()
        );
      }

      // --no-lockfile or --pure-lockfile or --frozen-lockfile
      if (_this11.flags.lockfile === false || _this11.flags.pureLockfile || _this11.flags.frozenLockfile) {
        return;
      }

      var lockFileHasAllPatterns = patterns.every(p => _this11.lockfile.getLocked(p));
      var lockfilePatternsMatch = Object.keys(_this11.lockfile.cache || {}).every(p => lockfileBasedOnResolver[p]);
      var resolverPatternsAreSameAsInLockfile = Object.keys(lockfileBasedOnResolver).every(pattern => {
        var manifest = _this11.lockfile.getLocked(pattern);
        return (
          manifest &&
          manifest.resolved === lockfileBasedOnResolver[pattern].resolved &&
          deepEqual(manifest.prebuiltVariants, lockfileBasedOnResolver[pattern].prebuiltVariants)
        );
      });
      var integrityPatternsAreSameAsInLockfile = Object.keys(lockfileBasedOnResolver).every(pattern => {
        var existingIntegrityInfo = lockfileBasedOnResolver[pattern].integrity;
        if (!existingIntegrityInfo) {
          // if this entry does not have an integrity, no need to re-write the lockfile because of it
          return true;
        }
        var manifest = _this11.lockfile.getLocked(pattern);
        if (manifest && manifest.integrity) {
          var manifestIntegrity = ssri.stringify(manifest.integrity);
          return manifestIntegrity === existingIntegrityInfo;
        }
        return false;
      });

      // remove command is followed by install with force, lockfile will be rewritten in any case then
      if (
        !_this11.flags.force &&
        _this11.lockfile.parseResultType === 'success' &&
        lockFileHasAllPatterns &&
        lockfilePatternsMatch &&
        resolverPatternsAreSameAsInLockfile &&
        integrityPatternsAreSameAsInLockfile &&
        patterns.length
      ) {
        return;
      }

      // build lockfile location
      var loc = path.join(_this11.config.lockfileFolder, constants.LOCKFILE_FILENAME);

      // write lockfile
      var lockSource = (0, _lockfile.stringify)(lockfileBasedOnResolver, false, _this11.config.enableLockfileVersions);
      yield fs.writeFilePreservingEol(loc, lockSource);

      _this11._logSuccessSaveLockfile();
    })();
  }

  _logSuccessSaveLockfile() {
    this.reporter.success(this.reporter.lang('savedLockfile'));
  }

  /**
   * Load the dependency graph of the current install. Only does package resolving and wont write to the cwd.
   */
  hydrate(ignoreUnusedPatterns) {
    var _this12 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var request = yield _this12.fetchRequestFromCwd([], ignoreUnusedPatterns);
      var depRequests = request.requests, rawPatterns = request.patterns, ignorePatterns = request.ignorePatterns, workspaceLayout = request.workspaceLayout;

      yield _this12.resolver.init(depRequests, {
        isFlat: _this12.flags.flat,
        isFrozen: _this12.flags.frozenLockfile,
        workspaceLayout,
      });
      yield _this12.flatten(rawPatterns);
      _this12.markIgnored(ignorePatterns);

      // fetch packages, should hit cache most of the time
      var manifests = yield fetcher.fetch(_this12.resolver.getManifests(), _this12.config);
      _this12.resolver.updateManifests(manifests);
      yield compatibility.check(_this12.resolver.getManifests(), _this12.config, _this12.flags.ignoreEngines);

      // expand minimal manifests
      for (var manifest of _this12.resolver.getManifests()) {
        var ref = manifest._reference;
        invariant(ref, 'expected reference');
        var type = ref.remote.type;
        // link specifier won't ever hit cache
        var loc = '';
        if (type === 'link') {
          continue;
        } else if (type === 'workspace') {
          if (!ref.remote.reference) {
            continue;
          }
          loc = ref.remote.reference;
        } else {
          loc = _this12.config.generateModuleCachePath(ref);
        }
        var newPkg = yield _this12.config.readManifest(loc);
        yield _this12.resolver.updateManifest(ref, newPkg);
      }

      return request;
    })();
  }

  /**
   * Check for updates every day and output a nag message if there's a newer version.
   */

  checkUpdate() {
    if (this.config.nonInteractive) {
      // don't show upgrade dialog on CI or non-TTY terminals
      return;
    }

    // don't check if disabled
    if (this.config.getOption('disable-self-update-check')) {
      return;
    }

    // only check for updates once a day
    var lastUpdateCheck = Number(this.config.getOption('lastUpdateCheck')) || 0;
    if (lastUpdateCheck && Date.now() - lastUpdateCheck < ONE_DAY) {
      return;
    }

    // don't bug for updates on tagged releases
    if (_yarnVersion.version.indexOf('-') >= 0) {
      return;
    }

    this._checkUpdate().catch(() => {
      // swallow errors
    });
  }

  _checkUpdate() {
    var _this13 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var latestVersion = yield _this13.config.requestManager.request({
        url: constants.SELF_UPDATE_VERSION_URL,
      });
      invariant(typeof latestVersion === 'string', 'expected string');
      latestVersion = latestVersion.trim();
      if (!semver.valid(latestVersion)) {
        return;
      }

      // ensure we only check for updates periodically
      _this13.config.registries.yarn.saveHomeConfig({
        lastUpdateCheck: Date.now(),
      });

      if (semver.gt(latestVersion, _yarnVersion.version)) {
        var installationMethod = yield (0, _yarnVersion.getInstallationMethod)();
        _this13.maybeOutputUpdate = () => {
          _this13.reporter.warn(_this13.reporter.lang('yarnOutdated', latestVersion, _yarnVersion.version));

          var command = getUpdateCommand(installationMethod);
          if (command) {
            _this13.reporter.info(_this13.reporter.lang('yarnOutdatedCommand'));
            _this13.reporter.command(command);
          } else {
            var installer = getUpdateInstaller(installationMethod);
            if (installer) {
              _this13.reporter.info(_this13.reporter.lang('yarnOutdatedInstaller', installer));
            }
          }
        };
      }
    })();
  }

  /**
   * Method to override with a possible upgrade message.
   */

  maybeOutputUpdate() {}
}
exports.Install = Install;

function hasWrapper(commander, args) {
  return true;
}

function setFlags(commander) {
  commander.description('Yarn install is used to install all dependencies for a project.');
  commander.usage('install [flags]');
  commander.option('-A, --audit', 'Run vulnerability audit on installed packages');
  commander.option('-g, --global', 'DEPRECATED');
  commander.option('-S, --save', 'DEPRECATED - save package to your `dependencies`');
  commander.option('-D, --save-dev', 'DEPRECATED - save package to your `devDependencies`');
  commander.option('-P, --save-peer', 'DEPRECATED - save package to your `peerDependencies`');
  commander.option('-O, --save-optional', 'DEPRECATED - save package to your `optionalDependencies`');
  commander.option('-E, --save-exact', 'DEPRECATED');
  commander.option('-T, --save-tilde', 'DEPRECATED');
}

function install() {
  return _install.apply(this, arguments);
}
function _install() {
  _install = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, lockfile) {
    yield wrapLifecycle(config, flags, /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
      var install = new Install(flags, config, reporter, lockfile);
      yield install.init();
    }));
  });

  return _install.apply(this, arguments);
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var lockfile;
    var error = 'installCommandRenamed';
    if (flags.lockfile === false) {
      lockfile = new _lockfile.default();
    } else {
      lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder, reporter);
    }

    if (args.length) {
      var exampleArgs = args.slice();

      if (flags.saveDev) {
        exampleArgs.push('--dev');
      }
      if (flags.savePeer) {
        exampleArgs.push('--peer');
      }
      if (flags.saveOptional) {
        exampleArgs.push('--optional');
      }
      if (flags.saveExact) {
        exampleArgs.push('--exact');
      }
      if (flags.saveTilde) {
        exampleArgs.push('--tilde');
      }
      var command = 'add';
      if (flags.global) {
        error = 'globalFlagRemoved';
        command = 'global add';
      }
      throw new _errors.MessageError(reporter.lang(error, `yarn ${command} ${exampleArgs.join(' ')}`));
    }

    yield install(config, reporter, flags, lockfile);
  });

  return _run.apply(this, arguments);
}

function wrapLifecycle() {
  return _wrapLifecycle.apply(this, arguments);
}
function _wrapLifecycle() {
  _wrapLifecycle = (0, _asyncToGenerator2.default)(function* (config, flags, factory) {
    yield config.executeLifecycleScript('preinstall');

    yield factory();

    // npm behaviour, seems kinda funky but yay compatibility
    yield config.executeLifecycleScript('install');
    yield config.executeLifecycleScript('postinstall');

    if (!config.production) {
      if (!config.disablePrepublish) {
        yield config.executeLifecycleScript('prepublish');
      }
      yield config.executeLifecycleScript('prepare');
    }
  });

  return _wrapLifecycle.apply(this, arguments);
}
