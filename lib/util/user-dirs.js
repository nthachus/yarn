'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.getCacheDir = getCacheDir;
exports.getConfigDir = getConfigDir;
exports.getDataDir = getDataDir;

var path = require('path');
var _userHomeDir = _interopRequireDefault(require('./user-home-dir'));

var FALLBACK_CONFIG_DIR = path.join(_userHomeDir.default, '.config', 'yarn');
var FALLBACK_CACHE_DIR = path.join(_userHomeDir.default, '.cache', 'yarn');

function getDataDir() {
  if (process.platform === 'win32') {
    var WIN32_APPDATA_DIR = getLocalAppDataDir();
    return WIN32_APPDATA_DIR == null ? FALLBACK_CONFIG_DIR : path.join(WIN32_APPDATA_DIR, 'Data');
  } else if (process.env.XDG_DATA_HOME) {
    return path.join(process.env.XDG_DATA_HOME, 'yarn');
  } else {
    // This could arguably be ~/Library/Application Support/Yarn on Macs,
    // but that feels unintuitive for a cli tool

    // Instead, use our prior fallback. Some day this could be
    // path.join(userHome, '.local', 'share', 'yarn')
    // or return path.join(WIN32_APPDATA_DIR, 'Data') on win32
    return FALLBACK_CONFIG_DIR;
  }
}

function getCacheDir() {
  if (process.platform === 'win32') {
    // process.env.TEMP also exists, but most apps put caches here
    return path.join(getLocalAppDataDir() || path.join(_userHomeDir.default, 'AppData', 'Local', 'Yarn'), 'Cache');
  } else if (process.env.XDG_CACHE_HOME) {
    return path.join(process.env.XDG_CACHE_HOME, 'yarn');
  } else if (process.platform === 'darwin') {
    return path.join(_userHomeDir.default, 'Library', 'Caches', 'Yarn');
  } else {
    return FALLBACK_CACHE_DIR;
  }
}

function getConfigDir() {
  if (process.platform === 'win32') {
    // Use our prior fallback. Some day this could be
    // return path.join(WIN32_APPDATA_DIR, 'Config')
    var WIN32_APPDATA_DIR = getLocalAppDataDir();
    return WIN32_APPDATA_DIR == null ? FALLBACK_CONFIG_DIR : path.join(WIN32_APPDATA_DIR, 'Config');
  } else if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'yarn');
  } else {
    return FALLBACK_CONFIG_DIR;
  }
}

function getLocalAppDataDir() {
  return process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Yarn') : null;
}
