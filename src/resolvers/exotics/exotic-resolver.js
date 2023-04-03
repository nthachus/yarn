import BaseResolver from '../base-resolver.js';

export default class ExoticResolver extends BaseResolver {
  static protocol;

  static isVersion(pattern) {
    const proto = this.protocol;
    if (proto) {
      return pattern.startsWith(`${proto}:`);
    } else {
      throw new Error('No protocol specified');
    }
  }
}
