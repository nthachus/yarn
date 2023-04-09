'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.YARN_REGISTRY =
  exports.YARN_INSTALLER_SH =
  exports.YARN_INSTALLER_MSI =
  exports.YARN_DOCS =
  exports.YARN_BIN_PATH =
  exports.VERSION_COLOR_SCHEME =
  exports.TARBALL_FILENAME =
  exports.SUPPORTED_NODE_VERSIONS =
  exports.SINGLE_INSTANCE_PORT =
  exports.SINGLE_INSTANCE_FILENAME =
  exports.SELF_UPDATE_VERSION_URL =
  exports.RESOLUTIONS =
  exports.REQUIRED_PACKAGE_KEYS =
  exports.PREFERRED_MODULE_CACHE_DIRECTORIES =
  exports.POSIX_GLOBAL_PREFIX =
  exports.PNP_FILENAME =
  exports.OWNED_DEPENDENCY_TYPES =
  exports.NPM_SHRINKWRAP_FILENAME =
  exports.NPM_REGISTRY_RE =
  exports.NPM_LOCK_FILENAME =
  exports.NODE_PACKAGE_JSON =
  exports.NODE_MODULES_FOLDER =
  exports.NODE_BIN_PATH =
  exports.NETWORK_TIMEOUT =
  exports.NETWORK_CONCURRENCY =
  exports.META_FOLDER =
  exports.METADATA_FILENAME =
  exports.MANIFEST_FIELDS =
  exports.LOCKFILE_VERSION =
  exports.LOCKFILE_FILENAME =
  exports.LINK_REGISTRY_DIRECTORY =
  exports.INTEGRITY_FILENAME =
  exports.GLOBAL_MODULE_DIRECTORY =
  exports.FALLBACK_GLOBAL_PREFIX =
  exports.ENV_PATH_KEY =
  exports.DEPENDENCY_TYPES =
  exports.DEFAULT_INDENT =
  exports.DATA_DIRECTORY =
  exports.CONFIG_DIRECTORY =
  exports.CLEAN_FILENAME =
  exports.CHILD_CONCURRENCY =
  exports.CACHE_VERSION =
    void 0;
exports.getPathKey = getPathKey;

var os = require('os');
var path = require('path');
var _userHomeDir = _interopRequireDefault(require('./util/user-home-dir'));
var _userDirs = require('./util/user-dirs');
var isWebpackBundle = require('is-webpack-bundle');

var DEPENDENCY_TYPES = ['devDependencies', 'dependencies', 'optionalDependencies', 'peerDependencies'];
exports.DEPENDENCY_TYPES = DEPENDENCY_TYPES;
var OWNED_DEPENDENCY_TYPES = ['devDependencies', 'dependencies', 'optionalDependencies'];
exports.OWNED_DEPENDENCY_TYPES = OWNED_DEPENDENCY_TYPES;

var RESOLUTIONS = 'resolutions';
exports.RESOLUTIONS = RESOLUTIONS;
var MANIFEST_FIELDS = [RESOLUTIONS].concat(DEPENDENCY_TYPES);
exports.MANIFEST_FIELDS = MANIFEST_FIELDS;

var SUPPORTED_NODE_VERSIONS = '^4.8.0 || ^5.7.0 || ^6.2.2 || >=8.0.0';
exports.SUPPORTED_NODE_VERSIONS = SUPPORTED_NODE_VERSIONS;

var YARN_REGISTRY = 'https://registry.yarnpkg.com';
exports.YARN_REGISTRY = YARN_REGISTRY;
var NPM_REGISTRY_RE = /https?:\/\/registry\.npmjs\.org/g;
exports.NPM_REGISTRY_RE = NPM_REGISTRY_RE;

var YARN_DOCS = 'https://yarnpkg.com/en/docs/cli/';
exports.YARN_DOCS = YARN_DOCS;
var YARN_INSTALLER_SH = 'https://yarnpkg.com/install.sh';
exports.YARN_INSTALLER_SH = YARN_INSTALLER_SH;
var YARN_INSTALLER_MSI = 'https://yarnpkg.com/latest.msi';
exports.YARN_INSTALLER_MSI = YARN_INSTALLER_MSI;

var SELF_UPDATE_VERSION_URL = 'https://yarnpkg.com/latest-version';
exports.SELF_UPDATE_VERSION_URL = SELF_UPDATE_VERSION_URL;

// cache version, bump whenever we make backwards incompatible changes
var CACHE_VERSION = 6;
exports.CACHE_VERSION = CACHE_VERSION;

// lockfile version, bump whenever we make backwards incompatible changes
var LOCKFILE_VERSION = 1;
exports.LOCKFILE_VERSION = LOCKFILE_VERSION;

// max amount of network requests to perform concurrently
var NETWORK_CONCURRENCY = 8;
exports.NETWORK_CONCURRENCY = NETWORK_CONCURRENCY;

// HTTP timeout used when downloading packages
var NETWORK_TIMEOUT = 30 * 1000; // in milliseconds
exports.NETWORK_TIMEOUT = NETWORK_TIMEOUT;

// max amount of child processes to execute concurrently
var CHILD_CONCURRENCY = 5;
exports.CHILD_CONCURRENCY = CHILD_CONCURRENCY;

