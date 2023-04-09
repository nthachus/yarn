'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
exports.extractWorkspaces = extractWorkspaces;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _executeLifecycleScript = require('./util/execute-lifecycle-script.js');
var _path = require('./util/path.js');
var _conversion = require('./util/conversion.js');
var _index = _interopRequireDefault(require('./util/normalize-manifest/index.js'));
var _errors = require('./errors.js');
var fs = _interopRequireWildcard(require('./util/fs.js'));
var constants = _interopRequireWildcard(require('./constants.js'));
var _packageConstraintResolver = _interopRequireDefault(require('./package-constraint-resolver.js'));
var _requestManager = _interopRequireDefault(require('./util/request-manager.js'));
var _index2 = require('./registries/index.js');
var _index3 = require('./reporters/index.js');
var _map = _interopRequireDefault(require('./util/map.js'));

var crypto = require('crypto');
var detectIndent = require('detect-indent');
var invariant = require('invariant');
var path = require('path');
var micromatch = require('micromatch');
var isCi = require('is-ci');

function sortObject(object) {
  var sortedObject = {};
  Object.keys(object).sort().forEach(item => {
    sortedObject[item] = object[item];
  });
  return sortedObject;
}

class Config {
  constructor(reporter) {
    this.enableDefaultRc = void 0;
    this.extraneousYarnrcFiles = void 0;
    //
    this.looseSemver = void 0;
    this.offline = void 0;
    this.preferOffline = void 0;
    this.pruneOfflineMirror = void 0;
    this.enableMetaFolder = void 0;
    this.enableLockfileVersions = void 0;
    this.linkFileDependencies = void 0;
    this.ignorePlatform = void 0;
    this.binLinks = void 0;
    this.updateChecksums = void 0;
    // cache packages in offline mirror folder as new .tgz files
    this.packBuiltPackages = void 0;
    this.linkedModules = void 0;
    this.linkFolder = void 0;
    this.globalFolder = void 0;
    this.networkConcurrency = void 0;
    this.childConcurrency = void 0;
    this.networkTimeout = void 0;
    this.modulesFolder = void 0;
    this._cacheRootFolder = void 0;
    this.cacheFolder = void 0;
    this.tempFolder = void 0;
    // Whether we should ignore executing lifecycle scripts
    this.ignoreScripts = void 0;
    this.production = void 0;
    this.disablePrepublish = void 0;
    this.nonInteractive = void 0;
    this.plugnplayPersist = void 0;
    this.plugnplayEnabled = void 0;
    this.plugnplayShebang = void 0;
    this.plugnplayBlacklist = void 0;
    this.plugnplayUnplugged = void 0;
    this.plugnplayPurgeUnpluggedPackages = void 0;
    this.workspacesEnabled = void 0;
    this.workspacesNohoistEnabled = void 0;
    this.offlineCacheFolder = void 0;
    this.cwd = void 0;
    this.workspaceRootFolder = void 0;
    this.lockfileFolder = void 0;
    this.registries = void 0;
    this.registryFolders = void 0;
    this.cache = void 0;
    this.commandName = void 0;
    this.focus = void 0;
    this.focusedWorkspaceName = void 0;
    this.autoAddIntegrity = void 0;
    this.otp = void 0;
    this.packageDateLimit = void 0;
    this.disableWrappersFolder = void 0;

    this.constraintResolver = new _packageConstraintResolver.default(this, reporter);
    this.requestManager = new _requestManager.default(reporter);
    this.reporter = reporter;
    this._init({});
  }

  /**
   * Execute a promise produced by factory if it doesn't exist in our cache with
   * the associated key.
   */

  getCache(key, factory) {
    var cached = this.cache[key];
    if (cached) {
      return cached;
    }

    return (this.cache[key] = factory().catch((err) => {
      this.cache[key] = null;
      throw err;
    }));
  }

  /**
   * Get a config option from our yarn config.
   */

  getOption(key, resolve) {
    if (resolve === void 0) resolve = false;
    var value = this.registries.yarn.getOption(key);

    if (resolve && typeof value === 'string' && value.length) {
      return (0, _path.resolveWithHome)(value);
    }

    return value;
  }

  /**
   * Reduce a list of versions to a single one based on an input range.
   */

