import {getExoticResolver} from './resolvers/index.js';
import PackageRequest from './package-request.js';
import {normalizePattern} from './util/normalize-pattern.js';
import RequestManager from './util/request-manager.js';
import BlockingQueue from './util/blocking-queue.js';
import Lockfile from './lockfile';
import map from './util/map.js';
import WorkspaceLayout from './workspace-layout.js';
import ResolutionMap, {shouldUpdateLockfile} from './resolution-map.js';

const invariant = require('invariant');
const semver = require('semver');

export default class PackageResolver {
  constructor(config, lockfile, resolutionMap = new ResolutionMap(config)) {
    // list of patterns associated with a package
    this.patternsByPackage = map();
    // patterns we've already resolved or are in the process of resolving
    this.fetchingPatterns = new Set();
    this.fetchingQueue = new BlockingQueue('resolver fetching');
    // a map of dependency patterns to packages
    this.patterns = map();
    this.resolutionMap = resolutionMap;
    // list of registries that have been used in this resolution
    this.usedRegistries = new Set();
    // whether the dependency graph will be flattened
    this.flat = false;

    // reporter instance, abstracts out display logic
    this.reporter = config.reporter;
    // lockfile instance which we can use to retrieve version info
    this.lockfile = lockfile;
    // environment specific config methods and options
    this.config = config;
    // list of packages need to be resolved later (they found a matching version in the
    // resolver, but better matches can still arrive later in the resolve process)
    this.delayedResolveQueue = [];
  }

  frozen;

  workspaceLayout;

  // activity monitor
  activity;

  // manages and throttles json api http requests
  requestManager;

  /**
   * TODO description
   */

  isNewPattern(pattern) {
    return !!this.patterns[pattern].fresh;
  }

  updateManifest(ref, newPkg) {
    // inherit fields
    const oldPkg = this.patterns[ref.patterns[0]];
    newPkg._reference = ref;
    newPkg._remote = ref.remote;
    newPkg.name = oldPkg.name;
    newPkg.fresh = oldPkg.fresh;
    newPkg.prebuiltVariants = oldPkg.prebuiltVariants;

    // update patterns
    for (const pattern of ref.patterns) {
      this.patterns[pattern] = newPkg;
    }

    return Promise.resolve();
  }

  updateManifests(newPkgs) {
    for (const newPkg of newPkgs) {
      if (newPkg._reference) {
        for (const pattern of newPkg._reference.patterns) {
          const oldPkg = this.patterns[pattern];
          newPkg.prebuiltVariants = oldPkg.prebuiltVariants;

          this.patterns[pattern] = newPkg;
        }
      }
    }

    return Promise.resolve();
  }

  /**
   * Given a list of patterns, dedupe them to a list of unique patterns.
   */

  dedupePatterns(patterns) {
    const deduped = [];
    const seen = new Set();

    for (const pattern of patterns) {
      const info = this.getResolvedPattern(pattern);
      if (seen.has(info)) {
        continue;
      }

      seen.add(info);
      deduped.push(pattern);
    }

    return deduped;
  }

  /**
   * Get a list of all manifests by topological order.
   */

  getTopologicalManifests(seedPatterns) {
    const pkgs = new Set();
    const skip = new Set();

    const add = (seedPatterns) => {
      for (const pattern of seedPatterns) {
        const pkg = this.getStrictResolvedPattern(pattern);
        if (skip.has(pkg)) {
          continue;
        }

        const ref = pkg._reference;
        invariant(ref, 'expected reference');
        skip.add(pkg);
        add(ref.dependencies);
        pkgs.add(pkg);
      }
    };

    add(seedPatterns);

    return pkgs;
  }

  /**
   * Get a list of all manifests by level sort order.
   */

