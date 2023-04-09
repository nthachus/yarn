'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.requireLockfile = exports.noArguments = void 0;
exports.run = run;
exports.setFlags = setFlags;
exports.verifyTreeCheck = verifyTreeCheck;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var _integrityChecker = _interopRequireWildcard(require('../../integrity-checker.js'));
var _lockfile = _interopRequireDefault(require('../../lockfile'));
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _install = require('./install.js');
var _normalizePattern2 = require('../../util/normalize-pattern.js');

var semver = require('semver');
var path = require('path');

var requireLockfile = false;
exports.requireLockfile = requireLockfile;
var noArguments = true;
exports.noArguments = noArguments;

function hasWrapper(commander) {
  return true;
}

function setFlags(commander) {
  commander.description('Verifies if versions in the current project’s package.json match that of yarn’s lock file.');
  commander.option('--integrity');
  commander.option('--verify-tree');
}

function verifyTreeCheck() {
  return _verifyTreeCheck.apply(this, arguments);
}
function _verifyTreeCheck() {
  _verifyTreeCheck = (0, _asyncToGenerator2.default)(function* (
    config,
    reporter,
    flags,
    args
  ) {
    var errCount = 0;
    function reportError(msg) {
      var vars = Array.prototype.slice.call(arguments, 1);
      reporter.error(reporter.lang.apply(reporter, [msg].concat(vars)));
      errCount++;
    }
    // check all dependencies recursively without relying on internal resolver
    var registryName = 'yarn';
    var registryFolder = config.registryFolders[0];
    var cwd = config.workspaceRootFolder ? config.lockfileFolder : config.cwd;
    var rootManifest = yield config.readManifest(cwd, registryName);

    var dependenciesToCheckVersion = [];
    if (rootManifest.dependencies) {
      for (var name in rootManifest.dependencies) {
        var version = rootManifest.dependencies[name];
        // skip linked dependencies
        var isLinkedDependency = /^link:/i.test(version) || (/^file:/i.test(version) && config.linkFileDependencies);
        if (isLinkedDependency) {
          continue;
        }
        dependenciesToCheckVersion.push({
          name,
          originalKey: name,
          parentCwd: cwd,
          version,
        });
      }
    }
    if (rootManifest.devDependencies && !config.production) {
      for (var _name in rootManifest.devDependencies) {
        var _version = rootManifest.devDependencies[_name];
        // skip linked dependencies
        var _isLinkedDependency = /^link:/i.test(_version) || (/^file:/i.test(_version) && config.linkFileDependencies);
        if (_isLinkedDependency) {
          continue;
        }
        dependenciesToCheckVersion.push({
          name: _name,
          originalKey: _name,
          parentCwd: cwd,
          version: _version,
        });
      }
    }

    var locationsVisited = new Set();
    while (dependenciesToCheckVersion.length) {
      var dep = dependenciesToCheckVersion.shift();
      var manifestLoc = path.resolve(dep.parentCwd, registryFolder, dep.name);
      if (locationsVisited.has(manifestLoc + `@${dep.version}`)) {
        continue;
      }
      locationsVisited.add(manifestLoc + `@${dep.version}`);
      // When plugnplay is enabled, packages aren't copied to the node_modules folder, so this check doesn't make sense
      // TODO: We ideally should check that the packages are located inside the cache instead
      if (config.plugnplayEnabled) {
        continue;
      }
      if (!(yield fs.exists(manifestLoc))) {
        reportError('packageNotInstalled', `${dep.originalKey}`);
        continue;
      }
      if (!(yield fs.exists(path.join(manifestLoc, 'package.json')))) {
        continue;
      }
      var pkg = yield config.readManifest(manifestLoc, registryName);
      if (
        semver.validRange(dep.version, config.looseSemver) &&
        !semver.satisfies(pkg.version, dep.version, config.looseSemver)
      ) {
        reportError('packageWrongVersion', dep.originalKey, dep.version, pkg.version);
        continue;
      }
      var dependencies = pkg.dependencies;
      if (dependencies) {
        for (var subdep in dependencies) {
          var subDepPath = path.resolve(manifestLoc, registryFolder, subdep);
          var found = false;
          var relative = path.relative(cwd, subDepPath);
          var locations = path.normalize(relative).split(registryFolder + path.sep).filter(dir => !!dir);
          locations.pop();
          while (locations.length >= 0) {
            var possiblePath;
            if (locations.length > 0) {
              possiblePath = path.join(cwd, registryFolder, locations.join(path.sep + registryFolder + path.sep));
            } else {
              possiblePath = cwd;
            }
            if (yield fs.exists(path.resolve(possiblePath, registryFolder, subdep))) {
              dependenciesToCheckVersion.push({
                name: subdep,
                originalKey: `${dep.originalKey}#${subdep}`,
                parentCwd: possiblePath,
                version: dependencies[subdep],
              });
              found = true;
              break;
            }
            if (!locations.length) {
              break;
            }
            locations.pop();
          }
          if (!found) {
            reportError('packageNotInstalled', `${dep.originalKey}#${subdep}`);
          }
        }
      }
    }

    if (errCount > 0) {
      throw new _errors.MessageError(reporter.lang('foundErrors', errCount));
    } else {
      reporter.success(reporter.lang('folderInSync'));
    }
  });

  return _verifyTreeCheck.apply(this, arguments);
}

