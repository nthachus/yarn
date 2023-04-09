'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;

var _baseResolver = _interopRequireDefault(require('../base-resolver.js'));

class RegistryResolver extends _baseResolver.default {
  constructor(request, name, range) {
    super(request, `${name}@${range}`);
    this.name = name;
    this.range = range;

    this.registryConfig = request.config.registries[this.constructor.registry].config;
  }
}
exports.default = RegistryResolver;

RegistryResolver.registry = void 0;
