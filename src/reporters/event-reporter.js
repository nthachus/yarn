import JSONReporter from './json-reporter.js';

const {EventEmitter} = require('events');

export default class EventReporter extends JSONReporter {
  emit;

  constructor(opts) {
    super(opts);

    // $FlowFixMe: looks like a flow bug
    EventEmitter.call(this);
  }

  _dump(type, data) {
    this.emit(type, data);
  }
}

Object.assign(EventReporter.prototype, EventEmitter.prototype);
