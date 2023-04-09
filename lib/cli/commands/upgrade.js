'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.cleanLockfile = cleanLockfile;
exports.getOutdated = getOutdated;
exports.hasWrapper = hasWrapper;
exports.requireLockfile = void 0;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _add = require('./add.js');
var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _packageRequest = _interopRequireDefault(require('../../package-request.js'));
var _normalizePattern = require('../../util/normalize-pattern.js');
var _install = require('./install.js');

// used to detect whether a semver range is simple enough to preserve when doing a --latest upgrade.
// when not matched, the upgraded version range will default to `^` the same as the `add` command would.
var basicSemverOperatorRegex = new RegExp('^(\\^|~|>=|<=)?[^ |&,]+$');

// used to detect if a passed parameter is a scope or a package name.
var validScopeRegex = /^@[a-zA-Z0-9-][a-zA-Z0-9_.-]*\/$/;

// If specific versions were requested for packages, override what getOutdated reported as the latest to install
// Also add ones that are missing, since the requested packages may not have been outdated at all.
function setUserRequestedPackageVersions(
  deps,
  args,
  latest,
  packagePatterns,
  reporter
) {
  args.forEach(requestedPattern => {
    var found = false;
    var normalized = (0, _normalizePattern.normalizePattern)(requestedPattern);

    // if the user specified a package name without a version range, then that implies "latest"
    // but if the latest flag is not passed then we need to use the version range from package.json
    if (!normalized.hasVersion && !latest) {
      packagePatterns.forEach(packagePattern => {
        var packageNormalized = (0, _normalizePattern.normalizePattern)(packagePattern.pattern);
        if (packageNormalized.name === normalized.name) {
          normalized = packageNormalized;
        }
      });
    }

    var newPattern = `${normalized.name}@${normalized.range}`;

    // if this dependency is already in the outdated list,
    // just update the upgradeTo to whatever version the user requested.
    deps.forEach(dep => {
      if (normalized.hasVersion && dep.name === normalized.name) {
        found = true;
        dep.upgradeTo = newPattern;
        reporter.verbose(reporter.lang('verboseUpgradeBecauseRequested', requestedPattern, newPattern));
      }
    });

    // if this dependency was not in the outdated list,
    // then add a new entry
    if (normalized.hasVersion && !found) {
      deps.push({
        name: normalized.name,
        wanted: '',
        latest: '',
        url: '',
        hint: '',
        range: '',
        current: '',
        upgradeTo: newPattern,
        workspaceName: '',
        workspaceLoc: '',
      });
      reporter.verbose(reporter.lang('verboseUpgradeBecauseRequested', requestedPattern, newPattern));
    }
  });
}

// this function attempts to determine the range operator on the semver range.
// this will only handle the simple cases of a semver starting with '^', '~', '>=', '<=', or an exact version.
// "exotic" semver ranges will not be handled.
function getRangeOperator(version) {
  var result = basicSemverOperatorRegex.exec(version);
  return result ? result[1] || '' : '^';
}

// Attempt to preserve the range operator from the package.json specified semver range.
// If an explicit operator was specified using --exact, --tilde, --caret, then that will take precedence.
function buildPatternToUpgradeTo(dep, flags) {
  if (dep.latest === 'exotic') {
    return `${dep.name}@${dep.url}`;
  }

  var toLatest = flags.latest;
  var toVersion = toLatest ? dep.latest : dep.range;
  var rangeOperator = '';

  if (toLatest) {
    if (flags.caret) {
      rangeOperator = '^';
    } else if (flags.tilde) {
      rangeOperator = '~';
    } else if (flags.exact) {
      rangeOperator = '';
    } else {
      rangeOperator = getRangeOperator(dep.range);
    }
  }

  return `${dep.name}@${rangeOperator}${toVersion}`;
}

function scopeFilter(flags, dep) {
  if (validScopeRegex.test(flags.scope)) {
    return dep.name.startsWith(flags.scope);
  }
  return true;
}

