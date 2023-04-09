'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.requireLockfile = void 0;
exports.run = run;
exports.setFlags = setFlags;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _index = require('../../registries/index.js');
var _install = require('./install.js');
var _errors = require('../../errors.js');
var _index2 = require('../../reporters/index.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var constants = _interopRequireWildcard(require('../../constants.js'));

var path = require('path');
var emoji = require('node-emoji');

var requireLockfile = true;
exports.requireLockfile = requireLockfile;

function setFlags(commander) {
  commander.description('Removes a package from your direct dependencies updating your package.json and yarn.lock.');
  commander.usage('remove [packages ...] [flags]');
  commander.option('-W, --ignore-workspace-root-check', 'required to run yarn remove inside a workspace root');
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var isWorkspaceRoot = config.workspaceRootFolder && config.cwd === config.workspaceRootFolder;

    if (!args.length) {
      throw new _errors.MessageError(reporter.lang('tooFewArguments', 1));
    }

    // running "yarn remove something" in a workspace root is often a mistake
    if (isWorkspaceRoot && !flags.ignoreWorkspaceRootCheck) {
      throw new _errors.MessageError(reporter.lang('workspacesRemoveRootCheck'));
    }

    var totalSteps = args.length + 1;
    var step = 0;

    // load manifests
    var lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder);
    var rootManifests = yield config.getRootManifests();
    var manifests = [];

    for (var name of args) {
      reporter.step(++step, totalSteps, `Removing module ${name}`, emoji.get('wastebasket'));

      var found = false;

      for (var registryName of Object.keys(_index.registries)) {
        var registry = config.registries[registryName];
        var object = rootManifests[registryName].object;

        for (var type of constants.DEPENDENCY_TYPES) {
          var deps = object[type];
          if (deps && deps[name]) {
            found = true;
            delete deps[name];
          }
        }

        var possibleManifestLoc = path.join(config.cwd, registry.folder, name);
        if (yield fs.exists(possibleManifestLoc)) {
          var manifest = yield config.maybeReadManifest(possibleManifestLoc, registryName);
          if (manifest) {
            manifests.push([possibleManifestLoc, manifest]);
          }
        }
      }

      if (!found) {
        throw new _errors.MessageError(reporter.lang('moduleNotInManifest'));
      }
    }

    // save manifests
    yield config.saveRootManifests(rootManifests);

    // run hooks - npm runs these one after another
    for (var action of ['preuninstall', 'uninstall', 'postuninstall']) {
      for (var _ref of manifests) {
        var loc = _ref[0];
        yield config.executeLifecycleScript(action, loc);
      }
    }

    // reinstall so we can get the updated lockfile
    reporter.step(++step, totalSteps, reporter.lang('uninstallRegenerate'), emoji.get('hammer'));
    var installFlags = (0, _extends2.default)({force: true, workspaceRootIsCwd: true}, flags);
    var reinstall = new _install.Install(installFlags, config, new _index2.NoopReporter(), lockfile);
    yield reinstall.init();

    //
    reporter.success(reporter.lang('uninstalledPackages'));
  });

  return _run.apply(this, arguments);
}
