'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));

var _packageRequest = _interopRequireDefault(require('../../package-request.js'));
var _baseResolver = _interopRequireDefault(require('../base-resolver.js'));
var _workspaceLayout = _interopRequireDefault(require('../../workspace-layout.js'));

var invariant = require('invariant');

class WorkspaceResolver extends _baseResolver.default {
  static isWorkspace(pattern, workspaceLayout) {
    return !!workspaceLayout && !!workspaceLayout.getManifestByPattern(pattern);
  }

  constructor(request, fragment, workspaceLayout) {
    super(request, fragment);
    this.workspaceLayout = workspaceLayout;
  }

  resolve(downloadedManifest) {
    var workspace = this.workspaceLayout.getManifestByPattern(this.request.pattern);
    invariant(workspace, 'expected workspace');
    var manifest = workspace.manifest, loc = workspace.loc;
    if (manifest._remote && manifest._remote.registryRemote) {
      return Promise.resolve(manifest); //already downloaded
    }
    var registry = manifest._registry;
    invariant(registry, 'expected reference');
    var hash = '';
    var registryRemote;
    if (downloadedManifest && manifest.version === downloadedManifest.version) {
      registryRemote = downloadedManifest._remote;
      invariant(registryRemote, 'missing remote info');
      hash = registryRemote.hash;
      //override any local changes to manifest
      Object.keys(manifest).forEach(k => k.startsWith('_') || delete manifest[k]);
      Object.assign(manifest, downloadedManifest);
    } else if (manifest._remote && manifest._remote.hash) {
      invariant(workspace.manifest._remote, 'missing remote info');
      registryRemote = workspace.manifest._remote.registryRemote;
      hash = manifest._remote.hash;
    }
    if (registryRemote) {
      registryRemote = (0, _extends2.default)({}, registryRemote);
    }

    manifest._remote = Object.assign(manifest._remote || {}, {
      type: 'workspace',
      registryRemote,
      registry,
      hash,
      reference: loc,
    });

    manifest._uid = manifest.version;

    return Promise.resolve(manifest);
  }
}
exports.default = WorkspaceResolver;
