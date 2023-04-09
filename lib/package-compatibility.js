'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.check = check;
exports.checkOne = checkOne;
exports.shouldCheck = shouldCheck;
exports.testEngine = testEngine;

var _errors = require('./errors.js');
var _map = _interopRequireDefault(require('./util/map.js'));
var _misc = require('./util/misc.js');
var _yarnVersion = require('./util/yarn-version.js');
var _semver = require('./util/semver.js');

var semver = require('semver');

var VERSIONS = Object.assign({}, process.versions, {
  yarn: _yarnVersion.version,
});

function isValid(items, actual) {
  var isNotWhitelist = true;
  var isBlacklist = false;

  for (var item of items) {
    // blacklist
    if (item[0] === '!') {
      isBlacklist = true;

      if (actual === item.slice(1)) {
        return false;
      }
      // whitelist
    } else {
      isNotWhitelist = false;

      if (item === actual) {
        return true;
      }
    }
  }

  // npm allows blacklists and whitelists to be mixed. Blacklists with
  // whitelisted items should be treated as whitelists.
  return isBlacklist && isNotWhitelist;
}

var aliases = (0, _map.default)({
  iojs: 'node', // we should probably prompt these libraries to fix this
});

var ignore = [
  'npm', // we'll never satisfy this for obvious reasons
  'teleport', // a module bundler used by some modules
  'rhino', // once a target for older modules
  'cordovaDependencies', // http://bit.ly/2tkUePg
  'parcel', // used for plugins of the Parcel bundler
];

function testEngine(name, range, versions, looseSemver) {
  var actual = versions[name];
  if (!actual) {
    return false;
  }

  if (!semver.valid(actual, looseSemver)) {
    return false;
  }

  if (semver.satisfies(actual, range, looseSemver)) {
    return true;
  }

  if (name === 'yarn' && (0, _semver.satisfiesWithPrereleases)(actual, range, looseSemver)) {
    return true;
  }

  if (name === 'node' && semver.gt(actual, '1.0.0', looseSemver)) {
    // WARNING: this is a massive hack and is super gross but necessary for compatibility
    // some modules have the `engines.node` field set to a caret version below semver major v1
    // eg. ^0.12.0. this is problematic as we enforce engines checks and node is now on version >=1
    // to allow this pattern we transform the node version to fake ones in the minor range 10-13
    var major = semver.major(actual, looseSemver);
    var fakes = [`0.10.${major}`, `0.11.${major}`, `0.12.${major}`, `0.13.${major}`];
    for (var actualFake of fakes) {
      if (semver.satisfies(actualFake, range, looseSemver)) {
        return true;
      }
    }
  }

  // incompatible version
  return false;
}

function isValidArch(archs) {
  return isValid(archs, process.arch);
}

function isValidPlatform(platforms) {
  return isValid(platforms, process.platform);
}

function checkOne(info, config, ignoreEngines) {
  var didIgnore = false;
  var didError = false;
  var reporter = config.reporter;
  var human = `${info.name}@${info.version}`;

  var pushError = msg => {
    var ref = info._reference;

    if (ref && ref.optional) {
      ref.ignore = true;
      ref.incompatible = true;

      if (!didIgnore) {
        didIgnore = true;
      }
    } else {
      reporter.error(`${human}: ${msg}`);
      didError = true;
    }
  };

  var os = info.os, cpu = info.cpu, engines = info.engines;

  if (shouldCheckPlatform(os, config.ignorePlatform) && !isValidPlatform(os)) {
    pushError(reporter.lang('incompatibleOS', process.platform));
  }

  if (shouldCheckCpu(cpu, config.ignorePlatform) && !isValidArch(cpu)) {
    pushError(reporter.lang('incompatibleCPU', process.arch));
  }

  if (shouldCheckEngines(engines, ignoreEngines)) {
    for (var entry of (0, _misc.entries)(info.engines)) {
      var name = entry[0];
      var range = entry[1];

      if (aliases[name]) {
        name = aliases[name];
      }

      if (VERSIONS[name]) {
        if (!testEngine(name, range, VERSIONS, config.looseSemver)) {
          pushError(reporter.lang('incompatibleEngine', name, range, VERSIONS[name]));
        }
      } else if (ignore.indexOf(name) < 0) {
        reporter.warn(`${human}: ${reporter.lang('invalidEngine', name)}`);
      }
    }
  }

  if (didError) {
    throw new _errors.MessageError(reporter.lang('foundIncompatible'));
  }
}

function check(infos, config, ignoreEngines) {
  for (var info of infos) {
    checkOne(info, config, ignoreEngines);
  }
}

function shouldCheckCpu(cpu, ignorePlatform) {
  return !ignorePlatform && Array.isArray(cpu) && cpu.length > 0;
}

function shouldCheckPlatform(os, ignorePlatform) {
  return !ignorePlatform && Array.isArray(os) && os.length > 0;
}

function shouldCheckEngines(engines, ignoreEngines) {
  return !ignoreEngines && typeof engines === 'object';
}

function shouldCheck(
  manifest,
  options
) {
  return (
    shouldCheckCpu(manifest.cpu, options.ignorePlatform) ||
    shouldCheckPlatform(manifest.os, options.ignorePlatform) ||
    shouldCheckEngines(manifest.engines, options.ignoreEngines)
  );
}
