'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = exports.LocalTarballFetcher = void 0;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../errors.js');
var constants = _interopRequireWildcard(require('../constants.js'));
var _baseFetcher = _interopRequireDefault(require('./base-fetcher.js'));
var fsUtil = _interopRequireWildcard(require('../util/fs.js'));
var _misc = require('../util/misc.js');
var normalizeUrl = require('normalize-url');

var crypto = require('crypto');
var path = require('path');
var tarFs = require('tar-fs');
var url = require('url');
var fs = require('fs');
var stream = require('stream');
var gunzip = require('gunzip-maybe');
var invariant = require('invariant');
var ssri = require('ssri');

var RE_URL_NAME_MATCH = /\/(?:(@[^/]+)(?:\/|%2f))?[^/]+\/(?:-|_attachments)\/(?:@[^/]+\/)?([^/]+)$/;

var isHashAlgorithmSupported = name => {
  var cachedResult = isHashAlgorithmSupported.__cache[name];
  if (cachedResult != null) {
    return cachedResult;
  }
  var supported = true;
  try {
    crypto.createHash(name);
  } catch (error) {
    if (error.message !== 'Digest method not supported') {
      throw error;
    }
    supported = false;
  }

  isHashAlgorithmSupported.__cache[name] = supported;
  return supported;
};
isHashAlgorithmSupported.__cache = {};

class TarballFetcher extends _baseFetcher.default {
  constructor(dest, remote, config) {
    super(dest, remote, config);
    this.validateError = null;
    this.validateIntegrity = null;
  }

