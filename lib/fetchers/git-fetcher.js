'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../errors.js');
var _baseFetcher = _interopRequireDefault(require('./base-fetcher.js'));
var _git = _interopRequireDefault(require('../util/git.js'));
var fsUtil = _interopRequireWildcard(require('../util/fs.js'));
var constants = _interopRequireWildcard(require('../constants.js'));
var crypto = _interopRequireWildcard(require('../util/crypto.js'));
var _install = require('../cli/commands/install.js');
var _lockfile = _interopRequireDefault(require('../lockfile'));
var _config = _interopRequireDefault(require('../config.js'));
var _pack = require('../cli/commands/pack.js');

var tarFs = require('tar-fs');
var url = require('url');
var path = require('path');
var fs = require('fs');

var invariant = require('invariant');

var PACKED_FLAG = '1';

class GitFetcher extends _baseFetcher.default {
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

  getTarballMirrorPath(_temp) {
    var _ref = _temp === void 0 ? {} : _temp, _ref$withCommit = _ref.withCommit, withCommit = _ref$withCommit === void 0 ? true : _ref$withCommit;
    var _url$parse = url.parse(this.reference), pathname = _url$parse.pathname;

    if (pathname == null) {
      return null;
    }

    var hash = this.hash;

    var packageFilename = withCommit && hash ? `${path.basename(pathname)}-${hash}` : `${path.basename(pathname)}`;

    if (packageFilename.startsWith(':')) {
      packageFilename = packageFilename.substr(1);
    }

    return this.config.getOfflineMirrorPath(packageFilename);
  }

  getTarballCachePath() {
    return path.join(this.dest, constants.TARBALL_FILENAME);
  }

