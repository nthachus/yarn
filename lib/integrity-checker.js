'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.integrityErrors = exports.default = void 0;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var constants = _interopRequireWildcard(require('./constants.js'));
var fs = _interopRequireWildcard(require('./util/fs.js'));
var _misc = require('./util/misc.js');
var _packageNameUtils = require('./util/package-name-utils.js');
var _workspaceLayout = _interopRequireDefault(require('./workspace-layout.js'));

var invariant = require('invariant');
var path = require('path');

var integrityErrors = {
  EXPECTED_IS_NOT_A_JSON: 'integrityFailedExpectedIsNotAJSON',
  FILES_MISSING: 'integrityFailedFilesMissing',
  LOCKFILE_DONT_MATCH: 'integrityLockfilesDontMatch',
  FLAGS_DONT_MATCH: 'integrityFlagsDontMatch',
  LINKED_MODULES_DONT_MATCH: 'integrityCheckLinkedModulesDontMatch',
  PATTERNS_DONT_MATCH: 'integrityPatternsDontMatch',
  MODULES_FOLDERS_MISSING: 'integrityModulesFoldersMissing',
  SYSTEM_PARAMS_DONT_MATCH: 'integritySystemParamsDontMatch',
};
exports.integrityErrors = integrityErrors;

var INTEGRITY_FILE_DEFAULTS = () => ({
  systemParams: (0, _packageNameUtils.getSystemParams)(),
  modulesFolders: [],
  flags: [],
  linkedModules: [],
  topLevelPatterns: [],
  lockfileEntries: {},
  files: [],
});

/**
 *
 */
class InstallationIntegrityChecker {
  constructor(config) {
    this.config = config;
  }

  /**
   * Get the common ancestor of every node_modules - it may be a node_modules directory itself, but isn't required to.
   */

  _getModulesRootFolder() {
    if (this.config.modulesFolder) {
      return this.config.modulesFolder;
    } else if (this.config.workspaceRootFolder) {
      return this.config.workspaceRootFolder;
    } else {
      return path.join(this.config.lockfileFolder, constants.NODE_MODULES_FOLDER);
    }
  }

  /**
   * Get the directory in which the yarn-integrity file should be written.
   */

  _getIntegrityFileFolder() {
    if (this.config.modulesFolder) {
      return this.config.modulesFolder;
    } else if (this.config.enableMetaFolder) {
      return path.join(this.config.lockfileFolder, constants.META_FOLDER);
    } else {
      return path.join(this.config.lockfileFolder, constants.NODE_MODULES_FOLDER);
    }
  }

  /**
   * Get the full path of the yarn-integrity file.
   */

