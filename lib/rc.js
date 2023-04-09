'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
exports.__esModule = true;
exports.getRcArgs = getRcArgs;
exports.getRcConfigForCwd = getRcConfigForCwd;
exports.getRcConfigForFolder = getRcConfigForFolder;

var _require = require('fs'), existsSync = _require.existsSync, readFileSync = _require.readFileSync;
var _require2 = require('path'), dirname = _require2.dirname, resolve = _require2.resolve;
var commander = require('commander');

var _lockfile = require('./lockfile');
var rcUtil = _interopRequireWildcard(require('./util/rc.js'));

// Keys that will get resolved relative to the path of the rc file they belong to
var PATH_KEYS = new Set([
  'yarn-path',
  'cache-folder',
  'global-folder',
  'modules-folder',
  'cwd',
  'offline-cache-folder',
]);

// given a cwd, load all .yarnrc files relative to it
function getRcConfigForCwd(cwd, args) {
  var config = {};

  if (args.indexOf('--no-default-rc') === -1) {
    Object.assign(
      config,
      rcUtil.findRc('yarn', cwd, (fileText, filePath) => {
        return loadRcFile(fileText, filePath);
      })
    );
  }

  for (var index = args.indexOf('--use-yarnrc'); index !== -1; index = args.indexOf('--use-yarnrc', index + 1)) {
    var value = args[index + 1];

    if (value && value.charAt(0) !== '-') {
      Object.assign(config, loadRcFile(readFileSync(value, 'utf8'), value));
    }
  }

  return config;
}

function getRcConfigForFolder(cwd) {
  var filePath = resolve(cwd, '.yarnrc');
  if (!existsSync(filePath)) {
    return {};
  }

  var fileText = readFileSync(filePath, 'utf8');
  return loadRcFile(fileText, filePath);
}

function loadRcFile(fileText, filePath) {
  var _parse = (0, _lockfile.parse)(fileText, filePath), values = _parse.object;

  if (filePath.match(/\.yml$/) && typeof values.yarnPath === 'string') {
    values = {'yarn-path': values.yarnPath};
  }

  // some keys reference directories so keep their relativity
  for (var key in values) {
    if (PATH_KEYS.has(key.replace(/^(--)?([^.]+\.)*/, ''))) {
      values[key] = resolve(dirname(filePath), values[key]);
    }
  }

  return values;
}

// get the built of arguments of a .yarnrc chain of the passed cwd
function buildRcArgs(cwd, args) {
  var config = getRcConfigForCwd(cwd, args);

  var argsForCommands = new Map();

  for (var key in config) {
    // args can be prefixed with the command name they're meant for, eg.
    // `--install.check-files true`
    var keyMatch = key.match(/^--(?:([^.]+)\.)?(.*)$/);
    if (!keyMatch) {
      continue;
    }

    var commandName = keyMatch[1] || '*';
    var arg = keyMatch[2];
    var value = config[key];

    // create args for this command name if we didn't previously have them
    var _args = argsForCommands.get(commandName) || [];
    argsForCommands.set(commandName, _args);

    // turn config value into appropriate cli flag
    var option = commander.optionFor(`--${arg}`);

    // If commander doesn't recognize the option or it takes a value after it
    if (!option || option.optional || option.required) {
      _args.push(`--${arg}`, value);
    } else if (value === true) {
      // we can't force remove an arg from cli
      _args.push(`--${arg}`);
    }
  }

  return argsForCommands;
}

// extract the value of a --cwd arg if present
function extractCwdArg(args) {
  for (var i = 0, I = args.length; i < I; ++i) {
    var arg = args[i];
    if (arg === '--') {
      return null;
    } else if (arg === '--cwd') {
      return args[i + 1];
    }
  }
  return null;
}

// get a list of arguments from .yarnrc that apply to this commandName
function getRcArgs(commandName, args, previousCwds) {
  if (previousCwds === void 0) previousCwds = [];
  // for the cwd, use the --cwd arg if it was passed or else use process.cwd()
  var origCwd = extractCwdArg(args) || process.cwd();

  // get a map of command names and their arguments
  var argMap = buildRcArgs(origCwd, args);

  // concat wildcard arguments and arguments meant for this specific command
  var newArgs = [].concat(argMap.get('*') || [], argMap.get(commandName) || []);

  // check if the .yarnrc args specified a cwd
  var newCwd = extractCwdArg(newArgs);
  if (newCwd && newCwd !== origCwd) {
    // ensure that we don't enter into a loop
    if (previousCwds.indexOf(newCwd) !== -1) {
      throw new Error(`Recursive .yarnrc files specifying --cwd flags. Bailing out.`);
    }

    //  if we have a new cwd then let's refetch the .yarnrc args relative to it
    return getRcArgs(commandName, newArgs, previousCwds.concat(origCwd));
  }

  return newArgs;
}