  resolveConstraints(versions, range) {
    return this.constraintResolver.reduce(versions, range);
  }

  /**
   * Initialise config. Fetch registry options, find package roots.
   */

  init(opts) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (opts === void 0) opts = {};
      _this._init(opts);

      _this.workspaceRootFolder = yield _this.findWorkspaceRoot(_this.cwd);
      _this.lockfileFolder = _this.workspaceRootFolder || _this.cwd;

      // using focus in a workspace root is not allowed
      if (_this.focus && (!_this.workspaceRootFolder || _this.cwd === _this.workspaceRootFolder)) {
        throw new _errors.MessageError(_this.reporter.lang('workspacesFocusRootCheck'));
      }

      if (_this.focus) {
        var focusedWorkspaceManifest = yield _this.readRootManifest();
        _this.focusedWorkspaceName = focusedWorkspaceManifest.name;
      }

      _this.linkedModules = [];

      var linkedModules;
      try {
        linkedModules = yield fs.readdir(_this.linkFolder);
      } catch (err) {
        if (err.code === 'ENOENT') {
          linkedModules = [];
        } else {
          throw err;
        }
      }

      var _loop = function* (dir) {
        var linkedPath = path.join(_this.linkFolder, dir);

        if (dir[0] === '@') {
          var _this$linkedModules;
          // it's a scope, not a package
          var scopedLinked = yield fs.readdir(linkedPath);
          (_this$linkedModules = _this.linkedModules).push.apply(_this$linkedModules, scopedLinked.map(scopedDir => path.join(dir, scopedDir)));
        } else {
          _this.linkedModules.push(dir);
        }
      };
      for (var dir of linkedModules) {
        yield* _loop(dir);
      }

      for (var key of Object.keys(_index2.registries)) {
        var Registry = _index2.registries[key];

        var extraneousRcFiles = Registry === _index2.registries.yarn ? _this.extraneousYarnrcFiles : [];

        // instantiate registry
        var registry = new Registry(
          _this.cwd,
          _this.registries,
          _this.requestManager,
          _this.reporter,
          _this.enableDefaultRc,
          extraneousRcFiles
        );

        yield registry.init({
          registry: opts.registry,
        });

        _this.registries[key] = registry;
        if (_this.registryFolders.indexOf(registry.folder) === -1) {
          _this.registryFolders.push(registry.folder);
        }
      }

      if (_this.modulesFolder) {
        _this.registryFolders = [_this.modulesFolder];
      }

      _this.networkConcurrency =
        opts.networkConcurrency || Number(_this.getOption('network-concurrency')) || constants.NETWORK_CONCURRENCY;

      _this.childConcurrency =
        opts.childConcurrency ||
        Number(_this.getOption('child-concurrency')) ||
        Number(process.env.CHILD_CONCURRENCY) ||
        constants.CHILD_CONCURRENCY;

      _this.networkTimeout = opts.networkTimeout || Number(_this.getOption('network-timeout')) || constants.NETWORK_TIMEOUT;

      var httpProxy = opts.httpProxy || _this.getOption('proxy');
      var httpsProxy = opts.httpsProxy || _this.getOption('https-proxy');
      _this.requestManager.setOptions({
        userAgent: String(_this.getOption('user-agent')),
        httpProxy: httpProxy === false ? false : String(httpProxy || ''),
        httpsProxy: httpsProxy === false ? false : String(httpsProxy || ''),
        strictSSL: Boolean(_this.getOption('strict-ssl')),
        ca: Array.prototype.concat(opts.ca || _this.getOption('ca') || []).map(String),
        cafile: String(opts.cafile || _this.getOption('cafile', true) || ''),
        cert: String(opts.cert || _this.getOption('cert') || ''),
        key: String(opts.key || _this.getOption('key') || ''),
        networkConcurrency: _this.networkConcurrency,
        networkTimeout: _this.networkTimeout,
      });

      _this.packageDateLimit = opts.packageDateLimit || String(_this.getOption('package-date-limit') || '') || null;
      _this.disableWrappersFolder = Boolean(_this.getOption('disable-wrappers-folder'));

