'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _baseFetcher = _interopRequireDefault(require('./base-fetcher.js'));
var fs = _interopRequireWildcard(require('../util/fs.js'));

class CopyFetcher extends _baseFetcher.default {
  _fetch() {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      yield fs.copy(_this.reference, _this.dest, _this.reporter);
      return {
        hash: _this.hash || '',
        resolved: null,
      };
    })();
  }
}
exports.default = CopyFetcher;