// Remove deps being upgraded from the lockfile, or else Add will use the already-installed version
// instead of the latest for the range.
// We do this recursively so that when Yarn installs the potentially updated transitive deps,
// it may upgrade them too instead of just using the "locked" version from the lockfile.
// Transitive dependencies that are also a direct dependency are skipped.
function cleanLockfile(
  lockfile,
  deps,
  packagePatterns,
  reporter
) {
  function cleanDepFromLockfile(pattern, depth) {
    var lockManifest = lockfile.getLocked(pattern);
    if (!lockManifest || (depth > 1 && packagePatterns.some(packagePattern => packagePattern.pattern === pattern))) {
      reporter.verbose(reporter.lang('verboseUpgradeNotUnlocking', pattern));
      return;
    }

    var dependencies = Object.assign({}, lockManifest.dependencies || {}, lockManifest.optionalDependencies || {});
    var depPatterns = Object.keys(dependencies).map(key => `${key}@${dependencies[key]}`);
    reporter.verbose(reporter.lang('verboseUpgradeUnlocking', pattern));
    lockfile.removePattern(pattern);
    depPatterns.forEach(pattern => cleanDepFromLockfile(pattern, depth + 1));
  }

  var patterns = deps.map(dep => dep.upgradeTo);
  patterns.forEach(pattern => cleanDepFromLockfile(pattern, 1));
}

function setFlags(commander) {
  commander.description('Upgrades packages to their latest version based on the specified range.');
  commander.usage('upgrade [flags]');
  commander.option('-S, --scope <scope>', 'upgrade packages under the specified scope');
  commander.option('-L, --latest', 'list the latest version of packages, ignoring version ranges in package.json');
  commander.option('-E, --exact', 'install exact version. Only used when --latest is specified.');
  commander.option('-P, --pattern [pattern]', 'upgrade packages that match pattern');
  commander.option(
    '-T, --tilde',
    'install most recent release with the same minor version. Only used when --latest is specified.'
  );
  commander.option(
    '-C, --caret',
    'install most recent release with the same major version. Only used when --latest is specified.'
  );
  commander.option('-A, --audit', 'Run vulnerability audit on installed packages');
}

function hasWrapper(commander, args) {
  return true;
}

var requireLockfile = true;
exports.requireLockfile = requireLockfile;

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var addArgs = [];
    var upgradeAll = args.length === 0 && typeof flags.scope === 'undefined' && typeof flags.pattern === 'undefined';
    var addFlags = Object.assign({}, flags, {
      force: true,
      ignoreWorkspaceRootCheck: true,
      workspaceRootIsCwd: config.cwd === config.lockfileFolder,
    });
    var lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder, reporter);
    var deps = yield getOutdated(config, reporter, flags, lockfile, args);
    var install = new _install.Install(flags, config, reporter, lockfile);
    var _yield$install$fetchR = yield install.fetchRequestFromCwd(), packagePatterns = _yield$install$fetchR.requests;

    setUserRequestedPackageVersions(deps, args, flags.latest, packagePatterns, reporter);
    cleanLockfile(lockfile, deps, packagePatterns, reporter);
    addArgs = deps.map(dep => dep.upgradeTo);

    if (flags.scope && validScopeRegex.test(flags.scope)) {
      addArgs = addArgs.filter(depName => depName.startsWith(flags.scope));
    }

    var add = new _add.Add(addArgs, addFlags, config, reporter, upgradeAll ? new _lockfile.default() : lockfile);
    yield add.init();
  });

  return _run.apply(this, arguments);
}

function getOutdated() {
  return _getOutdated.apply(this, arguments);
}
function _getOutdated() {
  _getOutdated = (0, _asyncToGenerator2.default)(function* (
    config,
    reporter,
    flags,
    lockfile,
    patterns
  ) {
    var install = new _install.Install(flags, config, reporter, lockfile);
    var outdatedFieldName = flags.latest ? 'latest' : 'wanted';

    // ensure scope is of the form `@scope/`
    var normalizeScope = function() {
      if (flags.scope) {
        if (!flags.scope.startsWith('@')) {
          flags.scope = '@' + flags.scope;
        }

        if (!flags.scope.endsWith('/')) {
          flags.scope += '/';
        }
      }
    };

    var versionFilter = function(dep) {
      return dep.current !== dep[outdatedFieldName];
    };

    if (!flags.latest) {
      // these flags only have an affect when --latest is used
      flags.tilde = false;
      flags.exact = false;
      flags.caret = false;
    }

    normalizeScope();

    var deps = (yield _packageRequest.default.getOutdatedPackages(lockfile, install, config, reporter, patterns, flags))
      .filter(versionFilter)
      .filter(scopeFilter.bind(this, flags));
    deps.forEach(dep => {
      dep.upgradeTo = buildPatternToUpgradeTo(dep, flags);
      reporter.verbose(reporter.lang('verboseUpgradeBecauseOutdated', dep.name, dep.upgradeTo));
    });

    return deps;
  });

  return _getOutdated.apply(this, arguments);
}
