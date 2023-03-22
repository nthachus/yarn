import {sortAlpha} from '../util/misc.js';
import {normalizePattern} from '../util/normalize-pattern.js';
import parse from './parse.js';
import {LOCKFILE_FILENAME} from '../constants.js';
import {exists, readFile} from '../util/fs.js';

const invariant = require('invariant');
const path = require('path');
const ssri = require('ssri');

export {parse};
export {default as stringify} from './stringify.js';

function getName(pattern) {
  return normalizePattern(pattern).name;
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

export function implodeEntry(pattern, obj) {
  const inferredName = getName(pattern);
  const integrity = obj.integrity ? serializeIntegrity(obj.integrity) : '';
  const imploded = {
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

export function explodeEntry(pattern, obj) {
  obj.optionalDependencies = obj.optionalDependencies || {};
  obj.dependencies = obj.dependencies || {};
  obj.uid = obj.uid || obj.version;
  obj.permissions = obj.permissions || {};
  obj.registry = obj.registry || 'npm';
  obj.name = obj.name || getName(pattern);
  const integrity = obj.integrity;
  if (integrity && integrity.isIntegrity) {
    obj.integrity = ssri.parse(integrity);
  }
  return obj;
}

export default class Lockfile {
  constructor({cache, source, parseResultType} = {}) {
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

    for (const key in this.cache) {
      // $FlowFixMe - `this.cache` is clearly defined at this point
      if (!/^.*@(file:|http)/.test(key) && this.cache[key] && !this.cache[key].integrity) {
        return true;
      }
    }

    return false;
  }

  static fromDirectory(dir, reporter) {
    // read the manifest in this directory
    const lockfileLoc = path.join(dir, LOCKFILE_FILENAME);

    let lockfile;
    let rawLockfile = '';
    let parseResult;

    if (exists(lockfileLoc)) {
      rawLockfile = readFile(lockfileLoc);
      parseResult = parse(rawLockfile, lockfileLoc);

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
    const cache = this.cache;
    if (!cache) {
      return undefined;
    }

    const shrunk = pattern in cache && cache[pattern];

    if (typeof shrunk === 'string') {
      return this.getLocked(shrunk);
    } else if (shrunk) {
      explodeEntry(pattern, shrunk);
      return shrunk;
    }

    return undefined;
  }

  removePattern(pattern) {
    const cache = this.cache;
    if (!cache) {
      return;
    }
    delete cache[pattern];
  }

  getLockfile(patterns) {
    const lockfile = {};
    const seen = new Map();

    // order by name so that lockfile manifest is assigned to the first dependency with this manifest
    // the others that have the same remoteKey will just refer to the first
    // ordering allows for consistency in lockfile when it is serialized
    const sortedPatternsKeys = Object.keys(patterns).sort(sortAlpha);

    for (const pattern of sortedPatternsKeys) {
      const pkg = patterns[pattern];
      const {_remote: remote, _reference: ref} = pkg;
      invariant(ref, 'Package is missing a reference');
      invariant(remote, 'Package is missing a remote');

      const remoteKey = keyForRemote(remote);
      const seenPattern = remoteKey && seen.get(remoteKey);
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
      const obj = implodeEntry(pattern, {
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
