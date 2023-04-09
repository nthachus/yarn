'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.examples = void 0;
exports.getCachedPackagesDirs = getCachedPackagesDirs;
exports.hasWrapper = hasWrapper;
exports.run = void 0;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));
var fs = _interopRequireWildcard(require('../../util/fs.js'));

var invariant = require('invariant');
var path = require('path');
var micromatch = require('micromatch');

function hasWrapper(flags, args) {
  return args[0] !== 'dir';
}

function getCachedPackagesDirs() {
  return _getCachedPackagesDirs.apply(this, arguments);
}
function _getCachedPackagesDirs() {
  _getCachedPackagesDirs = (0, _asyncToGenerator2.default)(function* (config, currentPath) {
    var results = [];
    var stat = yield fs.lstat(currentPath);

    if (!stat.isDirectory()) {
      return results;
    }

    var folders = yield fs.readdir(currentPath);
    for (var folder of folders) {
      if (folder[0] === '.') {
        continue;
      }
      var packageParentPath = path.join(currentPath, folder, 'node_modules');

      var candidates = yield fs.readdir(packageParentPath);
      invariant(
        candidates.length === 1,
        `There should only be one folder in a package cache (got ${candidates.join(',')} in ${packageParentPath})`
      );

      for (var candidate of candidates) {
        var candidatePath = path.join(packageParentPath, candidate);
        if (candidate.charAt(0) === '@') {
          var subCandidates = yield fs.readdir(candidatePath);
          invariant(
            subCandidates.length === 1,
            `There should only be one folder in a package cache (got ${subCandidates.join(',')} in ${candidatePath})`
          );

          for (var subCandidate of subCandidates) {
            var subCandidatePath = path.join(candidatePath, subCandidate);
            results.push(subCandidatePath);
          }
        } else {
          results.push(candidatePath);
        }
      }
    }

    return results;
  });

  return _getCachedPackagesDirs.apply(this, arguments);
}

function _getMetadataWithPath(getMetadataFn, paths) {
  return Promise.all(
    paths.map(path =>
      getMetadataFn(path)
        .then(r => {
          r._path = path;
          return r;
        })
        .catch(error => undefined)
    )
  );
}

function getCachedPackages() {
  return _getCachedPackages.apply(this, arguments);
}
function _getCachedPackages() {
  _getCachedPackages = (0, _asyncToGenerator2.default)(function* (config) {
    var paths = yield getCachedPackagesDirs(config, config.cacheFolder);
    return _getMetadataWithPath(config.readPackageMetadata.bind(config), paths).then(packages =>
      packages.filter(p => !!p)
    );
  });

  return _getCachedPackages.apply(this, arguments);
}

function list() {
  return _list.apply(this, arguments);
}
function _list() {
  _list = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var filterOut = function(_temp) {
      var _ref = _temp === void 0 ? {} : _temp, registry = _ref.registry, manifest = _ref.package, remote = _ref.remote;
      if (flags.pattern && !micromatch.contains(manifest.name, flags.pattern)) {
        return false;
      }
      return true;
    };

    var forReport = function(_temp2) {
      var _ref2 = _temp2 === void 0 ? {} : _temp2, registry = _ref2.registry, manifest = _ref2.package, remote = _ref2.remote;
      return [
        manifest.name,
        manifest.version,
        registry,
        (remote && remote.resolved) || '',
      ];
    };

    var packages = yield getCachedPackages(config);
    var body = packages.filter(filterOut).map(forReport);
    reporter.table(['Name', 'Version', 'Registry', 'Resolved'], body);
  });

  return _list.apply(this, arguments);
}

function clean() {
  return _clean.apply(this, arguments);
}
function _clean() {
  _clean = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (config.cacheFolder) {
      var activity = reporter.activity();

      if (args.length > 0) {
        // Clear named packages from cache
        var packages = yield getCachedPackages(config);
        var shouldDelete = function(_temp3) {
          var _ref3 = _temp3 === void 0 ? {} : _temp3, registry = _ref3.registry, manifest = _ref3.package, remote = _ref3.remote;
          return args.indexOf(manifest.name) !== -1;
        };
        var packagesToDelete = packages.filter(shouldDelete);

        for (var manifest of packagesToDelete) {
          var relativePath = path.relative(config.cacheFolder, manifest._path);
          while (relativePath && relativePath !== '.') {
            yield fs.unlink(path.resolve(config.cacheFolder, relativePath));
            relativePath = path.dirname(relativePath);
          }
        }

        activity.end();
        reporter.success(reporter.lang('clearedPackageFromCache', args[0]));
      } else {
        // Clear all cache
        yield fs.unlink(config._cacheRootFolder);
        yield fs.mkdirp(config.cacheFolder);
        activity.end();
        reporter.success(reporter.lang('clearedCache'));
      }
    }
  });

  return _clean.apply(this, arguments);
}

var _buildSubCommands = (0, _buildSubCommands2.default)('cache', {
  ls(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      reporter.warn(`\`yarn cache ls\` is deprecated. Please use \`yarn cache list\`.`);
      yield list(config, reporter, flags, args);
    })();
  },
  list,
  clean,
  dir(config, reporter) {
    reporter.log(config.cacheFolder, {force: true});
  },
});
var _setFlags = _buildSubCommands.setFlags;

exports.run = _buildSubCommands.run;
exports.examples = _buildSubCommands.examples;

function setFlags(commander) {
  _setFlags(commander);
  commander.description('Yarn cache list will print out every cached package.');
  commander.option('--pattern [pattern]', 'filter cached packages by pattern');
}
