'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

function setFlags(commander) {
  commander.description('Clears registry username and email.');
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    yield config.registries.yarn.saveHomeConfig({
      username: undefined,
      email: undefined,
    });

    reporter.success(reporter.lang('clearedCredentials'));
  });

  return _run.apply(this, arguments);
}
