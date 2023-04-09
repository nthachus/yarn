/* eslint object-shorthand: 0 */
'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.examples = void 0;
exports.hasWrapper = hasWrapper;
exports.run = void 0;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));

var CONFIG_KEYS = [
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

function hasWrapper(flags, args) {
  return args[0] !== 'get';
}

function setFlags(commander) {
  commander.description('Manages the yarn configuration files.');
}

var _buildSubCommands = (0, _buildSubCommands2.default)('config', {
  set(config, reporter, flags, args) {
    return (0, _asyncToGenerator2.default)(function* () {
      if (args.length === 0 || args.length > 2) {
        return false;
      }
      var key = args[0], _args$ = args[1], val = _args$ === void 0 ? true : _args$;
      var yarnConfig = config.registries.yarn;
      yield yarnConfig.saveHomeConfig({[key]: val});
      reporter.success(reporter.lang('configSet', key, val));
      return true;
    })();
  },

  get(config, reporter, flags, args) {
    if (args.length !== 1) {
      return false;
    }

    reporter.log(String(config.getOption(args[0])), {force: true});
    return true;
  },

  delete: (function() {
    var _ref = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
      if (args.length !== 1) {
        return false;
      }

      var key = args[0];
      var yarnConfig = config.registries.yarn;
      yield yarnConfig.saveHomeConfig({[key]: undefined});
      reporter.success(reporter.lang('configDelete', key));
      return true;
    });

    return function _delete() {
      return _ref.apply(this, arguments);
    };
  })(),

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
exports.run = _buildSubCommands.run;
exports.examples = _buildSubCommands.examples;
