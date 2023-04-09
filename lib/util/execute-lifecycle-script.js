'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = exports.IGNORE_MANIFEST_KEYS = void 0;
exports.execCommand = execCommand;
exports.execFromManifest = execFromManifest;
exports.executeLifecycleScript = executeLifecycleScript;
exports.getWrappersFolder = getWrappersFolder;
exports.makeEnv = makeEnv;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../errors.js');
var constants = _interopRequireWildcard(require('../constants.js'));
var child = _interopRequireWildcard(require('./child.js'));
var fs = _interopRequireWildcard(require('./fs.js'));
var _dynamicRequire = require('./dynamic-require.js');
var _portableScript = require('./portable-script.js');
var _fixCmdWinSlashes = require('./fix-cmd-win-slashes.js');
var _global2;
function _global() {
  return _global2 || (_global2 = require('../cli/commands/global.js'));
}

var path = require('path');

var IGNORE_MANIFEST_KEYS = new Set([
  'readme',
  'notice',
  'licenseText',
  'activationEvents',
  'contributes',
]);
exports.IGNORE_MANIFEST_KEYS = IGNORE_MANIFEST_KEYS;

// We treat these configs as internal, thus not expose them to process.env.
// This helps us avoid some gyp issues when building native modules.
// See https://github.com/yarnpkg/yarn/issues/2286.
var IGNORE_CONFIG_KEYS = ['lastUpdateCheck'];

var wrappersFolder = null;

function getWrappersFolder() {
  return _getWrappersFolder.apply(this, arguments);
}
function _getWrappersFolder() {
  _getWrappersFolder = (0, _asyncToGenerator2.default)(function* (config) {
    if (wrappersFolder) {
      return wrappersFolder;
    }

    wrappersFolder = yield fs.makeTempDir();

    yield (0, _portableScript.makePortableProxyScript)(process.execPath, wrappersFolder, {
      proxyBasename: 'node',
    });

    yield (0, _portableScript.makePortableProxyScript)(process.execPath, wrappersFolder, {
      proxyBasename: 'yarn',
      prependArguments: [process.argv[1]],
    });

    return wrappersFolder;
  });

  return _getWrappersFolder.apply(this, arguments);
}

var INVALID_CHAR_REGEX = /\W/g;

