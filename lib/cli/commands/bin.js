'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _run2 = require('./run.js');

var path = require('path');

function hasWrapper(commander) {
  return false;
}

function setFlags(commander) {
  commander.description('Displays the location of the yarn bin folder.');
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var binFolder = path.join(config.cwd, config.registryFolders[0], '.bin');
    if (args.length === 0) {
      reporter.log(binFolder, {force: true});
    } else {
      var binEntries = yield (0, _run2.getBinEntries)(config);

      var binName = args[0];
      var binPath = binEntries.get(binName);

      if (binPath) {
        reporter.log(binPath, {force: true});
      } else {
        reporter.error(reporter.lang('packageBinaryNotFound', binName));
      }
    }
  });

  return _run.apply(this, arguments);
}
