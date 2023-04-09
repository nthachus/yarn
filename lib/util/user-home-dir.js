'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.home = exports.default = void 0;

var _rootUser = _interopRequireDefault(require('./root-user.js'));

var path = require('path');

var home = require('os').homedir();
exports.home = home;

var userHomeDir = _rootUser.default ? path.resolve('/usr/local/share') : home;

exports.default = userHomeDir;
