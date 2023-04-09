'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;

var _npmResolver = _interopRequireDefault(require('./npm-resolver.js'));

class YarnResolver extends _npmResolver.default {}
exports.default = YarnResolver;
