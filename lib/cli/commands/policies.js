/* eslint-disable max-len */
'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.examples = void 0;
exports.hasWrapper = hasWrapper;
exports.setFlags = exports.run = void 0;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _yarnVersion = require('../../util/yarn-version.js');
var child = _interopRequireWildcard(require('../../util/child.js'));
var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));
var _rc = require('../../rc.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _lockfile = require('../../lockfile');
var _semver = require('../../util/semver.js');
var _constants = require('../../constants');

var V2_NAMES = ['berry', 'stable', 'canary', 'v2', '2'];

var isLocalFile = (version) => version.match(/^\.{0,2}[\\/]/) || path.isAbsolute(version);
var isV2Version = (version) => (0, _semver.satisfiesWithPrereleases)(version, '>=2.0.0');

var chalk = require('chalk');
var invariant = require('invariant');
var path = require('path');
var semver = require('semver');

function getBundleAsset(release) {
  return release.assets.find(asset => {
    return asset.name.match(/^yarn-[0-9]+\.[0-9]+\.[0-9]+\.js$/);
  });
}

function fetchReleases() {
  return _fetchReleases.apply(this, arguments);
}
function _fetchReleases() {
  _fetchReleases = (0, _asyncToGenerator2.default)(function* (
    config,
    _temp
  ) {
    var _ref = _temp === void 0 ? {} : _temp, _ref$includePrereleas = _ref.includePrereleases, includePrereleases = _ref$includePrereleas === void 0 ? false : _ref$includePrereleas;
    var token = process.env.GITHUB_TOKEN;
    var tokenUrlParameter = token ? `?access_token=${token}` : '';

    var request = yield config.requestManager.request({
      url: `https://api.github.com/repos/yarnpkg/yarn/releases${tokenUrlParameter}`,
      json: true,
    });

    var releases = request.filter(release => {
      if (release.draft) {
        return false;
      }

      if (release.prerelease && !includePrereleases) {
        return false;
      }

      // $FlowFixMe
      release.version = semver.coerce(release.tag_name);

      if (!release.version) {
        return false;
      }

      if (!getBundleAsset(release)) {
        return false;
      }

      return true;
    });

    releases.sort((a, b) => {
      // $FlowFixMe
      return -semver.compare(a.version, b.version);
    });

    return releases;
  });

  return _fetchReleases.apply(this, arguments);
}

function fetchBundle(config, url) {
  return config.requestManager.request({
    url,
    buffer: true,
  });
}

function hasWrapper(flags, args) {
  return false;
}

var _buildSubCommands = (0, _buildSubCommands2.default)('policies', {
  setVersion(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      var initialRange = args[0] || 'latest';
      var range = initialRange;

      var allowRc = flags.rc;

      if (range === 'rc') {
        reporter.log(
          `${chalk.yellow(
            `Warning:`
          )} Your current Yarn binary is currently Yarn ${_yarnVersion.version}; to avoid potential breaking changes, 'set version rc' won't receive upgrades past the 1.22.x branch.\n         To upgrade to the latest versions, run ${chalk.cyan(
            `yarn set version`
          )} ${chalk.yellow.underline(`canary`)} instead. Sorry for the inconvenience.\n`
        );

        range = '*';
        allowRc = true;
      }

      if (range === 'latest') {
        reporter.log(
          `${chalk.yellow(
            `Warning:`
          )} Your current Yarn binary is currently Yarn ${_yarnVersion.version}; to avoid potential breaking changes, 'set version latest' won't receive upgrades past the 1.22.x branch.\n         To upgrade to the latest versions, run ${chalk.cyan(
            `yarn set version`
          )} ${chalk.yellow.underline(`stable`)} instead. Sorry for the inconvenience.\n`
        );

        range = '*';
      }

      if (range === 'classic') {
        range = '*';
      }

      var bundleUrl;
      var bundleVersion;
      var isV2 = false;

      if (range === 'nightly' || range === 'nightlies') {
        reporter.log(
          `${chalk.yellow(
            `Warning:`
          )} Nightlies only exist for Yarn 1.x; starting from 2.x onwards, you should use 'canary' instead`
        );

        bundleUrl = 'https://nightly.yarnpkg.com/latest.js';
        bundleVersion = 'nightly';
      } else if (V2_NAMES.indexOf(range) !== -1 || isLocalFile(range) || isV2Version(range)) {
        var normalizedRange = range === `canary` ? `canary` : `stable`;

        if (process.env.COREPACK_ROOT) {
          yield child.spawn(
            _constants.NODE_BIN_PATH,
            [
              path.join(process.env.COREPACK_ROOT, 'dist/corepack.js'),
              `yarn@${normalizedRange}`,
              `set`,
              `version`,
              normalizedRange,
            ],
            {
              stdio: 'inherit',
              cwd: config.cwd,
            }
          );

          return;
        } else {
          var _bundle = yield fetchBundle(
            config,
            'https://github.com/yarnpkg/berry/raw/master/packages/yarnpkg-cli/bin/yarn.js'
          );

          var _yarnPath = path.resolve(config.lockfileFolder, `.yarn/releases/yarn-stable-temp.cjs`);
          yield fs.mkdirp(path.dirname(_yarnPath));
          yield fs.writeFile(_yarnPath, _bundle);
          yield fs.chmod(_yarnPath, 0o755);

          try {
            yield child.spawn(_constants.NODE_BIN_PATH, [_yarnPath, 'set', 'version', range], {
              stdio: 'inherit',
              cwd: config.lockfileFolder,
              env: (0, _extends2.default)({}, process.env, {
                YARN_IGNORE_PATH: `1`,
              }),
            });
          } catch (err) {
            // eslint-disable-next-line no-process-exit
            process.exit(1);
          }

          return;
        }
      } else {
        reporter.log(`Resolving ${chalk.yellow(initialRange)} to a url...`);

        var releases = [];

        try {
          releases = yield fetchReleases(config, {
            includePrereleases: allowRc,
          });
        } catch (e) {
          reporter.error(e.message);
          return;
        }

        var release = releases.find(release => {
          // $FlowFixMe
          return semver.satisfies(release.version, range);
        });

        if (!release) {
          throw new Error(`Release not found: ${range}`);
        }

        var asset = getBundleAsset(release);
        invariant(asset, 'The bundle asset should exist');

        bundleUrl = asset.browser_download_url;
        bundleVersion = release.version.version;
      }

      reporter.log(`Downloading ${chalk.green(bundleUrl)}...`);

      var bundle = yield fetchBundle(config, bundleUrl);

      var yarnPath = path.resolve(config.lockfileFolder, `.yarn/releases/yarn-${bundleVersion}.cjs`);
      reporter.log(`Saving it into ${chalk.magenta(yarnPath)}...`);
      yield fs.mkdirp(path.dirname(yarnPath));
      yield fs.writeFile(yarnPath, bundle);
      yield fs.chmod(yarnPath, 0o755);

      var targetPath = path.relative(config.lockfileFolder, yarnPath).replace(/\\/g, '/');

      if (isV2) {
        var rcPath = `${config.lockfileFolder}/.yarnrc.yml`;
        reporter.log(`Updating ${chalk.magenta(rcPath)}...`);

        yield fs.writeFilePreservingEol(rcPath, `yarnPath: ${JSON.stringify(targetPath)}\n`);
      } else {
        var _rcPath = `${config.lockfileFolder}/.yarnrc`;
        reporter.log(`Updating ${chalk.magenta(_rcPath)}...`);

        var rc = (0, _rc.getRcConfigForFolder)(config.lockfileFolder);
        rc['yarn-path'] = targetPath;

        yield fs.writeFilePreservingEol(_rcPath, `${(0, _lockfile.stringify)(rc)}\n`);
      }

      reporter.log(`Done!`);
    })();
  },
});

exports.run = _buildSubCommands.run;
exports.setFlags = _buildSubCommands.setFlags;
exports.examples = _buildSubCommands.examples;
