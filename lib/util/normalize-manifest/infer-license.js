'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = inferLicense;

var _licenses = _interopRequireDefault(require('./licenses.js'));

function clean(str) {
  return str.replace(/[^A-Za-z\s]/g, ' ').replace(/[\s]+/g, ' ').trim().toLowerCase();
}

var REGEXES = {
  Apache: [/Apache License\b/],
  BSD: [/BSD\b/],
  ISC: [/The ISC License/, /ISC\b/],
  MIT: [/MIT\b/],
  Unlicense: [/http:\/\/unlicense.org\//],
  WTFPL: [/DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE/, /WTFPL\b/],
};

function inferLicense(license) {
  // check if we have any explicit licenses
  var cleanLicense = clean(license);
  for (var licenseName in _licenses.default) {
    var testLicense = _licenses.default[licenseName];
    if (cleanLicense.search(testLicense) >= 0) {
      return licenseName;
    }
  }

  // infer based on some keywords
  for (var _licenseName in REGEXES) {
    for (var regex of REGEXES[_licenseName]) {
      if (license.search(regex) >= 0) {
        return `${_licenseName}*`;
      }
    }
  }

  return null;
}
