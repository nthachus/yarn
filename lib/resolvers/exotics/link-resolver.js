'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = exports.LINK_PROTOCOL_PREFIX = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _exoticResolver = _interopRequireDefault(require('./exotic-resolver.js'));
var util = _interopRequireWildcard(require('../../util/misc.js'));
var fs = _interopRequireWildcard(require('../../util/fs.js'));

var path = require('path');

var LINK_PROTOCOL_PREFIX = 'link:';
exports.LINK_PROTOCOL_PREFIX = LINK_PROTOCOL_PREFIX;

class LinkResolver extends _exoticResolver.default {
  constructor(request, fragment) {
    super(request, fragment);
    this.loc = util.removePrefix(fragment, LINK_PROTOCOL_PREFIX);
  }

  resolve() {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var loc = _this.loc;
      if (!path.isAbsolute(loc)) {
        loc = path.resolve(_this.config.lockfileFolder, loc);
      }

      var name = path.basename(loc);
      var registry = 'npm';

      var manifest =
        !(yield fs.exists(`${loc}/package.json`)) || loc === _this.config.lockfileFolder
          ? {_uid: '', name, version: '0.0.0', _registry: registry}
          : yield _this.config.readManifest(loc, _this.registry);

      manifest._remote = {
        type: 'link',
        registry,
        hash: null,
        reference: loc,
      };

      manifest._uid = manifest.version;

      return manifest;
    })();
  }
}
exports.default = LinkResolver;

LinkResolver.protocol = 'link';
