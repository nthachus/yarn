'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));

var invariant = require('invariant');
var _require = require('string_decoder'), StringDecoder = _require.StringDecoder;
var tarFs = require('tar-fs');
var tarStream = require('tar-stream');
var url = require('url');
var _require2 = require('fs'), createWriteStream = _require2.createWriteStream;

var _errors = require('../errors.js');
var _gitSpawn = require('./git/git-spawn.js');
var _gitRefResolver = require('./git/git-ref-resolver.js');
var crypto = _interopRequireWildcard(require('./crypto.js'));
var fs = _interopRequireWildcard(require('./fs.js'));
var _map = _interopRequireDefault(require('./map.js'));
var _misc = require('./misc.js');

var GIT_PROTOCOL_PREFIX = 'git+';
var SSH_PROTOCOL = 'ssh:';
var SCP_PATH_PREFIX = '/:';
var FILE_PROTOCOL = 'file:';
var GIT_VALID_REF_LINE_REGEXP = /^([a-fA-F0-9]+|ref)/;

var validRef = line => {
  return GIT_VALID_REF_LINE_REGEXP.exec(line);
};

var supportsArchiveCache = (0, _map.default)({
  'github.com': false, // not support, doubt they will ever support it
});

var handleSpawnError = err => {
  if (err instanceof _errors.ProcessSpawnError) {
    throw err;
  }
};

var SHORTHAND_SERVICES = (0, _map.default)({
  'github:': parsedUrl =>
    (0, _extends2.default)({}, parsedUrl, {
      slashes: true,
      auth: 'git',
      protocol: SSH_PROTOCOL,
      host: 'github.com',
      hostname: 'github.com',
      pathname: `/${parsedUrl.hostname}${parsedUrl.pathname}`,
    }),
  'bitbucket:': parsedUrl =>
    (0, _extends2.default)({}, parsedUrl, {
      slashes: true,
      auth: 'git',
      protocol: SSH_PROTOCOL,
      host: 'bitbucket.com',
      hostname: 'bitbucket.com',
      pathname: `/${parsedUrl.hostname}${parsedUrl.pathname}`,
    }),
});

class Git {
  constructor(config, gitUrl, hash) {
    this.supportsArchive = false;
    this.fetched = false;
    this.config = config;
    this.reporter = config.reporter;
    this.hash = hash;
    this.ref = hash;
    this.gitUrl = gitUrl;
    this.cwd = this.config.getTemp(crypto.hash(this.gitUrl.repository));
  }

  /**
   * npm URLs contain a 'git+' scheme prefix, which is not understood by git.
   * git "URLs" also allow an alternative scp-like syntax, so they're not standard URLs.
   */
  static npmUrlToGitUrl(npmUrl) {
    npmUrl = (0, _misc.removePrefix)(npmUrl, GIT_PROTOCOL_PREFIX);

    var parsed = url.parse(npmUrl);
    var expander = parsed.protocol && SHORTHAND_SERVICES[parsed.protocol];

    if (expander) {
      parsed = expander(parsed);
    }

    // Special case in npm, where ssh:// prefix is stripped to pass scp-like syntax
    // which in git works as remote path only if there are no slashes before ':'.
    // See #3146.
    if (
      parsed.protocol === SSH_PROTOCOL &&
      parsed.hostname &&
      parsed.path &&
      parsed.path.startsWith(SCP_PATH_PREFIX) &&
      parsed.port === null
    ) {
      var auth = parsed.auth ? parsed.auth + '@' : '';
      var pathname = parsed.path.slice(SCP_PATH_PREFIX.length);
      return {
        hostname: parsed.hostname,
        protocol: parsed.protocol,
        repository: `${auth}${parsed.hostname}:${pathname}`,
      };
    }

    // git local repos are specified as `git+file:` and a filesystem path, not a url.
    var repository;
    if (parsed.protocol === FILE_PROTOCOL) {
      repository = parsed.path;
    } else {
      repository = url.format((0, _extends2.default)({}, parsed, {hash: ''}));
    }

    return {
      hostname: parsed.hostname || null,
      protocol: parsed.protocol || FILE_PROTOCOL,
      repository: repository || '',
    };
  }

