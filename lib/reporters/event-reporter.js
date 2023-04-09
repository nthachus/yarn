'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;

var _jsonReporter = _interopRequireDefault(require('./json-reporter.js'));

var _require = require('events'), EventEmitter = _require.EventEmitter;

class EventReporter extends _jsonReporter.default {
  constructor(opts) {
    super(opts);
    this.emit = void 0;

    // $FlowFixMe: looks like a flow bug
    EventEmitter.call(this);
  }

  _dump(type, data) {
    this.emit(type, data);
  }
}
exports.default = EventReporter;

Object.assign(EventReporter.prototype, EventEmitter.prototype);
