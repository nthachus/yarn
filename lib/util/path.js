'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.getPosixPath = getPosixPath;
exports.resolveWithHome = resolveWithHome;

var _require = require('path'), resolve = _require.resolve;

var _userHomeDir = _interopRequireDefault(require('./user-home-dir'));

function getPosixPath(path) {
  return path.replace(/\\/g, '/');
}

function resolveWithHome(path) {
  var homePattern = process.platform === 'win32' ? /^~(\/|\\)/ : /^~\//;
  if (homePattern.test(path)) {
    return resolve(_userHomeDir.default, path.substr(2));
  }

  return resolve(path);
}
