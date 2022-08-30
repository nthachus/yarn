'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.default = nullify;

function nullify() {
  var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (Array.isArray(obj)) {
    for (var item of obj) {
      nullify(item);
    }
  } else if ((obj !== null && typeof obj === 'object') || typeof obj === 'function') {
    Object.setPrototypeOf(obj, null);

    // for..in can only be applied to 'object', not 'function'
    if (typeof obj === 'object') {
      for (var key in obj) {
        nullify(obj[key]);
      }
    }
  }

  return obj;
}
