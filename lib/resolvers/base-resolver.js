'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _construct2 = _interopRequireDefault(require('@babel/runtime/helpers/construct'));

class BaseResolver {
  constructor(request, fragment) {
    this.staticisVersion = void 0;

    this.resolver = request.resolver;
    this.reporter = request.reporter;
    this.fragment = fragment;
    this.registry = request.registry;
    this.request = request;
    this.pattern = request.pattern;
    this.config = request.config;
  }

  fork(Resolver, resolveArg) {
    var args = Array.prototype.slice.call(arguments, 2);
    var resolver = (0, _construct2.default)(Resolver, [this.request].concat(args));
    resolver.registry = this.registry;
    return resolver.resolve(resolveArg);
  }

  resolve(resolveArg) {
    throw new Error('Not implemented');
  }
}
exports.default = BaseResolver;
