import {MessageError} from '../../errors.js';
import ExoticResolver from './exotic-resolver.js';

export default class RegistryResolver extends ExoticResolver {
  constructor(request, fragment) {
    super(request, fragment);

    const match = fragment.match(/^(\S+):(@?.*?)(@(.*?)|)$/);
    if (match) {
      this.range = match[4] || 'latest';
      this.name = match[2];
    } else {
      throw new MessageError(this.reporter.lang('invalidFragment', fragment));
    }

    // $FlowFixMe
    this.registry = this.constructor.protocol;
  }

  static factory;

  resolve() {
    return this.fork(this.constructor.factory, false, this.name, this.range);
  }
}
