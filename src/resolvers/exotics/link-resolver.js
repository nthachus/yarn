import ExoticResolver from './exotic-resolver.js';
import * as util from '../../util/misc.js';
import * as fs from '../../util/fs.js';

const path = require('path');

export const LINK_PROTOCOL_PREFIX = 'link:';

export default class LinkResolver extends ExoticResolver {
  constructor(request, fragment) {
    super(request, fragment);
    this.loc = util.removePrefix(fragment, LINK_PROTOCOL_PREFIX);
  }

  static protocol = 'link';

  async resolve() {
    let loc = this.loc;
    if (!path.isAbsolute(loc)) {
      loc = path.resolve(this.config.lockfileFolder, loc);
    }

    const name = path.basename(loc);
    const registry = 'npm';

    const manifest =
      !(await fs.exists(`${loc}/package.json`)) || loc === this.config.lockfileFolder
        ? {_uid: '', name, version: '0.0.0', _registry: registry}
        : await this.config.readManifest(loc, this.registry);

    manifest._remote = {
      type: 'link',
      registry,
      hash: null,
      reference: loc,
    };

    manifest._uid = manifest.version;

    return manifest;
  }
}
