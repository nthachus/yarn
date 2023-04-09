'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;

var _jsonReporter = _interopRequireDefault(require('./json-reporter.js'));

class BufferReporter extends _jsonReporter.default {
  constructor(opts) {
    super(opts);
    this._buffer = [];
  }

  _dump(type, data, error) {
    this._buffer.push({
      type,
      data,
      error: !!error,
    });
  }

  getBuffer() {
    return this._buffer;
  }

  getBufferText() {
    return this._buffer.map(_ref => {
      var data = _ref.data;
      return typeof data === 'string' ? data : JSON.stringify(data);
    }).join('');
  }

  getBufferJson() {
    return JSON.parse(this.getBufferText());
  }
}
exports.default = BufferReporter;