function integrityHashCheck() {
  return _integrityHashCheck.apply(this, arguments);
}
function _integrityHashCheck() {
  _integrityHashCheck = (0, _asyncToGenerator2.default)(function* (
    config,
    reporter,
    flags,
    args
  ) {
    var errCount = 0;
    function reportError(msg) {
      var vars = Array.prototype.slice.call(arguments, 1);
      reporter.error(reporter.lang.apply(reporter, [msg].concat(vars)));
      errCount++;
    }
    var integrityChecker = new _integrityChecker.default(config);

    var lockfile = yield _lockfile.default.fromDirectory(config.cwd);
    var install = new _install.Install(flags, config, reporter, lockfile);

    // get patterns that are installed when running `yarn install`
    var _yield$install$fetchR = yield install.fetchRequestFromCwd(), patterns = _yield$install$fetchR.patterns, workspaceLayout = _yield$install$fetchR.workspaceLayout;

    var match = yield integrityChecker.check(patterns, lockfile.cache, flags, workspaceLayout);
    for (var pattern of match.missingPatterns) {
      reportError('lockfileNotContainPattern', pattern);
    }
    if (match.integrityFileMissing) {
      reportError('noIntegrityFile');
    }
    if (match.integrityMatches === false) {
      reporter.warn(reporter.lang(_integrityChecker.integrityErrors[match.integrityError]));
      reportError('integrityCheckFailed');
    }

    if (errCount > 0) {
      throw new _errors.MessageError(reporter.lang('foundErrors', errCount));
    } else {
      reporter.success(reporter.lang('folderInSync'));
    }
  });

  return _integrityHashCheck.apply(this, arguments);
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (flags.verifyTree) {
      yield verifyTreeCheck(config, reporter, flags, args);
      return;
    } else if (flags.integrity) {
      yield integrityHashCheck(config, reporter, flags, args);
      return;
    }

    var lockfile = yield _lockfile.default.fromDirectory(config.cwd);
    var install = new _install.Install(flags, config, reporter, lockfile);

    function humaniseLocation(loc) {
      var relative = path.relative(path.join(config.cwd, 'node_modules'), loc);
      var normalized = path.normalize(relative).split(path.sep);
      return normalized.filter(p => p !== 'node_modules').reduce((result, part) => {
        var length = result.length;
        if (length && result[length - 1].startsWith('@') && result[length - 1].indexOf(path.sep) === -1) {
          result[length - 1] += path.sep + part;
        } else {
          result.push(part);
        }
        return result;
      }, []);
    }

    var warningCount = 0;
    var errCount = 0;
    function reportError(msg) {
      var vars = Array.prototype.slice.call(arguments, 1);
      reporter.error(reporter.lang.apply(reporter, [msg].concat(vars)));
      errCount++;
    }

    // get patterns that are installed when running `yarn install`
    var _yield$install$hydrat = yield install.hydrate(), rawPatterns = _yield$install$hydrat.patterns, workspaceLayout = _yield$install$hydrat.workspaceLayout;
    var patterns = yield install.flatten(rawPatterns);

    // check if patterns exist in lockfile
    for (var pattern of patterns) {
      if (!lockfile.getLocked(pattern) && (!workspaceLayout || !workspaceLayout.getManifestByPattern(pattern))) {
        reportError('lockfileNotContainPattern', pattern);
      }
    }

    var bundledDeps = {};
    // check if any of the node_modules are out of sync
    var res = yield install.linker.getFlatHoistedTree(patterns, workspaceLayout);
    for (var _ref of res) {
      var loc = _ref[0], _ref$ = _ref[1], originalKey = _ref$.originalKey, pkg = _ref$.pkg, ignore = _ref$.ignore;
      if (ignore) {
        continue;
      }

      var parts = humaniseLocation(loc);

      // grey out hoisted portions of key
      var human = originalKey;
      var hoistedParts = parts.slice();
      var hoistedKey = parts.join('#');
      if (human !== hoistedKey) {
        var humanParts = human.split('#');

        for (var i = 0; i < humanParts.length; i++) {
          var humanPart = humanParts[i];

          if (hoistedParts[0] === humanPart) {
            hoistedParts.shift();

            if (i < humanParts.length - 1) {
              humanParts[i] += '#';
            }
          } else {
            humanParts[i] = reporter.format.dim(`${humanPart}#`);
          }
        }

        human = humanParts.join('');
      }

      // skip unnecessary checks for linked dependencies
      var remoteType = pkg._reference.remote.type;
      var isLinkedDependency =
        remoteType === 'link' || remoteType === 'workspace' || (remoteType === 'file' && config.linkFileDependencies);
      var isResolution = pkg._reference.hint === 'resolution';
      if (isLinkedDependency || isResolution) {
        continue;
      }

      if (!(yield fs.exists(loc))) {
        if (pkg._reference.optional) {
          reporter.warn(reporter.lang('optionalDepNotInstalled', human));
        } else {
          reportError('packageNotInstalled', human);
        }
        continue;
      }

      var pkgLoc = path.join(loc, 'package.json');

      if (yield fs.exists(pkgLoc)) {
        var packageJson = yield config.readJson(pkgLoc);
        packageJson.version = semver.clean(packageJson.version);

        if (pkg.version !== packageJson.version) {
          // node_modules contains wrong version
          reportError('packageWrongVersion', human, pkg.version, packageJson.version);
        }

        var deps = Object.assign({}, packageJson.dependencies, packageJson.peerDependencies);
        bundledDeps[packageJson.name] = packageJson.bundledDependencies || [];

        for (var name in deps) {
          var range = deps[name];
          if (!semver.validRange(range, config.looseSemver)) {
            continue; // exotic
          }

          var subHuman = `${human}#${name}@${range}`;

          // find the package that this will resolve to, factoring in hoisting
          var possibles = [];
          var depLoc = void 0;
          for (var _i = parts.length; _i >= 0; _i--) {
            var myParts = parts.slice(0, _i).concat(name);

            // build package.json location for this position
            var myDepPkgLoc = path.join(config.cwd, 'node_modules', myParts.join(`${path.sep}node_modules${path.sep}`));

            possibles.push(myDepPkgLoc);
          }
          while (possibles.length) {
            var _myDepPkgLoc = possibles.shift();
            if (yield fs.exists(_myDepPkgLoc)) {
              depLoc = _myDepPkgLoc;
              break;
            }
          }
          if (!depLoc) {
            // we'll hit the module not install error above when this module is hit
            continue;
          }

          var depPkgLoc = path.join(depLoc, 'package.json');

          if (yield fs.exists(depPkgLoc)) {
            var depPkg = yield config.readJson(depPkgLoc);
            var foundHuman = `${humaniseLocation(path.dirname(depPkgLoc)).join('#')}@${depPkg.version}`;
            if (!semver.satisfies(depPkg.version, range, config.looseSemver)) {
              // module isn't correct semver
              var resPattern = install.resolutionMap.find(name, originalKey.split('#'));
              if (resPattern) {
                var resHuman = `${human}#${resPattern}`;
                var _normalizePattern = (0, _normalizePattern2.normalizePattern)(resPattern), resRange = _normalizePattern.range;

                if (semver.satisfies(depPkg.version, resRange, config.looseSemver)) {
                  reporter.warn(reporter.lang('incompatibleResolutionVersion', foundHuman, subHuman));
                  warningCount++;
                } else {
                  reportError('packageDontSatisfy', resHuman, foundHuman);
                }
              } else {
                reportError('packageDontSatisfy', subHuman, foundHuman);
              }

              continue;
            }

            // check for modules above us that this could be deduped to
            for (var _loc of possibles) {
              var locPkg = path.join(_loc, 'package.json');

              if (!(yield fs.exists(locPkg))) {
                continue;
              }

              var _packageJson = yield config.readJson(locPkg);
              var packagePath = originalKey.split('#');
              var rootDep = packagePath[0];
              var packageName = packagePath[1] || _packageJson.name;

              var bundledDep = bundledDeps[rootDep] && bundledDeps[rootDep].indexOf(packageName) !== -1;
              if (
                !bundledDep &&
                (_packageJson.version === depPkg.version ||
                  (semver.satisfies(_packageJson.version, range, config.looseSemver) &&
                    semver.gt(_packageJson.version, depPkg.version, config.looseSemver)))
              ) {
                reporter.warn(
                  reporter.lang(
                    'couldBeDeduped',
                    subHuman,
                    _packageJson.version,
                    `${humaniseLocation(path.dirname(locPkg)).join('#')}@${_packageJson.version}`
                  )
                );
                warningCount++;
              }
              break;
            }
          }
        }
      }
    }

    if (warningCount > 1) {
      reporter.info(reporter.lang('foundWarnings', warningCount));
    }

    if (errCount > 0) {
      throw new _errors.MessageError(reporter.lang('foundErrors', errCount));
    } else {
      reporter.success(reporter.lang('folderInSync'));
    }
  });

  return _run.apply(this, arguments);
}
