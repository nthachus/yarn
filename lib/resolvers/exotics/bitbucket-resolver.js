'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _hostedGitResolver = _interopRequireDefault(require('./hosted-git-resolver.js'));

class BitbucketResolver extends _hostedGitResolver.default {
  static getTarballUrl(parts, hash) {
    return `https://${this.hostname}/${parts.user}/${parts.repo}/get/${hash}.tar.gz`;
  }

  static getGitHTTPBaseUrl(parts) {
    return `https://${this.hostname}/${parts.user}/${parts.repo}`;
  }

  static getGitHTTPUrl(parts) {
    return `${BitbucketResolver.getGitHTTPBaseUrl(parts)}.git`;
  }

  static getGitSSHUrl(parts) {
    return (
      `git+ssh://git@${this.hostname}/${parts.user}/${parts.repo}.git` +
      `${parts.hash ? '#' + decodeURIComponent(parts.hash) : ''}`
    );
  }

  static getHTTPFileUrl(parts, filename, commit) {
    return `https://${this.hostname}/${parts.user}/${parts.repo}/raw/${commit}/${filename}`;
  }

  hasHTTPCapability(url) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // We don't follow redirects and reject a 302 since this means BitBucket
      // won't allow us to use the HTTP protocol for `git` access.
      // Most probably a private repo and this 302 is to a login page.
      var bitbucketHTTPSupport = yield _this.config.requestManager.request({
        url,
        method: 'HEAD',
        queue: _this.resolver.fetchingQueue,
        followRedirect: false,
        rejectStatusCode: 302,
      });
      return bitbucketHTTPSupport !== false;
    })();
  }
}
exports.default = BitbucketResolver;

BitbucketResolver.hostname = 'bitbucket.org';
BitbucketResolver.protocol = 'bitbucket';
