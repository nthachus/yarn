import JSONReporter from './json-reporter.js';

export default class BufferReporter extends JSONReporter {
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
    return this._buffer.map(({data}) => (typeof data === 'string' ? data : JSON.stringify(data))).join('');
  }

  getBufferJson() {
    return JSON.parse(this.getBufferText());
  }
}
