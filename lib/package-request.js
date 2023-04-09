'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var path = require('path');
var invariant = require('invariant');
var semver = require('semver');

var _validate = require('./util/normalize-manifest/validate.js');
var _lockfile = _interopRequireDefault(require('./lockfile'));
var _packageReference = _interopRequireDefault(require('./package-reference.js'));
var _index = require('./resolvers/index.js');
var _errors = require('./errors.js');
var constants = _interopRequireWildcard(require('./constants.js'));
var versionUtil = _interopRequireWildcard(require('./util/version.js'));
var _workspaceResolver = _interopRequireDefault(require('./resolvers/contextual/workspace-resolver.js'));
var fs = _interopRequireWildcard(require('./util/fs.js'));
var _normalizePattern4 = require('./util/normalize-pattern.js');

var micromatch = require('micromatch');

class PackageRequest {
  constructor(req, resolver) {
    this.parentRequest = req.parentRequest;
    this.parentNames = req.parentNames || [];
    this.lockfile = resolver.lockfile;
    this.registry = req.registry;
    this.reporter = resolver.reporter;
    this.resolver = resolver;
    this.optional = req.optional;
    this.hint = req.hint;
    this.pattern = req.pattern;
    this.config = resolver.config;
    this.foundInfo = null;
  }

  init() {
    this.resolver.usedRegistries.add(this.registry);
  }

  getLocked(remoteType) {
    // always prioritise root lockfile
    var shrunk = this.lockfile.getLocked(this.pattern);

    if (shrunk && shrunk.resolved) {
      var resolvedParts = versionUtil.explodeHashedUrl(shrunk.resolved);

      // Detect Git protocols (git://HOST/PATH or git+PROTOCOL://HOST/PATH)
      var preferredRemoteType = /^git(\+[a-z0-9]+)?:\/\//.test(resolvedParts.url) ? 'git' : remoteType;

      return {
        name: shrunk.name,
        version: shrunk.version,
        _uid: shrunk.uid,
        _remote: {
          resolved: shrunk.resolved,
          type: preferredRemoteType,
          reference: resolvedParts.url,
          hash: resolvedParts.hash,
          integrity: shrunk.integrity,
          registry: shrunk.registry,
          packageName: shrunk.name,
        },
        optionalDependencies: shrunk.optionalDependencies || {},
        dependencies: shrunk.dependencies || {},
        prebuiltVariants: shrunk.prebuiltVariants || {},
      };
    } else {
      return null;
    }
  }

  /**
   * If the input pattern matches a registry one then attempt to find it on the registry.
   * Otherwise fork off to an exotic resolver if one matches.
   */

  findVersionOnRegistry(pattern) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _yield$_this$normaliz = yield _this.normalize(pattern), range = _yield$_this$normaliz.range, name = _yield$_this$normaliz.name;

      var exoticResolver = (0, _index.getExoticResolver)(range);
      if (exoticResolver) {
        var data = yield _this.findExoticVersionInfo(exoticResolver, range);

        // clone data as we're manipulating it in place and this could be resolved multiple
        // times
        data = Object.assign({}, data);

        // this is so the returned package response uses the overridden name. ie. if the
        // package's actual name is `bar`, but it's been specified in the manifest like:
        //   "foo": "http://foo.com/bar.tar.gz"
        // then we use the foo name
        data.name = name;
        return data;
      }

