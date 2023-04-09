'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.fetch = fetch;
exports.fetchOneRemote = fetchOneRemote;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('./errors.js');
var fetchers = _interopRequireWildcard(require('./fetchers/index.js'));
var fs = _interopRequireWildcard(require('./util/fs.js'));
var promise = _interopRequireWildcard(require('./util/promise.js'));

var ssri = require('ssri');

function fetchCache() {
  return _fetchCache.apply(this, arguments);
}
function _fetchCache() {
  _fetchCache = (0, _asyncToGenerator2.default)(function* (
    dest,
    fetcher,
    config,
    remote
  ) {
    // $FlowFixMe: This error doesn't make sense
    var _yield$config$readPac = yield config.readPackageMetadata(dest), hash = _yield$config$readPac.hash, pkg = _yield$config$readPac.package, cacheRemote = _yield$config$readPac.remote;

    var cacheIntegrity = cacheRemote.cacheIntegrity || cacheRemote.integrity;
    var cacheHash = cacheRemote.hash;

    if (remote.integrity) {
      if (!cacheIntegrity || !ssri.parse(cacheIntegrity).match(remote.integrity)) {
        throw new _errors.SecurityError(
          config.reporter.lang('fetchBadIntegrityCache', pkg.name, cacheIntegrity, remote.integrity)
        );
      }
    }

    if (remote.hash) {
      if (!cacheHash || cacheHash !== remote.hash) {
        throw new _errors.SecurityError(config.reporter.lang('fetchBadHashCache', pkg.name, cacheHash, remote.hash));
      }
    }

    yield fetcher.setupMirrorFromCache();
    return {
      package: pkg,
      hash,
      dest,
      cached: true,
    };
  });

  return _fetchCache.apply(this, arguments);
}

function fetchOneRemote() {
  return _fetchOneRemote.apply(this, arguments);
}
function _fetchOneRemote() {
  _fetchOneRemote = (0, _asyncToGenerator2.default)(function* (
    remote,
    name,
    version,
    dest,
    config
  ) {
    // Mock metadata for symlinked dependencies
    if (remote.type === 'link') {
      var mockPkg = {_uid: '', name: '', version: '0.0.0'};
      return Promise.resolve({resolved: null, hash: '', dest, package: mockPkg, cached: false});
    }

    var Fetcher = fetchers[remote.type];
    if (!Fetcher) {
      throw new _errors.MessageError(config.reporter.lang('unknownFetcherFor', remote.type));
    }

    var fetcher = new Fetcher(dest, remote, config);
    if (yield config.isValidModuleDest(dest)) {
      return fetchCache(dest, fetcher, config, remote);
    }

    // remove as the module may be invalid
    yield fs.unlink(dest);

    try {
      return yield fetcher.fetch({
        name,
        version,
      });
    } catch (err) {
      try {
        yield fs.unlink(dest);
      } catch (err2) {
        // what do?
      }
      throw err;
    }
  });

  return _fetchOneRemote.apply(this, arguments);
}

function fetchOne(ref, config) {
  var dest = config.generateModuleCachePath(ref);

  return fetchOneRemote(ref.remote, ref.name, ref.version, dest, config);
}

function maybeFetchOne() {
  return _maybeFetchOne.apply(this, arguments);
}
function _maybeFetchOne() {
  _maybeFetchOne = (0, _asyncToGenerator2.default)(function* (ref, config) {
    try {
      return yield fetchOne(ref, config);
    } catch (err) {
      if (ref.optional) {
        config.reporter.error(err.message);
        return null;
      } else {
        throw err;
      }
    }
  });

  return _maybeFetchOne.apply(this, arguments);
}

function fetch(pkgs, config) {
  var pkgsPerDest = new Map();
  pkgs = pkgs.filter(pkg => {
    var ref = pkg._reference;
    if (!ref) {
      return false;
    }
    var dest = config.generateModuleCachePath(ref);
    var otherPkg = pkgsPerDest.get(dest);
    if (otherPkg) {
      config.reporter.warn(
        config.reporter.lang('multiplePackagesCantUnpackInSameDestination', ref.patterns, dest, otherPkg.patterns)
      );
      return false;
    }
    pkgsPerDest.set(dest, ref);
    return true;
  });
  var tick = config.reporter.progress(pkgs.length);

  return promise.queue(
    pkgs,
    /*#__PURE__*/ (function() {
      var _ref = (0, _asyncToGenerator2.default)(function* (pkg) {
        var ref = pkg._reference;
        if (!ref) {
          return pkg;
        }

        var res = yield maybeFetchOne(ref, config);
        var newPkg;

        if (res) {
          newPkg = res.package;

          // update with new remote
          // but only if there was a hash previously as the tarball fetcher does not provide a hash.
          if (ref.remote.hash) {
            // if the checksum was updated, also update resolved and cache
            if (ref.remote.hash !== res.hash && config.updateChecksums) {
              var oldHash = ref.remote.hash;
              if (ref.remote.resolved) {
                ref.remote.resolved = ref.remote.resolved.replace(oldHash, res.hash);
              }
              ref.config.cache = Object.keys(ref.config.cache).reduce((cache, entry) => {
                var entryWithNewHash = entry.replace(oldHash, res.hash);
                cache[entryWithNewHash] = ref.config.cache[entry];
                return cache;
              }, {});
            }
            ref.remote.hash = res.hash || ref.remote.hash;
          }
        }

        if (tick) {
          tick();
        }

        if (newPkg) {
          newPkg._reference = ref;
          newPkg._remote = ref.remote;
          newPkg.name = pkg.name;
          newPkg.fresh = pkg.fresh;
          return newPkg;
        }

        return pkg;
      });

      return function() {
        return _ref.apply(this, arguments);
      };
    })(),
    config.networkConcurrency
  );
}
