'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.getBinFolder = getBinFolder;
exports.hasWrapper = hasWrapper;
exports.run = void 0;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var _index = require('../../registries/index.js');
var _baseReporter = _interopRequireDefault(require('../../reporters/base-reporter.js'));
var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));
var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _install = require('./install.js');
var _add = require('./add.js');
var _remove = require('./remove.js');
var _upgrade = require('./upgrade.js');
var _upgradeInteractive = require('./upgrade-interactive.js');
var _packageLinker = require('../../package-linker.js');
var _constants = require('../../constants.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));

class GlobalAdd extends _add.Add {
  constructor(args, flags, config, reporter, lockfile) {
    super(args, flags, config, reporter, lockfile);

    this.linker.setTopLevelBinLinking(false);
  }

  maybeOutputSaveTree() {
    for (var pattern of this.addedPatterns) {
      var manifest = this.resolver.getStrictResolvedPattern(pattern);
      ls(manifest, this.reporter, true);
    }
    return Promise.resolve();
  }

  _logSuccessSaveLockfile() {
    // noop
  }
}

var path = require('path');

function hasWrapper(flags, args) {
  return args[0] !== 'bin' && args[0] !== 'dir';
}

function updateCwd() {
  return _updateCwd.apply(this, arguments);
}
function _updateCwd() {
  _updateCwd = (0, _asyncToGenerator2.default)(function* (config) {
    yield fs.mkdirp(config.globalFolder);

    yield config.init({
      cwd: config.globalFolder,
      offline: config.offline,
      binLinks: true,
      globalFolder: config.globalFolder,
      cacheFolder: config._cacheRootFolder,
      linkFolder: config.linkFolder,
      enableDefaultRc: config.enableDefaultRc,
      extraneousYarnrcFiles: config.extraneousYarnrcFiles,
    });
  });

  return _updateCwd.apply(this, arguments);
}

function getBins() {
  return _getBins.apply(this, arguments);
}
function _getBins() {
  _getBins = (0, _asyncToGenerator2.default)(function* (config) {
    // build up list of registry folders to search for binaries
    var dirs = [];
    for (var registryName of Object.keys(_index.registries)) {
      var registry = config.registries[registryName];
      dirs.push(registry.loc);
    }

    // build up list of binary files
    var paths = new Set();
    for (var dir of dirs) {
      var binDir = path.join(dir, '.bin');
      if (!(yield fs.exists(binDir))) {
        continue;
      }

      for (var name of yield fs.readdir(binDir)) {
        paths.add(path.join(binDir, name));
      }
    }
    return paths;
  });

  return _getBins.apply(this, arguments);
}

function getGlobalPrefix() {
  return _getGlobalPrefix.apply(this, arguments);
}
function _getGlobalPrefix() {
  _getGlobalPrefix = (0, _asyncToGenerator2.default)(function* (config, flags) {
    if (flags.prefix) {
      return flags.prefix;
    } else if (config.getOption('prefix', true)) {
      return String(config.getOption('prefix', true));
    } else if (process.env.PREFIX) {
      return process.env.PREFIX;
    }

    var potentialPrefixFolders = [_constants.FALLBACK_GLOBAL_PREFIX];
    if (process.platform === 'win32') {
      // %LOCALAPPDATA%\Yarn --> C:\Users\Alice\AppData\Local\Yarn
      if (process.env.LOCALAPPDATA) {
        potentialPrefixFolders.unshift(path.join(process.env.LOCALAPPDATA, 'Yarn'));
      }
    } else {
      potentialPrefixFolders.unshift(_constants.POSIX_GLOBAL_PREFIX);
    }

    var binFolders = potentialPrefixFolders.map(prefix => path.join(prefix, 'bin'));
    var prefixFolderQueryResult = yield fs.getFirstSuitableFolder(binFolders);
    var prefix = prefixFolderQueryResult.folder && path.dirname(prefixFolderQueryResult.folder);

    if (!prefix) {
      config.reporter.warn(
        config.reporter.lang(
          'noGlobalFolder',
          prefixFolderQueryResult.skipped.map(item => path.dirname(item.folder)).join(', ')
        )
      );

      return _constants.FALLBACK_GLOBAL_PREFIX;
    }

    return prefix;
  });

  return _getGlobalPrefix.apply(this, arguments);
}

function getBinFolder() {
  return _getBinFolder.apply(this, arguments);
}
function _getBinFolder() {
  _getBinFolder = (0, _asyncToGenerator2.default)(function* (config, flags) {
    var prefix = yield getGlobalPrefix(config, flags);
    return path.resolve(prefix, 'bin');
  });

  return _getBinFolder.apply(this, arguments);
}

function initUpdateBins() {
  return _initUpdateBins.apply(this, arguments);
}
function _initUpdateBins() {
  _initUpdateBins = (0, _asyncToGenerator2.default)(function* (config, reporter, flags) {
    var beforeBins = yield getBins(config);
    var binFolder = yield getBinFolder(config, flags);

    function throwPermError(err, dest) {
      if (err.code === 'EACCES') {
        throw new _errors.MessageError(reporter.lang('noPermission', dest));
      } else {
        throw err;
      }
    }

    return /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
      try {
        yield fs.mkdirp(binFolder);
      } catch (err) {
        throwPermError(err, binFolder);
      }

      var afterBins = yield getBins(config);

      // remove old bins
      for (var src of beforeBins) {
        if (afterBins.has(src)) {
          // not old
          continue;
        }

        // remove old bin
        var dest = path.join(binFolder, path.basename(src));
        try {
          yield fs.unlink(dest);
        } catch (err) {
          throwPermError(err, dest);
        }
      }

      // add new bins
      for (var _src of afterBins) {
        // insert new bin
        var _dest = path.join(binFolder, path.basename(_src));
        try {
          yield fs.unlink(_dest);
          yield (0, _packageLinker.linkBin)(_src, _dest);
          if (process.platform === 'win32' && _dest.indexOf('.cmd') !== -1) {
            yield fs.rename(_dest + '.cmd', _dest);
          }
        } catch (err) {
          throwPermError(err, _dest);
        }
      }
    });
  });

  return _initUpdateBins.apply(this, arguments);
}

