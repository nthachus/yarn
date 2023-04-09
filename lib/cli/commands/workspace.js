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
var _constants = require('../../constants');

var invariant = require('invariant');

function setFlags(commander) {}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var workspaceRootFolder = config.workspaceRootFolder;

    if (!workspaceRootFolder) {
      throw new _errors.MessageError(reporter.lang('workspaceRootNotFound', config.cwd));
    }

    if (args.length < 1) {
      throw new _errors.MessageError(reporter.lang('workspaceMissingWorkspace'));
    }

    if (args.length < 2) {
      throw new _errors.MessageError(reporter.lang('workspaceMissingCommand'));
    }

    var manifest = yield config.findManifest(workspaceRootFolder, false);
    invariant(manifest && manifest.workspaces, 'We must find a manifest with a "workspaces" property');

    var workspaces = yield config.resolveWorkspaces(workspaceRootFolder, manifest);
    var _ref = args || [], workspaceName = _ref[0], rest = _ref.slice(1);

    if (!Object.prototype.hasOwnProperty.call(workspaces, workspaceName)) {
      throw new _errors.MessageError(reporter.lang('workspaceUnknownWorkspace', workspaceName));
    }

    var workspace = workspaces[workspaceName];

    try {
      yield child.spawn(_constants.NODE_BIN_PATH, [_constants.YARN_BIN_PATH].concat(rest), {
        stdio: 'inherit',
        cwd: workspace.loc,
      });
    } catch (err) {
      throw err;
    }
  });

  return _run.apply(this, arguments);
}
