'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;

var _errors = require('../../errors.js');
var _exoticResolver = _interopRequireDefault(require('./exotic-resolver.js'));

class RegistryResolver extends _exoticResolver.default {
  constructor(request, fragment) {
    super(request, fragment);

    var match = fragment.match(/^(\S+):(@?.*?)(@(.*?)|)$/);
    if (match) {
      this.range = match[4] || 'latest';
      this.name = match[2];
    } else {
      throw new _errors.MessageError(this.reporter.lang('invalidFragment', fragment));
    }

    // $FlowFixMe
    this.registry = this.constructor.protocol;
  }

  resolve() {
    return this.fork(this.constructor.factory, false, this.name, this.range);
  }
}
exports.default = RegistryResolver;

RegistryResolver.factory = void 0;
