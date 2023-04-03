import BaseResolver from '../base-resolver.js';

export default class RegistryResolver extends BaseResolver {
  constructor(request, name, range) {
    super(request, `${name}@${range}`);
    this.name = name;
    this.range = range;

    this.registryConfig = request.config.registries[this.constructor.registry].config;
  }

  static registry;
}
