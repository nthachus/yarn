import {normalizePattern} from './util/normalize-pattern.js';

const semver = require('semver');

export default class WorkspaceLayout {
  constructor(workspaces, config) {
    this.workspaces = workspaces;
    this.config = config;
  }

  virtualManifestName;

  getWorkspaceManifest(key) {
    return this.workspaces[key];
  }

  getManifestByPattern(pattern) {
    const {name, range} = normalizePattern(pattern);
    const workspace = this.getWorkspaceManifest(name);
    if (!workspace || !semver.satisfies(workspace.manifest.version, range, this.config.looseSemver)) {
      return null;
    }
    return workspace;
  }
}
