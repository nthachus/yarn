'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.requireLockfile = void 0;
exports.run = run;
exports.setFlags = setFlags;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _packageRequest = _interopRequireDefault(require('../../package-request.js'));
var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _install = require('./install.js');
var _colorForVersions = _interopRequireDefault(require('../../util/color-for-versions'));
var _colorizeDiff = _interopRequireDefault(require('../../util/colorize-diff.js'));

var requireLockfile = true;
exports.requireLockfile = requireLockfile;

function setFlags(commander) {
  commander.description('Checks for outdated package dependencies.');
  commander.usage('outdated [packages ...]');
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder);
    var install = new _install.Install((0, _extends2.default)({}, flags, {includeWorkspaceDeps: true}), config, reporter, lockfile);
    var deps = yield _packageRequest.default.getOutdatedPackages(lockfile, install, config, reporter);

    if (args.length) {
      var requested = new Set(args);

      deps = deps.filter(_ref => {
        var name = _ref.name;
        return requested.has(name);
      });
    }

    var getNameFromHint = hint => (hint ? `${hint}Dependencies` : 'dependencies');
    var colorizeName = _ref2 => {
      var current = _ref2.current, latest = _ref2.latest, name = _ref2.name;
      return reporter.format[(0, _colorForVersions.default)(current, latest)](name);
    };

    if (deps.length) {
      var usesWorkspaces = !!config.workspaceRootFolder;
      var body = deps.map((info) => {
        var row = [
          colorizeName(info),
          info.current,
          (0, _colorizeDiff.default)(info.current, info.wanted, reporter),
          reporter.format.cyan(info.latest),
          info.workspaceName || '',
          getNameFromHint(info.hint),
          reporter.format.cyan(info.url),
        ];
        if (!usesWorkspaces) {
          row.splice(4, 1);
        }
        return row;
      });

      var red = reporter.format.red('<red>');
      var yellow = reporter.format.yellow('<yellow>');
      var green = reporter.format.green('<green>');
      reporter.info(reporter.lang('legendColorsForVersionUpdates', red, yellow, green));

      var header = ['Package', 'Current', 'Wanted', 'Latest', 'Workspace', 'Package Type', 'URL'];
      if (!usesWorkspaces) {
        header.splice(4, 1);
      }
      reporter.table(header, body);

      return 1;
    }
    return 0;
  });

  return _run.apply(this, arguments);
}
