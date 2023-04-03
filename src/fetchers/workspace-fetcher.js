import {fetchOneRemote} from '../package-fetcher.js';

export default class WorkspaceFetcher {
  constructor(dest, remote, config) {
    this.config = config;
    this.dest = dest;
    this.registry = remote.registry;
    this.workspaceDir = remote.reference;
    this.registryRemote = remote.registryRemote;
  }

  setupMirrorFromCache() {
    return Promise.resolve();
  }

  async fetch() {
    const pkg = await this.config.readManifest(this.workspaceDir, this.registry);

    if (this.registryRemote) {
      await this.fetchRemoteWorkspace(this.registryRemote, pkg);
    }

    return {
      resolved: null,
      hash: '',
      cached: false,
      dest: this.dest,
      package: {
        ...pkg,
        _uid: pkg.version,
      },
    };
  }

  fetchRemoteWorkspace(remote, manifest) {
    return fetchOneRemote(remote, manifest.name, manifest.version, this.dest, this.config);
  }
}
