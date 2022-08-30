'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.VERSION_COLOR_SCHEME =
  exports.SINGLE_INSTANCE_FILENAME =
  exports.SINGLE_INSTANCE_PORT =
  exports.DEFAULT_INDENT =
  exports.NPM_SHRINKWRAP_FILENAME =
  exports.NPM_LOCK_FILENAME =
  exports.CLEAN_FILENAME =
  exports.TARBALL_FILENAME =
  exports.METADATA_FILENAME =
  exports.LOCKFILE_FILENAME =
  exports.INTEGRITY_FILENAME =
  exports.META_FOLDER =
  exports.NODE_PACKAGE_JSON =
  exports.NODE_MODULES_FOLDER =
  exports.REQUIRED_PACKAGE_KEYS =
  exports.CHILD_CONCURRENCY =
  exports.NETWORK_TIMEOUT =
  exports.NETWORK_CONCURRENCY =
  exports.LOCKFILE_VERSION =
  exports.CACHE_VERSION =
  exports.SELF_UPDATE_VERSION_URL =
  exports.YARN_INSTALLER_MSI =
  exports.YARN_INSTALLER_SH =
  exports.YARN_DOCS =
  exports.YARN_REGISTRY =
  exports.SUPPORTED_NODE_VERSIONS =
  exports.MANIFEST_FIELDS =
  exports.RESOLUTIONS =
  exports.DEPENDENCY_TYPES =
    void 0;

var DEPENDENCY_TYPES = ['devDependencies', 'dependencies', 'optionalDependencies', 'peerDependencies'];
exports.DEPENDENCY_TYPES = DEPENDENCY_TYPES;
var RESOLUTIONS = 'resolutions';
exports.RESOLUTIONS = RESOLUTIONS;
var MANIFEST_FIELDS = [RESOLUTIONS].concat(DEPENDENCY_TYPES);
exports.MANIFEST_FIELDS = MANIFEST_FIELDS;

var SUPPORTED_NODE_VERSIONS = '^4.8.0 || ^5.7.0 || ^6.2.2 || >=8.0.0';
exports.SUPPORTED_NODE_VERSIONS = SUPPORTED_NODE_VERSIONS;

var YARN_REGISTRY = 'https://registry.yarnpkg.com';
exports.YARN_REGISTRY = YARN_REGISTRY;

var YARN_DOCS = 'https://yarnpkg.com/en/docs/cli/';
exports.YARN_DOCS = YARN_DOCS;
var YARN_INSTALLER_SH = 'https://yarnpkg.com/install.sh';
exports.YARN_INSTALLER_SH = YARN_INSTALLER_SH;
var YARN_INSTALLER_MSI = 'https://yarnpkg.com/latest.msi';
exports.YARN_INSTALLER_MSI = YARN_INSTALLER_MSI;

var SELF_UPDATE_VERSION_URL = 'https://yarnpkg.com/latest-version';
exports.SELF_UPDATE_VERSION_URL = SELF_UPDATE_VERSION_URL;

// cache version, bump whenever we make backwards incompatible changes
var CACHE_VERSION = 2;
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

var NODE_MODULES_FOLDER = 'node_modules';
exports.NODE_MODULES_FOLDER = NODE_MODULES_FOLDER;
var NODE_PACKAGE_JSON = 'package.json';
exports.NODE_PACKAGE_JSON = NODE_PACKAGE_JSON;

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
