'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var child = _interopRequireWildcard(require('../../util/child.js'));
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _constants = require('../../constants');

function setFlags(commander) {
  commander.description(
    'Runs Node with the same version that the one used by Yarn itself, and by default from the project root'
  );
  commander.usage('node [--into PATH] [... args]');
  commander.option('--into <path>', 'Sets the cwd to the specified location');
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var pnpPath = `${config.lockfileFolder}/${_constants.PNP_FILENAME}`;

    var nodeOptions = process.env.NODE_OPTIONS || '';
    if (yield fs.exists(pnpPath)) {
      nodeOptions = `--require ${pnpPath} ${nodeOptions}`;
    }

    try {
      yield child.spawn(_constants.NODE_BIN_PATH, args, {
        stdio: 'inherit',
        cwd: flags.into || config.cwd,
        env: (0, _extends2.default)({}, process.env, {NODE_OPTIONS: nodeOptions}),
      });
    } catch (err) {
      throw err;
    }
  });

  return _run.apply(this, arguments);
}
