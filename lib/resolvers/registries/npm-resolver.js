'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _cache = require('../../cli/commands/cache.js');
var _errors = require('../../errors.js');
var _registryResolver = _interopRequireDefault(require('./registry-resolver.js'));
var _npmRegistry = _interopRequireDefault(require('../../registries/npm-registry.js'));
var _map = _interopRequireDefault(require('../../util/map.js'));
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _constants = require('../../constants.js');
var _packageNameUtils = require('../../util/package-name-utils.js');

var inquirer = require('inquirer');
var tty = require('tty');
var path = require('path');
var semver = require('semver');
var ssri = require('ssri');

var NPM_REGISTRY_ID = 'npm';

class NpmResolver extends _registryResolver.default {
  static findVersionInRegistryResponse(
    config,
    name,
    range,
    body,
    request
  ) {
    return (0, _asyncToGenerator2.default)(function* () {
      if (body.versions && Object.keys(body.versions).length === 0) {
        throw new _errors.MessageError(config.reporter.lang('registryNoVersions', body.name));
      }

      if (!body['dist-tags'] || !body.versions) {
        throw new _errors.MessageError(config.reporter.lang('malformedRegistryResponse', name));
      }

      if (range in body['dist-tags']) {
        range = body['dist-tags'][range];
      }

      // Only install package version that have release date before a specified one.
      // That date string must match JSON format, e.g. 2020-08-14T04:47:38.210Z
      if (config.packageDateLimit && body.time) {
        var releaseDates = body.time;
        var closestVersion = null;
        semver.rsort(Object.keys(body.versions)).some(v => {
          if (releaseDates[v] && semver.satisfies(v, range)) {
            closestVersion = v;
            if (releaseDates[v] < config.packageDateLimit) {
              return true;
            }
          }
          return false;
        });
        if (closestVersion) {
          return body.versions[closestVersion];
        }
      }

      // If the latest tag in the registry satisfies the requested range, then use that.
      // Otherwise we will fall back to semver maxSatisfying.
      // This mimics logic in NPM. See issue #3560
      var latestVersion = body['dist-tags'] ? body['dist-tags'].latest : undefined;
      if (latestVersion && semver.satisfies(latestVersion, range)) {
        return body.versions[latestVersion];
      }

      var satisfied = yield config.resolveConstraints(Object.keys(body.versions), range);
      if (satisfied) {
        return body.versions[satisfied];
      } else if (request && !config.nonInteractive) {
        if (request.resolver && request.resolver.activity) {
          request.resolver.activity.end();
        }
        config.reporter.log(config.reporter.lang('couldntFindVersionThatMatchesRange', body.name, range));
        var pageSize;
        if (process.stdout instanceof tty.WriteStream) {
          pageSize = process.stdout.rows - 2;
        }
        var response = yield inquirer.prompt([
          {
            name: 'package',
            type: 'list',
            message: config.reporter.lang('chooseVersionFromList', body.name),
            choices: semver.rsort(Object.keys(body.versions)),
            pageSize,
          },
        ]);
        if (response && response.package) {
          return body.versions[response.package];
        }
      }
      throw new _errors.MessageError(config.reporter.lang('couldntFindVersionThatMatchesRange', body.name, range));
    })();
  }

  resolveRequest(desiredVersion) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (_this.config.offline) {
        var res = yield _this.resolveRequestOffline();
        if (res != null) {
          return res;
        }
      }

      var escapedName = _npmRegistry.default.escapeName(_this.name);
      var desiredRange = desiredVersion || _this.range;
      var body = yield _this.config.registries.npm.request(escapedName, {unfiltered: !!_this.config.packageDateLimit});

