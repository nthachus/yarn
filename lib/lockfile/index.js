'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.default = void 0;
exports.explodeEntry = explodeEntry;
exports.implodeEntry = implodeEntry;
Object.defineProperty(exports, 'parse', {
  enumerable: true,
  get: () => _parse.default,
});
Object.defineProperty(exports, 'stringify', {
  enumerable: true,
  get: () => _stringify.default,
});

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
var _misc = require('../util/misc.js');
var _normalizePattern = require('../util/normalize-pattern.js');
var _parse = _interopRequireDefault(require('./parse.js'));
var _constants = require('../constants.js');
var _fs = require('../util/fs.js');
var _stringify = _interopRequireDefault(require('./stringify.js'));

var invariant = require('invariant');
var path = require('path');
var ssri = require('ssri');

function getName(pattern) {
  return (0, _normalizePattern.normalizePattern)(pattern).name;
}

function blankObjectUndefined(obj) {
  return obj && Object.keys(obj).length ? obj : undefined;
}

function keyForRemote(remote) {
  return remote.resolved || (remote.reference && remote.hash ? `${remote.reference}#${remote.hash}` : null);
}

function serializeIntegrity(integrity) {
  // We need this because `Integrity.toString()` does not use sorting to ensure a stable string output
  // See https://git.io/vx2Hy
  return integrity.toString().split(' ').sort().join(' ');
}

function implodeEntry(pattern, obj) {
  var inferredName = getName(pattern);
  var integrity = obj.integrity ? serializeIntegrity(obj.integrity) : '';
  var imploded = {
    name: inferredName === obj.name ? undefined : obj.name,
    version: obj.version,
    uid: obj.uid === obj.version ? undefined : obj.uid,
    resolved: obj.resolved,
    registry: obj.registry === 'npm' ? undefined : obj.registry,
    dependencies: blankObjectUndefined(obj.dependencies),
    optionalDependencies: blankObjectUndefined(obj.optionalDependencies),
    permissions: blankObjectUndefined(obj.permissions),
    prebuiltVariants: blankObjectUndefined(obj.prebuiltVariants),
  };

  if (integrity) {
    imploded.integrity = integrity;
  }
  return imploded;
}

function explodeEntry(pattern, obj) {
  obj.optionalDependencies = obj.optionalDependencies || {};
  obj.dependencies = obj.dependencies || {};
  obj.uid = obj.uid || obj.version;
  obj.permissions = obj.permissions || {};
  obj.registry = obj.registry || 'npm';
  obj.name = obj.name || getName(pattern);
  var integrity = obj.integrity;
  if (integrity && integrity.isIntegrity) {
    obj.integrity = ssri.parse(integrity);
  }
  return obj;
}

class Lockfile {
  constructor() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      cache = _ref.cache,
      source = _ref.source,
      parseResultType = _ref.parseResultType;

    // source string if the `cache` was parsed
    this.source = source || '';
    this.cache = cache;
    this.parseResultType = parseResultType;
  }

  // if true, we're parsing an old yarn file and need to update integrity fields
  hasEntriesExistWithoutIntegrity() {
    if (!this.cache) {
      return false;
    }

    for (var key in this.cache) {
      // $FlowFixMe - `this.cache` is clearly defined at this point
      if (!/^.*@(file:|http)/.test(key) && this.cache[key] && !this.cache[key].integrity) {
        return true;
      }
    }

    return false;
  }

  static fromDirectory(dir, reporter) {
    // read the manifest in this directory
    var lockfileLoc = path.join(dir, _constants.LOCKFILE_FILENAME);

    var lockfile;
    var rawLockfile = '';
    var parseResult;

    if ((0, _fs.exists)(lockfileLoc)) {
      rawLockfile = (0, _fs.readFile)(lockfileLoc);
      parseResult = (0, _parse.default)(rawLockfile, lockfileLoc);

      if (reporter) {
        if (parseResult.type === 'merge') {
          reporter.info(reporter.lang('lockfileMerged'));
        } else if (parseResult.type === 'conflict') {
          reporter.warn(reporter.lang('lockfileConflict'));
        }
      }

      lockfile = parseResult.object;
    } else if (reporter) {
      reporter.info(reporter.lang('noLockfileFound'));
    }

    return new Lockfile({cache: lockfile, source: rawLockfile, parseResultType: parseResult && parseResult.type});
  }

  getLocked(pattern) {
    var cache = this.cache;
    if (!cache) {
      return undefined;
    }

    var shrunk = pattern in cache && cache[pattern];

    if (typeof shrunk === 'string') {
      return this.getLocked(shrunk);
    } else if (shrunk) {
      explodeEntry(pattern, shrunk);
      return shrunk;
    }

    return undefined;
  }

  removePattern(pattern) {
    var cache = this.cache;
    if (!cache) {
      return;
    }
    delete cache[pattern];
  }

  getLockfile(patterns) {
    var lockfile = {};
    var seen = new Map();

    // order by name so that lockfile manifest is assigned to the first dependency with this manifest
    // the others that have the same remoteKey will just refer to the first
    // ordering allows for consistency in lockfile when it is serialized
    var sortedPatternsKeys = Object.keys(patterns).sort(_misc.sortAlpha);

    for (var pattern of sortedPatternsKeys) {
      var pkg = patterns[pattern];
      var remote = pkg._remote, ref = pkg._reference;
      invariant(ref, 'Package is missing a reference');
      invariant(remote, 'Package is missing a remote');

      var remoteKey = keyForRemote(remote);
      var seenPattern = remoteKey && seen.get(remoteKey);
      if (seenPattern) {
        // no point in duplicating it
        lockfile[pattern] = seenPattern;

        // if we're relying on our name being inferred and two of the patterns have
        // different inferred names then we need to set it
        if (!seenPattern.name && getName(pattern) !== pkg.name) {
          seenPattern.name = pkg.name;
        }
        continue;
      }
      var obj = implodeEntry(pattern, {
        name: pkg.name,
        version: pkg.version,
        uid: pkg._uid,
        resolved: remote.resolved,
        integrity: remote.integrity,
        registry: remote.registry,
        dependencies: pkg.dependencies,
        peerDependencies: pkg.peerDependencies,
        optionalDependencies: pkg.optionalDependencies,
        permissions: ref.permissions,
        prebuiltVariants: pkg.prebuiltVariants,
      });

      lockfile[pattern] = obj;

      if (remoteKey) {
        seen.set(remoteKey, obj);
      }
    }

    return lockfile;
  }
}
exports.default = Lockfile;
