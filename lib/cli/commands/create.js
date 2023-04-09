'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.coerceCreatePackageName = coerceCreatePackageName;
exports.hasWrapper = hasWrapper;
exports.parsePackageName = parsePackageName;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));

var _errors = require('../../errors.js');
var child = _interopRequireWildcard(require('../../util/child.js'));
var _executeLifecycleScript = require('../../util/execute-lifecycle-script');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _global = require('./global.js');

var path = require('path');

function setFlags(commander) {
  commander.description('Creates new projects from any create-* starter kits.');
}

function hasWrapper(commander, args) {
  return true;
}

function parsePackageName(str) {
  if (str.charAt(0) === '/') {
    throw new Error(`Name should not start with "/", got "${str}"`);
  }
  if (str.charAt(0) === '.') {
    throw new Error(`Name should not start with ".", got "${str}"`);
  }
  var parts = str.split('/');
  var isScoped = str.charAt(0) === '@';
  if (isScoped && parts[0] === '@') {
    throw new Error(`Scope should not be empty, got "${str}"`);
  }
  var scope = isScoped ? parts[0] : '';
  var name = parts[isScoped ? 1 : 0] || '';
  var path = parts.slice(isScoped ? 2 : 1).join('/');
  var fullName = [scope, name].filter(Boolean).join('/');
  var full = [scope, name, path].filter(Boolean).join('/');

  return {fullName, name, scope, path, full};
}

function coerceCreatePackageName(str) {
  var pkgNameObj = parsePackageName(str);
  var coercedName = pkgNameObj.name !== '' ? `create-${pkgNameObj.name}` : `create`;
  var coercedPkgNameObj = (0, _extends2.default)({}, pkgNameObj, {
    name: coercedName,
    fullName: [pkgNameObj.scope, coercedName].filter(Boolean).join('/'),
    full: [pkgNameObj.scope, coercedName, pkgNameObj.path].filter(Boolean).join('/'),
  });
  return coercedPkgNameObj;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var builderName = args[0], rest = args.slice(1);

    if (!builderName) {
      throw new _errors.MessageError(reporter.lang('invalidPackageName'));
    }

    var _coerceCreatePackageN = coerceCreatePackageName(builderName), packageName = _coerceCreatePackageN.fullName, commandName = _coerceCreatePackageN.name;

    var linkLoc = path.join(config.linkFolder, commandName);
    if (yield fs.exists(linkLoc)) {
      reporter.info(reporter.lang('linkUsing', packageName));
    } else {
      yield (0, _global.run)(config, reporter, {}, ['add', packageName]);
    }

    var binFolder = yield (0, _global.getBinFolder)(config, {});
    var command = path.resolve(binFolder, commandName);
    var env = yield (0, _executeLifecycleScript.makeEnv)('create', config.cwd, config);

    yield child.spawn(command, rest, {stdio: `inherit`, shell: true, env});
  });

  return _run.apply(this, arguments);
}