      if (body) {
        return NpmResolver.findVersionInRegistryResponse(_this.config, escapedName, desiredRange, body, _this.request);
      } else {
        return null;
      }
    })();
  }

  resolveRequestOffline() {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var packageDirs = yield _this2.config.getCache('cachedPackages', () => {
        return (0, _cache.getCachedPackagesDirs)(_this2.config, _this2.config.cacheFolder);
      });

      var versions = (0, _map.default)();

      for (var dir of packageDirs) {
        // check if folder contains the registry prefix
        if (dir.indexOf(`${NPM_REGISTRY_ID}-`) === -1) {
          continue;
        }

        // read manifest and validate correct name
        var pkg = yield _this2.config.readManifest(dir, NPM_REGISTRY_ID);
        if (pkg.name !== _this2.name) {
          continue;
        }

        // read package metadata
        var metadata = yield _this2.config.readPackageMetadata(dir);
        if (!metadata.remote) {
          continue; // old yarn metadata
        }

        versions[pkg.version] = Object.assign({}, pkg, {
          _remote: metadata.remote,
        });
      }

      var satisfied = yield _this2.config.resolveConstraints(Object.keys(versions), _this2.range);
      if (satisfied) {
        return versions[satisfied];
      } else if (!_this2.config.preferOffline) {
        throw new _errors.MessageError(
          _this2.reporter.lang('couldntFindPackageInCache', _this2.name, _this2.range, Object.keys(versions).join(', '))
        );
      } else {
        return null;
      }
    })();
  }

  cleanRegistry(url) {
    if (this.config.getOption('registry') === _constants.YARN_REGISTRY) {
      return url.replace(_constants.NPM_REGISTRY_RE, _constants.YARN_REGISTRY);
    } else {
      return url;
    }
  }

  resolve() {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // lockfile
      var shrunk = _this3.request.getLocked('tarball');
      if (shrunk) {
        if (_this3.config.packBuiltPackages && shrunk.prebuiltVariants && shrunk._remote) {
          var prebuiltVariants = shrunk.prebuiltVariants;
          var prebuiltName = (0, _packageNameUtils.getPlatformSpecificPackageFilename)(shrunk);
          var offlineMirrorPath = _this3.config.getOfflineMirrorPath();
          if (prebuiltVariants[prebuiltName] && offlineMirrorPath) {
            var filename = path.join(offlineMirrorPath, 'prebuilt', prebuiltName + '.tgz');
            var _remote = shrunk._remote;
            if (_remote && (yield fs.exists(filename))) {
              _remote.reference = `file:${filename}`;
              _remote.hash = prebuiltVariants[prebuiltName];
              _remote.integrity = ssri.fromHex(_remote.hash, 'sha1').toString();
            }
          }
        }
      }
      if (
        shrunk &&
        shrunk._remote &&
        (shrunk._remote.integrity || _this3.config.offline || !_this3.config.autoAddIntegrity)
      ) {
        // if the integrity field does not exist, we're not network-restricted, and the
        // migration hasn't been disabled, it needs to be created
        return shrunk;
      }

      var desiredVersion = shrunk && shrunk.version ? shrunk.version : null;
      var info = yield _this3.resolveRequest(desiredVersion);
      if (info == null) {
        throw new _errors.MessageError(_this3.reporter.lang('packageNotFoundRegistry', _this3.name, NPM_REGISTRY_ID));
      }

      var deprecated = info.deprecated, dist = info.dist;
      if (shrunk && shrunk._remote) {
        shrunk._remote.integrity =
          dist && dist.integrity
            ? ssri.parse(dist.integrity)
            : ssri.fromHex(dist && dist.shasum ? dist.shasum : '', 'sha1');
        return shrunk;
      }

      if (typeof deprecated === 'string') {
        var human = `${info.name}@${info.version}`;
        var parentNames = _this3.request.parentNames;
        if (parentNames.length) {
          human = parentNames.concat(human).join(' > ');
        }
        _this3.reporter.warn(`${human}: ${deprecated}`);
      }

      if (dist != null && dist.tarball) {
        info._remote = {
          resolved: `${_this3.cleanRegistry(dist.tarball)}#${dist.shasum}`,
          type: 'tarball',
          reference: _this3.cleanRegistry(dist.tarball),
          hash: dist.shasum,
          integrity: dist.integrity ? ssri.parse(dist.integrity) : ssri.fromHex(dist.shasum, 'sha1'),
          registry: NPM_REGISTRY_ID,
          packageName: info.name,
        };
      }

      info._uid = info.version;

      return info;
    })();
  }
}
exports.default = NpmResolver;

NpmResolver.registry = NPM_REGISTRY_ID;
