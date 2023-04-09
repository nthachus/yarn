'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _yarnVersion = require('../../util/yarn-version.js');

function setFlags(commander) {
  commander.description('Displays version information of currently installed Yarn, Node.js, and its dependencies.');
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var versions = {yarn: _yarnVersion.version};

    var pkg = yield config.maybeReadManifest(config.cwd);
    if (pkg && pkg.name && pkg.version) {
      versions[pkg.name] = pkg.version;
    }

    Object.assign(versions, process.versions);

    reporter.inspect(versions);
  });

  return _run.apply(this, arguments);
}
