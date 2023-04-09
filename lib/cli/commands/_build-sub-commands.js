'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = _default;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var _misc = require('../../util/misc.js');

function _default(rootCommandName, subCommands, usage) {
  if (usage === void 0) usage = [];
  var subCommandNames = Object.keys(subCommands).map(_misc.hyphenate);

  function setFlags(commander) {
    commander.usage(`${rootCommandName} [${subCommandNames.join('|')}] [flags]`);
  }

  function run() {
    return _run.apply(this, arguments);
  }
  function _run() {
    _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
      var subName = (0, _misc.camelCase)(args.shift() || '');
      if (subName && subCommands[subName]) {
        var command = subCommands[subName];
        var res = yield command(config, reporter, flags, args);
        if (res !== false) {
          return Promise.resolve();
        }
      }

      if (usage && usage.length) {
        reporter.error(`${reporter.lang('usage')}:`);
        for (var msg of usage) {
          reporter.error(`yarn ${rootCommandName} ${msg}`);
        }
      }
      return Promise.reject(new _errors.MessageError(reporter.lang('invalidCommand', subCommandNames.join(', '))));
    });

    return _run.apply(this, arguments);
  }

  function hasWrapper(commander, args) {
    return true;
  }

  var examples = usage.map((cmd) => {
    return `${rootCommandName} ${cmd}`;
  });

  return {run, setFlags, hasWrapper, examples};
}