var REQUIRED_PACKAGE_KEYS = ['name', 'version', '_uid'];
exports.REQUIRED_PACKAGE_KEYS = REQUIRED_PACKAGE_KEYS;

function getPreferredCacheDirectories() {
  var preferredCacheDirectories = [(0, _userDirs.getCacheDir)()];

  if (process.getuid) {
    // $FlowFixMe: process.getuid exists, dammit
    preferredCacheDirectories.push(path.join(os.tmpdir(), `.yarn-cache-${process.getuid()}`));
  }

  preferredCacheDirectories.push(path.join(os.tmpdir(), `.yarn-cache`));

  return preferredCacheDirectories;
}

var PREFERRED_MODULE_CACHE_DIRECTORIES = getPreferredCacheDirectories();
exports.PREFERRED_MODULE_CACHE_DIRECTORIES = PREFERRED_MODULE_CACHE_DIRECTORIES;
var CONFIG_DIRECTORY = (0, _userDirs.getConfigDir)();
exports.CONFIG_DIRECTORY = CONFIG_DIRECTORY;
var DATA_DIRECTORY = (0, _userDirs.getDataDir)();
exports.DATA_DIRECTORY = DATA_DIRECTORY;
var LINK_REGISTRY_DIRECTORY = path.join(DATA_DIRECTORY, 'link');
exports.LINK_REGISTRY_DIRECTORY = LINK_REGISTRY_DIRECTORY;
var GLOBAL_MODULE_DIRECTORY = path.join(DATA_DIRECTORY, 'global');
exports.GLOBAL_MODULE_DIRECTORY = GLOBAL_MODULE_DIRECTORY;

var NODE_BIN_PATH = process.execPath;
exports.NODE_BIN_PATH = NODE_BIN_PATH;
var YARN_BIN_PATH = getYarnBinPath();
exports.YARN_BIN_PATH = YARN_BIN_PATH;

// Webpack needs to be configured with node.__dirname/__filename = false
function getYarnBinPath() {
  if (isWebpackBundle) {
    return __filename;
  } else {
    return path.join(__dirname, '..', 'bin', 'yarn.js');
  }
}

var NODE_MODULES_FOLDER = 'node_modules';
exports.NODE_MODULES_FOLDER = NODE_MODULES_FOLDER;
var NODE_PACKAGE_JSON = 'package.json';
exports.NODE_PACKAGE_JSON = NODE_PACKAGE_JSON;

var PNP_FILENAME = '.pnp.js';
exports.PNP_FILENAME = PNP_FILENAME;

var POSIX_GLOBAL_PREFIX = `${process.env.DESTDIR || ''}/usr/local`;
exports.POSIX_GLOBAL_PREFIX = POSIX_GLOBAL_PREFIX;
var FALLBACK_GLOBAL_PREFIX = path.join(_userHomeDir.default, '.yarn');
exports.FALLBACK_GLOBAL_PREFIX = FALLBACK_GLOBAL_PREFIX;

var META_FOLDER = '.yarn-meta';
exports.META_FOLDER = META_FOLDER;
var INTEGRITY_FILENAME = '.yarn-integrity';
exports.INTEGRITY_FILENAME = INTEGRITY_FILENAME;
var LOCKFILE_FILENAME = 'yarn.lock';
exports.LOCKFILE_FILENAME = LOCKFILE_FILENAME;
var METADATA_FILENAME = '.yarn-metadata.json';
exports.METADATA_FILENAME = METADATA_FILENAME;
var TARBALL_FILENAME = '.yarn-tarball.tgz';
exports.TARBALL_FILENAME = TARBALL_FILENAME;
var CLEAN_FILENAME = '.yarnclean';
exports.CLEAN_FILENAME = CLEAN_FILENAME;

var NPM_LOCK_FILENAME = 'package-lock.json';
exports.NPM_LOCK_FILENAME = NPM_LOCK_FILENAME;
var NPM_SHRINKWRAP_FILENAME = 'npm-shrinkwrap.json';
exports.NPM_SHRINKWRAP_FILENAME = NPM_SHRINKWRAP_FILENAME;

var DEFAULT_INDENT = '  ';
exports.DEFAULT_INDENT = DEFAULT_INDENT;
var SINGLE_INSTANCE_PORT = 31997;
exports.SINGLE_INSTANCE_PORT = SINGLE_INSTANCE_PORT;
var SINGLE_INSTANCE_FILENAME = '.yarn-single-instance';
exports.SINGLE_INSTANCE_FILENAME = SINGLE_INSTANCE_FILENAME;

var ENV_PATH_KEY = getPathKey(process.platform, process.env);
exports.ENV_PATH_KEY = ENV_PATH_KEY;

function getPathKey(platform, env) {
  var pathKey = 'PATH';

  // windows calls its path "Path" usually, but this is not guaranteed.
  if (platform === 'win32') {
    pathKey = 'Path';

    for (var key in env) {
      if (key.toLowerCase() === 'path') {
        pathKey = key;
      }
    }
  }

  return pathKey;
}

var VERSION_COLOR_SCHEME = {
  major: 'red',
  premajor: 'red',
  minor: 'yellow',
  preminor: 'yellow',
  patch: 'green',
  prepatch: 'green',
  prerelease: 'red',
  unchanged: 'white',
  unknown: 'red',
};
exports.VERSION_COLOR_SCHEME = VERSION_COLOR_SCHEME;
