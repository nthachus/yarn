'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;

var _baseResolver = _interopRequireDefault(require('../base-resolver.js'));

class ExoticResolver extends _baseResolver.default {
  static isVersion(pattern) {
    var proto = this.protocol;
    if (proto) {
      return pattern.startsWith(`${proto}:`);
    } else {
      throw new Error('No protocol specified');
    }
  }
}
exports.default = ExoticResolver;

ExoticResolver.protocol = void 0;