function ls(manifest, reporter, saved) {
  var bins = manifest.bin ? Object.keys(manifest.bin) : [];
  var human = `${manifest.name}@${manifest.version}`;
  if (bins.length) {
    if (saved) {
      reporter.success(reporter.lang('packageInstalledWithBinaries', human));
    } else {
      reporter.info(reporter.lang('packageHasBinaries', human));
    }
    reporter.list(`bins-${manifest.name}`, bins);
  } else if (saved) {
    reporter.warn(reporter.lang('packageHasNoBinaries', human));
  }
}

function list() {
  return _list.apply(this, arguments);
}
function _list() {
  _list = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    yield updateCwd(config);

    // install so we get hard file paths
    var lockfile = yield _lockfile.default.fromDirectory(config.cwd);
    var install = new _install.Install({}, config, new _baseReporter.default(), lockfile);
    var patterns = yield install.getFlattenedDeps();

    // dump global modules
    for (var pattern of patterns) {
      var manifest = install.resolver.getStrictResolvedPattern(pattern);
      ls(manifest, reporter, false);
    }
  });

  return _list.apply(this, arguments);
}

var _buildSubCommands = (0, _buildSubCommands2.default)('global', {
  add(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      yield updateCwd(config);

      var updateBins = yield initUpdateBins(config, reporter, flags);
      if (args.indexOf('yarn') !== -1) {
        reporter.warn(reporter.lang('packageContainsYarnAsGlobal'));
      }

      // install module
      var lockfile = yield _lockfile.default.fromDirectory(config.cwd);
      var install = new GlobalAdd(args, flags, config, reporter, lockfile);
      yield install.init();

      // link binaries
      yield updateBins();
    })();
  },

  bin(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      reporter.log(yield getBinFolder(config, flags), {force: true});
    })();
  },

  dir(config, reporter, flags, args) {
    reporter.log(config.globalFolder, {force: true});
    return Promise.resolve();
  },

  ls(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      reporter.warn(`\`yarn global ls\` is deprecated. Please use \`yarn global list\`.`);
      yield list(config, reporter, flags, args);
    })();
  },

  list(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      yield list(config, reporter, flags, args);
    })();
  },

  remove(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      yield updateCwd(config);

      var updateBins = yield initUpdateBins(config, reporter, flags);

      // remove module
      yield (0, _remove.run)(config, reporter, flags, args);

      // remove binaries
      yield updateBins();
    })();
  },

  upgrade(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      yield updateCwd(config);

      var updateBins = yield initUpdateBins(config, reporter, flags);

      // upgrade module
      yield (0, _upgrade.run)(config, reporter, flags, args);

      // update binaries
      yield updateBins();
    })();
  },

  upgradeInteractive(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      yield updateCwd(config);

      var updateBins = yield initUpdateBins(config, reporter, flags);

      // upgrade module
      yield (0, _upgradeInteractive.run)(config, reporter, flags, args);

      // update binaries
      yield updateBins();
    })();
  },
});
var _setFlags = _buildSubCommands.setFlags;

exports.run = _buildSubCommands.run;

function setFlags(commander) {
  _setFlags(commander);
  commander.description('Installs packages globally on your operating system.');
  commander.option('--prefix <prefix>', 'bin prefix to use to install binaries');
  commander.option('--latest', 'upgrade to the latest version of packages');
}