      _this.globalFolder = opts.globalFolder || String(_this.getOption('global-folder', true));
      if (_this.globalFolder === 'undefined') {
        _this.globalFolder = constants.GLOBAL_MODULE_DIRECTORY;
      }

      var cacheRootFolder = opts.cacheFolder || _this.getOption('cache-folder', true);

      if (!cacheRootFolder) {
        var preferredCacheFolders = constants.PREFERRED_MODULE_CACHE_DIRECTORIES;
        var preferredCacheFolder = opts.preferredCacheFolder || _this.getOption('preferred-cache-folder', true);

        if (preferredCacheFolder) {
          preferredCacheFolders = [String(preferredCacheFolder)].concat(preferredCacheFolders);
        }

        var cacheFolderQuery = yield fs.getFirstSuitableFolder(
          preferredCacheFolders,
          fs.constants.W_OK | fs.constants.X_OK | fs.constants.R_OK // eslint-disable-line no-bitwise
        );
        for (var skippedEntry of cacheFolderQuery.skipped) {
          _this.reporter.warn(_this.reporter.lang('cacheFolderSkipped', skippedEntry.folder));
        }

        cacheRootFolder = cacheFolderQuery.folder;
        if (cacheRootFolder && cacheFolderQuery.skipped.length > 0) {
          _this.reporter.warn(_this.reporter.lang('cacheFolderSelected', cacheRootFolder));
        }
      }

      if (!cacheRootFolder) {
        throw new _errors.MessageError(_this.reporter.lang('cacheFolderMissing'));
      } else {
        _this._cacheRootFolder = String(cacheRootFolder);
      }

      var manifest = yield _this.maybeReadManifest(_this.lockfileFolder);

      var plugnplayByEnv = _this.getOption('plugnplay-override');
      if (plugnplayByEnv != null) {
        _this.plugnplayEnabled = plugnplayByEnv !== 'false' && plugnplayByEnv !== '0';
        _this.plugnplayPersist = false;
      } else if (opts.enablePnp || opts.disablePnp) {
        _this.plugnplayEnabled = !!opts.enablePnp;
        _this.plugnplayPersist = true;
      } else if (manifest && manifest.installConfig && manifest.installConfig.pnp) {
        _this.plugnplayEnabled = !!manifest.installConfig.pnp;
        _this.plugnplayPersist = false;
      } else {
        _this.plugnplayEnabled = false;
        _this.plugnplayPersist = false;
      }

      if (process.platform === 'win32') {
        var cacheRootFolderDrive = path.parse(_this._cacheRootFolder).root.toLowerCase();
        var lockfileFolderDrive = path.parse(_this.lockfileFolder).root.toLowerCase();

        if (cacheRootFolderDrive !== lockfileFolderDrive) {
          if (_this.plugnplayEnabled) {
            _this.reporter.warn(_this.reporter.lang('plugnplayWindowsSupport'));
          }
          _this.plugnplayEnabled = false;
          _this.plugnplayPersist = false;
        }
      }

      _this.plugnplayShebang = String(_this.getOption('plugnplay-shebang') || '') || '/usr/bin/env node';
      _this.plugnplayBlacklist = String(_this.getOption('plugnplay-blacklist') || '') || null;

      _this.ignoreScripts = opts.ignoreScripts || Boolean(_this.getOption('ignore-scripts', false));

      _this.workspacesEnabled = _this.getOption('workspaces-experimental') !== false;
      _this.workspacesNohoistEnabled = _this.getOption('workspaces-nohoist-experimental') !== false;

      _this.offlineCacheFolder = String(_this.getOption('offline-cache-folder') || '') || null;

      _this.pruneOfflineMirror = Boolean(_this.getOption('yarn-offline-mirror-pruning'));
      _this.enableMetaFolder = Boolean(_this.getOption('enable-meta-folder'));
      _this.enableLockfileVersions = Boolean(_this.getOption('yarn-enable-lockfile-versions'));
      _this.linkFileDependencies = Boolean(_this.getOption('yarn-link-file-dependencies'));
      _this.packBuiltPackages = Boolean(_this.getOption('experimental-pack-script-packages-in-mirror'));

      _this.autoAddIntegrity = !(0, _conversion.boolifyWithDefault)(String(_this.getOption('unsafe-disable-integrity-migration')), true);