      var Resolver = _this.getRegistryResolver();
      var resolver = new Resolver(_this, name, range);
      try {
        return yield resolver.resolve();
      } catch (err) {
        // if it is not an error thrown by yarn and it has a parent request,
        // thow a more readable error
        if (!(err instanceof _errors.MessageError) && _this.parentRequest && _this.parentRequest.pattern) {
          throw new _errors.MessageError(
            _this.reporter.lang('requiredPackageNotFoundRegistry', pattern, _this.parentRequest.pattern, _this.registry)
          );
        }
        throw err;
      }
    })();
  }

  /**
   * Get the registry resolver associated with this package request.
   */

  getRegistryResolver() {
    var Resolver = _index.registries[this.registry];
    if (Resolver) {
      return Resolver;
    } else {
      throw new _errors.MessageError(this.reporter.lang('unknownRegistryResolver', this.registry));
    }
  }

  normalizeRange(pattern) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (pattern.indexOf(':') > -1 || pattern.indexOf('@') > -1 || (0, _index.getExoticResolver)(pattern)) {
        return pattern;
      }

      if (!semver.validRange(pattern)) {
        try {
          if (yield fs.exists(path.join(_this2.config.cwd, pattern, constants.NODE_PACKAGE_JSON))) {
            _this2.reporter.warn(_this2.reporter.lang('implicitFileDeprecated', pattern));
            return `file:${pattern}`;
          }
        } catch (err) {
          // pass
        }
      }

      return pattern;
    })();
  }

  normalize(pattern) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _normalizePattern = (0, _normalizePattern4.normalizePattern)(pattern), name = _normalizePattern.name, range = _normalizePattern.range, hasVersion = _normalizePattern.hasVersion;
      var newRange = yield _this3.normalizeRange(range);
      return {name, range: newRange, hasVersion};
    })();
  }

  /**
   * Construct an exotic resolver instance with the input `ExoticResolver` and `range`.
   */

  findExoticVersionInfo(ExoticResolver, range) {
    var resolver = new ExoticResolver(this, range);
    return resolver.resolve();
  }

  /**
   * If the current pattern matches an exotic resolver then delegate to it or else try
   * the registry.
   */

  findVersionInfo() {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var exoticResolver = (0, _index.getExoticResolver)(_this4.pattern);
      if (exoticResolver) {
        return _this4.findExoticVersionInfo(exoticResolver, _this4.pattern);
      } else if (_workspaceResolver.default.isWorkspace(_this4.pattern, _this4.resolver.workspaceLayout)) {
        invariant(_this4.resolver.workspaceLayout, 'expected workspaceLayout');
        var resolver = new _workspaceResolver.default(_this4, _this4.pattern, _this4.resolver.workspaceLayout);
        var manifest;
        if (
          _this4.config.focus &&
          !_this4.pattern.includes(_this4.resolver.workspaceLayout.virtualManifestName) &&
          !_this4.pattern.startsWith(_this4.config.focusedWorkspaceName + '@')
        ) {
          var localInfo = _this4.resolver.workspaceLayout.getManifestByPattern(_this4.pattern);
          invariant(localInfo, 'expected local info for ' + _this4.pattern);
          var localManifest = localInfo.manifest;
          var requestPattern = localManifest.name + '@' + localManifest.version;
          manifest = yield _this4.findVersionOnRegistry(requestPattern);
        }
        return resolver.resolve(manifest);
      } else {
        return _this4.findVersionOnRegistry(_this4.pattern);
      }
    })();
  }

  reportResolvedRangeMatch(info, resolved) {}

  /**
   * Do the final resolve of a package that had a match with an existing version.
   * After all unique versions have been discovered, so the best available version
   * is found.
   */
  resolveToExistingVersion(info) {
    // get final resolved version
    var _normalizePattern2 = (0, _normalizePattern4.normalizePattern)(this.pattern), range = _normalizePattern2.range, name = _normalizePattern2.name;
    var solvedRange = semver.validRange(range) ? info.version : range;
    var resolved = this.resolver.getHighestRangeVersionMatch(name, solvedRange, info);
    invariant(resolved, 'should have a resolved reference');

    this.reportResolvedRangeMatch(info, resolved);
    var ref = resolved._reference;
    invariant(ref, 'Resolved package info has no package reference');
    ref.addRequest(this);
    ref.addPattern(this.pattern, resolved);
    ref.addOptional(this.optional);
  }

  /**
   * TODO description
   */
  find(_ref) {
    var _this5 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var fresh = _ref.fresh, frozen = _ref.frozen;
      // find version info for this package pattern
      var info = yield _this5.findVersionInfo();

      if (!semver.valid(info.version)) {
        throw new _errors.MessageError(_this5.reporter.lang('invalidPackageVersion', info.name, info.version));
      }

      info.fresh = fresh;
      (0, _validate.cleanDependencies)(info, false, _this5.reporter, () => {
        // swallow warnings
      });

      // check if while we were resolving this dep we've already resolved one that satisfies
      // the same range
      var _normalizePattern3 = (0, _normalizePattern4.normalizePattern)(_this5.pattern), range = _normalizePattern3.range, name = _normalizePattern3.name;
      var solvedRange = semver.validRange(range) ? info.version : range;
      var resolved =
        !info.fresh || frozen
          ? _this5.resolver.getExactVersionMatch(name, solvedRange, info)
          : _this5.resolver.getHighestRangeVersionMatch(name, solvedRange, info);

      if (resolved) {
        _this5.resolver.reportPackageWithExistingVersion(_this5, info);
        return;
      }

      if (info.flat && !_this5.resolver.flat) {
        throw new _errors.MessageError(_this5.reporter.lang('flatGlobalError', `${info.name}@${info.version}`));
      }

      // validate version info
      PackageRequest.validateVersionInfo(info, _this5.reporter);

      //
      var remote = info._remote;
      invariant(remote, 'Missing remote');

      // set package reference
      var ref = new _packageReference.default(_this5, info, remote);
      ref.addPattern(_this5.pattern, info);
      ref.addOptional(_this5.optional);
      ref.setFresh(fresh);
      info._reference = ref;
      info._remote = remote;
      // start installation of dependencies
      var promises = [];
      var deps = [];
      var parentNames = [].concat(_this5.parentNames, [name]);
      // normal deps
      for (var depName in info.dependencies) {
        var depPattern = depName + '@' + info.dependencies[depName];
        deps.push(depPattern);
        promises.push(
          _this5.resolver.find({
            pattern: depPattern,
            registry: remote.registry,
            // dependencies of optional dependencies should themselves be optional
            optional: _this5.optional,
            parentRequest: _this5,
            parentNames,
          })
        );
      }

      // optional deps
      for (var _depName in info.optionalDependencies) {
        var _depPattern = _depName + '@' + info.optionalDependencies[_depName];
        deps.push(_depPattern);
        promises.push(
          _this5.resolver.find({
            hint: 'optional',
            pattern: _depPattern,
            registry: remote.registry,
            optional: true,
            parentRequest: _this5,
            parentNames,
          })
        );
      }
      if (remote.type === 'workspace' && !_this5.config.production) {
        // workspaces support dev dependencies
        for (var _depName2 in info.devDependencies) {
          var _depPattern2 = _depName2 + '@' + info.devDependencies[_depName2];
          deps.push(_depPattern2);
          promises.push(
            _this5.resolver.find({
              hint: 'dev',
              pattern: _depPattern2,
              registry: remote.registry,
              optional: false,
              parentRequest: _this5,
              parentNames,
            })
          );
        }
      }

      for (var promise of promises) {
        yield promise;
      }

      ref.addDependencies(deps);

      // Now that we have all dependencies, it's safe to propagate optional
      for (var otherRequest of ref.requests.slice(1)) {
        ref.addOptional(otherRequest.optional);
      }
    })();
  }

  /**
   * TODO description
   */

  static validateVersionInfo(info, reporter) {
    // human readable name to use in errors
    var human = `${info.name}@${info.version}`;

    info.version = PackageRequest.getPackageVersion(info);

    for (var key of constants.REQUIRED_PACKAGE_KEYS) {
      if (!info[key]) {
        throw new _errors.MessageError(reporter.lang('missingRequiredPackageKey', human, key));
      }
    }
  }

  /**
   * Returns the package version if present, else defaults to the uid
   */

  static getPackageVersion(info) {
    // TODO possibly reconsider this behaviour
    return info.version === undefined ? info._uid : info.version;
  }

  /**
   * Gets all of the outdated packages and sorts them appropriately
   */

  static getOutdatedPackages(
    lockfile,
    install,
    config,
    reporter,
    filterByPatterns,
    flags
  ) {
    return (0, _asyncToGenerator2.default)(function* () {
      var _yield$install$fetchR = yield install.fetchRequestFromCwd(), reqPatterns = _yield$install$fetchR.requests, workspaceLayout = _yield$install$fetchR.workspaceLayout;

      // Filter out workspace patterns if necessary
      var depReqPatterns = workspaceLayout
        ? reqPatterns.filter(p => !workspaceLayout.getManifestByPattern(p.pattern))
        : reqPatterns;

      // filter the list down to just the packages requested.
      // prevents us from having to query the metadata for all packages.
      if ((filterByPatterns && filterByPatterns.length) || (flags && flags.pattern)) {
        var filterByNames =
          filterByPatterns && filterByPatterns.length
            ? filterByPatterns.map(pattern => (0, _normalizePattern4.normalizePattern)(pattern).name)
            : [];
        depReqPatterns = depReqPatterns.filter(
          dep =>
            filterByNames.indexOf((0, _normalizePattern4.normalizePattern)(dep.pattern).name) >= 0 ||
            (flags && flags.pattern && micromatch.contains((0, _normalizePattern4.normalizePattern)(dep.pattern).name, flags.pattern))
        );
      }

      var deps = yield Promise.all(
        depReqPatterns.map(/*#__PURE__*/ (function() {
          var _ref3 = (0, _asyncToGenerator2.default)(function* (_ref2) {
            var pattern = _ref2.pattern, hint = _ref2.hint, workspaceName = _ref2.workspaceName, workspaceLoc = _ref2.workspaceLoc;
            var locked = lockfile.getLocked(pattern);
            if (!locked) {
              throw new _errors.MessageError(reporter.lang('lockfileOutdated'));
            }

            var name = locked.name, current = locked.version;
            var latest = '';
            var wanted = '';
            var url = '';

            var normalized = (0, _normalizePattern4.normalizePattern)(pattern);

            if ((0, _index.getExoticResolver)(pattern) || (0, _index.getExoticResolver)(normalized.range)) {
              latest = wanted = 'exotic';
              url = normalized.range;
            } else {
              var registry = config.registries[locked.registry];

              var _yield$registry$check = yield registry.checkOutdated(config, name, normalized.range);
              latest = _yield$registry$check.latest;
              wanted = _yield$registry$check.wanted;
              url = _yield$registry$check.url;
            }

            return {
              name,
              current,
              wanted,
              latest,
              url,
              hint,
              range: normalized.range,
              upgradeTo: '',
              workspaceName: workspaceName || '',
              workspaceLoc: workspaceLoc || '',
            };
          });

          return function() {
            return _ref3.apply(this, arguments);
          };
        })())
      );

      // Make sure to always output `exotic` versions to be compatible with npm
      var isDepOld = _ref4 => {
        var current = _ref4.current, latest = _ref4.latest, wanted = _ref4.wanted;
        return latest === 'exotic' || semver.lt(current, wanted) || semver.lt(current, latest);
      };
      var orderByName = (depA, depB) => depA.name.localeCompare(depB.name);
      return deps.filter(isDepOld).sort(orderByName);
    })();
  }
}
exports.default = PackageRequest;
