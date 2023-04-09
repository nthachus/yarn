'use strict';
exports.__esModule = true;
exports.default = nullify;

function nullify(obj) {
  if (obj === void 0) obj = {};
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
