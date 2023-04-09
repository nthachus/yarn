'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.queryWhy = queryWhy;
exports.requireLockfile = void 0;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _install = require('./install.js');
var _constants = require('../../constants.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _errors = require('../../errors.js');

var requireLockfile = true;
exports.requireLockfile = requireLockfile;

var invariant = require('invariant');
var bytes = require('bytes');
var emoji = require('node-emoji');
var path = require('path');

function cleanQuery() {
  return _cleanQuery.apply(this, arguments);
}
function _cleanQuery() {
  _cleanQuery = (0, _asyncToGenerator2.default)(function* (config, query) {
    // if a location was passed then turn it into a hash query
    if (path.isAbsolute(query) && (yield fs.exists(query))) {
      // absolute path
      query = path.relative(config.cwd, query);
    }

    // remove references to node_modules with hashes
    query = query.replace(/([\\/]|^)node_modules[\\/]/g, '#');

    // remove trailing hashes
    query = query.replace(/^#+/g, '');

    // remove trailing paths from each part of the query, skip second part of path for scoped packages
    var queryParts = query.split('#');
    queryParts = queryParts.map((part) => {
      var parts = part.split(/[\\/]/g);

      if (part[0] === '@') {
        parts = parts.slice(0, 2);
      } else {
        parts = parts.slice(0, 1);
      }

      return parts.join('/');
    });
    query = queryParts.join('#');

    return query;
  });

  return _cleanQuery.apply(this, arguments);
}

function getPackageSize() {
  return _getPackageSize.apply(this, arguments);
}
function _getPackageSize() {
  _getPackageSize = (0, _asyncToGenerator2.default)(function* (tuple) {
    var loc = tuple[0];

    var files = yield fs.walk(loc, null, new Set([_constants.METADATA_FILENAME, _constants.TARBALL_FILENAME]));

    var sizes = yield Promise.all(files.map(walkFile => fs.getFileSizeOnDisk(walkFile.absolute)));

    return sum(sizes);
  });

  return _getPackageSize.apply(this, arguments);
}

function sum(array) {
  return array.length ? array.reduce((a, b) => a + b, 0) : 0;
}

function collect(
  hoistManifests,
  allDependencies,
  dependency,
  _temp
) {
  var _ref = _temp === void 0 ? {recursive: false} : _temp, recursive = _ref.recursive;
  var depInfo = dependency[1];
  var deps = depInfo.pkg.dependencies;

  if (!deps) {
    return allDependencies;
  }

  var dependencyKeys = new Set(Object.keys(deps));
  var directDependencies = [];

  for (var dep of hoistManifests) {
    var info = dep[1];

    if (!allDependencies.has(dep) && dependencyKeys.has(info.key)) {
      allDependencies.add(dep);
      directDependencies.push(dep);
    }
  }

  if (recursive) {
    directDependencies.forEach(dependency => collect(hoistManifests, allDependencies, dependency, {recursive: true}));
  }

  return allDependencies;
}

function getSharedDependencies(hoistManifests, transitiveKeys) {
  var sharedDependencies = new Set();
  for (var _ref2 of hoistManifests) {
    var info = _ref2[1];
    if (!transitiveKeys.has(info.key) && info.pkg.dependencies) {
      Object.keys(info.pkg.dependencies).forEach(dependency => {
        if (transitiveKeys.has(dependency) && !sharedDependencies.has(dependency)) {
          sharedDependencies.add(dependency);
        }
      });
    }
  }
  return sharedDependencies;
}

function setFlags(commander) {
  commander.description('Identifies why a package has been installed, detailing which other packages depend on it.');
}

function hasWrapper(commander, args) {
  return true;
}

// to conform to the current standard '#' as package tree separator
function toStandardPathString(pathString) {
  var str = pathString.replace(/\//g, '#');
  if (str[0] === '#') {
    return str.slice(1);
  }
  return str;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (!args.length) {
      throw new _errors.MessageError(reporter.lang('missingWhyDependency'));
    }
    if (args.length > 1) {
      throw new _errors.MessageError(reporter.lang('tooManyArguments', 1));
    }

    var query = yield cleanQuery(config, args[0]);

    reporter.step(1, 4, reporter.lang('whyStart', args[0]), emoji.get('thinking_face'));

    // init
    reporter.step(2, 4, reporter.lang('whyInitGraph'), emoji.get('truck'));
    var lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder, reporter);
    var install = new _install.Install(flags, config, reporter, lockfile);
    var _yield$install$fetchR = yield install.fetchRequestFromCwd(), depRequests = _yield$install$fetchR.requests, patterns = _yield$install$fetchR.patterns, workspaceLayout = _yield$install$fetchR.workspaceLayout;
    yield install.resolver.init(depRequests, {
      isFlat: install.flags.flat,
      isFrozen: install.flags.frozenLockfile,
      workspaceLayout,
    });
    var hoisted = yield install.linker.getFlatHoistedTree(patterns);

    // finding
    reporter.step(3, 4, reporter.lang('whyFinding'), emoji.get('mag'));

    var matches = queryWhy(query, hoisted);

    if (matches.length <= 0) {
      reporter.error(reporter.lang('whyUnknownMatch'));
      return;
    }

    var processMatch = /*#__PURE__*/ (function() {
      var _ref4 = (0, _asyncToGenerator2.default)(function* (match) {
        var matchInfo = match[1];
        var matchRef = matchInfo.pkg._reference;
        invariant(matchRef, 'expected reference');

        var distinctMatchPatterns = new Set(matchRef.patterns);
        var reasons = [];

        // reason: dependency of these modules
        if (matchInfo.originalParentPath.length > 0) {
          reasons.push({
            type: 'whyDependedOn',
            typeSimple: 'whyDependedOnSimple',
            value: toStandardPathString(matchInfo.originalParentPath),
          });
        }

        // reason: exists in manifest
        var rootType;
        for (var pattern of distinctMatchPatterns) {
          rootType = install.rootPatternsToOrigin[pattern];
          if (rootType) {
            reasons.push({
              type: 'whySpecified',
              typeSimple: 'whySpecifiedSimple',
              value: rootType,
            });
          }
        }

        // reason: this is hoisted from these modules
        for (var _path of matchInfo.previousPaths) {
          reasons.push({
            type: 'whyHoistedFrom',
            typeSimple: 'whyHoistedFromSimple',
            value: toStandardPathString(_path),
          });
        }

        // package sizes
        var packageSize = 0;
        var directSizes = [];
        var transitiveSizes = [];
        try {
          packageSize = yield getPackageSize(match);
        } catch (e) {}

        var dependencies = Array.from(collect(hoisted, new Set(), match));
        var transitiveDependencies = Array.from(collect(hoisted, new Set(), match, {recursive: true}));

        try {
          directSizes = yield Promise.all(dependencies.map(getPackageSize));
          transitiveSizes = yield Promise.all(transitiveDependencies.map(getPackageSize));
        } catch (e) {}

        var transitiveKeys = new Set(transitiveDependencies.map(_ref5 => {
          var info = _ref5[1];
          return info.key;
        }));
        var sharedDependencies = getSharedDependencies(hoisted, transitiveKeys);

        // prepare output: populate reporter
        reporter.info(reporter.lang('whyMatch', `${matchInfo.key}@${matchInfo.pkg.version}`));
        //
        // reason: hoisted/nohoist
        if (matchInfo.isNohoist) {
          reasons.push({
            type: 'whyNotHoisted',
            typeSimple: 'whyNotHoistedSimple',
            value: matchInfo.nohoistList,
          });
        } else if (query === matchInfo.originalKey) {
          reporter.info(reporter.lang('whyHoistedTo', matchInfo.key));
        }

        if (reasons.length === 1) {
          reporter.info(reporter.lang(reasons[0].typeSimple, reasons[0].value));
        } else if (reasons.length > 1) {
          reporter.info(reporter.lang('whyReasons'));
          reporter.list('reasons', reasons.map(reason => reporter.lang(reason.type, reason.value)));
        } else {
          reporter.error(reporter.lang('whyWhoKnows'));
        }

        if (packageSize) {
          // stats: file size of this dependency without any dependencies
          reporter.info(reporter.lang('whyDiskSizeWithout', bytes(packageSize)));

          // stats: file size of this dependency including dependencies that aren't shared
          reporter.info(reporter.lang('whyDiskSizeUnique', bytes(packageSize + sum(directSizes))));

          // stats: file size of this dependency including dependencies
          reporter.info(reporter.lang('whyDiskSizeTransitive', bytes(packageSize + sum(transitiveSizes))));

          // stats: shared transitive dependencies
          reporter.info(reporter.lang('whySharedDependencies', sharedDependencies.size));
        }
      });

      return function processMatch() {
        return _ref4.apply(this, arguments);
      };
    })();

    reporter.step(4, 4, reporter.lang('whyCalculating'), emoji.get('aerial_tramway'));
    for (var match of matches) {
      yield processMatch(match);
    }
  });

  return _run.apply(this, arguments);
}

function queryWhy(pattern, hoisted) {
  var nohoistPattern = `#${pattern}`;
  var found = [];
  for (var _ref3 of hoisted) {
    var loc = _ref3[0], info = _ref3[1];
    if (info.key === pattern || info.previousPaths.indexOf(pattern) >= 0 || info.key.endsWith(nohoistPattern)) {
      found.push([loc, info]);
    }
  }
  return found;
}