  /**
   * Check if the host specified in the input `gitUrl` has archive capability.
   */

  static hasArchiveCapability(ref) {
    return (0, _asyncToGenerator2.default)(function* () {
      var hostname = ref.hostname;
      if (ref.protocol !== 'ssh:' || hostname == null) {
        return false;
      }

      if (hostname in supportsArchiveCache) {
        return supportsArchiveCache[hostname];
      }

      try {
        yield (0, _gitSpawn.spawn)(['archive', `--remote=${ref.repository}`, 'HEAD', Date.now() + '']);
        throw new Error();
      } catch (err) {
        handleSpawnError(err);
        var supports = err.message.indexOf('did not match any files') >= 0;
        return (supportsArchiveCache[hostname] = supports);
      }
    })();
  }

  /**
   * Check if the input `target` is a 5-40 character hex commit hash.
   */

  static repoExists(ref) {
    return (0, _asyncToGenerator2.default)(function* () {
      var isLocal = ref.protocol === FILE_PROTOCOL;

      try {
        if (isLocal) {
          yield (0, _gitSpawn.spawn)(['show-ref', '-t'], {cwd: ref.repository});
        } else {
          yield (0, _gitSpawn.spawn)(['ls-remote', '-t', ref.repository]);
        }
        return true;
      } catch (err) {
        handleSpawnError(err);
        return false;
      }
    })();
  }

  static replaceProtocol(ref, protocol) {
    return {
      hostname: ref.hostname,
      protocol,
      repository: ref.repository.replace(/^(?:git|http):/, protocol),
    };
  }

  /**
   * Attempt to upgrade insecure protocols to secure protocol
   */
  static secureGitUrl(ref, hash, reporter) {
    return (0, _asyncToGenerator2.default)(function* () {
      if ((0, _gitRefResolver.isCommitSha)(hash)) {
        // this is cryptographically secure
        return ref;
      }

      if (ref.protocol === 'git:') {
        var secureUrl = Git.replaceProtocol(ref, 'https:');
        if (yield Git.repoExists(secureUrl)) {
          return secureUrl;
        } else {
          reporter.warn(reporter.lang('downloadGitWithoutCommit', ref.repository));
          return ref;
        }
      }

      if (ref.protocol === 'http:') {
        var secureRef = Git.replaceProtocol(ref, 'https:');
        if (yield Git.repoExists(secureRef)) {
          return secureRef;
        } else {
          reporter.warn(reporter.lang('downloadHTTPWithoutCommit', ref.repository));
          return ref;
        }
      }

      return ref;
    })();
  }

  /**
   * Archive a repo to destination
   */

  archive(dest) {
    if (this.supportsArchive) {
      return this._archiveViaRemoteArchive(dest);
    } else {
      return this._archiveViaLocalFetched(dest);
    }
  }

