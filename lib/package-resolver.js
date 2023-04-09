'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _index = require('./resolvers/index.js');
var _packageRequest = _interopRequireDefault(require('./package-request.js'));
var _normalizePattern2 = require('./util/normalize-pattern.js');
var _requestManager = _interopRequireDefault(require('./util/request-manager.js'));
var _blockingQueue = _interopRequireDefault(require('./util/blocking-queue.js'));
var _lockfile = _interopRequireDefault(require('./lockfile'));
var _map = _interopRequireDefault(require('./util/map.js'));
var _workspaceLayout = _interopRequireDefault(require('./workspace-layout.js'));
var _resolutionMap = _interopRequireWildcard(require('./resolution-map.js'));

var invariant = require('invariant');
var semver = require('semver');

class PackageResolver {
  constructor(config, lockfile, resolutionMap) {
    if (resolutionMap === void 0) resolutionMap = new _resolutionMap.default(config);
    this.frozen = void 0;
    this.workspaceLayout = void 0;
    // activity monitor
    this.activity = void 0;
    // manages and throttles json api http requests
    this.requestManager = void 0;

    // list of patterns associated with a package
    this.patternsByPackage = (0, _map.default)();
    // patterns we've already resolved or are in the process of resolving
    this.fetchingPatterns = new Set();
    this.fetchingQueue = new _blockingQueue.default('resolver fetching');
    // a map of dependency patterns to packages
    this.patterns = (0, _map.default)();
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

  /**
   * TODO description
   */

  isNewPattern(pattern) {
    return !!this.patterns[pattern].fresh;
  }

  updateManifest(ref, newPkg) {
    // inherit fields
    var oldPkg = this.patterns[ref.patterns[0]];
    newPkg._reference = ref;
    newPkg._remote = ref.remote;
    newPkg.name = oldPkg.name;
    newPkg.fresh = oldPkg.fresh;
    newPkg.prebuiltVariants = oldPkg.prebuiltVariants;

    // update patterns
    for (var pattern of ref.patterns) {
      this.patterns[pattern] = newPkg;
    }

    return Promise.resolve();
  }

  updateManifests(newPkgs) {
    for (var newPkg of newPkgs) {
      if (newPkg._reference) {
        for (var pattern of newPkg._reference.patterns) {
          var oldPkg = this.patterns[pattern];
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
    var deduped = [];
    var seen = new Set();

    for (var pattern of patterns) {
      var info = this.getResolvedPattern(pattern);
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
    var pkgs = new Set();
    var skip = new Set();

    var add = (seedPatterns) => {
      for (var pattern of seedPatterns) {
        var pkg = this.getStrictResolvedPattern(pattern);
        if (skip.has(pkg)) {
          continue;
        }

        var ref = pkg._reference;
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
    var pkgs = new Set();
    var skip = new Set();

    var add = (seedPatterns) => {
      var refs = [];

      for (var pattern of seedPatterns) {
        var pkg = this.getStrictResolvedPattern(pattern);
        if (skip.has(pkg)) {
          continue;
        }

        var ref = pkg._reference;
        invariant(ref, 'expected reference');

        refs.push(ref);
        skip.add(pkg);
        pkgs.add(pkg);
      }

      for (var _ref of refs) {
        add(_ref.dependencies);
      }
    };

    add(seedPatterns);

    return pkgs;
  }

  /**
   * Get a list of all package names in the dependency graph.
   */

  getAllDependencyNamesByLevelOrder(seedPatterns) {
    var names = new Set();
    for (var _ref2 of this.getLevelOrderManifests(seedPatterns)) {
      var name = _ref2.name;
      names.add(name);
    }
    return names;
  }

  /**
   * Retrieve all the package info stored for this package name.
   */

  getAllInfoForPackageName(name) {
    var patterns = this.patternsByPackage[name] || [];
    return this.getAllInfoForPatterns(patterns);
  }

  /**
   * Retrieve all the package info stored for a list of patterns.
   */

  getAllInfoForPatterns(patterns) {
    var infos = [];
    var seen = new Set();

    for (var pattern of patterns) {
      var info = this.patterns[pattern];
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
    var infos = [];
    var seen = new Set();

    for (var pattern in this.patterns) {
      var info = this.patterns[pattern];
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
    var pkg = this.getResolvedPattern(pattern);
    invariant(pkg, `missing package ${pattern}`);
    var ref = pkg._reference;
    invariant(ref, 'expected package reference');
    ref.patterns = [newPattern];
    this.addPattern(newPattern, pkg);
    this.removePattern(pattern);
  }

  /**
   * Make all versions of this package resolve to it.
   */

  collapseAllVersionsOfPackage(name, version) {
    var patterns = this.dedupePatterns(this.patternsByPackage[name]);
    return this.collapsePackageVersions(name, version, patterns);
  }

  /**
   * Make all given patterns resolve to version.
   */
  collapsePackageVersions(name, version, patterns) {
    var human = `${name}@${version}`;

    // get manifest that matches the version we're collapsing too
    var collapseToReference;
    var collapseToManifest;
    var collapseToPattern;
    for (var pattern of patterns) {
      var _manifest = this.patterns[pattern];
      if (_manifest.version === version) {
        collapseToReference = _manifest._reference;
        collapseToManifest = _manifest;
        collapseToPattern = pattern;
        break;
      }
    }

    invariant(
      collapseToReference && collapseToManifest && collapseToPattern,
      `Couldn't find package manifest for ${human}`
    );

    for (var _pattern of patterns) {
      // don't touch the pattern we're collapsing to
      if (_pattern === collapseToPattern) {
        continue;
      }

      // remove this pattern
      var ref = this.getStrictResolvedPattern(_pattern)._reference;
      invariant(ref, 'expected package reference');
      var refPatterns = ref.patterns.slice();
      ref.prune();

      // add pattern to the manifest we're collapsing to
      for (var _pattern2 of refPatterns) {
        collapseToReference.addPattern(_pattern2, collapseToManifest);
      }
    }

    return collapseToPattern;
  }

  /**
   * TODO description
   */

  addPattern(pattern, info) {
    this.patterns[pattern] = info;

    var byName = (this.patternsByPackage[info.name] = this.patternsByPackage[info.name] || []);
    if (byName.indexOf(pattern) === -1) {
      byName.push(pattern);
    }
  }

  /**
   * TODO description
   */

  removePattern(pattern) {
    var pkg = this.patterns[pattern];
    if (!pkg) {
      return;
    }

    var byName = this.patternsByPackage[pkg.name];
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
    var manifest = this.getResolvedPattern(pattern);
    invariant(manifest, 'expected manifest');
    return manifest;
  }

  /**
   * TODO description
   */

  getExactVersionMatch(name, version, manifest) {
    var patterns = this.patternsByPackage[name];
    if (!patterns) {
      return null;
    }

    for (var pattern of patterns) {
      var info = this.getStrictResolvedPattern(pattern);
      if (info.version === version) {
        return info;
      }
    }

    if (manifest && (0, _index.getExoticResolver)(version)) {
      return this.exoticRangeMatch(patterns.map(this.getStrictResolvedPattern.bind(this)), manifest);
    }

    return null;
  }

  /**
   * Get the manifest of the highest known version that satisfies a package range
   */

  getHighestRangeVersionMatch(name, range, manifest) {
    var patterns = this.patternsByPackage[name];

    if (!patterns) {
      return null;
    }

    var versionNumbers = [];
    var resolvedPatterns = patterns.map(pattern => {
      var info = this.getStrictResolvedPattern(pattern);
      versionNumbers.push(info.version);

      return info;
    });

    var maxValidRange = semver.maxSatisfying(versionNumbers, range);

    if (!maxValidRange) {
      return manifest && (0, _index.getExoticResolver)(range) ? this.exoticRangeMatch(resolvedPatterns, manifest) : null;
    }

    var indexOfmaxValidRange = versionNumbers.indexOf(maxValidRange);
    var maxValidRangeManifest = resolvedPatterns[indexOfmaxValidRange];

    return maxValidRangeManifest;
  }

  /**
   * Get the manifest of the package that matches an exotic range
   */

  exoticRangeMatch(resolvedPkgs, manifest) {
    var remote = manifest._remote;
    if (!(remote && remote.reference && remote.type === 'copy')) {
      return null;
    }

    var matchedPkg = resolvedPkgs.find(_ref3 => {
      var pkgRemote = _ref3._remote;
      return pkgRemote && pkgRemote.reference === remote.reference && pkgRemote.type === 'copy';
    });

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
      !(0, _index.getExoticResolver)(range) &&
      hasVersion &&
      !semver.satisfies(version, range)
    );
  }

  /**
   * TODO description
   */

  find(initialReq) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var req = _this.resolveToResolution(initialReq);

      // we've already resolved it with a resolution
      if (!req) {
        return;
      }

      var request = new _packageRequest.default(req, _this);
      var fetchKey = `${req.registry}:${req.pattern}:${String(req.optional)}`;
      var initialFetch = !_this.fetchingPatterns.has(fetchKey);
      var fresh = false;

      if (_this.activity) {
        _this.activity.tick(req.pattern);
      }

      if (initialFetch) {
        _this.fetchingPatterns.add(fetchKey);

        var lockfileEntry = _this.lockfile.getLocked(req.pattern);

        if (lockfileEntry) {
          var _normalizePattern = (0, _normalizePattern2.normalizePattern)(req.pattern), range = _normalizePattern.range, hasVersion = _normalizePattern.hasVersion;

          if (_this.isLockfileEntryOutdated(lockfileEntry.version, range, hasVersion)) {
            _this.reporter.warn(_this.reporter.lang('incorrectLockfileEntry', req.pattern));
            _this.removePattern(req.pattern);
            _this.lockfile.removePattern(req.pattern);
            fresh = true;
          }
        } else {
          fresh = true;
        }

        request.init();
      }

      yield request.find({fresh, frozen: _this.frozen});
    })();
  }

  /**
   * TODO description
   */

  init(
    deps,
    _temp
  ) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _ref4 = _temp === void 0 ? {
        isFlat: false,
        isFrozen: false,
        workspaceLayout: undefined,
      } : _temp;
      var isFlat = _ref4.isFlat, isFrozen = _ref4.isFrozen, workspaceLayout = _ref4.workspaceLayout;
      _this2.flat = Boolean(isFlat);
      _this2.frozen = Boolean(isFrozen);
      _this2.workspaceLayout = workspaceLayout;
      var activity = (_this2.activity = _this2.reporter.activity());

      for (var req of deps) {
        yield _this2.find(req);
      }

      // all required package versions have been discovered, so now packages that
      // resolved to existing versions can be resolved to their best available version
      _this2.resolvePackagesWithExistingVersions();

      for (var _req of _this2.resolutionMap.delayQueue) {
        _this2.resolveToResolution(_req);
      }

      if (isFlat) {
        for (var dep of deps) {
          var name = (0, _normalizePattern2.normalizePattern)(dep.pattern).name;
          _this2.optimizeResolutions(name);
        }
      }

      activity.end();
      _this2.activity = null;
    })();
  }

  // for a given package, see if a single manifest can satisfy all ranges
  optimizeResolutions(name) {
    var _this3 = this;
    var patterns = this.dedupePatterns(this.patternsByPackage[name] || []);

    // don't optimize things that already have a lockfile entry:
    // https://github.com/yarnpkg/yarn/issues/79
    var collapsablePatterns = patterns.filter(pattern => {
      var remote = this.patterns[pattern]._remote;
      return !this.lockfile.getLocked(pattern) && (!remote || remote.type !== 'workspace');
    });
    if (collapsablePatterns.length < 2) {
      return;
    }

    // reverse sort, so we'll find the maximum satisfying version first
    var availableVersions = this.getAllInfoForPatterns(collapsablePatterns).map(manifest => manifest.version);
    availableVersions.sort(semver.rcompare);

    var ranges = collapsablePatterns.map(pattern => (0, _normalizePattern2.normalizePattern)(pattern).range);

    // find the most recent version that satisfies all patterns (if one exists), and
    // collapse to that version.
    var _loop = function(version) {
      if (ranges.every(range => semver.satisfies(version, range))) {
        _this3.collapsePackageVersions(name, version, collapsablePatterns);
        return {v: void 0};
      }
    };
    for (var version of availableVersions) {
      var _ret = _loop(version);
      if (typeof _ret === 'object') return _ret.v;
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
    for (var _ref5 of this.delayedResolveQueue) {
      var req = _ref5.req, info = _ref5.info;
      req.resolveToExistingVersion(info);
    }
  }

  resolveToResolution(req) {
    var parentNames = req.parentNames, pattern = req.pattern;

    if (!parentNames || this.flat) {
      return req;
    }

    var resolution = this.resolutionMap.find(pattern, parentNames);

    if (resolution) {
      var resolutionManifest = this.getResolvedPattern(resolution);

      if (resolutionManifest) {
        invariant(resolutionManifest._reference, 'resolutions should have a resolved reference');
        resolutionManifest._reference.patterns.push(pattern);
        this.addPattern(pattern, resolutionManifest);
        var lockManifest = this.lockfile.getLocked(pattern);
        if ((0, _resolutionMap.shouldUpdateLockfile)(lockManifest, resolutionManifest._reference)) {
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
exports.default = PackageResolver;
