'use strict';
exports.__esModule = true;
exports.defaultFormatter = void 0;

function formatFunction() {
  var strs = Array.prototype.slice.call(arguments, 0);
  return strs.join(' ');
}

var defaultFormatter = {
  bold: formatFunction,
  dim: formatFunction,
  italic: formatFunction,
  underline: formatFunction,
  inverse: formatFunction,
  strikethrough: formatFunction,
  black: formatFunction,
  red: formatFunction,
  green: formatFunction,
  yellow: formatFunction,
  blue: formatFunction,
  magenta: formatFunction,
  cyan: formatFunction,
  white: formatFunction,
  gray: formatFunction,
  grey: formatFunction,
  stripColor: formatFunction,
};
exports.defaultFormatter = defaultFormatter;