  _archiveViaRemoteArchive(dest) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var hashStream = new crypto.HashStream();
      yield (0, _gitSpawn.spawn)(['archive', `--remote=${_this.gitUrl.repository}`, _this.ref], {
        process(proc, resolve, reject, done) {
          var writeStream = createWriteStream(dest);
          proc.on('error', reject);
          writeStream.on('error', reject);
          writeStream.on('end', done);
          writeStream.on('open', function() {
            proc.stdout.pipe(hashStream).pipe(writeStream);
          });
          writeStream.once('finish', done);
        },
      });
      return hashStream.getHash();
    })();
  }

  _archiveViaLocalFetched(dest) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var hashStream = new crypto.HashStream();
      yield (0, _gitSpawn.spawn)(['archive', _this2.hash], {
        cwd: _this2.cwd,
        process(proc, resolve, reject, done) {
          var writeStream = createWriteStream(dest);
          proc.on('error', reject);
          writeStream.on('error', reject);
          writeStream.on('open', function() {
            proc.stdout.pipe(hashStream).pipe(writeStream);
          });
          writeStream.once('finish', done);
        },
      });
      return hashStream.getHash();
    })();
  }

  /**
   * Clone a repo to the input `dest`. Use `git archive` if it's available, otherwise fall
   * back to `git clone`.
   */

  clone(dest) {
    if (this.supportsArchive) {
      return this._cloneViaRemoteArchive(dest);
    } else {
      return this._cloneViaLocalFetched(dest);
    }
  }

  _cloneViaRemoteArchive(dest) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      yield (0, _gitSpawn.spawn)(['archive', `--remote=${_this3.gitUrl.repository}`, _this3.ref], {
        process(proc, update, reject, done) {
          var extractor = tarFs.extract(dest, {
            dmode: 0o555, // all dirs should be readable
            fmode: 0o444, // all files should be readable
          });
          extractor.on('error', reject);
          extractor.on('finish', done);

          proc.stdout.pipe(extractor);
          proc.on('error', reject);
        },
      });
    })();
  }

  _cloneViaLocalFetched(dest) {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      yield (0, _gitSpawn.spawn)(['archive', _this4.hash], {
        cwd: _this4.cwd,
        process(proc, resolve, reject, done) {
          var extractor = tarFs.extract(dest, {
            dmode: 0o555, // all dirs should be readable
            fmode: 0o444, // all files should be readable
          });

          extractor.on('error', reject);
          extractor.on('finish', done);

          proc.stdout.pipe(extractor);
        },
      });
    })();
  }

  /**
   * Clone this repo.
   */

  fetch() {
    var _this5 = this;
    var gitUrl = this.gitUrl, cwd = this.cwd;

    return fs.lockQueue.push(gitUrl.repository, /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
      if (yield fs.exists(cwd)) {
        yield (0, _gitSpawn.spawn)(['fetch', '--tags'], {cwd});
        yield (0, _gitSpawn.spawn)(['pull'], {cwd});
      } else {
        yield (0, _gitSpawn.spawn)(['clone', gitUrl.repository, cwd]);
      }

      _this5.fetched = true;
    }));
  }

  /**
   * Fetch the file by cloning the repo and reading it.
   */

  getFile(filename) {
    if (this.supportsArchive) {
      return this._getFileFromArchive(filename);
    } else {
      return this._getFileFromClone(filename);
    }
  }

  _getFileFromArchive(filename) {
    var _this6 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      try {
        return yield (0, _gitSpawn.spawn)(['archive', `--remote=${_this6.gitUrl.repository}`, _this6.ref, filename], {
          process(proc, update, reject, done) {
            var parser = tarStream.extract();

            parser.on('error', reject);
            parser.on('finish', done);

            parser.on('entry', (header, stream, next) => {
              var decoder = new StringDecoder('utf8');
              var fileContent = '';

              stream.on('data', buffer => {
                fileContent += decoder.write(buffer);
              });
              stream.on('end', () => {
                var remaining = decoder.end();
                update(fileContent + remaining);
                next();
              });
              stream.resume();
            });

            proc.stdout.pipe(parser);
          },
        });
      } catch (err) {
        if (err.message.indexOf('did not match any files') >= 0) {
          return false;
        } else {
          throw err;
        }
      }
    })();
  }

  _getFileFromClone(filename) {
    var _this7 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      invariant(_this7.fetched, 'Repo not fetched');

      try {
        return yield (0, _gitSpawn.spawn)(['show', `${_this7.hash}:${filename}`], {
          cwd: _this7.cwd,
        });
      } catch (err) {
        handleSpawnError(err);
        // file doesn't exist
        return false;
      }
    })();
  }

  /**
   * Initialize the repo, find a secure url to use and
   * set the ref to match an input `target`.
   */
  init() {
    var _this8 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      _this8.gitUrl = yield Git.secureGitUrl(_this8.gitUrl, _this8.hash, _this8.reporter);

      yield _this8.setRefRemote();

      // check capabilities
      if (_this8.ref !== '' && (yield Git.hasArchiveCapability(_this8.gitUrl))) {
        _this8.supportsArchive = true;
      } else {
        yield _this8.fetch();
      }

      return _this8.hash;
    })();
  }

  setRefRemote() {
    var _this9 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var isLocal = _this9.gitUrl.protocol === FILE_PROTOCOL;
      var stdout;

      if (isLocal) {
        stdout = yield (0, _gitSpawn.spawn)(['show-ref', '--tags', '--heads'], {cwd: _this9.gitUrl.repository});
      } else {
        stdout = yield (0, _gitSpawn.spawn)(['ls-remote', '--tags', '--heads', _this9.gitUrl.repository]);
      }

      var refs = (0, _gitRefResolver.parseRefs)(stdout);
      return _this9.setRef(refs);
    })();
  }

  setRefHosted(hostedRefsList) {
    var refs = (0, _gitRefResolver.parseRefs)(hostedRefsList);
    return this.setRef(refs);
  }

  /**
   * Resolves the default branch of a remote repository (not always "master")
   */

  resolveDefaultBranch() {
    var _this10 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var isLocal = _this10.gitUrl.protocol === FILE_PROTOCOL;

      try {
        var stdout;
        if (isLocal) {
          stdout = yield (0, _gitSpawn.spawn)(['show-ref', 'HEAD'], {cwd: _this10.gitUrl.repository});
          var refs = (0, _gitRefResolver.parseRefs)(stdout);
          var sha = refs.values().next().value;
          if (sha) {
            return {sha, ref: undefined};
          } else {
            throw new Error('Unable to find SHA for git HEAD');
          }
        } else {
          stdout = yield (0, _gitSpawn.spawn)(['ls-remote', '--symref', _this10.gitUrl.repository, 'HEAD']);
          var lines = stdout.split('\n').filter(validRef);
          var _lines$0$split = lines[0].split(/\s+/), ref = _lines$0$split[1];
          var _lines$1$split = lines[1].split(/\s+/), _sha = _lines$1$split[0];
          return {sha: _sha, ref};
        }
      } catch (err) {
        handleSpawnError(err);
        // older versions of git don't support "--symref"
        var _stdout = yield (0, _gitSpawn.spawn)(['ls-remote', _this10.gitUrl.repository, 'HEAD']);
        var _lines = _stdout.split('\n').filter(validRef);
        var _lines$0$split2 = _lines[0].split(/\s+/), _sha2 = _lines$0$split2[0];
        return {sha: _sha2, ref: undefined};
      }
    })();
  }

  /**
   * Resolve a git commit to it's 40-chars format and ensure it exists in the repository
   * We need to use the 40-chars format to avoid multiple folders in the cache
   */

  resolveCommit(shaToResolve) {
    var _this11 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      try {
        yield _this11.fetch();
        var revListArgs = ['rev-list', '-n', '1', '--no-abbrev-commit', '--format=oneline', shaToResolve];
        var stdout = yield (0, _gitSpawn.spawn)(revListArgs, {cwd: _this11.cwd});
        var _stdout$split = stdout.split(/\s+/), sha = _stdout$split[0];
        return {sha, ref: undefined};
      } catch (err) {
        handleSpawnError(err);
        // assuming commit not found, let's try something else
        return null;
      }
    })();
  }

  /**
   * Resolves the input hash / ref / semver range to a valid commit sha
   * If possible also resolves the sha to a valid ref in order to use "git archive"
   */

  setRef(refs) {
    var _this12 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // get commit ref
      var version = _this12.hash;

      var resolvedResult = yield (0, _gitRefResolver.resolveVersion)({
        config: _this12.config,
        git: _this12,
        version,
        refs,
      });
      if (!resolvedResult) {
        throw new _errors.MessageError(
          _this12.reporter.lang('couldntFindMatch', version, Array.from(refs.keys()).join(','), _this12.gitUrl.repository)
        );
      }

      _this12.hash = resolvedResult.sha;
      _this12.ref = resolvedResult.ref || '';
      return _this12.hash;
    })();
  }
}
exports.default = Git;
