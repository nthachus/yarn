'use strict';
exports.__esModule = true;
exports.dynamicRequire = void 0;

// $FlowFixMe We want this require to be dynamic
var dynamicRequire = typeof __webpack_require__ !== 'undefined' ? __non_webpack_require__ : require; // eslint-disable-line
exports.dynamicRequire = dynamicRequire;
