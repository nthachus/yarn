'use strict';
exports.__esModule = true;
exports.default = parsePackageName;

var PKG_INPUT = /(^\S?[^\s@]+)(?:@(\S+))?$/;

function parsePackageName(input) {
  var _PKG_INPUT$exec = PKG_INPUT.exec(input), name = _PKG_INPUT$exec[1], version = _PKG_INPUT$exec[2];
  return {name, version};
}
