'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
exports.explodeHostedGitFragment = explodeHostedGitFragment;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var _index = require('../../registries/index.js');
var _gitResolver = _interopRequireDefault(require('./git-resolver.js'));
var _exoticResolver = _interopRequireDefault(require('./exotic-resolver.js'));
var _git = _interopRequireDefault(require('../../util/git.js'));
var _guessName = _interopRequireDefault(require('../../util/guess-name.js'));

function parseHash(fragment) {
  var hashPosition = fragment.indexOf('#');
  return hashPosition === -1 ? '' : fragment.substr(hashPosition + 1);
}

function explodeHostedGitFragment(fragment, reporter) {
  var hash = parseHash(fragment);

  var preParts = fragment.split('@');
  if (preParts.length > 2) {
    fragment = preParts[1] + '@' + preParts[2];
  }

  var parts = fragment
    .replace(/(.*?)#.*/, '$1') // Strip hash
    .replace(/.*:(.*)/, '$1') // Strip prefixed protocols
    .replace(/.git$/, '') // Strip the .git suffix
    .split('/');

  var user = parts[parts.length - 2];
  var repo = parts[parts.length - 1];

  if (user === undefined || repo === undefined) {
    throw new _errors.MessageError(reporter.lang('invalidHostedGitFragment', fragment));
  }

  return {
    user,
    repo,
    hash,
  };
}

class HostedGitResolver extends _exoticResolver.default {
  constructor(request, fragment) {
    super(request, fragment);
    this.url = void 0;

    var exploded = (this.exploded = explodeHostedGitFragment(fragment, this.reporter));
    var user = exploded.user, repo = exploded.repo, hash = exploded.hash;
    this.user = user;
    this.repo = repo;
    this.hash = hash;
  }

  static getTarballUrl(exploded, commit) {
    exploded;
    commit;
    throw new Error('Not implemented');
  }

  static getGitHTTPUrl(exploded) {
    exploded;
    throw new Error('Not implemented');
  }

  static getGitHTTPBaseUrl(exploded) {
    exploded;
    throw new Error('Not implemented');
  }

  static getGitSSHUrl(exploded) {
    exploded;
    throw new Error('Not implemented');
  }

  static getHTTPFileUrl(exploded, filename, commit) {
    exploded;
    filename;
    commit;
    throw new Error('Not implemented');
  }

  getRefOverHTTP(url) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var gitUrl = _git.default.npmUrlToGitUrl(url);
      var client = new _git.default(_this.config, gitUrl, _this.hash);

      var out = yield _this.config.requestManager.request({
        url: `${url}/info/refs?service=git-upload-pack`,
        queue: _this.resolver.fetchingQueue,
      });

      if (out) {
        // clean up output
        var lines = out.trim().split('\n');

        // remove first two lines which contains compatibility info etc
        lines = lines.slice(2);

        // remove last line which contains the terminator "0000"
        lines.pop();

        // remove line lengths from start of each line
        lines = lines.map(line => line.slice(4));

        out = lines.join('\n');
      } else {
        throw new Error(_this.reporter.lang('hostedGitResolveError'));
      }

      return client.setRefHosted(out);
    })();
  }

  resolveOverHTTP(url) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var commit = yield _this2.getRefOverHTTP(url);
      var config = _this2.config;

      var tarballUrl = _this2.constructor.getTarballUrl(_this2.exploded, commit);

      var tryRegistry = /*#__PURE__*/ (function() {
        var _ref = (0, _asyncToGenerator2.default)(function* (registry) {
          var filename = _index.registries[registry].filename;

          var href = _this2.constructor.getHTTPFileUrl(_this2.exploded, filename, commit);
          var file = yield config.requestManager.request({
            url: href,
            queue: _this2.resolver.fetchingQueue,
          });
          if (!file) {
            return null;
          }

          var json = yield config.readJson(href, () => JSON.parse(file));
          json._uid = commit;
          json._remote = {
            resolved: tarballUrl,
            type: 'tarball',
            reference: tarballUrl,
            registry,
          };
          return json;
        });

        return function tryRegistry() {
          return _ref.apply(this, arguments);
        };
      })();

      var file = yield tryRegistry(_this2.registry);
      if (file) {
        return file;
      }

      for (var registry in _index.registries) {
        if (registry === _this2.registry) {
          continue;
        }

        var _file = yield tryRegistry(registry);
        if (_file) {
          return _file;
        }
      }

      return {
        name: (0, _guessName.default)(url),
        version: '0.0.0',
        _uid: commit,
        _remote: {
          resolved: tarballUrl,
          type: 'tarball',
          reference: tarballUrl,
          registry: 'npm',
          hash: undefined,
        },
      };
    })();
  }

  hasHTTPCapability(url) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      return (
        (yield _this3.config.requestManager.request({
          url,
          method: 'HEAD',
          queue: _this3.resolver.fetchingQueue,
          followRedirect: false,
        })) !== false
      );
    })();
  }

  resolve() {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // If we already have the tarball, just return it without having to make any HTTP requests.
      var shrunk = _this4.request.getLocked('tarball');
      if (shrunk) {
        return shrunk;
      }

      var httpUrl = _this4.constructor.getGitHTTPUrl(_this4.exploded);
      var httpBaseUrl = _this4.constructor.getGitHTTPBaseUrl(_this4.exploded);
      var sshUrl = _this4.constructor.getGitSSHUrl(_this4.exploded);

      // If we can access the files over HTTP then we should as it's MUCH faster than git
      // archive and tarball unarchiving. The HTTP API is only available for public repos
      // though.
      if (yield _this4.hasHTTPCapability(httpBaseUrl)) {
        return _this4.resolveOverHTTP(httpUrl);
      }

      // If the url is accessible over git archive then we should immediately delegate to
      // the git resolver.
      //
      // NOTE: Here we use a different url than when we delegate to the git resolver later on.
      // This is because `git archive` requires access over ssh and github only allows that
      // if you have write permissions
      var sshGitUrl = _git.default.npmUrlToGitUrl(sshUrl);
      if (yield _git.default.hasArchiveCapability(sshGitUrl)) {
        var archiveClient = new _git.default(_this4.config, sshGitUrl, _this4.hash);
        var commit = yield archiveClient.init();
        return _this4.fork(_gitResolver.default, true, `${sshUrl}#${commit}`);
      }

      // fallback to the plain git resolver
      return _this4.fork(_gitResolver.default, true, sshUrl);
    })();
  }
}
exports.default = HostedGitResolver;
