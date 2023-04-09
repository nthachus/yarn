'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
exports.__esModule = true;
exports.default = void 0;

var constants = _interopRequireWildcard(require('../../constants.js'));

var chalk = require('chalk');

var getDocsLink = name => `${constants.YARN_DOCS}${name || ''}`;
var getDocsInfo = name => 'Visit ' + chalk.bold(getDocsLink(name)) + ' for documentation about this command.';

var access = _interopRequireWildcard(require('./access.js'));
var add = _interopRequireWildcard(require('./add.js'));
var audit = _interopRequireWildcard(require('./audit.js'));
var autoclean = _interopRequireWildcard(require('./autoclean.js'));
var bin = _interopRequireWildcard(require('./bin.js'));
var cache = _interopRequireWildcard(require('./cache.js'));
var check = _interopRequireWildcard(require('./check.js'));
var config = _interopRequireWildcard(require('./config.js'));
var create = _interopRequireWildcard(require('./create.js'));
var exec = _interopRequireWildcard(require('./exec.js'));
var generateLockEntry = _interopRequireWildcard(require('./generate-lock-entry.js'));
var global = _interopRequireWildcard(require('./global.js'));
var help = _interopRequireWildcard(require('./help.js'));
var import_ = _interopRequireWildcard(require('./import.js'));
var info = _interopRequireWildcard(require('./info.js'));
var init = _interopRequireWildcard(require('./init.js'));
var install = _interopRequireWildcard(require('./install.js'));
var licenses = _interopRequireWildcard(require('./licenses.js'));
var link = _interopRequireWildcard(require('./link.js'));
var login = _interopRequireWildcard(require('./login.js'));
var logout = _interopRequireWildcard(require('./logout.js'));
var list = _interopRequireWildcard(require('./list.js'));
var node = _interopRequireWildcard(require('./node.js'));
var outdated = _interopRequireWildcard(require('./outdated.js'));
var owner = _interopRequireWildcard(require('./owner.js'));
var pack = _interopRequireWildcard(require('./pack.js'));
var policies = _interopRequireWildcard(require('./policies.js'));
var publish = _interopRequireWildcard(require('./publish.js'));
var remove = _interopRequireWildcard(require('./remove.js'));
var run = _interopRequireWildcard(require('./run.js'));
var tag = _interopRequireWildcard(require('./tag.js'));
var team = _interopRequireWildcard(require('./team.js'));
var unplug = _interopRequireWildcard(require('./unplug.js'));
var unlink = _interopRequireWildcard(require('./unlink.js'));
var upgrade = _interopRequireWildcard(require('./upgrade.js'));
var version = _interopRequireWildcard(require('./version.js'));
var versions = _interopRequireWildcard(require('./versions.js'));
var why = _interopRequireWildcard(require('./why.js'));
var workspaces = _interopRequireWildcard(require('./workspaces.js'));
var workspace = _interopRequireWildcard(require('./workspace.js'));
var upgradeInteractive = _interopRequireWildcard(require('./upgrade-interactive.js'));

var _useless = _interopRequireDefault(require('./_useless.js'));

var commands = {
  access,
  add,
  audit,
  autoclean,
  bin,
  cache,
  check,
  config,
  create,
  dedupe: (0, _useless.default)("The dedupe command isn't necessary. `yarn install` will already dedupe."),
  exec,
  generateLockEntry,
  global,
  help,
  import: import_,
  info,
  init,
  install,
  licenses,
  link,
  lockfile: (0, _useless.default)("The lockfile command isn't necessary. `yarn install` will produce a lockfile."),
  login,
  logout,
  list,
  node,
  outdated,
  owner,
  pack,
  policies,
  prune: (0, _useless.default)("The prune command isn't necessary. `yarn install` will prune extraneous packages."),
  publish,
  remove,
  run,
  tag,
  team,
  unplug,
  unlink,
  upgrade,
  version,
  versions,
  why,
  workspaces,
  workspace,
  upgradeInteractive,
};

for (var key in commands) {
  commands[key].getDocsInfo = getDocsInfo(key);
}

var _aliases = _interopRequireDefault(require('../aliases.js'));

for (var _key in _aliases.default) {
  commands[_key] = commands[_aliases.default[_key]];
  commands[_key].getDocsInfo = getDocsInfo(_key);
}

exports.default = commands;
