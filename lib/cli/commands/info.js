'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _npmRegistry = _interopRequireDefault(require('../../registries/npm-registry.js'));
var _parsePackageName2 = _interopRequireDefault(require('../../util/parse-package-name.js'));
var semver = require('semver');

function clean(object) {
  if (Array.isArray(object)) {
    var result = [];
    object.forEach(item => {
      item = clean(item);
      if (item) {
        result.push(item);
      }
    });
    return result;
  } else if (typeof object === 'object') {
    var _result = {};
    for (var key in object) {
      if (key.startsWith('_')) {
        continue;
      }

      var item = clean(object[key]);
      if (item) {
        _result[key] = item;
      }
    }
    return _result;
  } else if (object) {
    return object;
  } else {
    return null;
  }
}

function setFlags(commander) {
  commander.description('Shows information about a package.');
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (args.length > 2) {
      reporter.error(reporter.lang('tooManyArguments', 2));
      return;
    }

    var packageName = args.shift() || '.';

    // Handle the case when we are referencing a local package.
    if (packageName === '.') {
      packageName = (yield config.readRootManifest()).name;
    }

    var packageInput = _npmRegistry.default.escapeName(packageName);
    var _parsePackageName = (0, _parsePackageName2.default)(packageInput), name = _parsePackageName.name, version = _parsePackageName.version;

    var result;
    try {
      result = yield config.registries.npm.request(name, {unfiltered: true});
    } catch (e) {
      reporter.error(reporter.lang('infoFail'));
      return;
    }
    if (!result) {
      reporter.error(reporter.lang('infoFail'));
      return;
    }

    result = clean(result);

    var versions = result.versions;
    // $FlowFixMe
    result.versions = Object.keys(versions).sort(semver.compareLoose);
    result.version = version || result['dist-tags'].latest;
    result = Object.assign(result, versions[result.version]);

    var fieldPath = args.shift();
    var fields = fieldPath ? fieldPath.split('.') : [];

    // Readmes can be long so exclude them unless explicitly asked for.
    if (fields[0] !== 'readme') {
      delete result.readme;
    }

    result = fields.reduce((prev, cur) => prev && prev[cur], result);
    reporter.inspect(result);
  });

  return _run.apply(this, arguments);
}
