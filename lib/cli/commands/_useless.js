'use strict';
exports.__esModule = true;
exports.default = _default;

var _errors = require('../../errors.js');

function _default(message) {
  return {
    useless: true,
    run() {
      throw new _errors.MessageError(message);
    },
    setFlags: () => {},
    hasWrapper: () => true,
  };
}
