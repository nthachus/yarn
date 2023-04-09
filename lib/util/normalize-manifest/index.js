'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _resolveRelative = _interopRequireDefault(require('./resolve-relative.js'));
var _validate = _interopRequireDefault(require('./validate.js'));
var _fix = _interopRequireDefault(require('./fix.js'));

var path = require('path');

var _default = /*#__PURE__*/ (function() {
  var _ref = (0, _asyncToGenerator2.default)(function* (info, moduleLoc, config, isRoot) {
    // create human readable name
    var name = info.name, version = info.version;
    var human;
    if (typeof name === 'string') {
      human = name;
    }
    if (human && typeof version === 'string' && version) {
      human += `@${version}`;
    }
    if (isRoot && info._loc) {
      human = path.relative(config.cwd, info._loc);
    }

    function warn(msg) {
      if (human) {
        msg = `${human}: ${msg}`;
      }
      config.reporter.warn(msg);
    }

    yield (0, _fix.default)(info, moduleLoc, config.reporter, warn, config.looseSemver);
    (0, _resolveRelative.default)(info, moduleLoc, config.lockfileFolder);

    if (config.cwd === config.globalFolder) {
      return info;
    }

    try {
      (0, _validate.default)(info, isRoot, config.reporter, warn);
    } catch (err) {
      if (human) {
        err.message = `${human}: ${err.message}`;
      }
      throw err;
    }

    return info;
  });

  return function() {
    return _ref.apply(this, arguments);
  };
})();
exports.default = _default;
