/* eslint object-shorthand: 0 */

import buildSubCommands from './_build-sub-commands.js';

const CONFIG_KEYS = [
  // 'reporter',
  'registryFolders',
  'linkedModules',
  // 'registries',
  'cache',
  'cwd',
  'looseSemver',
  'commandName',
  'preferOffline',
  'modulesFolder',
  'globalFolder',
  'linkFolder',
  'offline',
  'binLinks',
  'ignorePlatform',
  'ignoreScripts',
  'disablePrepublish',
  'nonInteractive',
  'workspaceRootFolder',
  'lockfileFolder',
  'networkConcurrency',
  'childConcurrency',
  'networkTimeout',
  'workspacesEnabled',
  'workspacesNohoistEnabled',
  'pruneOfflineMirror',
  'enableMetaFolder',
  'enableLockfileVersions',
  'linkFileDependencies',
  'cacheFolder',
  'tempFolder',
  'production',
  'packageDateLimit',
  'disableWrappersFolder',
];

export function hasWrapper(flags, args) {
  return args[0] !== 'get';
}

export function setFlags(commander) {
  commander.description('Manages the yarn configuration files.');
}

export const {run, examples} = buildSubCommands('config', {
  async set(config, reporter, flags, args) {
    if (args.length === 0 || args.length > 2) {
      return false;
    }
    const [key, val = true] = args;
    const yarnConfig = config.registries.yarn;
    await yarnConfig.saveHomeConfig({[key]: val});
    reporter.success(reporter.lang('configSet', key, val));
    return true;
  },

  get(config, reporter, flags, args) {
    if (args.length !== 1) {
      return false;
    }

    reporter.log(String(config.getOption(args[0])), {force: true});
    return true;
  },

  delete: async function(config, reporter, flags, args) {
    if (args.length !== 1) {
      return false;
    }

    const key = args[0];
    const yarnConfig = config.registries.yarn;
    await yarnConfig.saveHomeConfig({[key]: undefined});
    reporter.success(reporter.lang('configDelete', key));
    return true;
  },

  list(config, reporter, flags, args) {
    if (args.length) {
      return false;
    }

    reporter.info(reporter.lang('configYarn'));
    reporter.inspect(config.registries.yarn.config);

    reporter.info(reporter.lang('configNpm'));
    reporter.inspect(config.registries.npm.config);

    return true;
  },

  current(config, reporter, flags, args) {
    if (args.length) {
      return false;
    }

    reporter.log(JSON.stringify(config, CONFIG_KEYS, 2), {force: true});

    return true;
  },
});
