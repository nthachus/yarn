'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _packageFetcher = require('../package-fetcher.js');

class WorkspaceFetcher {
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

  fetch() {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var pkg = yield _this.config.readManifest(_this.workspaceDir, _this.registry);

      if (_this.registryRemote) {
        yield _this.fetchRemoteWorkspace(_this.registryRemote, pkg);
      }

      return {
        resolved: null,
        hash: '',
        cached: false,
        dest: _this.dest,
        package: (0, _extends2.default)({}, pkg, {
          _uid: pkg.version,
        }),
      };
    })();
  }

  fetchRemoteWorkspace(remote, manifest) {
    return (0, _packageFetcher.fetchOneRemote)(remote, manifest.name, manifest.version, this.dest, this.config);
  }
}
exports.default = WorkspaceFetcher;
