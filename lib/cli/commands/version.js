'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
exports.setVersion = setVersion;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _index = require('../../registries/index.js');
var _executeLifecycleScript = require('../../util/execute-lifecycle-script.js');
var _errors = require('../../errors.js');
var _gitSpawn = require('../../util/git/git-spawn.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _map = _interopRequireDefault(require('../../util/map.js'));

var invariant = require('invariant');
var semver = require('semver');
var path = require('path');

var NEW_VERSION_FLAG = '--new-version [version]';
function isValidNewVersion(oldVersion, newVersion, looseSemver, identifier) {
  return !!(semver.valid(newVersion, looseSemver) || semver.inc(oldVersion, newVersion, looseSemver, identifier));
}

function setFlags(commander) {
  commander.description('Update the version of your package via the command line.');
  commander.option(NEW_VERSION_FLAG, 'new version');
  commander.option('--major', 'auto-increment major version number');
  commander.option('--minor', 'auto-increment minor version number');
  commander.option('--patch', 'auto-increment patch version number');
  commander.option('--premajor', 'auto-increment premajor version number');
  commander.option('--preminor', 'auto-increment preminor version number');
  commander.option('--prepatch', 'auto-increment prepatch version number');
  commander.option('--prerelease', 'auto-increment prerelease version number');
  commander.option('--preid [preid]', 'add a custom identifier to the prerelease');
  commander.option('--message [message]', 'message');
  commander.option('--no-git-tag-version', 'no git tag version');
  commander.option('--no-commit-hooks', 'bypass git hooks when committing new version');
}

function hasWrapper(commander, args) {
  return true;
}

function setVersion() {
  return _setVersion.apply(this, arguments);
}
function _setVersion() {
  _setVersion = (0, _asyncToGenerator2.default)(function* (
    config,
    reporter,
    flags,
    args,
    required
  ) {
    var pkg = yield config.readRootManifest();
    var pkgLoc = pkg._loc;
    var scripts = (0, _map.default)();
    var newVersion = flags.newVersion;
    var identifier = undefined;
    if (flags.preid) {
      identifier = flags.preid;
    }
    invariant(pkgLoc, 'expected package location');

    if (args.length && !newVersion) {
      throw new _errors.MessageError(reporter.lang('invalidVersionArgument', NEW_VERSION_FLAG));
    }

    function runLifecycle(lifecycle) {
      if (scripts[lifecycle]) {
        return (0, _executeLifecycleScript.execCommand)({stage: lifecycle, config, cmd: scripts[lifecycle], cwd: config.cwd, isInteractive: true});
      }

      return Promise.resolve();
    }

    function isCommitHooksDisabled() {
      return flags.commitHooks === false || config.getOption('version-commit-hooks') === false;
    }

    if (pkg.scripts) {
      // inherit `scripts` from manifest
      Object.assign(scripts, pkg.scripts);
    }

    // get old version
    var oldVersion = pkg.version;
    if (oldVersion) {
      reporter.info(`${reporter.lang('currentVersion')}: ${oldVersion}`);
    } else {
      oldVersion = '0.0.0';
    }

    // get new version
    if (newVersion && !isValidNewVersion(oldVersion, newVersion, config.looseSemver, identifier)) {
      throw new _errors.MessageError(reporter.lang('invalidVersion'));
    }

    // get new version by bumping old version, if requested
    if (!newVersion) {
      if (flags.major) {
        newVersion = semver.inc(oldVersion, 'major');
      } else if (flags.minor) {
        newVersion = semver.inc(oldVersion, 'minor');
      } else if (flags.patch) {
        newVersion = semver.inc(oldVersion, 'patch');
      } else if (flags.premajor) {
        newVersion = semver.inc(oldVersion, 'premajor', identifier);
      } else if (flags.preminor) {
        newVersion = semver.inc(oldVersion, 'preminor', identifier);
      } else if (flags.prepatch) {
        newVersion = semver.inc(oldVersion, 'prepatch', identifier);
      } else if (flags.prerelease) {
        newVersion = semver.inc(oldVersion, 'prerelease', identifier);
      }
    }

    // wasn't passed a version arg so ask interactively
    while (!newVersion) {
      // make sure we're not running in non-interactive mode before asking for new version
      if (flags.nonInteractive || config.nonInteractive) {
        // if no version is specified, use current version in package.json
        newVersion = oldVersion;
        break;
      }

      // Make sure we dont exit with an error message when pressing Ctrl-C or enter to abort
      try {
        newVersion = yield reporter.question(reporter.lang('newVersion'));
        if (!newVersion) {
          newVersion = oldVersion;
        }
      } catch (err) {
        newVersion = oldVersion;
      }

      if (!required && !newVersion) {
        reporter.info(`${reporter.lang('noVersionOnPublish')}: ${oldVersion}`);
        return function() {
          return Promise.resolve();
        };
      }

      if (isValidNewVersion(oldVersion, newVersion, config.looseSemver, identifier)) {
        break;
      } else {
        newVersion = null;
        reporter.error(reporter.lang('invalidSemver'));
      }
    }
    if (newVersion) {
      newVersion = semver.inc(oldVersion, newVersion, config.looseSemver, identifier) || newVersion;
    }
    invariant(newVersion, 'expected new version');

    if (newVersion === pkg.version) {
      return function() {
        return Promise.resolve();
      };
    }

    yield runLifecycle('preversion');

    // update version
    reporter.info(`${reporter.lang('newVersion')}: ${newVersion}`);
    pkg.version = newVersion;

    // update versions in manifests
    var manifests = yield config.getRootManifests();
    for (var registryName of _index.registryNames) {
      var manifest = manifests[registryName];
      if (manifest.exists) {
        manifest.object.version = newVersion;
      }
    }
    yield config.saveRootManifests(manifests);

    yield runLifecycle('version');

    return /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
      invariant(newVersion, 'expected version');

      // check if a new git tag should be created
      if (flags.gitTagVersion && config.getOption('version-git-tag')) {
        // add git commit and tag
        var isGit = false;
        var parts = config.cwd.split(path.sep);
        while (parts.length) {
          isGit = yield fs.exists(path.join(parts.join(path.sep), '.git'));
          if (isGit) {
            break;
          } else {
            parts.pop();
          }
        }

        if (isGit) {
          var message = (flags.message || String(config.getOption('version-git-message'))).replace(/%s/g, newVersion);
          var sign = Boolean(config.getOption('version-sign-git-tag'));
          var flag = sign ? '-sm' : '-am';
          var prefix = String(config.getOption('version-tag-prefix'));
          var _args = ['commit', '-m', message].concat(isCommitHooksDisabled() ? ['-n'] : []);

          var gitRoot = (yield (0, _gitSpawn.spawn)(['rev-parse', '--show-toplevel'], {cwd: config.cwd})).trim();

          // add manifest
          yield (0, _gitSpawn.spawn)(['add', path.relative(gitRoot, pkgLoc)], {cwd: gitRoot});

          // create git commit
          yield (0, _gitSpawn.spawn)(_args, {cwd: gitRoot});

          // create git tag
          yield (0, _gitSpawn.spawn)(['tag', `${prefix}${newVersion}`, flag, message], {cwd: gitRoot});
        }
      }

      yield runLifecycle('postversion');
    });
  });

  return _setVersion.apply(this, arguments);
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var commit = yield setVersion(config, reporter, flags, args, true);
    yield commit();
  });

  return _run.apply(this, arguments);
}
