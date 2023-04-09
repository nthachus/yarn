/* eslint no-unused-vars: 0 */
'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _index = _interopRequireDefault(require('../util/normalize-manifest/index.js'));
var constants = _interopRequireWildcard(require('../constants.js'));
var fs = _interopRequireWildcard(require('../util/fs.js'));
var _mutex = _interopRequireDefault(require('../util/mutex.js'));

var cmdShim = require('@zkochan/cmd-shim');
var path = require('path');

class BaseFetcher {
  constructor(dest, remote, config) {
    this.reporter = config.reporter;
    this.packageName = remote.packageName;
    this.reference = remote.reference;
    this.registry = remote.registry;
    this.hash = remote.hash;
    this.remote = remote;
    this.config = config;
    this.dest = dest;
  }

  setupMirrorFromCache() {
    // fetcher subclasses may use this to perform actions such as copying over a cached tarball to the offline
    // mirror etc
    return Promise.resolve();
  }

  _fetch() {
    return Promise.reject(new Error('Not implemented'));
  }

  fetch(defaultManifest) {
    var _this = this;
    return fs.lockQueue.push(this.dest, /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
      yield fs.mkdirp(_this.dest);

      // fetch package and get the hash
      var _yield$_this$_fetch = yield _this._fetch(), hash = _yield$_this$_fetch.hash;

      var pkg = yield (0, _asyncToGenerator2.default)(function* () {
        // load the new normalized manifest
        try {
          return yield _this.config.readManifest(_this.dest, _this.registry);
        } catch (e) {
          if (e.code === 'ENOENT' && defaultManifest) {
            return (0, _index.default)(defaultManifest, _this.dest, _this.config, false);
          } else {
            throw e;
          }
        }
      })();

      if (pkg.bin) {
        for (var binName of Object.keys(pkg.bin)) {
          var binDest = `${_this.dest}/.bin`;

          // Using any sort of absolute path here would prevent makePortableProxyScript from preserving symlinks when
          // calling the binary
          var src = path.resolve(_this.dest, pkg.bin[binName]);

          if (yield fs.exists(src)) {
            // We ensure that the target is executable
            yield fs.chmod(src, 0o755);
          }

          yield fs.mkdirp(binDest);
          if (process.platform === 'win32') {
            var unlockMutex = yield (0, _mutex.default)(src);
            try {
              yield cmdShim.ifExists(src, `${binDest}/${binName}`, {createPwshFile: false});
            } finally {
              unlockMutex();
            }
          } else {
            yield fs.symlink(src, `${binDest}/${binName}`);
          }
        }
      }

      yield fs.writeFile(
        path.join(_this.dest, constants.METADATA_FILENAME),
        JSON.stringify(
          {
            manifest: pkg,
            artifacts: [],
            remote: _this.remote,
            registry: _this.registry,
            hash,
          },
          null,
          '  '
        )
      );

      return {
        hash,
        dest: _this.dest,
        package: pkg,
        cached: false,
      };
    }));
  }
}
exports.default = BaseFetcher;
