'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = exports.DEFAULTS = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _constants = require('../constants.js');
var _npmRegistry = _interopRequireDefault(require('./npm-registry.js'));
var _lockfile = require('../lockfile');
var fs = _interopRequireWildcard(require('../util/fs.js'));
var _yarnVersion = require('../util/yarn-version.js');
var _userHomeDir = _interopRequireDefault(require('../util/user-home-dir'));
var path = require('path');

var DEFAULTS = {
  'version-tag-prefix': 'v',
  'version-git-tag': true,
  'version-commit-hooks': true,
  'version-git-sign': false,
  'version-git-message': 'v%s',

  'init-version': '1.0.0',
  'init-license': 'MIT',

  'save-prefix': '^',
  'bin-links': true,
  'ignore-scripts': false,
  'ignore-optional': false,
  registry: _constants.YARN_REGISTRY,
  'strict-ssl': true,
  'user-agent': [`yarn/${_yarnVersion.version}`, 'npm/?', `node/${process.version}`, process.platform, process.arch].join(' '),
};
exports.DEFAULTS = DEFAULTS;

var RELATIVE_KEYS = ['yarn-offline-mirror', 'cache-folder', 'global-folder', 'offline-cache-folder', 'yarn-path'];
var FOLDER_KEY = ['yarn-offline-mirror', 'cache-folder', 'global-folder', 'offline-cache-folder'];

var npmMap = {
  'version-git-sign': 'sign-git-tag',
  'version-tag-prefix': 'tag-version-prefix',
  'version-git-tag': 'git-tag-version',
  'version-commit-hooks': 'commit-hooks',
  'version-git-message': 'message',
};

class YarnRegistry extends _npmRegistry.default {
  constructor(
    cwd,
    registries,
    requestManager,
    reporter,
    enableDefaultRc,
    extraneousRcFiles
  ) {
    super(cwd, registries, requestManager, reporter, enableDefaultRc, extraneousRcFiles);

    this.homeConfigLoc = path.join(_userHomeDir.default, '.yarnrc');
    this.homeConfig = {};
  }

  getOption(key) {
    var val = this.config[key];

    // if this isn't set in a yarn config, then use npm
    if (typeof val === 'undefined') {
      val = this.registries.npm.getOption(npmMap[key]);
    }

    if (typeof val === 'undefined') {
      val = this.registries.npm.getOption(key);
    }

    // if this isn't set in a yarn config or npm config, then use the default (or undefined)
    if (typeof val === 'undefined') {
      val = DEFAULTS[key];
    }

    return val;
  }

  loadConfig() {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var locations = yield _this.getPossibleConfigLocations('yarnrc', _this.reporter);

      for (var _ref of locations) {
        var isHome = _ref[0], loc = _ref[1], file = _ref[2];
        var _parse = (0, _lockfile.parse)(file, loc), config = _parse.object;

        if (isHome) {
          _this.homeConfig = config;
        }

        for (var key of RELATIVE_KEYS) {
          var valueLoc = config[key];

          if (!_this.config[key] && valueLoc) {
            var resolvedLoc = (config[key] = path.resolve(path.dirname(loc), valueLoc));

            if (FOLDER_KEY.indexOf(key) !== -1) {
              yield fs.mkdirp(resolvedLoc);
            }
          }
        }

        // merge with any existing environment variables
        var env = config.env;
        if (env) {
          var existingEnv = _this.config.env;
          if (existingEnv) {
            _this.config.env = Object.assign({}, env, existingEnv);
          }
        }

        _this.config = Object.assign({}, config, _this.config);
      }

      // default yarn config
      _this.config = Object.assign({}, DEFAULTS, _this.config);
    })();
  }

  saveHomeConfig(config) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      YarnRegistry.normalizeConfig(config);

      for (var key in config) {
        var val = config[key];

        // if the current config key was taken from home config then update
        // the global config
        if (_this2.homeConfig[key] === _this2.config[key]) {
          _this2.config[key] = val;
        }

        // update just the home config
        _this2.homeConfig[key] = config[key];
      }

      yield fs.writeFilePreservingEol(_this2.homeConfigLoc, `${(0, _lockfile.stringify)(_this2.homeConfig)}\n`);
    })();
  }
}
exports.default = YarnRegistry;

YarnRegistry.filename = 'yarn.json';
