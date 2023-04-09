'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _tarballFetcher = _interopRequireDefault(require('../../fetchers/tarball-fetcher.js'));
var _exoticResolver = _interopRequireDefault(require('./exotic-resolver.js'));
var _gitResolver = _interopRequireDefault(require('./git-resolver.js'));
var _guessName = _interopRequireDefault(require('../../util/guess-name.js'));
var versionUtil = _interopRequireWildcard(require('../../util/version.js'));
var crypto = _interopRequireWildcard(require('../../util/crypto.js'));
var fs = _interopRequireWildcard(require('../../util/fs.js'));

var invariant = require('invariant');

class TarballResolver extends _exoticResolver.default {
  constructor(request, fragment) {
    super(request, fragment);

    var _versionUtil$explodeH = versionUtil.explodeHashedUrl(fragment), hash = _versionUtil$explodeH.hash, url = _versionUtil$explodeH.url;
    this.hash = hash;
    this.url = url;
  }

  static isVersion(pattern) {
    // we can sometimes match git urls which we don't want
    if (_gitResolver.default.isVersion(pattern)) {
      return false;
    }

    // full http url
    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
      return true;
    }

    // local file reference - ignore patterns with names
    if (pattern.indexOf('@') < 0) {
      if (pattern.endsWith('.tgz') || pattern.endsWith('.tar.gz')) {
        return true;
      }
    }

    return false;
  }

  resolve() {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var shrunk = _this.request.getLocked('tarball');
      if (shrunk) {
        return shrunk;
      }

      var url = _this.url;
      var hash = _this.hash, registry = _this.registry;
      var pkgJson;

      // generate temp directory
      var dest = _this.config.getTemp(crypto.hash(url));

      if (yield _this.config.isValidModuleDest(dest)) {
        // load from local cache
        var _yield$_this$config$r = yield _this.config.readPackageMetadata(dest);
        pkgJson = _yield$_this$config$r.package;
        hash = _yield$_this$config$r.hash;
        registry = _yield$_this$config$r.registry;
      } else {
        // delete if invalid
        yield fs.unlink(dest);

        var fetcher = new _tarballFetcher.default(
          dest,
          {
            type: 'tarball',
            reference: url,
            registry,
            hash,
          },
          _this.config
        );

        // fetch file and get it's hash
        var fetched = yield fetcher.fetch({
          name: (0, _guessName.default)(url),
          version: '0.0.0',
          _registry: 'npm',
        });
        pkgJson = fetched.package;
        hash = fetched.hash;

        registry = pkgJson._registry;
        invariant(registry, 'expected registry');
      }

      // use the commit/tarball hash as the uid as we can't rely on the version as it's not
      // in the registry
      pkgJson._uid = hash;

      // set remote so it can be "fetched"
      pkgJson._remote = {
        type: 'copy',
        resolved: `${url}#${hash}`,
        hash,
        registry,
        reference: dest,
      };

      return pkgJson;
    })();
  }
}
exports.default = TarballResolver;