function makeEnv() {
  return _makeEnv.apply(this, arguments);
}
function _makeEnv() {
  _makeEnv = (0, _asyncToGenerator2.default)(function* (
    stage,
    cwd,
    config
  ) {
    var env = (0, _extends2.default)(
      {
        NODE: process.execPath,
        INIT_CWD: process.cwd(),
      },
      // This lets `process.env.NODE` to override our `process.execPath`.
      // This is a bit confusing but it is how `npm` was designed so we
      // try to be compatible with that.
      process.env
    );

    // Merge in the `env` object specified in .yarnrc
    var customEnv = config.getOption('env');
    if (customEnv && typeof customEnv === 'object') {
      Object.assign(env, customEnv);
    }

    env.npm_lifecycle_event = stage;
    env.npm_node_execpath = env.NODE;
    env.npm_execpath = env.npm_execpath || (process.mainModule && process.mainModule.filename);

    // Set the env to production for npm compat if production mode.
    // https://github.com/npm/npm/blob/30d75e738b9cb7a6a3f9b50e971adcbe63458ed3/lib/utils/lifecycle.js#L336
    if (config.production) {
      env.NODE_ENV = 'production';
    }

    // Note: npm_config_argv environment variable contains output of nopt - command-line
    // parser used by npm. Since we use other parser, we just roughly emulate it's output. (See: #684)
    env.npm_config_argv = JSON.stringify({
      remain: [],
      cooked: config.commandName === 'run' ? [config.commandName, stage] : [config.commandName],
      original: process.argv.slice(2),
    });

    var manifest = yield config.maybeReadManifest(cwd);
    if (manifest) {
      if (manifest.scripts && Object.prototype.hasOwnProperty.call(manifest.scripts, stage)) {
        env.npm_lifecycle_script = manifest.scripts[stage];
      }

      // add npm_package_*
      var queue = [['', manifest]];
      while (queue.length) {
        var _queue$pop = queue.pop(), key = _queue$pop[0], val = _queue$pop[1];
        if (typeof val === 'object') {
          for (var subKey in val) {
            var fullKey = [key, subKey].filter(Boolean).join('_');
            if (fullKey && fullKey[0] !== '_' && !IGNORE_MANIFEST_KEYS.has(fullKey)) {
              queue.push([fullKey, val[subKey]]);
            }
          }
        } else {
          var cleanVal = String(val);
          if (cleanVal.indexOf('\n') >= 0) {
            cleanVal = JSON.stringify(cleanVal);
          }

          //replacing invalid chars with underscore
          var cleanKey = key.replace(INVALID_CHAR_REGEX, '_');

          env[`npm_package_${cleanKey}`] = cleanVal;
        }
      }
    }

    // add npm_config_* and npm_package_config_* from yarn config
    var keys = new Set([].concat(
      Object.keys(config.registries.yarn.config),
      Object.keys(config.registries.npm.config)
    ));

    var cleaned = Array.from(keys)
      .filter(key => !key.match(/:_/) && IGNORE_CONFIG_KEYS.indexOf(key) === -1)
      .map(key => {
        var val = config.getOption(key);
        if (!val) {
          val = '';
        } else if (typeof val === 'number') {
          val = '' + val;
        } else if (typeof val !== 'string') {
          val = JSON.stringify(val);
        }

        if (val.indexOf('\n') >= 0) {
          val = JSON.stringify(val);
        }
        return [key, val];
      });
    // add npm_config_*
    for (var _ref3 of cleaned) {
      var _key = _ref3[0], _val = _ref3[1];
      var _cleanKey = _key.replace(/^_+/, '');
      var envKey = `npm_config_${_cleanKey}`.replace(INVALID_CHAR_REGEX, '_');
      env[envKey] = _val;
    }
    // add npm_package_config_*
    if (manifest && manifest.name) {
      var packageConfigPrefix = `${manifest.name}:`;
      for (var _ref4 of cleaned) {
        var _key2 = _ref4[0], _val2 = _ref4[1];
        if (_key2.indexOf(packageConfigPrefix) !== 0) {
          continue;
        }
        var _cleanKey2 = _key2.replace(/^_+/, '').replace(packageConfigPrefix, '');
        var _envKey = `npm_package_config_${_cleanKey2}`.replace(INVALID_CHAR_REGEX, '_');
        env[_envKey] = _val2;
      }
    }

    // split up the path
    var envPath = env[constants.ENV_PATH_KEY];
    var pathParts = envPath ? envPath.split(path.delimiter) : [];

    // Include node-gyp version that was bundled with the current Node.js version,
    // if available.
    pathParts.unshift(path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'node-gyp-bin'));
    pathParts.unshift(
      path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'node-gyp-bin')
    );
    // Include node-gyp version from homebrew managed npm, if available.
    pathParts.unshift(
      path.join(path.dirname(process.execPath), '..', 'libexec', 'lib', 'node_modules', 'npm', 'bin', 'node-gyp-bin')
    );

    // Add global bin folder if it is not present already, as some packages depend
    // on a globally-installed version of node-gyp.
    var globalBin = yield (0, _global().getBinFolder)(config, {});
    if (pathParts.indexOf(globalBin) === -1) {
      pathParts.unshift(globalBin);
    }

    // Add node_modules .bin folders to the PATH
    for (var registryFolder of config.registryFolders) {
      var binFolder = path.join(registryFolder, '.bin');
      if (config.workspacesEnabled && config.workspaceRootFolder) {
        pathParts.unshift(path.join(config.workspaceRootFolder, binFolder));
      }
      pathParts.unshift(path.join(config.linkFolder, binFolder));
      pathParts.unshift(path.join(cwd, binFolder));
    }

    var pnpFile;

    if (process.versions.pnp) {
      pnpFile = _dynamicRequire.dynamicRequire.resolve('pnpapi');
    } else {
      var candidate = `${config.lockfileFolder}/${constants.PNP_FILENAME}`;
      if (yield fs.exists(candidate)) {
        pnpFile = candidate;
      }
    }

    if (pnpFile) {
      var pnpApi = (0, _dynamicRequire.dynamicRequire)(pnpFile);

      var packageLocator = pnpApi.findPackageLocator(`${cwd}/`);
      var packageInformation = pnpApi.getPackageInformation(packageLocator);

      for (var _ref5 of packageInformation.packageDependencies.entries()) {
        var name = _ref5[0], reference = _ref5[1];
        var dependencyInformation = pnpApi.getPackageInformation({name, reference});

        if (!dependencyInformation || !dependencyInformation.packageLocation) {
          continue;
        }

        var _binFolder = `${dependencyInformation.packageLocation}/.bin`;
        if (yield fs.exists(_binFolder)) {
          pathParts.unshift(_binFolder);
        }
      }

      // Note that NODE_OPTIONS doesn't support any style of quoting its arguments at the moment
      // For this reason, it won't work if the user has a space inside its $PATH
      env.NODE_OPTIONS = env.NODE_OPTIONS || '';
      env.NODE_OPTIONS = `--require ${pnpFile} ${env.NODE_OPTIONS}`;
    }

    if (!config.disableWrappersFolder) {
      pathParts.unshift(yield getWrappersFolder(config));
    }

    // join path back together
    env[constants.ENV_PATH_KEY] = pathParts.join(path.delimiter);

    return env;
  });

  return _makeEnv.apply(this, arguments);
}

