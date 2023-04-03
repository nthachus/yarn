import {MessageError} from '../../errors.js';
import GitResolver from './git-resolver.js';
import ExoticResolver from './exotic-resolver.js';
import * as util from '../../util/misc.js';

export function explodeGistFragment(fragment, reporter) {
  fragment = util.removePrefix(fragment, 'gist:');

  const parts = fragment.split('#');

  if (parts.length <= 2) {
    return {
      id: parts[0],
      hash: parts[1] || '',
    };
  } else {
    throw new MessageError(reporter.lang('invalidGistFragment', fragment));
  }
}

export default class GistResolver extends ExoticResolver {
  static protocol = 'gist';

  constructor(request, fragment) {
    super(request, fragment);

    const {id, hash} = explodeGistFragment(fragment, this.reporter);
    this.id = id;
    this.hash = hash;
  }

  resolve() {
    return this.fork(GitResolver, false, `https://gist.github.com/${this.id}.git#${this.hash}`);
  }
}
