'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.examples = void 0;
exports.hasWrapper = hasWrapper;
exports.run = void 0;
exports.setFlags = setFlags;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _baseReporter = _interopRequireDefault(require('../../reporters/base-reporter.js'));
var _install = require('./install.js');
var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));

var invariant = require('invariant');

function hasWrapper(flags, args) {
  return args[0] != 'generate-disclaimer';
}

function getManifests() {
  return _getManifests.apply(this, arguments);
}
function _getManifests() {
  _getManifests = (0, _asyncToGenerator2.default)(function* (config, flags) {
    var lockfile = yield _lockfile.default.fromDirectory(config.cwd);
    var install = new _install.Install((0, _extends2.default)({skipIntegrityCheck: true}, flags), config, new _baseReporter.default(), lockfile);
    yield install.hydrate(true);

    var manifests = install.resolver.getManifests();

    // sort by name
    manifests = manifests.sort(function(a, b) {
      if (!a.name && !b.name) {
        return 0;
      }

      if (!a.name) {
        return 1;
      }

      if (!b.name) {
        return -1;
      }

      return a.name.localeCompare(b.name);
    });

    // filter ignored manifests
    manifests = manifests.filter((manifest) => {
      var ref = manifest._reference;
      return !!ref && !ref.ignore;
    });

    return manifests;
  });

  return _getManifests.apply(this, arguments);
}

function list() {
  return _list.apply(this, arguments);
}
function _list() {
  _list = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var manifests = yield getManifests(config, flags);
    var manifestsByLicense = new Map();

    for (var _ref3 of manifests) {
      var name = _ref3.name, version = _ref3.version, license = _ref3.license, repository = _ref3.repository, homepage = _ref3.homepage, author = _ref3.author;
      var licenseKey = license || 'UNKNOWN';
      var url = repository ? repository.url : homepage;
      var vendorUrl = homepage || (author && author.url);
      var vendorName = author && author.name;

      if (!manifestsByLicense.has(licenseKey)) {
        manifestsByLicense.set(licenseKey, new Map());
      }

      var byLicense = manifestsByLicense.get(licenseKey);
      invariant(byLicense, 'expected value');
      byLicense.set(`${name}@${version}`, {
        name,
        version,
        url,
        vendorUrl,
        vendorName,
      });
    }

    if (flags.json) {
      var body = [];

      manifestsByLicense.forEach((license, licenseKey) => {
        license.forEach(_ref4 => {
          var name = _ref4.name, version = _ref4.version, url = _ref4.url, vendorUrl = _ref4.vendorUrl, vendorName = _ref4.vendorName;
          body.push([name, version, licenseKey, url || 'Unknown', vendorUrl || 'Unknown', vendorName || 'Unknown']);
        });
      });

      reporter.table(['Name', 'Version', 'License', 'URL', 'VendorUrl', 'VendorName'], body);
    } else {
      var trees = [];

      manifestsByLicense.forEach((license, licenseKey) => {
        var licenseTree = [];

        license.forEach(_ref5 => {
          var name = _ref5.name, version = _ref5.version, url = _ref5.url, vendorUrl = _ref5.vendorUrl, vendorName = _ref5.vendorName;
          var children = [];

          if (url) {
            children.push({name: `${reporter.format.bold('URL:')} ${url}`});
          }

          if (vendorUrl) {
            children.push({name: `${reporter.format.bold('VendorUrl:')} ${vendorUrl}`});
          }

          if (vendorName) {
            children.push({name: `${reporter.format.bold('VendorName:')} ${vendorName}`});
          }

          licenseTree.push({
            name: `${name}@${version}`,
            children,
          });
        });

        trees.push({
          name: licenseKey,
          children: licenseTree,
        });
      });

      reporter.tree('licenses', trees, {force: true});
    }
  });

  return _list.apply(this, arguments);
}
function setFlags(commander) {
  commander.description('Lists licenses for installed packages.');
}
var _buildSubCommands = (0, _buildSubCommands2.default)('licenses', {
  ls(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      reporter.warn(`\`yarn licenses ls\` is deprecated. Please use \`yarn licenses list\`.`);
      yield list(config, reporter, flags, args);
    })();
  },

  list(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      yield list(config, reporter, flags, args);
    })();
  },

  generateDisclaimer(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      /* eslint-disable no-console */

      // `reporter.log` dumps a bunch of ANSI escapes to clear the current line and
      // is for abstracting the console output so it can be consumed by other tools
      // (JSON output being the primary one). This command is only for text consumption
      // and you should just be dumping it to a TXT file. Using a reporter here has the
      // potential to mess up the output since it might print ansi escapes.
      // @kittens - https://git.io/v7uts

      var manifests = yield getManifests(config, flags);
      var manifest = yield config.readRootManifest();

      // Create a map of license text to manifest so that packages with exactly
      // the same license text are grouped together.
      var manifestsByLicense = new Map();
      for (var _manifest of manifests) {
        var licenseText = _manifest.licenseText, noticeText = _manifest.noticeText;
        var licenseKey;
        if (!licenseText) {
          continue;
        }

        if (!noticeText) {
          licenseKey = licenseText;
        } else {
          licenseKey = `${licenseText}\n\nNOTICE\n\n${noticeText}`;
        }

        if (!manifestsByLicense.has(licenseKey)) {
          manifestsByLicense.set(licenseKey, new Map());
        }

        var byLicense = manifestsByLicense.get(licenseKey);
        invariant(byLicense, 'expected value');
        byLicense.set(_manifest.name, _manifest);
      }

      console.log(
        'THE FOLLOWING SETS FORTH ATTRIBUTION NOTICES FOR THIRD PARTY SOFTWARE THAT MAY BE CONTAINED ' +
          `IN PORTIONS OF THE ${String(manifest.name).toUpperCase().replace(/-/g, ' ')} PRODUCT.`
      );
      console.log();

      for (var _ref of manifestsByLicense) {
        var _licenseKey = _ref[0], _manifests = _ref[1];
        console.log('-----');
        console.log();

        var names = [];
        var urls = [];
        for (var _ref2 of _manifests) {
          var name = _ref2[0], repository = _ref2[1].repository;
          names.push(name);
          if (repository && repository.url) {
            urls.push(_manifests.size === 1 ? repository.url : `${repository.url} (${name})`);
          }
        }

        var heading = [];
        heading.push(`The following software may be included in this product: ${names.join(', ')}.`);
        if (urls.length > 0) {
          heading.push(`A copy of the source code may be downloaded from ${urls.join(', ')}.`);
        }
        heading.push('This software contains the following license and notice below:');

        console.log(heading.join(' '));
        console.log();

        if (_licenseKey) {
          console.log(_licenseKey.trim());
        } else {
          // what do we do here? base it on `license`?
        }

        console.log();
      }
    })();
  },
});
exports.run = _buildSubCommands.run;
exports.examples = _buildSubCommands.examples;
