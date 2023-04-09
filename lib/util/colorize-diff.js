'use strict';
exports.__esModule = true;
exports.default = _default;

function _default(from, to, reporter) {
  var parts = to.split('.');
  var fromParts = from.split('.');

  var splitIndex = parts.findIndex((part, i) => part !== fromParts[i]);
  if (splitIndex === -1) {
    return from;
  }

  var colorized = reporter.format.green(parts.slice(splitIndex).join('.'));
  return parts.slice(0, splitIndex).concat(colorized).join('.');
}