  _getIntegrityFileLocation() {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var locationFolder = _this._getIntegrityFileFolder();
      var locationPath = path.join(locationFolder, constants.INTEGRITY_FILENAME);

      var exists = yield fs.exists(locationPath);

      return {
        locationFolder,
        locationPath,
        exists,
      };
    })();
  }

  /**
   * Get the list of the directories that contain our modules (there might be multiple such folders b/c of workspaces).
   */

  _getModulesFolders(_temp) {
    var _ref = _temp === void 0 ? {} : _temp, workspaceLayout = _ref.workspaceLayout;
    var locations = [];

    if (this.config.modulesFolder) {
      locations.push(this.config.modulesFolder);
    } else {
      locations.push(path.join(this.config.lockfileFolder, constants.NODE_MODULES_FOLDER));
    }

    if (workspaceLayout) {
      for (var workspaceName of Object.keys(workspaceLayout.workspaces)) {
        var loc = workspaceLayout.workspaces[workspaceName].loc;

        if (loc) {
          locations.push(path.join(loc, constants.NODE_MODULES_FOLDER));
        }
      }
    }

    return locations.sort(_misc.sortAlpha);
  }

  /**
   * Get a list of the files that are located inside our module folders.
   */
  _getIntegrityListing(_temp2) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _ref2 = _temp2 === void 0 ? {} : _temp2, workspaceLayout = _ref2.workspaceLayout;
      var files = [];

      var recurse = /*#__PURE__*/ (function() {
        var _ref3 = (0, _asyncToGenerator2.default)(function* (dir) {
          for (var file of yield fs.readdir(dir)) {
            var entry = path.join(dir, file);
            var stat = yield fs.lstat(entry);

            if (stat.isDirectory()) {
              yield recurse(entry);
            } else {
              files.push(entry);
            }
          }
        });

        return function recurse() {
          return _ref3.apply(this, arguments);
        };
      })();

      for (var modulesFolder of _this2._getModulesFolders({workspaceLayout})) {
        if (yield fs.exists(modulesFolder)) {
          yield recurse(modulesFolder);
        }
      }

      return files;
    })();
  }

  /**
   * Generate integrity hash of input lockfile.
   */

  _generateIntegrityFile(
    lockfile,
    patterns,
    flags,
    workspaceLayout,
    artifacts
  ) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var result = (0, _extends2.default)({}, INTEGRITY_FILE_DEFAULTS(), {
        artifacts,
      });

      result.topLevelPatterns = patterns;

      // If using workspaces, we also need to add the workspaces patterns to the top-level, so that we'll know if a
      // dependency is added or removed into one of them. We must take care not to read the aggregator (if !loc).
      //
      // Also note that we can't use of workspaceLayout.workspaces[].manifest._reference.patterns, because when
      // doing a "yarn check", the _reference property hasn't yet been properly initialized.

      if (workspaceLayout) {
        result.topLevelPatterns = result.topLevelPatterns.filter(p => {
          // $FlowFixMe
          return !workspaceLayout.getManifestByPattern(p);
        });

        for (var name of Object.keys(workspaceLayout.workspaces)) {
          if (!workspaceLayout.workspaces[name].loc) {
            continue;
          }

          var manifest = workspaceLayout.workspaces[name].manifest;

          if (manifest) {
            for (var dependencyType of constants.DEPENDENCY_TYPES) {
              var dependencies = manifest[dependencyType];

              if (!dependencies) {
                continue;
              }

              for (var dep of Object.keys(dependencies)) {
                result.topLevelPatterns.push(`${dep}@${dependencies[dep]}`);
              }
            }
          }
        }
      }

      result.topLevelPatterns.sort(_misc.sortAlpha);

      if (flags.checkFiles) {
        result.flags.push('checkFiles');
      }

      if (flags.flat) {
        result.flags.push('flat');
      }

      if (_this3.config.ignoreScripts) {
        result.flags.push('ignoreScripts');
      }
      if (_this3.config.focus) {
        result.flags.push('focus: ' + _this3.config.focusedWorkspaceName);
      }

      if (_this3.config.production) {
        result.flags.push('production');
      }

      if (_this3.config.plugnplayEnabled) {
        result.flags.push('plugnplay');
      }

      var linkedModules = _this3.config.linkedModules;

      if (linkedModules.length) {
        result.linkedModules = linkedModules.sort(_misc.sortAlpha);
      }

      for (var key of Object.keys(lockfile)) {
        result.lockfileEntries[key] = lockfile[key].resolved || '';
      }

      for (var modulesFolder of _this3._getModulesFolders({workspaceLayout})) {
        if (yield fs.exists(modulesFolder)) {
          result.modulesFolders.push(path.relative(_this3.config.lockfileFolder, modulesFolder));
        }
      }

      if (flags.checkFiles) {
        var modulesRoot = _this3._getModulesRootFolder();

        result.files = (yield _this3._getIntegrityListing({workspaceLayout}))
          .map(entry => path.relative(modulesRoot, entry))
          .sort(_misc.sortAlpha);
      }

      return result;
    })();
  }

  _getIntegrityFile(locationPath) {
    return (0, _asyncToGenerator2.default)(function* () {
      var expectedRaw = yield fs.readFile(locationPath);
      try {
        return (0, _extends2.default)(
          {},
          INTEGRITY_FILE_DEFAULTS(),
          JSON.parse(expectedRaw)
        );
      } catch (e) {
        // ignore JSON parsing for legacy text integrity files compatibility
      }
      return null;
    })();
  }

  _compareIntegrityFiles(
    actual,
    expected,
    checkFiles,
    workspaceLayout
  ) {
    if (!expected) {
      return 'EXPECTED_IS_NOT_A_JSON';
    }

    if (!(0, _misc.compareSortedArrays)(actual.linkedModules, expected.linkedModules)) {
      return 'LINKED_MODULES_DONT_MATCH';
    }

    if (actual.systemParams !== expected.systemParams) {
      return 'SYSTEM_PARAMS_DONT_MATCH';
    }

    var relevantExpectedFlags = expected.flags.slice();

    // If we run "yarn" after "yarn --check-files", we shouldn't fail the less strict validation
    if (actual.flags.indexOf('checkFiles') === -1) {
      relevantExpectedFlags = relevantExpectedFlags.filter(flag => flag !== 'checkFiles');
    }

    if (!(0, _misc.compareSortedArrays)(actual.flags, relevantExpectedFlags)) {
      return 'FLAGS_DONT_MATCH';
    }

    if (!(0, _misc.compareSortedArrays)(actual.topLevelPatterns, expected.topLevelPatterns || [])) {
      return 'PATTERNS_DONT_MATCH';
    }

    for (var key of Object.keys(actual.lockfileEntries)) {
      if (actual.lockfileEntries[key] !== expected.lockfileEntries[key]) {
        return 'LOCKFILE_DONT_MATCH';
      }
    }

    for (var _key of Object.keys(expected.lockfileEntries)) {
      if (actual.lockfileEntries[_key] !== expected.lockfileEntries[_key]) {
        return 'LOCKFILE_DONT_MATCH';
      }
    }

    if (checkFiles) {
      // Early bailout if we expect more files than what we have
      if (expected.files.length > actual.files.length) {
        return 'FILES_MISSING';
      }

      // Since we know the "files" array is sorted (alphabetically), we can optimize the thing
      // Instead of storing the files in a Set, we can just iterate both arrays at once. O(n)!
      for (var u = 0, v = 0; u < expected.files.length; ++u) {
        // Index that, if reached, means that we won't have enough food to match the remaining expected entries anyway
        var max = v + (actual.files.length - v) - (expected.files.length - u) + 1;

        // Skip over files that have been added (ie not present in 'expected')
        while (v < max && actual.files[v] !== expected.files[u]) {
          v += 1;
        }

        // If we've reached the index defined above, the file is either missing or we can early exit
        if (v === max) {
          return 'FILES_MISSING';
        }
      }
    }
    return 'OK';
  }

  check(
    patterns,
    lockfile,
    flags,
    workspaceLayout
  ) {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // check if patterns exist in lockfile
      var missingPatterns = patterns.filter(
        p => !lockfile[p] && (!workspaceLayout || !workspaceLayout.getManifestByPattern(p))
      );

      var loc = yield _this4._getIntegrityFileLocation();
      if (missingPatterns.length || !loc.exists) {
        return {
          integrityFileMissing: !loc.exists,
          missingPatterns,
        };
      }

      var actual = yield _this4._generateIntegrityFile(lockfile, patterns, flags, workspaceLayout);

      var expected = yield _this4._getIntegrityFile(loc.locationPath);
      var integrityMatches = _this4._compareIntegrityFiles(actual, expected, flags.checkFiles, workspaceLayout);

      if (integrityMatches === 'OK') {
        invariant(expected, "The integrity shouldn't pass without integrity file");
        for (var modulesFolder of expected.modulesFolders) {
          if (!(yield fs.exists(path.join(_this4.config.lockfileFolder, modulesFolder)))) {
            integrityMatches = 'MODULES_FOLDERS_MISSING';
          }
        }
      }

      return {
        integrityFileMissing: false,
        integrityMatches: integrityMatches === 'OK',
        integrityError: integrityMatches === 'OK' ? undefined : integrityMatches,
        missingPatterns,
        hardRefreshRequired: integrityMatches === 'SYSTEM_PARAMS_DONT_MATCH',
      };
    })();
  }

  /**
   * Get artifacts from integrity file if it exists.
   */
  getArtifacts() {
    var _this5 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var loc = yield _this5._getIntegrityFileLocation();
      if (!loc.exists) {
        return null;
      }

      var expectedRaw = yield fs.readFile(loc.locationPath);
      var expected;
      try {
        expected = JSON.parse(expectedRaw);
      } catch (e) {
        // ignore JSON parsing for legacy text integrity files compatibility
      }

      return expected ? expected.artifacts : null;
    })();
  }

  /**
   * Write the integrity hash of the current install to disk.
   */
  save(
    patterns,
    lockfile,
    flags,
    workspaceLayout,
    artifacts
  ) {
    var _this6 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var integrityFile = yield _this6._generateIntegrityFile(lockfile, patterns, flags, workspaceLayout, artifacts);

      var loc = yield _this6._getIntegrityFileLocation();
      invariant(loc.locationPath, 'expected integrity hash location');

      yield fs.mkdirp(path.dirname(loc.locationPath));
      yield fs.writeFile(loc.locationPath, JSON.stringify(integrityFile, null, 2));
    })();
  }

  removeIntegrityFile() {
    var _this7 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var loc = yield _this7._getIntegrityFileLocation();
      if (loc.exists) {
        yield fs.unlink(loc.locationPath);
      }
    })();
  }
}
exports.default = InstallationIntegrityChecker;