  getLocalPaths(override) {
    var paths = [
      override ? path.resolve(this.config.cwd, override) : null,
      this.getTarballMirrorPath(),
      this.getTarballMirrorPath({withCommit: false}),
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
        invariant(stream, 'cachedStream should be available at this point');
        // $FlowFixMe - This is available https://nodejs.org/api/fs.html#fs_readstream_path
        var tarballPath = stream.path;

        var untarStream = _this2._createUntarStream(_this2.dest);

        var hashStream = new crypto.HashStream();
        stream
          .pipe(hashStream)
          .pipe(untarStream)
          .on('finish', () => {
            var expectHash = _this2.hash;
            invariant(expectHash, 'Commit hash required');

            var actualHash = hashStream.getHash();

            // This condition is disabled because "expectHash" actually is the commit hash
            // This is a design issue that we'll need to fix (https://github.com/yarnpkg/yarn/pull/3449)
            if (true || !expectHash || expectHash === actualHash) {
              resolve({
                hash: expectHash,
              });
            } else {
              reject(
                new _errors.SecurityError(
                  _this2.config.reporter.lang(
                    'fetchBadHashWithPath',
                    _this2.packageName,
                    _this2.remote.reference,
                    expectHash,
                    actualHash
                  )
                )
              );
            }
          })
          .on('error', function(err) {
            reject(new _errors.MessageError(this.reporter.lang('fetchErrorCorrupt', err.message, tarballPath)));
          });
      });
    })();
  }

  hasPrepareScript(git) {
    return (0, _asyncToGenerator2.default)(function* () {
      var manifestFile = yield git.getFile('package.json');

      if (manifestFile) {
        var scripts = JSON.parse(manifestFile).scripts;
        var hasPrepareScript = Boolean(scripts && scripts.prepare);
        return hasPrepareScript;
      }

      return false;
    })();
  }

  fetchFromExternal() {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var hash = _this3.hash;
      invariant(hash, 'Commit hash required');

      var gitUrl = _git.default.npmUrlToGitUrl(_this3.reference);
      var git = new _git.default(_this3.config, gitUrl, hash);
      yield git.init();

      if (yield _this3.hasPrepareScript(git)) {
        yield _this3.fetchFromInstallAndPack(git);
      } else {
        yield _this3.fetchFromGitArchive(git);
      }

      return {
        hash,
      };
    })();
  }

  fetchFromInstallAndPack(git) {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var prepareDirectory = _this4.config.getTemp(`${crypto.hash(git.gitUrl.repository)}.${git.hash}.prepare`);
      yield fsUtil.unlink(prepareDirectory);

      yield git.clone(prepareDirectory);

      var _yield$Promise$all = yield Promise.all([
        _config.default.create(
          {
            binLinks: true,
            cwd: prepareDirectory,
            disablePrepublish: true,
            production: false,
          },
          _this4.reporter
        ),
        _lockfile.default.fromDirectory(prepareDirectory, _this4.reporter),
      ]);
      var prepareConfig = _yield$Promise$all[0], prepareLockFile = _yield$Promise$all[1];
      yield (0, _install.install)(prepareConfig, _this4.reporter, {}, prepareLockFile);

      var tarballMirrorPath = _this4.getTarballMirrorPath();
      var tarballCachePath = _this4.getTarballCachePath();

      if (tarballMirrorPath) {
        yield _this4._packToTarball(prepareConfig, tarballMirrorPath);
      }
      if (tarballCachePath) {
        yield _this4._packToTarball(prepareConfig, tarballCachePath);
      }

      yield _this4._packToDirectory(prepareConfig, _this4.dest);

      yield fsUtil.unlink(prepareDirectory);
    })();
  }

  _packToTarball(config, path) {
    var _this5 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var tarballStream = yield _this5._createTarballStream(config);
      yield new Promise((resolve, reject) => {
        var writeStream = fs.createWriteStream(path);
        tarballStream.on('error', reject);
        writeStream.on('error', reject);
        writeStream.on('end', resolve);
        writeStream.on('open', () => {
          tarballStream.pipe(writeStream);
        });
        writeStream.once('finish', resolve);
      });
    })();
  }

  _packToDirectory(config, dest) {
    var _this6 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var tarballStream = yield _this6._createTarballStream(config);
      yield new Promise((resolve, reject) => {
        var untarStream = _this6._createUntarStream(dest);
        tarballStream.on('error', reject);
        untarStream.on('error', reject);
        untarStream.on('end', resolve);
        untarStream.once('finish', resolve);
        tarballStream.pipe(untarStream);
      });
    })();
  }

  _createTarballStream(config) {
    var savedPackedHeader = false;
    return (0, _pack.packTarball)(config, {
      mapHeader(header) {
        if (!savedPackedHeader) {
          savedPackedHeader = true;
          header.pax = header.pax || {};
          // add a custom data on the first header
          // in order to distinguish a tar from "git archive" and a tar from "pack" command
          header.pax.packed = PACKED_FLAG;
        }
        return header;
      },
    });
  }

  _createUntarStream(dest) {
    var PREFIX = 'package/';
    var isPackedTarball = undefined;
    return tarFs.extract(dest, {
      dmode: 0o555, // all dirs should be readable
      fmode: 0o444, // all files should be readable
      chown: false, // don't chown. just leave as it is
      map: header => {
        if (isPackedTarball === undefined) {
          isPackedTarball = header.pax && header.pax.packed === PACKED_FLAG;
        }
        if (isPackedTarball) {
          header.name = header.name.substr(PREFIX.length);
        }
      },
    });
  }

  fetchFromGitArchive(git) {
    var _this7 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      yield git.clone(_this7.dest);
      var tarballMirrorPath = _this7.getTarballMirrorPath();
      var tarballCachePath = _this7.getTarballCachePath();

      if (tarballMirrorPath) {
        yield git.archive(tarballMirrorPath);
      }

      if (tarballCachePath) {
        yield git.archive(tarballCachePath);
      }
    })();
  }

  _fetch() {
    return this.fetchFromLocal().catch(err => this.fetchFromExternal());
  }
}
exports.default = GitFetcher;
