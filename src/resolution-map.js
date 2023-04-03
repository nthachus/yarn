const semver = require('semver');
const minimatch = require('minimatch');
import map from './util/map';
import {normalizePattern} from './util/normalize-pattern.js';
import parsePackagePath, {isValidPackagePath} from './util/parse-package-path';
import {getExoticResolver} from './resolvers';

const DIRECTORY_SEPARATOR = '/';
const GLOBAL_NESTED_DEP_PATTERN = '**/';

export default class ResolutionMap {
  constructor(config) {
    this.resolutionsByPackage = map();
    this.config = config;
    this.reporter = config.reporter;
    this.delayQueue = new Set();
  }

  init(resolutions = {}) {
    for (const globPattern in resolutions) {
      const info = this.parsePatternInfo(globPattern, resolutions[globPattern]);

      if (info) {
        const resolution = this.resolutionsByPackage[info.name] || [];
        this.resolutionsByPackage[info.name] = [...resolution, info];
      }
    }
  }

  addToDelayQueue(req) {
    this.delayQueue.add(req);
  }

  parsePatternInfo(globPattern, range) {
    if (!isValidPackagePath(globPattern)) {
      this.reporter.warn(this.reporter.lang('invalidResolutionName', globPattern));
      return null;
    }

    const directories = parsePackagePath(globPattern);
    const name = directories.pop();

    if (!semver.validRange(range) && !getExoticResolver(range)) {
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
    const {name, range: reqRange} = normalizePattern(reqPattern);
    const resolutions = this.resolutionsByPackage[name];

    if (!resolutions) {
      return '';
    }

    const modulePath = [...parentNames, name].join(DIRECTORY_SEPARATOR);
    const {pattern, range} = resolutions.find(({globPattern}) => minimatch(modulePath, globPattern)) || {};

    if (pattern) {
      if (semver.validRange(reqRange) && semver.valid(range) && !semver.satisfies(range, reqRange)) {
        this.reporter.warn(this.reporter.lang('incompatibleResolutionVersion', pattern, reqPattern));
      }
    }

    return pattern;
  }
}

export const shouldUpdateLockfile = (lockfileEntry, resolutionEntry) => {
  if (!lockfileEntry || !resolutionEntry) {
    return false;
  }

  return lockfileEntry.resolved !== resolutionEntry.remote.resolved;
};
