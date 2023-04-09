'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = exports.SCOPE_SEPARATOR = void 0;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _constants = require('../constants.js');
var fs = _interopRequireWildcard(require('../util/fs.js'));
var _npmResolver = _interopRequireDefault(require('../resolvers/registries/npm-resolver.js'));
var _envReplace = _interopRequireDefault(require('../util/env-replace.js'));
var _baseRegistry = _interopRequireDefault(require('./base-registry.js'));
var _misc = require('../util/misc');
var _path = require('../util/path');
var normalizeUrl = require('normalize-url');
var _userHomeDir = _interopRequireWildcard(require('../util/user-home-dir'));
var _errors = require('../errors.js');
var _login = require('../cli/commands/login.js');
var path = require('path');
var url = require('url');
var ini = require('ini');

var DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
var REGEX_REGISTRY_ENFORCED_HTTPS = /^https?:\/\/([^\/]+\.)?(yarnpkg\.com|npmjs\.(org|com))(\/|$)/;
var REGEX_REGISTRY_HTTP_PROTOCOL = /^https?:/i;
var REGEX_REGISTRY_PREFIX = /^(https?:)?\/\//i;
var REGEX_REGISTRY_SUFFIX = /registry\/?$/;

var SCOPE_SEPARATOR = '%2f';
exports.SCOPE_SEPARATOR = SCOPE_SEPARATOR;
// All scoped package names are of the format `@scope%2fpkg` from the use of NpmRegistry.escapeName
// `(?:^|\/)` Match either the start of the string or a `/` but don't capture
// `[^\/?]+?` Match any character that is not '/' or '?' and capture, up until the first occurrence of:
// `(?=%2f|\/)` Match SCOPE_SEPARATOR, the escaped '/', or a raw `/` and don't capture
// The reason for matching a plain `/` is NPM registry being inconsistent about escaping `/` in
// scoped package names: when you're fetching a tarball, it is not escaped, when you want info
// about the package, it is escaped.
var SCOPED_PKG_REGEXP = /(?:^|\/)(@[^\/?]+?)(?=%2f|\/)/;

// TODO: Use the method from src/cli/commands/global.js for this instead
function getGlobalPrefix() {
  if (process.env.PREFIX) {
    return process.env.PREFIX;
  } else if (process.platform === 'win32') {
    // c:\node\node.exe --> prefix=c:\node\
    return path.dirname(process.execPath);
  } else {
    // /usr/local/bin/node --> prefix=/usr/local
    var prefix = path.dirname(path.dirname(process.execPath));

    // destdir only is respected on Unix
    if (process.env.DESTDIR) {
      prefix = path.join(process.env.DESTDIR, prefix);
    }

    return prefix;
  }
}

var PATH_CONFIG_OPTIONS = new Set(['cache', 'cafile', 'prefix', 'userconfig']);

function isPathConfigOption(key) {
  return PATH_CONFIG_OPTIONS.has(key);
}

function normalizePath(val) {
  if (val === undefined) {
    return undefined;
  }

  if (typeof val !== 'string') {
    val = String(val);
  }

  return (0, _path.resolveWithHome)(val);
}

function urlParts(requestUrl) {
  var normalizedUrl = normalizeUrl(requestUrl);
  var parsed = url.parse(normalizedUrl);
  var host = parsed.host || '';
  var path = parsed.path || '';
  return {host, path};
}

class NpmRegistry extends _baseRegistry.default {
  constructor(
    cwd,
    registries,
    requestManager,
    reporter,
    enableDefaultRc,
    extraneousRcFiles
  ) {
    super(cwd, registries, requestManager, reporter, enableDefaultRc, extraneousRcFiles);
    this.folder = 'node_modules';
  }

  static escapeName(name) {
    // scoped packages contain slashes and the npm registry expects them to be escaped
    return name.replace('/', SCOPE_SEPARATOR);
  }

  isScopedPackage(packageIdent) {
    return SCOPED_PKG_REGEXP.test(packageIdent);
  }

