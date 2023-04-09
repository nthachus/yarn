'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.registryNames = exports.registries = void 0;

var _yarnRegistry = _interopRequireDefault(require('./yarn-registry.js'));
var _npmRegistry = _interopRequireDefault(require('./npm-registry.js'));

var registries = {
  npm: _npmRegistry.default,
  yarn: _yarnRegistry.default,
};
exports.registries = registries;

var registryNames = Object.keys(registries);
exports.registryNames = registryNames;
