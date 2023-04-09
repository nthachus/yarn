'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));

var _misc = require('../util/misc.js');

var objectPath = require('object-path');
var path = require('path');

class BaseRegistry {
  constructor(
    cwd,
    registries,
    requestManager,
    reporter,
    enableDefaultRc,
    extraneousRcFiles
  ) {
    this.otp = void 0;

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
    var config = this.config;
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

  request(pathname, opts) {
    if (opts === void 0) opts = {};
    return this.requestManager.request((0, _extends2.default)(
      {
        url: pathname,
      },
      opts
    ));
  }

  init(overrides) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (overrides === void 0) overrides = {};
      _this.mergeEnv('yarn_');
      yield _this.loadConfig();

      for (var override of Object.keys(overrides)) {
        var val = overrides[override];

        if (val !== undefined) {
          _this.config[override] = val;
        }
      }
      _this.loc = path.join(_this.cwd, _this.folder);
    })();
  }

  static normalizeConfig(config) {
    for (var key in config) {
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
    for (var envKey in process.env) {
      var key = envKey.toLowerCase();

      // only accept keys prefixed with the prefix
      if (key.indexOf(prefix.toLowerCase()) !== 0) {
        continue;
      }

      var val = BaseRegistry.normalizeConfigOption(process.env[envKey]);

      // remove config prefix
      key = (0, _misc.removePrefix)(key, prefix.toLowerCase());

      // replace dunders with dots
      key = key.replace(/__/g, '.');

      // replace underscores with dashes ignoring keys that start with an underscore
      key = key.replace(/([^_])_/g, '$1-');

      // set it via a path
      objectPath.set(this.config, key, val);
    }
  }
}
exports.default = BaseRegistry;

// the filename to use for package metadata
BaseRegistry.filename = void 0;
