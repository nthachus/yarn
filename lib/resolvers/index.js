'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.getExoticResolver = getExoticResolver;
exports.hostedGit = void 0;
exports.hostedGitFragmentToGitUrl = hostedGitFragmentToGitUrl;
exports.registries = void 0;

var _baseResolver = _interopRequireDefault(require('./base-resolver.js'));

var _npmResolver = _interopRequireDefault(require('./registries/npm-resolver.js'));
var _yarnResolver = _interopRequireDefault(require('./registries/yarn-resolver.js'));

var registries = {
  npm: _npmResolver.default,
  yarn: _yarnResolver.default,
};
exports.registries = registries;

//

var _gitResolver = _interopRequireDefault(require('./exotics/git-resolver.js'));
var _tarballResolver = _interopRequireDefault(require('./exotics/tarball-resolver.js'));
var _githubResolver = _interopRequireDefault(require('./exotics/github-resolver.js'));
var _fileResolver = _interopRequireDefault(require('./exotics/file-resolver.js'));
var _linkResolver = _interopRequireDefault(require('./exotics/link-resolver.js'));
var _gitlabResolver = _interopRequireDefault(require('./exotics/gitlab-resolver.js'));
var _gistResolver = _interopRequireDefault(require('./exotics/gist-resolver.js'));
var _bitbucketResolver = _interopRequireDefault(require('./exotics/bitbucket-resolver.js'));

var exotics = new Set([
  _gitResolver.default,
  _tarballResolver.default,
  _githubResolver.default,
  _fileResolver.default,
  _linkResolver.default,
  _gitlabResolver.default,
  _gistResolver.default,
  _bitbucketResolver.default,
]);

function getExoticResolver(pattern) {
  for (var Resolver of exotics) {
    if (Resolver.isVersion(pattern)) {
      return Resolver;
    }
  }
  return null;
}

//

var _hostedGitResolver = require('./exotics/hosted-git-resolver.js');

var hostedGit = {
  github: _githubResolver.default,
  gitlab: _gitlabResolver.default,
  bitbucket: _bitbucketResolver.default,
};
exports.hostedGit = hostedGit;

function hostedGitFragmentToGitUrl(fragment, reporter) {
  for (var key in hostedGit) {
    var Resolver = hostedGit[key];
    if (Resolver.isVersion(fragment)) {
      return Resolver.getGitHTTPUrl((0, _hostedGitResolver.explodeHostedGitFragment)(fragment, reporter));
    }
  }

  return fragment;
}

//

var _registryResolver = _interopRequireDefault(require('./exotics/registry-resolver.js'));

for (var key in registries) {
  var _class;
  var RegistryResolver = registries[key];

  exotics.add(
    ((_class = class extends _registryResolver.default {}),
    (_class.protocol = key),
    (_class.factory = RegistryResolver),
    _class)
  );
}
