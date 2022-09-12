export const OWNED_DEPENDENCY_TYPES = ['devDependencies', 'dependencies', 'optionalDependencies'];
export const DEPENDENCY_TYPES = [...OWNED_DEPENDENCY_TYPES, 'peerDependencies'];
export const RESOLUTIONS = 'resolutions';
export const MANIFEST_FIELDS = [RESOLUTIONS, ...DEPENDENCY_TYPES];

export const SUPPORTED_NODE_VERSIONS = '^4.8.0 || ^5.7.0 || ^6.2.2 || >=8.0.0';

export const YARN_REGISTRY = 'https://registry.yarnpkg.com';
export const NPM_REGISTRY_RE = /https?:\/\/registry\.npmjs\.org/g;

export const YARN_DOCS = 'https://yarnpkg.com/en/docs/cli/';
export const YARN_INSTALLER_SH = 'https://yarnpkg.com/install.sh';
export const YARN_INSTALLER_MSI = 'https://yarnpkg.com/latest.msi';

export const SELF_UPDATE_VERSION_URL = 'https://yarnpkg.com/latest-version';

// cache version, bump whenever we make backwards incompatible changes
export const CACHE_VERSION = 6;

// lockfile version, bump whenever we make backwards incompatible changes
export const LOCKFILE_VERSION = 1;

// max amount of network requests to perform concurrently
export const NETWORK_CONCURRENCY = 8;

// HTTP timeout used when downloading packages
export const NETWORK_TIMEOUT = 30 * 1000; // in milliseconds

// max amount of child processes to execute concurrently
export const CHILD_CONCURRENCY = 5;

export const REQUIRED_PACKAGE_KEYS = ['name', 'version', '_uid'];

export const NODE_MODULES_FOLDER = 'node_modules';
export const NODE_PACKAGE_JSON = 'package.json';

export const PNP_FILENAME = '.pnp.js';

export const META_FOLDER = '.yarn-meta';
export const INTEGRITY_FILENAME = '.yarn-integrity';
export const LOCKFILE_FILENAME = 'yarn.lock';
export const METADATA_FILENAME = '.yarn-metadata.json';
export const TARBALL_FILENAME = '.yarn-tarball.tgz';
export const CLEAN_FILENAME = '.yarnclean';

export const NPM_LOCK_FILENAME = 'package-lock.json';
export const NPM_SHRINKWRAP_FILENAME = 'npm-shrinkwrap.json';

export const DEFAULT_INDENT = '  ';
export const SINGLE_INSTANCE_PORT = 31997;
export const SINGLE_INSTANCE_FILENAME = '.yarn-single-instance';

export const VERSION_COLOR_SCHEME = {
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
