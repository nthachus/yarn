import HostedGitResolver from './hosted-git-resolver.js';

export default class BitbucketResolver extends HostedGitResolver {
  static hostname = 'bitbucket.org';
  static protocol = 'bitbucket';

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

  async hasHTTPCapability(url) {
    // We don't follow redirects and reject a 302 since this means BitBucket
    // won't allow us to use the HTTP protocol for `git` access.
    // Most probably a private repo and this 302 is to a login page.
    const bitbucketHTTPSupport = await this.config.requestManager.request({
      url,
      method: 'HEAD',
      queue: this.resolver.fetchingQueue,
      followRedirect: false,
      rejectStatusCode: 302,
    });
    return bitbucketHTTPSupport !== false;
  }
}