      //init & create cacheFolder, tempFolder
      _this.cacheFolder = path.join(_this._cacheRootFolder, 'v' + String(constants.CACHE_VERSION));
      _this.tempFolder = opts.tempFolder || path.join(_this.cacheFolder, '.tmp');
      yield fs.mkdirp(_this.cacheFolder);
      yield fs.mkdirp(_this.tempFolder);

      if (opts.production !== undefined) {
        _this.production = Boolean(opts.production);
      } else {
        _this.production =
          Boolean(_this.getOption('production')) ||
          (process.env.NODE_ENV === 'production' &&
            process.env.NPM_CONFIG_PRODUCTION !== 'false' &&
            process.env.YARN_PRODUCTION !== 'false');
      }

      if (_this.workspaceRootFolder && !_this.workspacesEnabled) {
        throw new _errors.MessageError(_this.reporter.lang('workspacesDisabled'));
      }
    })();
  }

  _init(opts) {
    this.registryFolders = [];
    this.linkedModules = [];

    this.registries = (0, _map.default)();
    this.cache = (0, _map.default)();

    // Ensure the cwd is always an absolute path.
    this.cwd = path.resolve(opts.cwd || this.cwd || process.cwd());

    this.looseSemver = opts.looseSemver == undefined ? true : opts.looseSemver;

    this.commandName = opts.commandName || '';

    this.enableDefaultRc = opts.enableDefaultRc !== false;
    this.extraneousYarnrcFiles = opts.extraneousYarnrcFiles || [];

    this.preferOffline = !!opts.preferOffline;
    this.modulesFolder = opts.modulesFolder;
    this.linkFolder = opts.linkFolder || constants.LINK_REGISTRY_DIRECTORY;
    this.offline = !!opts.offline;
    this.binLinks = !!opts.binLinks;
    this.updateChecksums = !!opts.updateChecksums;
    this.plugnplayUnplugged = [];
    this.plugnplayPurgeUnpluggedPackages = false;

    this.ignorePlatform = !!opts.ignorePlatform;
    this.ignoreScripts = !!opts.ignoreScripts;

    this.disablePrepublish = !!opts.disablePrepublish;

    // $FlowFixMe$
    this.nonInteractive = !!opts.nonInteractive || isCi || !process.stdout.isTTY;

    this.requestManager.setOptions({
      offline: !!opts.offline && !opts.preferOffline,
      captureHar: !!opts.captureHar,
    });

    this.focus = !!opts.focus;
    this.focusedWorkspaceName = '';

    this.otp = opts.otp || '';
  }

  /**
   * Generate a name suitable as unique filesystem identifier for the specified package.
   */

  generateUniquePackageSlug(pkg) {
    var slug = pkg.name;

    slug = slug.replace(/[^@a-z0-9]+/g, '-');
    slug = slug.replace(/^-+|-+$/g, '');

    if (pkg.registry) {
      slug = `${pkg.registry}-${slug}`;
    } else {
      slug = `unknown-${slug}`;
    }

    var hash = pkg.remote.hash;

    if (pkg.version) {
      slug += `-${pkg.version}`;
    }

    if (pkg.uid && pkg.version !== pkg.uid) {
      slug += `-${pkg.uid}`;
    } else if (hash) {
      slug += `-${hash}`;
    }

    if (pkg.remote.integrity) {
      slug += `-integrity`;
    }

    return slug;
  }

  /**
   * Generate an absolute module path.
   */

  generateModuleCachePath(pkg) {
    invariant(this.cacheFolder, 'No package root');
    invariant(pkg, 'Undefined package');

    var slug = this.generateUniquePackageSlug(pkg);
    return path.join(this.cacheFolder, slug, 'node_modules', pkg.name);
  }

  /**
   */

  getUnpluggedPath() {
    return path.join(this.lockfileFolder, '.pnp', 'unplugged');
  }

  /**
   */

  generatePackageUnpluggedPath(pkg) {
    var slug = this.generateUniquePackageSlug(pkg);
    return path.join(this.getUnpluggedPath(), slug, 'node_modules', pkg.name);
  }

  /**
   */

  listUnpluggedPackageFolders() {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var unpluggedPackages = new Map();
      var unpluggedPath = _this2.getUnpluggedPath();

      if (!(yield fs.exists(unpluggedPath))) {
        return unpluggedPackages;
      }

      for (var unpluggedName of yield fs.readdir(unpluggedPath)) {
        var nmListing = yield fs.readdir(path.join(unpluggedPath, unpluggedName, 'node_modules'));
        invariant(nmListing.length === 1, 'A single folder should be in the unplugged directory');

        var target = path.join(unpluggedPath, unpluggedName, `node_modules`, nmListing[0]);
        unpluggedPackages.set(unpluggedName, target);
      }

      return unpluggedPackages;
    })();
  }

  /**
   * Execute lifecycle scripts in the specified directory. Ignoring when the --ignore-scripts flag has been
   * passed.
   */

  executeLifecycleScript(commandName, cwd) {
    if (this.ignoreScripts) {
      return Promise.resolve();
    } else {
      return (0, _executeLifecycleScript.execFromManifest)(this, commandName, cwd || this.cwd);
    }
  }

  /**
   * Generate an absolute temporary filename location based on the input filename.
   */

  getTemp(filename) {
    invariant(this.tempFolder, 'No temp folder');
    return path.join(this.tempFolder, filename);
  }

  /**
   * Remote packages may be cached in a file system to be available for offline installation.
   * Second time the same package needs to be installed it will be loaded from there.
   * Given a package's filename, return a path in the offline mirror location.
   */

  getOfflineMirrorPath(packageFilename) {
    var mirrorPath;

    for (var key of ['npm', 'yarn']) {
      var registry = this.registries[key];

      if (registry == null) {
        continue;
      }

      var registryMirrorPath = registry.config['yarn-offline-mirror'];

      if (registryMirrorPath === false) {
        return null;
      }

      if (registryMirrorPath == null) {
        continue;
      }

      mirrorPath = registryMirrorPath;
    }

    if (mirrorPath == null) {
      return null;
    }

    if (packageFilename == null) {
      return mirrorPath;
    }

    return path.join(mirrorPath, path.basename(packageFilename));
  }

  /**
   * Checker whether the folder input is a valid module folder. We output a yarn metadata
   * file when we've successfully setup a folder so use this as a marker.
   */

  isValidModuleDest(dest) {
    return (0, _asyncToGenerator2.default)(function* () {
      if (!(yield fs.exists(dest))) {
        return false;
      }

      if (!(yield fs.exists(path.join(dest, constants.METADATA_FILENAME)))) {
        return false;
      }

      return true;
    })();
  }

  /**
   * Read package metadata and normalized package info.
   */

  readPackageMetadata(dir) {
    var _this3 = this;
    return this.getCache(`metadata-${dir}`, /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
      var metadata = yield _this3.readJson(path.join(dir, constants.METADATA_FILENAME));
      var pkg = yield _this3.readManifest(dir, metadata.registry);

      return {
        package: pkg,
        artifacts: metadata.artifacts || [],
        hash: metadata.hash,
        remote: metadata.remote,
        registry: metadata.registry,
      };
    }));
  }

  /**
   * Read normalized package info according yarn-metadata.json
   * throw an error if package.json was not found
   */

  readManifest(dir, priorityRegistry, isRoot) {
    var _this4 = this;
    if (isRoot === void 0) isRoot = false;
    return this.getCache(`manifest-${dir}`, /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
      var manifest = yield _this4.maybeReadManifest(dir, priorityRegistry, isRoot);

      if (manifest) {
        return manifest;
      } else {
        throw new _errors.MessageError(_this4.reporter.lang('couldntFindPackagejson', dir), 'ENOENT');
      }
    }));
  }

  /**
   * try get the manifest file by looking
   * 1. manifest file in cache
   * 2. manifest file in registry
   */
  maybeReadManifest(dir, priorityRegistry, isRoot) {
    var _this5 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (isRoot === void 0) isRoot = false;
      var metadataLoc = path.join(dir, constants.METADATA_FILENAME);

      if (yield fs.exists(metadataLoc)) {
        var metadata = yield _this5.readJson(metadataLoc);

        if (!priorityRegistry) {
          priorityRegistry = metadata.priorityRegistry;
        }

        if (typeof metadata.manifest !== 'undefined') {
          return metadata.manifest;
        }
      }

      if (priorityRegistry) {
        var file = yield _this5.tryManifest(dir, priorityRegistry, isRoot);
        if (file) {
          return file;
        }
      }

      for (var registry of Object.keys(_index2.registries)) {
        if (priorityRegistry === registry) {
          continue;
        }

        var _file = yield _this5.tryManifest(dir, registry, isRoot);
        if (_file) {
          return _file;
        }
      }

      return null;
    })();
  }

  /**
   * Read the root manifest.
   */

  readRootManifest() {
    return this.readManifest(this.cwd, 'npm', true);
  }

  /**
   * Try and find package info with the input directory and registry.
   */

  tryManifest(dir, registry, isRoot) {
    var _this6 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var filename = _index2.registries[registry].filename;
      var loc = path.join(dir, filename);
      if (yield fs.exists(loc)) {
        var data = yield _this6.readJson(loc);
        data._registry = registry;
        data._loc = loc;
        return (0, _index.default)(data, dir, _this6, isRoot);
      } else {
        return null;
      }
    })();
  }

  findManifest(dir, isRoot) {
    var _this7 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      for (var registry of _index2.registryNames) {
        var manifest = yield _this7.tryManifest(dir, registry, isRoot);

        if (manifest) {
          return manifest;
        }
      }

      return null;
    })();
  }

  findWorkspaceRoot(initial) {
    var _this8 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var previous = null;
      var current = path.normalize(initial);
      if (!(yield fs.exists(current))) {
        throw new _errors.MessageError(_this8.reporter.lang('folderMissing', current));
      }

      do {
        var manifest = yield _this8.findManifest(current, true);
        var ws = extractWorkspaces(manifest);
        if (ws && ws.packages) {
          var relativePath = path.relative(current, initial);
          if (relativePath === '' || micromatch([relativePath], ws.packages).length > 0) {
            return current;
          } else {
            return null;
          }
        }

        previous = current;
        current = path.dirname(current);
      } while (current !== previous);

      return null;
    })();
  }

  resolveWorkspaces(root, rootManifest) {
    var _this9 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var workspaces = {};
      if (!_this9.workspacesEnabled) {
        return workspaces;
      }

      var ws = _this9.getWorkspaces(rootManifest, true);
      var patterns = ws && ws.packages ? ws.packages : [];

      if (!Array.isArray(patterns)) {
        throw new _errors.MessageError(_this9.reporter.lang('workspacesSettingMustBeArray'));
      }

      var registryFilenames = _index2.registryNames
        .map(registryName => _this9.registries[registryName].constructor.filename)
        .join('|');
      var trailingPattern = `/+(${registryFilenames})`;
      // anything under folder (node_modules) should be ignored, thus use the '**' instead of shallow match "*"
      var ignorePatterns = _this9.registryFolders.map(folder => `/${folder}/**/+(${registryFilenames})`);

      var files = yield Promise.all(
        patterns.map(pattern =>
          fs.glob(pattern.replace(/\/?$/, trailingPattern), {
            cwd: root,
            ignore: ignorePatterns.map(ignorePattern => pattern.replace(/\/?$/, ignorePattern)),
          })
        )
      );

      for (var file of new Set(Array.prototype.concat.apply([], files))) {
        var loc = path.join(root, path.dirname(file));
        var manifest = yield _this9.findManifest(loc, false);

        if (!manifest) {
          continue;
        }

        if (!manifest.name) {
          _this9.reporter.warn(_this9.reporter.lang('workspaceNameMandatory', loc));
          continue;
        }
        if (!manifest.version) {
          _this9.reporter.warn(_this9.reporter.lang('workspaceVersionMandatory', loc));
          continue;
        }

        if (Object.prototype.hasOwnProperty.call(workspaces, manifest.name)) {
          throw new _errors.MessageError(_this9.reporter.lang('workspaceNameDuplicate', manifest.name));
        }

        workspaces[manifest.name] = {loc, manifest};
      }

      return workspaces;
    })();
  }

  // workspaces functions
  getWorkspaces(manifest, shouldThrow) {
    if (shouldThrow === void 0) shouldThrow = false;
    if (!manifest || !this.workspacesEnabled) {
      return undefined;
    }

    var ws = extractWorkspaces(manifest);

    if (!ws) {
      return ws;
    }

    // validate eligibility
    var wsCopy = (0, _extends2.default)({}, ws);
    var warnings = [];
    var errors = [];

    // packages
    if (wsCopy.packages && wsCopy.packages.length > 0 && !manifest.private) {
      errors.push(this.reporter.lang('workspacesRequirePrivateProjects'));
      wsCopy = undefined;
    }
    // nohoist
    if (wsCopy && wsCopy.nohoist && wsCopy.nohoist.length > 0) {
      if (!this.workspacesNohoistEnabled) {
        warnings.push(this.reporter.lang('workspacesNohoistDisabled', manifest.name));
        wsCopy.nohoist = undefined;
      } else if (!manifest.private) {
        errors.push(this.reporter.lang('workspacesNohoistRequirePrivatePackages', manifest.name));
        wsCopy.nohoist = undefined;
      }
    }

    if (errors.length > 0 && shouldThrow) {
      throw new _errors.MessageError(errors.join('\n'));
    }

    var msg = errors.concat(warnings).join('\n');
    if (msg.length > 0) {
      this.reporter.warn(msg);
    }

    return wsCopy;
  }

  /**
   * Description
   */

  getFolder(pkg) {
    var registryName = pkg._registry;
    if (!registryName) {
      var ref = pkg._reference;
      invariant(ref, 'expected reference');
      registryName = ref.registry;
    }
    return this.registries[registryName].folder;
  }

  /**
   * Get root manifests.
   */

  getRootManifests() {
    var _this10 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var manifests = {};
      for (var registryName of _index2.registryNames) {
        var registry = _index2.registries[registryName];
        var jsonLoc = path.join(_this10.cwd, registry.filename);

        var object = {};
        var exists = false;
        var indent = void 0;
        if (yield fs.exists(jsonLoc)) {
          exists = true;

          var info = yield _this10.readJson(jsonLoc, fs.readJsonAndFile);
          object = info.object;
          indent = detectIndent(info.content).indent || undefined;
        }
        manifests[registryName] = {loc: jsonLoc, object, exists, indent};
      }
      return manifests;
    })();
  }

  /**
   * Save root manifests.
   */

  saveRootManifests(manifests) {
    return (0, _asyncToGenerator2.default)(function* () {
      for (var registryName of _index2.registryNames) {
        var _manifests$registryNa = manifests[registryName], loc = _manifests$registryNa.loc, object = _manifests$registryNa.object, exists = _manifests$registryNa.exists, indent = _manifests$registryNa.indent;
        if (!exists && !Object.keys(object).length) {
          continue;
        }

        for (var field of constants.DEPENDENCY_TYPES) {
          if (object[field]) {
            object[field] = sortObject(object[field]);
          }
        }

        yield fs.writeFilePreservingEol(loc, JSON.stringify(object, null, indent || constants.DEFAULT_INDENT) + '\n');
      }
    })();
  }

  /**
   * Call the passed factory (defaults to fs.readJson) and rethrow a pretty error message if it was the result
   * of a syntax error.
   */

  readJson(loc, factory) {
    if (factory === void 0) factory = fs.readJson;
    try {
      return factory(loc);
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new _errors.MessageError(this.reporter.lang('jsonError', loc, err.message));
      } else {
        throw err;
      }
    }
  }

  static create(opts, reporter) {
    return (0, _asyncToGenerator2.default)(function* () {
      if (opts === void 0) opts = {};
      if (reporter === void 0) reporter = new _index3.NoopReporter();
      var config = new Config(reporter);
      yield config.init(opts);
      return config;
    })();
  }
}
exports.default = Config;

function extractWorkspaces(manifest) {
  if (!manifest || !manifest.workspaces) {
    return undefined;
  }

  if (Array.isArray(manifest.workspaces)) {
    return {packages: manifest.workspaces};
  }

  if (
    (manifest.workspaces.packages && Array.isArray(manifest.workspaces.packages)) ||
    (manifest.workspaces.nohoist && Array.isArray(manifest.workspaces.nohoist))
  ) {
    return manifest.workspaces;
  }

  return undefined;
}
