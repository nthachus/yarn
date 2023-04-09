'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _index = require('../index.js');
var util = _interopRequireWildcard(require('../../util/misc.js'));
var versionUtil = _interopRequireWildcard(require('../../util/version.js'));
var _guessName = _interopRequireDefault(require('../../util/guess-name.js'));
var _index2 = require('../../registries/index.js');
var _exoticResolver = _interopRequireDefault(require('./exotic-resolver.js'));
var _git = _interopRequireDefault(require('../../util/git.js'));

var urlParse = require('url').parse;

var GIT_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.com', 'bitbucket.org'];

var GIT_PATTERN_MATCHERS = [/^git:/, /^git\+.+:/, /^ssh:/, /^https?:.+\.git$/, /^https?:.+\.git#.+/];

class GitResolver extends _exoticResolver.default {
  constructor(request, fragment) {
    super(request, fragment);

    var _versionUtil$explodeH = versionUtil.explodeHashedUrl(fragment), url = _versionUtil$explodeH.url, hash = _versionUtil$explodeH.hash;
    this.url = url;
    this.hash = hash;
  }

  static isVersion(pattern) {
    for (var matcher of GIT_PATTERN_MATCHERS) {
      if (matcher.test(pattern)) {
        return true;
      }
    }

    var _urlParse = urlParse(pattern), hostname = _urlParse.hostname, path = _urlParse.path;
    if (hostname && path && GIT_HOSTS.indexOf(hostname) >= 0) {
      // only if dependency is pointing to a git repo,
      // e.g. facebook/flow and not file in a git repo facebook/flow/archive/v1.0.0.tar.gz
      return path.split('/').filter((p) => !!p).length === 2;
    }

    return false;
  }

  resolve(forked) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var url = _this.url;

      // shortcut for hosted git. we will fallback to a GitResolver if the hosted git
      // optimisations fail which the `forked` flag indicates so we don't get into an
      // infinite loop
      var parts = urlParse(url);
      if (false && !forked && !parts.auth && parts.pathname) {
        // check if this git url uses any of the hostnames defined in our hosted git resolvers
        for (var name in _index.hostedGit) {
          var Resolver = _index.hostedGit[name];
          if (Resolver.hostname !== parts.hostname) {
            continue;
          }

          // we have a match! clean up the pathname of url artifacts
          var pathname = parts.pathname;
          pathname = util.removePrefix(pathname, '/'); // remove prefixed slash
          pathname = util.removeSuffix(pathname, '.git'); // remove .git suffix if present

          var _url = `${pathname}${_this.hash ? '#' + decodeURIComponent(_this.hash) : ''}`;
          return _this.fork(Resolver, false, _url);
        }
      }

      // get from lockfile
      var shrunk = _this.request.getLocked('git');
      if (shrunk) {
        return shrunk;
      }

      var config = _this.config;

      var gitUrl = _git.default.npmUrlToGitUrl(url);
      var client = new _git.default(config, gitUrl, _this.hash);
      var commit = yield client.init();

      function tryRegistry() {
        return _tryRegistry.apply(this, arguments);
      }
      function _tryRegistry() {
        _tryRegistry = (0, _asyncToGenerator2.default)(function* (registry) {
          var filename = _index2.registries[registry].filename;

          var file = yield client.getFile(filename);
          if (!file) {
            return null;
          }

          var json = yield config.readJson(`${url}/${filename}`, () => JSON.parse(file));
          json._uid = commit;
          json._remote = {
            resolved: `${url}#${commit}`,
            type: 'git',
            reference: url,
            hash: commit,
            registry,
          };
          return json;
        });

        return _tryRegistry.apply(this, arguments);
      }

      var file = yield tryRegistry(_this.registry);
      if (file) {
        return file;
      }

      for (var registry in _index2.registries) {
        if (registry === _this.registry) {
          continue;
        }

        var _file = yield tryRegistry(registry);
        if (_file) {
          return _file;
        }
      }

      return {
        // This is just the default, it can be overridden with key of dependencies
        name: (0, _guessName.default)(url),
        version: '0.0.0',
        _uid: commit,
        _remote: {
          resolved: `${url}#${commit}`,
          type: 'git',
          reference: url,
          hash: commit,
          registry: 'npm',
        },
      };
    })();
  }
}
exports.default = GitResolver;
