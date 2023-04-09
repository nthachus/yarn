'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _constants = require('../../constants');
var _util = require('./util.js');
var _index = require('../../resolvers/index.js');
var _inferLicense = _interopRequireDefault(require('./infer-license.js'));
var fs = _interopRequireWildcard(require('../fs.js'));

var semver = require('semver');
var path = require('path');
var url = require('url');

var VALID_BIN_KEYS = /^(?!\.{0,2}$)[a-z0-9._-]+$/i;

var LICENSE_RENAMES = {
  'MIT/X11': 'MIT',
  X11: 'MIT',
};

var _default = /*#__PURE__*/ (function() {
  var _ref = (0, _asyncToGenerator2.default)(function* (
    info,
    moduleLoc,
    reporter,
    warn,
    looseSemver
  ) {
    var files = yield fs.readdir(moduleLoc);

    // clean info.version
    if (typeof info.version === 'string') {
      info.version = semver.clean(info.version, looseSemver) || info.version;
    }

    // if name or version aren't set then set them to empty strings
    info.name = info.name || '';
    info.version = info.version || '';

    // if the man field is a string then coerce it to an array
    if (typeof info.man === 'string') {
      info.man = [info.man];
    }

    // if the keywords field is a string then split it on any whitespace
    if (typeof info.keywords === 'string') {
      info.keywords = info.keywords.split(/\s+/g);
    }

    // if there's no contributors field but an authors field then expand it
    if (!info.contributors && files.indexOf('AUTHORS') >= 0) {
      var authorsFilepath = path.join(moduleLoc, 'AUTHORS');
      var authorsFilestats = yield fs.stat(authorsFilepath);
      if (authorsFilestats.isFile()) {
        var authors = yield fs.readFile(authorsFilepath);
        authors = authors
          .split(/\r?\n/g) // split on lines
          .map((line) => line.replace(/^\s*#.*$/, '').trim()) // remove comments
          .filter((line) => !!line); // remove empty lines
        info.contributors = authors;
      }
    }

    // expand people fields to objects
    if (typeof info.author === 'string' || typeof info.author === 'object') {
      info.author = (0, _util.normalizePerson)(info.author);
    }
    if (Array.isArray(info.contributors)) {
      info.contributors = info.contributors.map(_util.normalizePerson);
    }
    if (Array.isArray(info.maintainers)) {
      info.maintainers = info.maintainers.map(_util.normalizePerson);
    }

    // if there's no readme field then load the README file from the cwd
    if (!info.readme) {
      var readmeCandidates = files
        .filter((filename) => {
          var lower = filename.toLowerCase();
          return lower === 'readme' || lower.indexOf('readme.') === 0;
        })
        .sort((filename1, filename2) => {
          // favor files with extensions
          return filename2.indexOf('.') - filename1.indexOf('.');
        });

      for (var readmeFilename of readmeCandidates) {
        var readmeFilepath = path.join(moduleLoc, readmeFilename);
        var readmeFileStats = yield fs.stat(readmeFilepath);
        if (readmeFileStats.isFile()) {
          info.readmeFilename = readmeFilename;
          info.readme = yield fs.readFile(readmeFilepath);
          break;
        }
      }
    }

    // if there's no description then take the first paragraph from the readme
    if (!info.description && info.readme) {
      var desc = (0, _util.extractDescription)(info.readme);
      if (desc) {
        info.description = desc;
      }
    }

    // support array of engine keys
    if (Array.isArray(info.engines)) {
      var engines = {};
      for (var str of info.engines) {
        if (typeof str === 'string') {
          var _str$trim$split = str.trim().split(/ +/g), name = _str$trim$split[0], patternParts = _str$trim$split.slice(1);
          engines[name] = patternParts.join(' ');
        }
      }
      info.engines = engines;
    }

    // if the repository field is a string then assume it's a git repo and expand it
    if (typeof info.repository === 'string') {
      info.repository = {
        type: 'git',
        url: info.repository,
      };
    }

    var repo = info.repository;

    // explode info.repository.url if it's a hosted git shorthand
    if (repo && typeof repo === 'object' && typeof repo.url === 'string') {
      repo.url = (0, _index.hostedGitFragmentToGitUrl)(repo.url, reporter);
    }

    // allow bugs to be specified as a string, expand it to an object with a single url prop
    if (typeof info.bugs === 'string') {
      info.bugs = {url: info.bugs};
    }

    // normalize homepage url to http
    if (typeof info.homepage === 'string') {
      var parts = url.parse(info.homepage);
      parts.protocol = parts.protocol || 'http:';
      if (parts.pathname && !parts.hostname) {
        parts.hostname = parts.pathname;
        parts.pathname = '';
      }
      info.homepage = url.format(parts);
    }

    // if the `bin` field is as string then expand it to an object with a single property
    // based on the original `bin` field and `name field`
    // { name: "foo", bin: "cli.js" } -> { name: "foo", bin: { foo: "cli.js" } }
    if (typeof info.name === 'string' && typeof info.bin === 'string' && info.bin.length > 0) {
      // Remove scoped package name for consistency with NPM's bin field fixing behaviour
      var _name = info.name.replace(/^@[^\/]+\//, '');
      info.bin = {[_name]: info.bin};
    }

    // Validate that the bin entries reference only files within their package, and that
    // their name is a valid file name
    if (typeof info.bin === 'object' && info.bin !== null) {
      var bin = info.bin;
      for (var key of Object.keys(bin)) {
        var target = bin[key];
        if (!VALID_BIN_KEYS.test(key) || !(0, _util.isValidBin)(target)) {
          delete bin[key];
          warn(reporter.lang('invalidBinEntry', info.name, key));
        } else {
          bin[key] = path.normalize(target);
        }
      }
    } else if (typeof info.bin !== 'undefined') {
      delete info.bin;
      warn(reporter.lang('invalidBinField', info.name));
    }

    // bundleDependencies is an alias for bundledDependencies
    if (info.bundledDependencies) {
      info.bundleDependencies = info.bundledDependencies;
      delete info.bundledDependencies;
    }

    var scripts;

    // dummy script object to shove file inferred scripts onto
    if (info.scripts && typeof info.scripts === 'object') {
      scripts = info.scripts;
    } else {
      scripts = {};
    }

    // if there's a server.js file and no start script then set it to `node server.js`
    if (!scripts.start && files.indexOf('server.js') >= 0) {
      scripts.start = 'node server.js';
    }

    // if there's a binding.gyp file and no install script then set it to `node-gyp rebuild`
    if (!scripts.install && files.indexOf('binding.gyp') >= 0) {
      scripts.install = 'node-gyp rebuild';
    }

    // set scripts if we've polluted the empty object
    if (Object.keys(scripts).length) {
      info.scripts = scripts;
    }

    var dirs = info.directories;

    if (dirs && typeof dirs === 'object') {
      var binDir = dirs.bin;

      if (!info.bin && binDir && typeof binDir === 'string') {
        var _bin = (info.bin = {});
        var fullBinDir = path.join(moduleLoc, binDir);

        if (yield fs.exists(fullBinDir)) {
          for (var scriptName of yield fs.readdir(fullBinDir)) {
            if (scriptName[0] === '.') {
              continue;
            }
            _bin[scriptName] = path.join('.', binDir, scriptName);
          }
        } else {
          warn(reporter.lang('manifestDirectoryNotFound', binDir, info.name));
        }
      }

      var manDir = dirs.man;

      if (!info.man && typeof manDir === 'string') {
        var man = (info.man = []);
        var fullManDir = path.join(moduleLoc, manDir);

        if (yield fs.exists(fullManDir)) {
          for (var filename of yield fs.readdir(fullManDir)) {
            if (/^(.*?)\.[0-9]$/.test(filename)) {
              man.push(path.join('.', manDir, filename));
            }
          }
        } else {
          warn(reporter.lang('manifestDirectoryNotFound', manDir, info.name));
        }
      }
    }

    delete info.directories;

    // normalize licenses field
    var licenses = info.licenses;
    if (Array.isArray(licenses) && !info.license) {
      var licenseTypes = [];

      for (var _license of licenses) {
        if (_license && typeof _license === 'object') {
          _license = _license.type;
        }
        if (typeof _license === 'string') {
          licenseTypes.push(_license);
        }
      }

      licenseTypes = licenseTypes.filter(_util.isValidLicense);

      if (licenseTypes.length === 1) {
        info.license = licenseTypes[0];
      } else if (licenseTypes.length) {
        info.license = `(${licenseTypes.join(' OR ')})`;
      }
    }

    var license = info.license;

    // normalize license
    if (license && typeof license === 'object') {
      info.license = license.type;
    }

    // get license file
    var licenseFile = files.find((filename) => {
      var lower = filename.toLowerCase();
      return (
        lower === 'license' || lower.startsWith('license.') || lower === 'unlicense' || lower.startsWith('unlicense.')
      );
    });
    if (licenseFile) {
      var licenseFilepath = path.join(moduleLoc, licenseFile);
      var licenseFileStats = yield fs.stat(licenseFilepath);
      if (licenseFileStats.isFile()) {
        var licenseContent = yield fs.readFile(licenseFilepath);
        var inferredLicense = (0, _inferLicense.default)(licenseContent);
        info.licenseText = licenseContent;

        var _license2 = info.license;

        if (typeof _license2 === 'string') {
          if (inferredLicense && (0, _util.isValidLicense)(inferredLicense) && !(0, _util.isValidLicense)(_license2)) {
            // some packages don't specify their license version but we can infer it based on their license file
            var basicLicense = _license2.toLowerCase().replace(/(-like|\*)$/g, '');
            var expandedLicense = inferredLicense.toLowerCase();
            if (expandedLicense.startsWith(basicLicense)) {
              // TODO consider doing something to notify the user
              info.license = inferredLicense;
            }
          }
        } else if (inferredLicense) {
          // if there's no license then infer it based on the license file
          info.license = inferredLicense;
        } else {
          // valid expression to refer to a license in a file
          info.license = `SEE LICENSE IN ${licenseFile}`;
        }
      }
    }

    if (typeof info.license === 'string') {
      // sometimes licenses are known by different names, reduce them
      info.license = LICENSE_RENAMES[info.license] || info.license;
    } else if (typeof info.readme === 'string') {
      // the license might be at the bottom of the README
      var _inferredLicense = (0, _inferLicense.default)(info.readme);
      if (_inferredLicense) {
        info.license = _inferredLicense;
      }
    }

    // get notice file
    var noticeFile = files.find((filename) => {
      var lower = filename.toLowerCase();
      return lower === 'notice' || lower.startsWith('notice.');
    });
    if (noticeFile) {
      var noticeFilepath = path.join(moduleLoc, noticeFile);
      var noticeFileStats = yield fs.stat(noticeFilepath);
      if (noticeFileStats.isFile()) {
        info.noticeText = yield fs.readFile(noticeFilepath);
      }
    }

    for (var dependencyType of _constants.MANIFEST_FIELDS) {
      var dependencyList = info[dependencyType];
      if (dependencyList && typeof dependencyList === 'object') {
        delete dependencyList['//'];
        for (var _name2 in dependencyList) {
          dependencyList[_name2] = dependencyList[_name2] || '';
        }
      }
    }
  });

  return function() {
    return _ref.apply(this, arguments);
  };
})();
exports.default = _default;
