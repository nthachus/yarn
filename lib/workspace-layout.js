'use strict';
exports.__esModule = true;
exports.default = void 0;

var _normalizePattern2 = require('./util/normalize-pattern.js');

var semver = require('semver');

class WorkspaceLayout {
  constructor(workspaces, config) {
    this.virtualManifestName = void 0;

    this.workspaces = workspaces;
    this.config = config;
  }

  getWorkspaceManifest(key) {
    return this.workspaces[key];
  }

  getManifestByPattern(pattern) {
    var _normalizePattern = (0, _normalizePattern2.normalizePattern)(pattern), name = _normalizePattern.name, range = _normalizePattern.range;
    var workspace = this.getWorkspaceManifest(name);
    if (!workspace || !semver.satisfies(workspace.manifest.version, range, this.config.looseSemver)) {
      return null;
    }
    return workspace;
  }
}
exports.default = WorkspaceLayout;
