'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.shouldUpdateLockfile = exports.default = void 0;

var semver = require('semver');
var minimatch = require('minimatch');
var _map = _interopRequireDefault(require('./util/map'));
var _normalizePattern2 = require('./util/normalize-pattern.js');
var _parsePackagePath = _interopRequireWildcard(require('./util/parse-package-path'));
var _resolvers = require('./resolvers');

var DIRECTORY_SEPARATOR = '/';
var GLOBAL_NESTED_DEP_PATTERN = '**/';

class ResolutionMap {
  constructor(config) {
    this.resolutionsByPackage = (0, _map.default)();
    this.config = config;
    this.reporter = config.reporter;
    this.delayQueue = new Set();
  }

  init(resolutions) {
    if (resolutions === void 0) resolutions = {};
    for (var globPattern in resolutions) {
      var info = this.parsePatternInfo(globPattern, resolutions[globPattern]);

      if (info) {
        var resolution = this.resolutionsByPackage[info.name] || [];
        this.resolutionsByPackage[info.name] = [].concat(resolution, [info]);
      }
    }
  }

  addToDelayQueue(req) {
    this.delayQueue.add(req);
  }

  parsePatternInfo(globPattern, range) {
    if (!(0, _parsePackagePath.isValidPackagePath)(globPattern)) {
      this.reporter.warn(this.reporter.lang('invalidResolutionName', globPattern));
      return null;
    }

    var directories = (0, _parsePackagePath.default)(globPattern);
    var name = directories.pop();

    if (!semver.validRange(range) && !(0, _resolvers.getExoticResolver)(range)) {
      this.reporter.warn(this.reporter.lang('invalidResolutionVersion', range));
      return null;
    }

    // For legacy support of resolutions, replace `name` with `**/name`
    if (name === globPattern) {
      globPattern = `${GLOBAL_NESTED_DEP_PATTERN}${name}`;
    }

    return {
      name,
      range,
      globPattern,
      pattern: `${name}@${range}`,
    };
  }

  find(reqPattern, parentNames) {
    var _normalizePattern = (0, _normalizePattern2.normalizePattern)(reqPattern), name = _normalizePattern.name, reqRange = _normalizePattern.range;
    var resolutions = this.resolutionsByPackage[name];

    if (!resolutions) {
      return '';
    }

    var modulePath = [].concat(parentNames, [name]).join(DIRECTORY_SEPARATOR);
    var _ref = resolutions.find(_ref2 => {
      var globPattern = _ref2.globPattern;
      return minimatch(modulePath, globPattern);
    }) || {};
    var pattern = _ref.pattern, range = _ref.range;

    if (pattern) {
      if (semver.validRange(reqRange) && semver.valid(range) && !semver.satisfies(range, reqRange)) {
        this.reporter.warn(this.reporter.lang('incompatibleResolutionVersion', pattern, reqPattern));
      }
    }

    return pattern;
  }
}
exports.default = ResolutionMap;

var shouldUpdateLockfile = (lockfileEntry, resolutionEntry) => {
  if (!lockfileEntry || !resolutionEntry) {
    return false;
  }

  return lockfileEntry.resolved !== resolutionEntry.remote.resolved;
};
exports.shouldUpdateLockfile = shouldUpdateLockfile;
