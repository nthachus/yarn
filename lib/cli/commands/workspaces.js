'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.examples = void 0;
exports.hasWrapper = hasWrapper;
exports.info = info;
exports.run = void 0;
exports.runScript = runScript;
exports.setFlags = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));
var _constants = require('../../constants.js');
var child = _interopRequireWildcard(require('../../util/child.js'));
var _constants2 = require('../../constants');

var invariant = require('invariant');
var path = require('path');
var os = require('os');
var semver = require('semver');

function hasWrapper(commander, args) {
  return true;
}

function info() {
  return _info.apply(this, arguments);
}
function _info() {
  _info = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var workspaceRootFolder = config.workspaceRootFolder;

    if (!workspaceRootFolder) {
      throw new _errors.MessageError(reporter.lang('workspaceRootNotFound', config.cwd));
    }

    var manifest = yield config.findManifest(workspaceRootFolder, false);
    invariant(manifest && manifest.workspaces, 'We must find a manifest with a "workspaces" property');

    var workspaces = yield config.resolveWorkspaces(workspaceRootFolder, manifest);

    var publicData = {};

    for (var workspaceName of Object.keys(workspaces)) {
      var _workspaces$workspace = workspaces[workspaceName], loc = _workspaces$workspace.loc, _manifest = _workspaces$workspace.manifest;

      var workspaceDependencies = new Set();
      var mismatchedWorkspaceDependencies = new Set();

      for (var dependencyType of _constants.DEPENDENCY_TYPES) {
        if (dependencyType !== 'peerDependencies') {
          for (var dependencyName of Object.keys(_manifest[dependencyType] || {})) {
            if (Object.prototype.hasOwnProperty.call(workspaces, dependencyName)) {
              invariant(_manifest && _manifest[dependencyType], 'The request should exist');
              var requestedRange = _manifest[dependencyType][dependencyName];
              if (semver.satisfies(workspaces[dependencyName].manifest.version, requestedRange)) {
                workspaceDependencies.add(dependencyName);
              } else {
                mismatchedWorkspaceDependencies.add(dependencyName);
              }
            }
          }
        }
      }

      publicData[workspaceName] = {
        location: path.relative(config.lockfileFolder, loc).replace(/\\/g, '/'),
        workspaceDependencies: Array.from(workspaceDependencies),
        mismatchedWorkspaceDependencies: Array.from(mismatchedWorkspaceDependencies),
      };
    }

    reporter.log(JSON.stringify(publicData, null, 2), {force: true});
  });

  return _info.apply(this, arguments);
}

function runScript() {
  return _runScript.apply(this, arguments);
}
function _runScript() {
  _runScript = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var workspaceRootFolder = config.workspaceRootFolder;

    if (!workspaceRootFolder) {
      throw new _errors.MessageError(reporter.lang('workspaceRootNotFound', config.cwd));
    }

    var manifest = yield config.findManifest(workspaceRootFolder, false);
    invariant(manifest && manifest.workspaces, 'We must find a manifest with a "workspaces" property');

    var workspaces = yield config.resolveWorkspaces(workspaceRootFolder, manifest);

    try {
      for (var workspaceName of Object.keys(workspaces)) {
        var loc = workspaces[workspaceName].loc;
        reporter.log(`${os.EOL}> ${workspaceName}`);
        yield child.spawn(_constants2.NODE_BIN_PATH, [_constants2.YARN_BIN_PATH, 'run'].concat(args), {
          stdio: 'inherit',
          cwd: loc,
        });
      }
    } catch (err) {
      throw err;
    }
  });

  return _runScript.apply(this, arguments);
}

var _buildSubCommands = (0, _buildSubCommands2.default)('workspaces', {
  info(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      yield info(config, reporter, flags, args);
    })();
  },
  run(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      yield runScript(config, reporter, flags, args);
    })();
  },
});

exports.run = _buildSubCommands.run;
exports.setFlags = _buildSubCommands.setFlags;
exports.examples = _buildSubCommands.examples;
