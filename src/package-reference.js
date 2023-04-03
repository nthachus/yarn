import {entries} from './util/misc.js';

export default class PackageReference {
  constructor(request, info, remote) {
    this.resolver = request.resolver;
    this.lockfile = request.lockfile;
    this.requests = [];
    this.config = request.config;
    this.hint = request.hint;

    this.isPlugnplay = false;

    this.registry = remote.registry;
    this.version = info.version;
    this.name = info.name;
    this.uid = info._uid;

    this.remote = remote;

    this.dependencies = [];

    this.permissions = {};
    this.patterns = [];
    this.optional = null;
    this.level = Infinity;
    this.ignore = false;
    this.incompatible = false;
    this.fresh = false;
    this.locations = [];
    this.addRequest(request);
  }

  setFresh(fresh) {
    this.fresh = fresh;
  }

  addLocation(loc) {
    if (this.locations.indexOf(loc) === -1) {
      this.locations.push(loc);
    }
  }

  addRequest(request) {
    this.requests.push(request);

    this.level = Math.min(this.level, request.parentNames.length);
  }

  prune() {
    for (const selfPattern of this.patterns) {
      // remove ourselves from the resolver
      this.resolver.removePattern(selfPattern);
    }
  }

  addDependencies(deps) {
    this.dependencies = this.dependencies.concat(deps);
  }

  setPermission(key, val) {
    this.permissions[key] = val;
  }

  hasPermission(key) {
    if (key in this.permissions) {
      return this.permissions[key];
    } else {
      return false;
    }
  }

  addPattern(pattern, manifest) {
    this.resolver.addPattern(pattern, manifest);

    this.patterns.push(pattern);

    const shrunk = this.lockfile.getLocked(pattern);
    if (shrunk && shrunk.permissions) {
      for (const [key, perm] of entries(shrunk.permissions)) {
        this.setPermission(key, perm);
      }
    }
  }

  addOptional(optional) {
    if (this.optional == null) {
      // optional is uninitialised
      this.optional = optional;
    } else if (!optional) {
      // otherwise, ignore all subsequent optional assignments and only accept ones making
      // this not optional
      this.optional = false;
    }
  }
}
