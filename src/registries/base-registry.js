import {removePrefix} from '../util/misc.js';

const objectPath = require('object-path');
const path = require('path');

export default class BaseRegistry {
  constructor(
    cwd,
    registries,
    requestManager,
    reporter,
    enableDefaultRc,
    extraneousRcFiles,
  ) {
    this.reporter = reporter;
    this.requestManager = requestManager;
    this.registries = registries;
    this.config = {};
    // relative folder name to put these modules
    this.folder = '';
    this.token = '';
    // absolute folder name to insert modules
    this.loc = '';
    this.cwd = cwd;
    this.enableDefaultRc = enableDefaultRc;
    this.extraneousRcFiles = extraneousRcFiles;
  }

  // the filename to use for package metadata
  static filename;

  //
  otp;

  setToken(token) {
    this.token = token;
  }

  setOtp(otp) {
    this.otp = otp;
  }

  getOption(key) {
    return this.config[key];
  }

  getAvailableRegistries() {
    const config = this.config;
    return Object.keys(config).reduce((registries, option) => {
      if (option === 'registry' || option.split(':')[1] === 'registry') {
        registries.push(config[option]);
      }
      return registries;
    }, []);
  }

  loadConfig() {
    return Promise.resolve();
  }

  checkOutdated(config, name, range) {
    return Promise.reject(new Error('unimplemented'));
  }

  saveHomeConfig(config) {
    return Promise.reject(new Error('unimplemented'));
  }

  request(pathname, opts = {}) {
    return this.requestManager.request({
      url: pathname,
      ...opts,
    });
  }

  async init(overrides = {}) {
    this.mergeEnv('yarn_');
    await this.loadConfig();

    for (const override of Object.keys(overrides)) {
      const val = overrides[override];

      if (val !== undefined) {
        this.config[override] = val;
      }
    }
    this.loc = path.join(this.cwd, this.folder);
  }

  static normalizeConfig(config) {
    for (const key in config) {
      config[key] = BaseRegistry.normalizeConfigOption(config[key]);
    }
    return config;
  }

  static normalizeConfigOption(val) {
    if (val === 'true') {
      return true;
    } else if (val === 'false') {
      return false;
    } else {
      return val;
    }
  }

  mergeEnv(prefix) {
    // try environment variables
    for (const envKey in process.env) {
      let key = envKey.toLowerCase();

      // only accept keys prefixed with the prefix
      if (key.indexOf(prefix.toLowerCase()) !== 0) {
        continue;
      }

      const val = BaseRegistry.normalizeConfigOption(process.env[envKey]);

      // remove config prefix
      key = removePrefix(key, prefix.toLowerCase());

      // replace dunders with dots
      key = key.replace(/__/g, '.');

      // replace underscores with dashes ignoring keys that start with an underscore
      key = key.replace(/([^_])_/g, '$1-');

      // set it via a path
      objectPath.set(this.config, key, val);
    }
  }
}