  setupMirrorFromCache() {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var tarballMirrorPath = _this.getTarballMirrorPath();
      var tarballCachePath = _this.getTarballCachePath();

      if (tarballMirrorPath == null) {
        return;
      }

      if (!(yield fsUtil.exists(tarballMirrorPath)) && (yield fsUtil.exists(tarballCachePath))) {
        // The tarball doesn't exists in the offline cache but does in the cache; we import it to the mirror
        yield fsUtil.mkdirp(path.dirname(tarballMirrorPath));
        yield fsUtil.copy(tarballCachePath, tarballMirrorPath, _this.reporter);
      }
    })();
  }

  getTarballCachePath() {
    return path.join(this.dest, constants.TARBALL_FILENAME);
  }

  getTarballMirrorPath() {
    var _url$parse = url.parse(this.reference), pathname = _url$parse.pathname;

    if (pathname == null) {
      return null;
    }

    var match = pathname.match(RE_URL_NAME_MATCH);

    var packageFilename;
    if (match) {
      var scope = match[1], tarballBasename = match[2];
      packageFilename = scope ? `${scope}-${tarballBasename}` : tarballBasename;
    } else {
      // fallback to base name
      packageFilename = path.basename(pathname);
    }

    return this.config.getOfflineMirrorPath(packageFilename);
  }

  createExtractor(
    resolve,
    reject,
    tarballPath
  ) {
    var hashInfo = this._supportedIntegrity({hashOnly: true});
    var integrityInfo = this._supportedIntegrity({hashOnly: false});

    var now = new Date();

    var fs = require('fs');
    var patchedFs = Object.assign({}, fs, {
      utimes: (path, atime, mtime, cb) => {
        fs.stat(path, (err, stat) => {
          if (err) {
            cb(err);
            return;
          }
          if (stat.isDirectory()) {
            fs.utimes(path, atime, mtime, cb);
            return;
          }
          fs.open(path, 'a', (err, fd) => {
            if (err) {
              cb(err);
              return;
            }
            fs.futimes(fd, atime, mtime, err => {
              if (err) {
                fs.close(fd, () => cb(err));
              } else {
                fs.close(fd, err => cb(err));
              }
            });
          });
        });
      },
    });

    var hashValidateStream = new ssri.integrityStream(hashInfo);
    var integrityValidateStream = new ssri.integrityStream(integrityInfo);

    var untarStream = tarFs.extract(this.dest, {
      strip: 1,
      dmode: 0o755, // all dirs should be readable
      fmode: 0o644, // all files should be readable
      chown: false, // don't chown. just leave as it is
      map: header => {
        header.mtime = now;
        if (header.linkname) {
          var basePath = path.posix.dirname(path.join('/', header.name));
          var jailPath = path.posix.join(basePath, header.linkname);
          header.linkname = path.posix.relative('/', jailPath);
        }
        return header;
      },
      fs: patchedFs,
    });
    var extractorStream = gunzip();

    hashValidateStream.once('error', err => {
      this.validateError = err;
    });
    integrityValidateStream.once('error', err => {
      this.validateError = err;
    });
    integrityValidateStream.once('integrity', sri => {
      this.validateIntegrity = sri;
    });

    untarStream.on('error', err => {
      reject(new _errors.MessageError(this.config.reporter.lang('errorExtractingTarball', err.message, tarballPath)));
    });

    extractorStream.pipe(untarStream).on('finish', () => {
      var error = this.validateError;
      var hexDigest = this.validateIntegrity ? this.validateIntegrity.hexDigest() : '';
      if (
        this.config.updateChecksums &&
        this.remote.integrity &&
        this.validateIntegrity &&
        this.remote.integrity !== this.validateIntegrity.toString()
      ) {
        this.remote.integrity = this.validateIntegrity.toString();
      } else if (this.validateIntegrity) {
        this.remote.cacheIntegrity = this.validateIntegrity.toString();
      }

      if (integrityInfo.integrity && Object.keys(integrityInfo.integrity).length === 0) {
        return reject(
          new _errors.SecurityError(
            this.config.reporter.lang('fetchBadIntegrityAlgorithm', this.packageName, this.remote.reference)
          )
        );
      }

      if (error) {
        if (this.config.updateChecksums) {
          this.remote.integrity = error.found.toString();
        } else {
          return reject(
            new _errors.SecurityError(
              this.config.reporter.lang(
                'fetchBadHashWithPath',
                this.packageName,
                this.remote.reference,
                error.found.toString(),
                error.expected.toString()
              )
            )
          );
        }
      }

      return resolve({
        hash: this.hash || hexDigest,
      });
    });

    return {hashValidateStream, integrityValidateStream, extractorStream};
  }

  getLocalPaths(override) {
    var paths = [
      override ? path.resolve(this.config.cwd, override) : null,
      this.getTarballMirrorPath(),
      this.getTarballCachePath(),
    ];
    // $FlowFixMe: https://github.com/facebook/flow/issues/1414
    return paths.filter(path => path != null);
  }

  fetchFromLocal(override) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var tarPaths = _this2.getLocalPaths(override);
      var stream = yield fsUtil.readFirstAvailableStream(tarPaths);

      return new Promise((resolve, reject) => {
        if (!stream) {
          reject(new _errors.MessageError(_this2.reporter.lang('tarballNotInNetworkOrCache', _this2.reference, tarPaths)));
          return;
        }
        invariant(stream, 'stream should be available at this point');
        // $FlowFixMe - This is available https://nodejs.org/api/fs.html#fs_readstream_path
        var tarballPath = stream.path;
        var _this2$createExtracto = _this2.createExtractor(
          resolve,
          reject,
          tarballPath
        );
        var hashValidateStream = _this2$createExtracto.hashValidateStream, integrityValidateStream = _this2$createExtracto.integrityValidateStream, extractorStream = _this2$createExtracto.extractorStream;

        stream.pipe(hashValidateStream);
        hashValidateStream.pipe(integrityValidateStream);

        integrityValidateStream.pipe(extractorStream).on('error', err => {
          reject(new _errors.MessageError(_this2.config.reporter.lang('fetchErrorCorrupt', err.message, tarballPath)));
        });
      });
    })();
  }

  fetchFromExternal() {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var registry = _this3.config.registries[_this3.registry];

      try {
        var headers = _this3.requestHeaders();
        return yield registry.request(
          _this3.reference,
          {
            headers: (0, _extends2.default)(
              {
                'Accept-Encoding': 'gzip',
              },
              headers
            ),
            buffer: true,
            process: (req, resolve, reject) => {
              // should we save this to the offline cache?
              var tarballMirrorPath = _this3.getTarballMirrorPath();
              var tarballCachePath = _this3.getTarballCachePath();

              var _this3$createExtracto = _this3.createExtractor(
                resolve,
                reject
              );
              var hashValidateStream = _this3$createExtracto.hashValidateStream, integrityValidateStream = _this3$createExtracto.integrityValidateStream, extractorStream = _this3$createExtracto.extractorStream;

              req.pipe(hashValidateStream);
              hashValidateStream.pipe(integrityValidateStream);

              if (tarballMirrorPath) {
                integrityValidateStream.pipe(fs.createWriteStream(tarballMirrorPath)).on('error', reject);
              }

              if (tarballCachePath) {
                integrityValidateStream.pipe(fs.createWriteStream(tarballCachePath)).on('error', reject);
              }

              integrityValidateStream.pipe(extractorStream).on('error', reject);
            },
          },
          _this3.packageName
        );
      } catch (err) {
        var tarballMirrorPath = _this3.getTarballMirrorPath();
        var tarballCachePath = _this3.getTarballCachePath();

        if (tarballMirrorPath && (yield fsUtil.exists(tarballMirrorPath))) {
          yield fsUtil.unlink(tarballMirrorPath);
        }

        if (tarballCachePath && (yield fsUtil.exists(tarballCachePath))) {
          yield fsUtil.unlink(tarballCachePath);
        }

        throw err;
      }
    })();
  }

  requestHeaders() {
    var registry = this.config.registries.yarn;
    var config = registry.config;
    var requestParts = urlParts(this.reference);
    return Object.keys(config).reduce((headers, option) => {
      var parts = option.split(':');
      if (parts.length === 3 && parts[1] === '_header') {
        var registryParts = urlParts(parts[0]);
        if (requestParts.host === registryParts.host && requestParts.path.startsWith(registryParts.path)) {
          var headerName = parts[2];
          var headerValue = config[option];
          headers[headerName] = headerValue;
        }
      }
      return headers;
    }, {});
  }

  _fetch() {
    var isFilePath = this.reference.startsWith('file:');
    this.reference = (0, _misc.removePrefix)(this.reference, 'file:');
    var urlParse = url.parse(this.reference);

    // legacy support for local paths in yarn.lock entries
    var isRelativePath = urlParse.protocol
      ? urlParse.protocol.match(/^[a-z]:$/i)
      : urlParse.pathname ? urlParse.pathname.match(/^(?:\.{1,2})?[\\\/]/) : false;

    if (isFilePath || isRelativePath) {
      return this.fetchFromLocal(this.reference);
    }

    return this.fetchFromLocal().catch(err => this.fetchFromExternal());
  }

  _findIntegrity(_ref) {
    var hashOnly = _ref.hashOnly;
    if (this.remote.integrity && !hashOnly) {
      return ssri.parse(this.remote.integrity);
    }
    if (this.hash) {
      return ssri.fromHex(this.hash, 'sha1');
    }
    return null;
  }

  _supportedIntegrity(_ref2) {
    var hashOnly = _ref2.hashOnly;
    var expectedIntegrity = this._findIntegrity({hashOnly}) || {};
    var expectedIntegrityAlgorithms = Object.keys(expectedIntegrity);
    var shouldValidateIntegrity = (this.hash || this.remote.integrity) && !this.config.updateChecksums;

    if (expectedIntegrityAlgorithms.length === 0 && (!shouldValidateIntegrity || hashOnly)) {
      var _algorithms = this.config.updateChecksums ? ['sha512'] : ['sha1'];
      // for consistency, return sha1 for packages without a remote integrity (eg. github)
      return {integrity: null, algorithms: _algorithms};
    }

    var algorithms = new Set(['sha512', 'sha1']);
    var integrity = {};
    for (var algorithm of expectedIntegrityAlgorithms) {
      if (isHashAlgorithmSupported(algorithm)) {
        algorithms.add(algorithm);
        integrity[algorithm] = expectedIntegrity[algorithm];
      }
    }

    return {integrity, algorithms: Array.from(algorithms)};
  }
}
exports.default = TarballFetcher;

class LocalTarballFetcher extends TarballFetcher {
  _fetch() {
    return this.fetchFromLocal(this.reference);
  }
}
exports.LocalTarballFetcher = LocalTarballFetcher;

function urlParts(requestUrl) {
  var normalizedUrl = normalizeUrl(requestUrl);
  var parsed = url.parse(normalizedUrl);
  var host = parsed.host || '';
  var path = parsed.path || '';
  return {host, path};
}
