'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.getBinEntries = getBinEntries;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _executeLifecycleScript = require('../../util/execute-lifecycle-script.js');
var _dynamicRequire = require('../../util/dynamic-require.js');
var _hooks = require('../../util/hooks.js');
var _errors = require('../../errors.js');
var _packageCompatibility = require('../../package-compatibility.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var constants = _interopRequireWildcard(require('../../constants.js'));

var invariant = require('invariant');
var leven = require('leven');
var path = require('path');
var _require = require('puka'), quoteForShell = _require.quoteForShell, sh = _require.sh, unquoted = _require.unquoted;

function toObject(input) {
  var output = Object.create(null);

  for (var _ref of input.entries()) {
    var key = _ref[0], val = _ref[1];
    output[key] = val;
  }

  return output;
}

function getBinEntries() {
  return _getBinEntries.apply(this, arguments);
}
function _getBinEntries() {
  _getBinEntries = (0, _asyncToGenerator2.default)(function* (config) {
    var binFolders = new Set();
    var binEntries = new Map();

    // Setup the node_modules/.bin folders for analysis
    for (var registryFolder of config.registryFolders) {
      binFolders.add(path.resolve(config.cwd, registryFolder, '.bin'));
      binFolders.add(path.resolve(config.lockfileFolder, registryFolder, '.bin'));
    }

    // Same thing, but for the pnp dependencies, located inside the cache
    if (yield fs.exists(`${config.lockfileFolder}/${constants.PNP_FILENAME}`)) {
      var pnpApi = (0, _dynamicRequire.dynamicRequire)(`${config.lockfileFolder}/${constants.PNP_FILENAME}`);

      var packageLocator = pnpApi.findPackageLocator(`${config.cwd}/`);
      var packageInformation = pnpApi.getPackageInformation(packageLocator);

      for (var _ref2 of packageInformation.packageDependencies.entries()) {
        var name = _ref2[0], reference = _ref2[1];
        var dependencyInformation = pnpApi.getPackageInformation({name, reference});

        if (dependencyInformation.packageLocation) {
          binFolders.add(`${dependencyInformation.packageLocation}/.bin`);
        }
      }
    }

    // Build up a list of possible scripts by exploring the folders marked for analysis
    for (var binFolder of binFolders) {
      if (yield fs.exists(binFolder)) {
        for (var _name of yield fs.readdir(binFolder)) {
          binEntries.set(_name, path.join(binFolder, _name));
        }
      }
    }

    return binEntries;
  });

  return _getBinEntries.apply(this, arguments);
}

function setFlags(commander) {
  commander.description('Runs a defined package script.');
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var pkg = yield config.readManifest(config.cwd);

    var binCommands = new Set();
    var pkgCommands = new Set();

    var scripts = new Map();

    for (var _ref3 of yield getBinEntries(config)) {
      var name = _ref3[0], loc = _ref3[1];
      scripts.set(name, quoteForShell(loc));
      binCommands.add(name);
    }

    var pkgScripts = pkg.scripts;

    if (pkgScripts) {
      for (var _name2 of Object.keys(pkgScripts).sort()) {
        scripts.set(_name2, pkgScripts[_name2] || '');
        pkgCommands.add(_name2);
      }
    }

    function runCommand(_ref4) {
      var action = _ref4[0], args = _ref4.slice(1);
      return (0, _hooks.callThroughHook)('runScript', () => realRunCommand(action, args), {action, args});
    }

    function realRunCommand() {
      return _realRunCommand.apply(this, arguments);
    }
    function _realRunCommand() {
      _realRunCommand = (0, _asyncToGenerator2.default)(function* (action, args) {
        // build up list of commands
        var cmds = [];

        if (pkgScripts && action in pkgScripts) {
          var preAction = `pre${action}`;
          if (preAction in pkgScripts) {
            cmds.push([preAction, pkgScripts[preAction]]);
          }

          var script = scripts.get(action);
          invariant(script, 'Script must exist');
          cmds.push([action, script]);

          var postAction = `post${action}`;
          if (postAction in pkgScripts) {
            cmds.push([postAction, pkgScripts[postAction]]);
          }
        } else if (scripts.has(action)) {
          var _script = scripts.get(action);
          invariant(_script, 'Script must exist');
          cmds.push([action, _script]);
        }

        if (cmds.length) {
          var ignoreEngines = !!(flags.ignoreEngines || config.getOption('ignore-engines'));
          try {
            yield (0, _packageCompatibility.checkOne)(pkg, config, ignoreEngines);
          } catch (err) {
            throw err instanceof _errors.MessageError ? new _errors.MessageError(reporter.lang('cannotRunWithIncompatibleEnv')) : err;
          }

          // Disable wrapper in executed commands
          process.env.YARN_WRAP_OUTPUT = 'false';
          for (var _ref5 of cmds) {
            var stage = _ref5[0], cmd = _ref5[1];
            // only tack on trailing arguments for default script, ignore for pre and post - #1595
            var cmdWithArgs = stage === action ? sh`${unquoted(cmd)} ${args}` : cmd;
            var customShell = config.getOption('script-shell');
            yield (0, _executeLifecycleScript.execCommand)({
              stage,
              config,
              cmd: cmdWithArgs,
              cwd: flags.into || config.cwd,
              isInteractive: true,
              customShell: customShell ? String(customShell) : undefined,
            });
          }
        } else if (action === 'env') {
          reporter.log(JSON.stringify(yield (0, _executeLifecycleScript.makeEnv)('env', config.cwd, config), null, 2), {force: true});
        } else {
          var suggestion;

          for (var commandName of scripts.keys()) {
            var steps = leven(commandName, action);
            if (steps < 2) {
              suggestion = commandName;
            }
          }

          var msg = `Command ${JSON.stringify(action)} not found.`;
          if (suggestion) {
            msg += ` Did you mean ${JSON.stringify(suggestion)}?`;
          }
          throw new _errors.MessageError(msg);
        }
      });

      return _realRunCommand.apply(this, arguments);
    }

    // list possible scripts if none specified
    if (args.length === 0) {
      if (binCommands.size > 0) {
        reporter.info(`${reporter.lang('binCommands') + Array.from(binCommands).join(', ')}`);
      } else {
        reporter.error(reporter.lang('noBinAvailable'));
      }

      var printedCommands = new Map();

      for (var pkgCommand of pkgCommands) {
        var action = scripts.get(pkgCommand);
        invariant(action, 'Action must exists');
        printedCommands.set(pkgCommand, action);
      }

      if (pkgCommands.size > 0) {
        reporter.info(`${reporter.lang('possibleCommands')}`);
        reporter.list('possibleCommands', Array.from(pkgCommands), toObject(printedCommands));
        if (!flags.nonInteractive) {
          yield reporter.question(reporter.lang('commandQuestion')).then(
            answer => runCommand(answer.trim().split(' ')),
            () => reporter.error(reporter.lang('commandNotSpecified'))
          );
        }
      } else {
        reporter.error(reporter.lang('noScriptsAvailable'));
      }
      return Promise.resolve();
    } else {
      return runCommand(args);
    }
  });

  return _run.apply(this, arguments);
}
