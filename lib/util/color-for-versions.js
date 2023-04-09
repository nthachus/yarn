'use strict';
exports.__esModule = true;
exports.default = _default;

var semver = require('semver');
var _semver = require('./semver.js');
var _constants = require('../constants.js');

function _default(from, to) {
  var validFrom = semver.valid(from);
  var validTo = semver.valid(to);
  var versionBump = 'unknown';
  if (validFrom && validTo) {
    versionBump = (0, _semver.diffWithUnstable)(validFrom, validTo) || 'unchanged';
  }
  return _constants.VERSION_COLOR_SCHEME[versionBump];
}