  getLevelOrderManifests(seedPatterns) {
    const pkgs = new Set();
    const skip = new Set();

    const add = (seedPatterns) => {
      const refs = [];

      for (const pattern of seedPatterns) {
        const pkg = this.getStrictResolvedPattern(pattern);
        if (skip.has(pkg)) {
          continue;
        }

        const ref = pkg._reference;
        invariant(ref, 'expected reference');

        refs.push(ref);
        skip.add(pkg);
        pkgs.add(pkg);
      }

      for (const ref of refs) {
        add(ref.dependencies);
      }
    };

    add(seedPatterns);

    return pkgs;
  }

  /**
   * Get a list of all package names in the dependency graph.
   */

  getAllDependencyNamesByLevelOrder(seedPatterns) {
    const names = new Set();
    for (const {name} of this.getLevelOrderManifests(seedPatterns)) {
      names.add(name);
    }
    return names;
  }

  /**
   * Retrieve all the package info stored for this package name.
   */

  getAllInfoForPackageName(name) {
    const patterns = this.patternsByPackage[name] || [];
    return this.getAllInfoForPatterns(patterns);
  }

  /**
   * Retrieve all the package info stored for a list of patterns.
   */

  getAllInfoForPatterns(patterns) {
    const infos = [];
    const seen = new Set();

    for (const pattern of patterns) {
      const info = this.patterns[pattern];
      if (seen.has(info)) {
        continue;
      }

      seen.add(info);
      infos.push(info);
    }

    return infos;
  }

  /**
   * Get a flat list of all package info.
   */

  getManifests() {
    const infos = [];
    const seen = new Set();

    for (const pattern in this.patterns) {
      const info = this.patterns[pattern];
      if (seen.has(info)) {
        continue;
      }

      infos.push(info);
      seen.add(info);
    }

    return infos;
  }

  /**
   * replace pattern in resolver, e.g. `name` is replaced with `name@^1.0.1`
   */
  replacePattern(pattern, newPattern) {
    const pkg = this.getResolvedPattern(pattern);
    invariant(pkg, `missing package ${pattern}`);
    const ref = pkg._reference;
    invariant(ref, 'expected package reference');
    ref.patterns = [newPattern];
    this.addPattern(newPattern, pkg);
    this.removePattern(pattern);
  }

  /**
   * Make all versions of this package resolve to it.
   */

  collapseAllVersionsOfPackage(name, version) {
    const patterns = this.dedupePatterns(this.patternsByPackage[name]);
    return this.collapsePackageVersions(name, version, patterns);
  }

  /**
   * Make all given patterns resolve to version.
   */
  collapsePackageVersions(name, version, patterns) {
    const human = `${name}@${version}`;

    // get manifest that matches the version we're collapsing too
    let collapseToReference;
    let collapseToManifest;
    let collapseToPattern;
    for (const pattern of patterns) {
      const _manifest = this.patterns[pattern];
      if (_manifest.version === version) {
        collapseToReference = _manifest._reference;
        collapseToManifest = _manifest;
        collapseToPattern = pattern;
        break;
      }
    }

    invariant(
      collapseToReference && collapseToManifest && collapseToPattern,
      `Couldn't find package manifest for ${human}`,
    );

    for (const pattern of patterns) {
      // don't touch the pattern we're collapsing to
      if (pattern === collapseToPattern) {
        continue;
      }

      // remove this pattern
      const ref = this.getStrictResolvedPattern(pattern)._reference;
      invariant(ref, 'expected package reference');
      const refPatterns = ref.patterns.slice();
      ref.prune();

      // add pattern to the manifest we're collapsing to
      for (const pattern of refPatterns) {
        collapseToReference.addPattern(pattern, collapseToManifest);
      }
    }

    return collapseToPattern;
  }

  /**
   * TODO description
   */

  addPattern(pattern, info) {
    this.patterns[pattern] = info;

    const byName = (this.patternsByPackage[info.name] = this.patternsByPackage[info.name] || []);
    if (byName.indexOf(pattern) === -1) {
      byName.push(pattern);
    }
  }