  getRequestUrl(registry, pathname) {
    var resolved = pathname;

    if (!REGEX_REGISTRY_PREFIX.test(pathname)) {
      resolved = url.resolve((0, _misc.addSuffix)(registry, '/'), `./${pathname}`);
    }

    if (REGEX_REGISTRY_ENFORCED_HTTPS.test(resolved)) {
      resolved = resolved.replace(/^http:\/\//, 'https://');
    }

    return resolved;
  }

  isRequestToRegistry(requestUrl, registryUrl) {
    var request = urlParts(requestUrl);
    var registry = urlParts(registryUrl);
    var customHostSuffix = this.getRegistryOrGlobalOption(registryUrl, 'custom-host-suffix');

    var requestToRegistryHost = request.host === registry.host;
    var requestToYarn = _constants.YARN_REGISTRY.includes(request.host) && DEFAULT_REGISTRY.includes(registry.host);
    var requestToRegistryPath = request.path.startsWith(registry.path);
    // For some registries, the package path does not prefix with the registry path
    var customHostSuffixInUse = typeof customHostSuffix === 'string' && request.host.endsWith(customHostSuffix);

    return (requestToRegistryHost || requestToYarn) && (requestToRegistryPath || customHostSuffixInUse);
  }

  request(pathname, opts, packageName) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (opts === void 0) opts = {};
      // packageName needs to be escaped when if it is passed
      var packageIdent = (packageName && NpmRegistry.escapeName(packageName)) || pathname;
      var registry = opts.registry || _this.getRegistry(packageIdent);
      var requestUrl = _this.getRequestUrl(registry, pathname);

      var alwaysAuth = _this.getRegistryOrGlobalOption(registry, 'always-auth');

      var headers = (0, _extends2.default)(
        {
          Accept:
            // This is to use less bandwidth unless we really need to get the full response.
            // See https://github.com/npm/npm-registry-client#requests
            opts.unfiltered
              ? 'application/json'
              : 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
        },
        opts.headers
      );

      var isToRegistry = _this.isRequestToRegistry(requestUrl, registry) || _this.requestNeedsAuth(requestUrl);

      // this.token must be checked to account for publish requests on non-scoped packages
      if (_this.token || (isToRegistry && (alwaysAuth || _this.isScopedPackage(packageIdent)))) {
        var authorization = _this.getAuth(packageIdent);
        if (authorization) {
          headers.authorization = authorization;
        }
      }

      if (_this.otp) {
        headers['npm-otp'] = _this.otp;
      }

      try {
        return yield _this.requestManager.request({
          url: requestUrl,
          method: opts.method,
          body: opts.body,
          auth: opts.auth,
          headers,
          json: !opts.buffer,
          buffer: opts.buffer,
          process: opts.process,
          gzip: true,
        });
      } catch (error) {
        if (error instanceof _errors.OneTimePasswordError) {
          if (_this.otp) {
            throw new _errors.MessageError(_this.reporter.lang('incorrectOneTimePassword'));
          }

          _this.reporter.info(_this.reporter.lang('twoFactorAuthenticationEnabled'));
          if (error.notice) {
            _this.reporter.info(error.notice);
          }

          _this.otp = yield (0, _login.getOneTimePassword)(_this.reporter);

          _this.requestManager.clearCache();

          return _this.request(pathname, opts, packageName);
        } else {
          throw error;
        }
      }
    })();
  }

  requestNeedsAuth(requestUrl) {
    var config = this.config;
    var requestParts = urlParts(requestUrl);
    return !!Object.keys(config).find(option => {
      var parts = option.split(':');
      if ((parts.length === 2 && parts[1] === '_authToken') || parts[1] === '_password') {
        var registryParts = urlParts(parts[0]);
        if (requestParts.host === registryParts.host && requestParts.path.startsWith(registryParts.path)) {
          return true;
        }
      }
      return false;
    });
  }

  checkOutdated(config, name, range) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var escapedName = NpmRegistry.escapeName(name);
      var req = yield _this2.request(escapedName, {unfiltered: true});
      if (!req) {
        throw new Error(`couldn't find ${name}`);
      }

      // By default use top level 'repository' and 'homepage' values
      var repository = req.repository, homepage = req.homepage;
      var wantedPkg = yield _npmResolver.default.findVersionInRegistryResponse(config, escapedName, range, req);

      // But some local repositories like Verdaccio do not return 'repository' nor 'homepage'
      // in top level data structure, so we fallback to wanted package manifest
      if (!repository && !homepage) {
        repository = wantedPkg.repository;
        homepage = wantedPkg.homepage;
      }

      var latest = req['dist-tags'].latest;
      // In certain cases, registries do not return a 'latest' tag.
      if (!latest) {
        latest = wantedPkg.version;
      }

      var url = homepage || (repository && repository.url) || '';

      return {
        latest,
        wanted: wantedPkg.version,
        url,
      };
    })();
  }

  getPossibleConfigLocations(filename, reporter) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var possibles = [];

      for (var rcFile of _this3.extraneousRcFiles.slice().reverse()) {
        possibles.push([false, path.resolve(process.cwd(), rcFile)]);
      }

      if (_this3.enableDefaultRc) {
        // npmrc --> ./.npmrc, ~/.npmrc, ${prefix}/etc/npmrc
        var localfile = '.' + filename;
        possibles = possibles.concat([
          [false, path.join(_this3.cwd, localfile)],
          [true, _this3.config.userconfig || path.join(_userHomeDir.default, localfile)],
          [false, path.join(getGlobalPrefix(), 'etc', filename)],
        ]);

        // When home directory for global install is different from where $HOME/npmrc is stored,
        // E.g. /usr/local/share vs /root on linux machines, check the additional location
        if (_userHomeDir.home !== _userHomeDir.default) {
          possibles.push([true, path.join(_userHomeDir.home, localfile)]);
        }

        // npmrc --> ../.npmrc, ../../.npmrc, etc.
        var foldersFromRootToCwd = (0, _path.getPosixPath)(_this3.cwd).split('/');
        while (foldersFromRootToCwd.length > 1) {
          possibles.push([false, path.join(foldersFromRootToCwd.join(path.sep), localfile)]);
          foldersFromRootToCwd.pop();
        }
      }

      var actuals = [];
      for (var _ref of possibles) {
        var isHome = _ref[0], loc = _ref[1];
        reporter.verbose(reporter.lang('configPossibleFile', loc));
        if (yield fs.exists(loc)) {
          reporter.verbose(reporter.lang('configFileFound', loc));
          actuals.push([isHome, loc, yield fs.readFile(loc)]);
        }
      }

      return actuals;
    })();
  }

  static getConfigEnv(env) {
    if (env === void 0) env = process.env;
    // To match NPM's behavior, HOME is always the user's home directory.
    var overrideEnv = {
      HOME: _userHomeDir.home,
    };
    return Object.assign({}, env, overrideEnv);
  }

  static normalizeConfig(config) {
    var env = NpmRegistry.getConfigEnv();
    config = _baseRegistry.default.normalizeConfig(config);

    for (var key in config) {
      config[key] = (0, _envReplace.default)(config[key], env);
      if (isPathConfigOption(key)) {
        config[key] = normalizePath(config[key]);
      }
    }

    return config;
  }

  loadConfig() {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // docs: https://docs.npmjs.com/misc/config
      _this4.mergeEnv('npm_config_');

      for (var _ref2 of yield _this4.getPossibleConfigLocations('npmrc', _this4.reporter)) {
        var loc = _ref2[1], file = _ref2[2];
        var config = NpmRegistry.normalizeConfig(ini.parse(file));

        // normalize offline mirror path relative to the current npmrc
        var offlineLoc = config['yarn-offline-mirror'];
        // don't normalize if we already have a mirror path
        if (!_this4.config['yarn-offline-mirror'] && offlineLoc) {
          var mirrorLoc = (config['yarn-offline-mirror'] = path.resolve(path.dirname(loc), offlineLoc));
          yield fs.mkdirp(mirrorLoc);
        }

        _this4.config = Object.assign({}, config, _this4.config);
      }
    })();
  }

  getScope(packageIdent) {
    var match = packageIdent.match(SCOPED_PKG_REGEXP);
    return (match && match[1]) || '';
  }

  getRegistry(packageIdent) {
    // Try extracting registry from the url, then scoped registry, and default registry
    if (packageIdent.match(REGEX_REGISTRY_PREFIX)) {
      var availableRegistries = this.getAvailableRegistries();
      var registry = availableRegistries.find(registry => packageIdent.startsWith(registry));
      if (registry) {
        return String(registry);
      }
    }

    for (var scope of [this.getScope(packageIdent), '']) {
      var _registry =
        this.getScopedOption(scope, 'registry') || this.registries.yarn.getScopedOption(scope, 'registry');
      if (_registry) {
        return String(_registry);
      }
    }

    return DEFAULT_REGISTRY;
  }

  getAuthByRegistry(registry) {
    // Check for bearer token.
    var authToken = this.getRegistryOrGlobalOption(registry, '_authToken');
    if (authToken) {
      return `Bearer ${String(authToken)}`;
    }

    // Check for basic auth token.
    var auth = this.getRegistryOrGlobalOption(registry, '_auth');
    if (auth) {
      return `Basic ${String(auth)}`;
    }

    // Check for basic username/password auth.
    var username = this.getRegistryOrGlobalOption(registry, 'username');
    var password = this.getRegistryOrGlobalOption(registry, '_password');
    if (username && password) {
      var pw = Buffer.from(String(password), 'base64').toString();
      return 'Basic ' + Buffer.from(String(username) + ':' + pw).toString('base64');
    }

    return '';
  }

  getAuth(packageIdent) {
    if (this.token) {
      return this.token;
    }

    var baseRegistry = this.getRegistry(packageIdent);
    var registries = [baseRegistry];

    // If sending a request to the Yarn registry, we must also send it the auth token for the npm registry
    if (baseRegistry === _constants.YARN_REGISTRY) {
      registries.push(DEFAULT_REGISTRY);
    }

    for (var registry of registries) {
      var auth = this.getAuthByRegistry(registry);

      if (auth) {
        return auth;
      }
    }

    return '';
  }

  getScopedOption(scope, option) {
    return this.getOption(scope + (scope ? ':' : '') + option);
  }

  getRegistryOption(registry, option) {
    var pre = REGEX_REGISTRY_HTTP_PROTOCOL;
    var suf = REGEX_REGISTRY_SUFFIX;

    // When registry is used config scope, the trailing '/' is required
    var reg = (0, _misc.addSuffix)(registry, '/');

    // 1st attempt, try to get option for the given registry URL
    // 2nd attempt, remove the 'https?:' prefix of the registry URL
    // 3nd attempt, remove the 'registry/?' suffix of the registry URL
    return (
      this.getScopedOption(reg, option) ||
      (pre.test(reg) && this.getRegistryOption(reg.replace(pre, ''), option)) ||
      (suf.test(reg) && this.getRegistryOption(reg.replace(suf, ''), option))
    );
  }

  getRegistryOrGlobalOption(registry, option) {
    return this.getRegistryOption(registry, option) || this.getOption(option);
  }
}
exports.default = NpmRegistry;

NpmRegistry.filename = 'package.json';
