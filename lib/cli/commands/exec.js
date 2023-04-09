'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var child = _interopRequireWildcard(require('../../util/child.js'));
var _executeLifecycleScript = require('../../util/execute-lifecycle-script.js');

function setFlags(commander) {}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var env = yield (0, _executeLifecycleScript.makeEnv)(`exec`, config.cwd, config);

    if (args.length < 1) {
      throw new _errors.MessageError(reporter.lang('execMissingCommand'));
    }

    var execName = args[0], rest = args.slice(1);
    yield child.spawn(execName, rest, {stdio: 'inherit', env});
  });

  return _run.apply(this, arguments);
}
