'use strict';
exports.__esModule = true;
exports.findRc = findRc;

var _require = require('fs'), readFileSync = _require.readFileSync;
var path = require('path');
var _constants = require('../constants');

var etc = '/etc';
var isWin = process.platform === 'win32';
var home = isWin ? process.env.USERPROFILE : process.env.HOME;

function getRcPaths(name, cwd) {
  var configPaths = [];

  function pushConfigPath() {
    var segments = Array.prototype.slice.call(arguments, 0);
    configPaths.push(path.join.apply(path, segments));
    if (segments[segments.length - 1] === `.${name}rc`) {
      configPaths.push(path.join.apply(path, segments.slice(0, -1).concat([`.${name}rc.yml`])));
    }
  }

  function unshiftConfigPath() {
    var segments = Array.prototype.slice.call(arguments, 0);
    if (segments[segments.length - 1] === `.${name}rc`) {
      configPaths.unshift(path.join.apply(path, segments.slice(0, -1).concat([`.${name}rc.yml`])));
    }
    configPaths.unshift(path.join.apply(path, segments));
  }

  if (!isWin) {
    pushConfigPath(etc, name, 'config');
    pushConfigPath(etc, `${name}rc`);
  }

  if (home) {
    pushConfigPath(_constants.CONFIG_DIRECTORY);
    pushConfigPath(home, '.config', name, 'config');
    pushConfigPath(home, '.config', name);
    pushConfigPath(home, `.${name}`, 'config');
    pushConfigPath(home, `.${name}rc`);
  }

  // add .yarnrc locations relative to the cwd
  while (true) {
    unshiftConfigPath(cwd, `.${name}rc`);

    var upperCwd = path.dirname(cwd);
    if (upperCwd === cwd) {
      // we've reached the root
      break;
    } else {
      // continue since there's still more directories to search
      cwd = upperCwd;
    }
  }

  var envVariable = `${name}_config`.toUpperCase();

  if (process.env[envVariable]) {
    pushConfigPath(process.env[envVariable]);
  }

  return configPaths;
}

function parseRcPaths(paths, parser) {
  return Object.assign.apply(
    Object,
    [{}].concat(
      paths.map(path => {
        try {
          return parser(readFileSync(path).toString(), path);
        } catch (error) {
          if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            return {};
          } else {
            throw error;
          }
        }
      })
    )
  );
}

function findRc(name, cwd, parser) {
  return parseRcPaths(getRcPaths(name, cwd), parser);
}