  /**
   * TODO description
   */

  removePattern(pattern) {
    const pkg = this.patterns[pattern];
    if (!pkg) {
      return;
    }

    const byName = this.patternsByPackage[pkg.name];
    if (!byName) {
      return;
    }

    byName.splice(byName.indexOf(pattern), 1);
    delete this.patterns[pattern];
  }

  /**
   * TODO description
   */

  getResolvedPattern(pattern) {
    return this.patterns[pattern];
  }

  /**
   * TODO description
   */

  getStrictResolvedPattern(pattern) {
    const manifest = this.getResolvedPattern(pattern);
    invariant(manifest, 'expected manifest');
    return manifest;
  }

  /**
   * TODO description
   */

  getExactVersionMatch(name, version, manifest) {
    const patterns = this.patternsByPackage[name];
    if (!patterns) {
      return null;
    }

    for (const pattern of patterns) {
      const info = this.getStrictResolvedPattern(pattern);
      if (info.version === version) {
        return info;
      }
    }

    if (manifest && getExoticResolver(version)) {
      return this.exoticRangeMatch(patterns.map(this.getStrictResolvedPattern.bind(this)), manifest);
    }

    return null;
  }

  /**
   * Get the manifest of the highest known version that satisfies a package range
   */

  getHighestRangeVersionMatch(name, range, manifest) {
    const patterns = this.patternsByPackage[name];

    if (!patterns) {
      return null;
    }

    const versionNumbers = [];
    const resolvedPatterns = patterns.map((pattern) => {
      const info = this.getStrictResolvedPattern(pattern);
      versionNumbers.push(info.version);

      return info;
    });

    const maxValidRange = semver.maxSatisfying(versionNumbers, range);

    if (!maxValidRange) {
      return manifest && getExoticResolver(range) ? this.exoticRangeMatch(resolvedPatterns, manifest) : null;
    }

    const indexOfmaxValidRange = versionNumbers.indexOf(maxValidRange);
    const maxValidRangeManifest = resolvedPatterns[indexOfmaxValidRange];

    return maxValidRangeManifest;
  }

  /**
   * Get the manifest of the package that matches an exotic range
   */

  exoticRangeMatch(resolvedPkgs, manifest) {
    const remote = manifest._remote;
    if (!(remote && remote.reference && remote.type === 'copy')) {
      return null;
    }

    const matchedPkg = resolvedPkgs.find(
      ({_remote: pkgRemote}) => pkgRemote && pkgRemote.reference === remote.reference && pkgRemote.type === 'copy',
    );

    if (matchedPkg) {
      manifest._remote = matchedPkg._remote;
    }

    return matchedPkg;
  }

  /**
   * Determine if LockfileEntry is incorrect, remove it from lockfile cache and consider the pattern as new
   */
  isLockfileEntryOutdated(version, range, hasVersion) {
    return !!(
      semver.validRange(range) &&
      semver.valid(version) &&
      !getExoticResolver(range) &&
      hasVersion &&
      !semver.satisfies(version, range)
    );
  }

  /**
   * TODO description
   */

  async find(initialReq) {
    const req = this.resolveToResolution(initialReq);

    // we've already resolved it with a resolution
    if (!req) {
      return;
    }

    const request = new PackageRequest(req, this);
    const fetchKey = `${req.registry}:${req.pattern}:${String(req.optional)}`;
    const initialFetch = !this.fetchingPatterns.has(fetchKey);
    let fresh = false;

    if (this.activity) {
      this.activity.tick(req.pattern);
    }

    if (initialFetch) {
      this.fetchingPatterns.add(fetchKey);

      const lockfileEntry = this.lockfile.getLocked(req.pattern);

      if (lockfileEntry) {
        const {range, hasVersion} = normalizePattern(req.pattern);

        if (this.isLockfileEntryOutdated(lockfileEntry.version, range, hasVersion)) {
          this.reporter.warn(this.reporter.lang('incorrectLockfileEntry', req.pattern));
          this.removePattern(req.pattern);
          this.lockfile.removePattern(req.pattern);
          fresh = true;
        }
      } else {
        fresh = true;
      }

      request.init();
    }

    await request.find({fresh, frozen: this.frozen});
  }

