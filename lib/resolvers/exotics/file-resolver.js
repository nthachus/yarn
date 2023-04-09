'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = exports.FILE_PROTOCOL_PREFIX = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var path = require('path');
var invariant = require('invariant');
var uuid = require('uuid');

var _errors = require('../../errors.js');
var _exoticResolver = _interopRequireDefault(require('./exotic-resolver.js'));
var util = _interopRequireWildcard(require('../../util/misc.js'));
var fs = _interopRequireWildcard(require('../../util/fs.js'));

var FILE_PROTOCOL_PREFIX = 'file:';
exports.FILE_PROTOCOL_PREFIX = FILE_PROTOCOL_PREFIX;

class FileResolver extends _exoticResolver.default {
  constructor(request, fragment) {
    super(request, fragment);
    this.loc = util.removePrefix(fragment, FILE_PROTOCOL_PREFIX);
  }

  static isVersion(pattern) {
    return super.isVersion.call(this, pattern) || this.prefixMatcher.test(pattern) || path.isAbsolute(pattern);
  }

  resolve() {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var loc = _this.loc;
      if (!path.isAbsolute(loc)) {
        loc = path.resolve(_this.config.lockfileFolder, loc);
      }

      if (_this.config.linkFileDependencies) {
        var _registry = 'npm';
        var _manifest = {_uid: '', name: '', version: '0.0.0', _registry: _registry};
        _manifest._remote = {
          type: 'link',
          registry: _registry,
          hash: null,
          reference: loc,
        };
        _manifest._uid = _manifest.version;
        return _manifest;
      }
      if (!(yield fs.exists(loc))) {
        throw new _errors.MessageError(_this.reporter.lang('doesntExist', loc, _this.pattern.split('@')[0]));
      }

      var manifest = yield (0, _asyncToGenerator2.default)(function* () {
        try {
          return yield _this.config.readManifest(loc, _this.registry);
        } catch (e) {
          if (e.code === 'ENOENT') {
            return {
              // This is just the default, it can be overridden with key of dependencies
              name: path.dirname(loc),
              version: '0.0.0',
              _uid: '0.0.0',
              _registry: 'npm',
            };
          }

          throw e;
        }
      })();
      var registry = manifest._registry;
      invariant(registry, 'expected registry');

      manifest._remote = {
        type: 'copy',
        registry,
        hash: `${uuid.v4()}-${new Date().getTime()}`,
        reference: loc,
      };

      manifest._uid = manifest.version;

      return manifest;
    })();
  }
}
exports.default = FileResolver;

FileResolver.protocol = 'file';
FileResolver.prefixMatcher = /^\.{1,2}\//;