function executeLifecycleScript() {
  return _executeLifecycleScript.apply(this, arguments);
}
function _executeLifecycleScript() {
  _executeLifecycleScript = (0, _asyncToGenerator2.default)(function* (_ref) {
    var stage = _ref.stage,
      config = _ref.config,
      cwd = _ref.cwd,
      cmd = _ref.cmd,
      isInteractive = _ref.isInteractive,
      onProgress = _ref.onProgress,
      customShell = _ref.customShell;
    var env = yield makeEnv(stage, cwd, config);

    yield checkForGypIfNeeded(config, cmd, env[constants.ENV_PATH_KEY].split(path.delimiter));

    if (process.platform === 'win32' && (!customShell || customShell === 'cmd')) {
      // handle windows run scripts starting with a relative path
      cmd = (0, _fixCmdWinSlashes.fixCmdWinSlashes)(cmd);
    }

    // By default (non-interactive), pipe everything to the terminal and run child process detached
    // as long as it's not Windows (since windows does not have /dev/tty)
    var stdio = ['ignore', 'pipe', 'pipe'];
    var detached = process.platform !== 'win32';

    if (isInteractive) {
      stdio = 'inherit';
      detached = false;
    }

    var shell = customShell || true;
    var stdout = yield child.spawn(cmd, [], {cwd, env, stdio, detached, shell}, onProgress);

    return {cwd, command: cmd, stdout};
  });

  return _executeLifecycleScript.apply(this, arguments);
}

exports.default = executeLifecycleScript;

var checkGypPromise = null;
/**
 * Special case: Some packages depend on node-gyp, but don't specify this in
 * their package.json dependencies. They assume that node-gyp is available
 * globally. We need to detect this case and show an error message.
 */
function checkForGypIfNeeded(config, cmd, paths) {
  if (cmd.substr(0, cmd.indexOf(' ')) !== 'node-gyp') {
    return Promise.resolve();
  }

  // Ensure this only runs once, rather than multiple times in parallel.
  if (!checkGypPromise) {
    checkGypPromise = _checkForGyp(config, paths);
  }
  return checkGypPromise;
}

function _checkForGyp() {
  return _checkForGyp2.apply(this, arguments);
}
function _checkForGyp2() {
  _checkForGyp2 = (0, _asyncToGenerator2.default)(function* (config, paths) {
    var reporter = config.reporter;

    // Check every directory in the PATH
    var allChecks = yield Promise.all(paths.map(dir => fs.exists(path.join(dir, 'node-gyp'))));
    if (allChecks.some(Boolean)) {
      // node-gyp is available somewhere
      return;
    }

    reporter.info(reporter.lang('packageRequiresNodeGyp'));

    try {
      yield (0, _global().run)(config, reporter, {}, ['add', 'node-gyp']);
    } catch (e) {
      throw new _errors.MessageError(reporter.lang('nodeGypAutoInstallFailed', e.message));
    }
  });

  return _checkForGyp2.apply(this, arguments);
}

function execFromManifest() {
  return _execFromManifest.apply(this, arguments);
}
function _execFromManifest() {
  _execFromManifest = (0, _asyncToGenerator2.default)(function* (config, commandName, cwd) {
    var pkg = yield config.maybeReadManifest(cwd);
    if (!pkg || !pkg.scripts) {
      return;
    }

    var cmd = pkg.scripts[commandName];
    if (cmd) {
      yield execCommand({stage: commandName, config, cmd, cwd, isInteractive: true});
    }
  });

  return _execFromManifest.apply(this, arguments);
}

function execCommand() {
  return _execCommand.apply(this, arguments);
}
function _execCommand() {
  _execCommand = (0, _asyncToGenerator2.default)(function* (_ref2) {
    var stage = _ref2.stage,
      config = _ref2.config,
      cmd = _ref2.cmd,
      cwd = _ref2.cwd,
      isInteractive = _ref2.isInteractive,
      customShell = _ref2.customShell;
    var reporter = config.reporter;
    try {
      reporter.command(cmd);
      yield executeLifecycleScript({stage, config, cwd, cmd, isInteractive, customShell});
      return Promise.resolve();
    } catch (err) {
      if (err instanceof _errors.ProcessTermError) {
        var formattedError = new _errors.ProcessTermError(
          err.EXIT_SIGNAL
            ? reporter.lang('commandFailedWithSignal', err.EXIT_SIGNAL)
            : reporter.lang('commandFailedWithCode', err.EXIT_CODE)
        );
        formattedError.EXIT_CODE = err.EXIT_CODE;
        formattedError.EXIT_SIGNAL = err.EXIT_SIGNAL;
        throw formattedError;
      } else {
        throw err;
      }
    }
  });

  return _execCommand.apply(this, arguments);
}