  /**
   * TODO description
   */

  async init(
    deps,
    {isFlat, isFrozen, workspaceLayout} = {
      isFlat: false,
      isFrozen: false,
      workspaceLayout: undefined,
    },
  ) {
    this.flat = Boolean(isFlat);
    this.frozen = Boolean(isFrozen);
    this.workspaceLayout = workspaceLayout;
    const activity = (this.activity = this.reporter.activity());

    for (const req of deps) {
      await this.find(req);
    }

    // all required package versions have been discovered, so now packages that
    // resolved to existing versions can be resolved to their best available version
    this.resolvePackagesWithExistingVersions();

    for (const req of this.resolutionMap.delayQueue) {
      this.resolveToResolution(req);
    }

    if (isFlat) {
      for (const dep of deps) {
        const name = normalizePattern(dep.pattern).name;
        this.optimizeResolutions(name);
      }
    }

    activity.end();
    this.activity = null;
  }

  // for a given package, see if a single manifest can satisfy all ranges
  optimizeResolutions(name) {
    const patterns = this.dedupePatterns(this.patternsByPackage[name] || []);

    // don't optimize things that already have a lockfile entry:
    // https://github.com/yarnpkg/yarn/issues/79
    const collapsablePatterns = patterns.filter(pattern => {
      const remote = this.patterns[pattern]._remote;
      return !this.lockfile.getLocked(pattern) && (!remote || remote.type !== 'workspace');
    });
    if (collapsablePatterns.length < 2) {
      return;
    }

    // reverse sort, so we'll find the maximum satisfying version first
    const availableVersions = this.getAllInfoForPatterns(collapsablePatterns).map(manifest => manifest.version);
    availableVersions.sort(semver.rcompare);

    const ranges = collapsablePatterns.map(pattern => normalizePattern(pattern).range);

    // find the most recent version that satisfies all patterns (if one exists), and
    // collapse to that version.
    for (const version of availableVersions) {
      if (ranges.every(range => semver.satisfies(version, range))) {
        this.collapsePackageVersions(name, version, collapsablePatterns);
        return;
      }
    }
  }

  /**
   * Called by the package requester for packages that this resolver already had
   * a matching version for. Delay the resolve, because better matches can still be
   * discovered.
   */

  reportPackageWithExistingVersion(req, info) {
    this.delayedResolveQueue.push({req, info});
  }

  /**
   * Executes the resolve to existing versions for packages after the find process,
   * when all versions that are going to be used have been discovered.
   */

  resolvePackagesWithExistingVersions() {
    for (const {req, info} of this.delayedResolveQueue) {
      req.resolveToExistingVersion(info);
    }
  }

  resolveToResolution(req) {
    const {parentNames, pattern} = req;

    if (!parentNames || this.flat) {
      return req;
    }

    const resolution = this.resolutionMap.find(pattern, parentNames);

    if (resolution) {
      const resolutionManifest = this.getResolvedPattern(resolution);

      if (resolutionManifest) {
        invariant(resolutionManifest._reference, 'resolutions should have a resolved reference');
        resolutionManifest._reference.patterns.push(pattern);
        this.addPattern(pattern, resolutionManifest);
        const lockManifest = this.lockfile.getLocked(pattern);
        if (shouldUpdateLockfile(lockManifest, resolutionManifest._reference)) {
          this.lockfile.removePattern(pattern);
        }
      } else {
        this.resolutionMap.addToDelayQueue(req);
      }
      return null;
    }

    return req;
  }
}
