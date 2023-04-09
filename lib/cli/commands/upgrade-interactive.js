'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.requireLockfile = void 0;
exports.run = run;
exports.setFlags = setFlags;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var inquirer = require('inquirer');
var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _add = require('./add.js');
var _upgrade = require('./upgrade.js');
var _colorForVersions = _interopRequireDefault(require('../../util/color-for-versions'));
var _colorizeDiff = _interopRequireDefault(require('../../util/colorize-diff.js'));
var _install2 = require('./install.js');

var path = require('path');

var requireLockfile = true;
exports.requireLockfile = requireLockfile;

function setFlags(commander) {
  commander.description('Provides an easy way to update outdated packages.');
  commander.usage('upgrade-interactive [flags]');
  commander.option('-S, --scope <scope>', 'upgrade packages under the specified scope');
  commander.option('--latest', 'list the latest version of packages, ignoring version ranges in package.json');
  commander.option('-E, --exact', 'install exact version. Only used when --latest is specified.');
  commander.option(
    '-T, --tilde',
    'install most recent release with the same minor version. Only used when --latest is specified.'
  );
  commander.option(
    '-C, --caret',
    'install most recent release with the same major version. Only used when --latest is specified.'
  );
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var outdatedFieldName = flags.latest ? 'latest' : 'wanted';
    var lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder);

    var deps = yield (0, _upgrade.getOutdated)(config, reporter, (0, _extends2.default)({}, flags, {includeWorkspaceDeps: true}), lockfile, args);

    if (deps.length === 0) {
      reporter.success(reporter.lang('allDependenciesUpToDate'));
      return;
    }

    // Fail early with runtime compatibility checks so that it doesn't fail after you've made your selections
    var install = new _install2.Install(flags, config, reporter, lockfile);
    yield install.checkCompatibility();

    var usesWorkspaces = !!config.workspaceRootFolder;

    var maxLengthArr = {
      name: 'name'.length,
      current: 'from'.length,
      range: 'latest'.length,
      [outdatedFieldName]: 'to'.length,
      workspaceName: 'workspace'.length,
    };

    var keysWithDynamicLength = ['name', 'current', outdatedFieldName];

    if (!flags.latest) {
      maxLengthArr.range = 'range'.length;
      keysWithDynamicLength.push('range');
    }

    if (usesWorkspaces) {
      keysWithDynamicLength.push('workspaceName');
    }

    deps.forEach(dep =>
      keysWithDynamicLength.forEach(key => {
        maxLengthArr[key] = Math.max(maxLengthArr[key], dep[key].length);
      })
    );

    // Depends on maxLengthArr
    var addPadding = dep => key => `${dep[key]}${' '.repeat(maxLengthArr[key] - dep[key].length)}`;
    var headerPadding = (header, key) =>
      `${reporter.format.bold.underline(header)}${' '.repeat(maxLengthArr[key] - header.length)}`;

    var colorizeName = (from, to) => reporter.format[(0, _colorForVersions.default)(from, to)];

    var getNameFromHint = hint => (hint ? `${hint}Dependencies` : 'dependencies');

    var makeRow = dep => {
      var padding = addPadding(dep);
      var name = colorizeName(dep.current, dep[outdatedFieldName])(padding('name'));
      var current = reporter.format.blue(padding('current'));
      var latest = (0, _colorizeDiff.default)(dep.current, padding(outdatedFieldName), reporter);
      var url = reporter.format.cyan(dep.url);
      var range = reporter.format.blue(flags.latest ? 'latest' : padding('range'));
      if (usesWorkspaces) {
        var workspace = padding('workspaceName');
        return `${name}  ${range}  ${current}  ❯  ${latest}  ${workspace}  ${url}`;
      } else {
        return `${name}  ${range}  ${current}  ❯  ${latest}  ${url}`;
      }
    };

    var makeHeaderRow = () => {
      var name = headerPadding('name', 'name');
      var range = headerPadding('range', 'range');
      var from = headerPadding('from', 'current');
      var to = headerPadding('to', outdatedFieldName);
      var url = reporter.format.bold.underline('url');
      if (usesWorkspaces) {
        var workspace = headerPadding('workspace', 'workspaceName');
        return `  ${name}  ${range}  ${from}     ${to}  ${workspace}  ${url}`;
      } else {
        return `  ${name}  ${range}  ${from}     ${to}  ${url}`;
      }
    };

    var groupedDeps = deps.reduce((acc, dep) => {
      var hint = dep.hint, name = dep.name, upgradeTo = dep.upgradeTo;
      var version = dep[outdatedFieldName];
      var key = getNameFromHint(hint);
      var xs = acc[key] || [];
      acc[key] = xs.concat({
        name: makeRow(dep),
        value: dep,
        short: `${name}@${version}`,
        upgradeTo,
      });
      return acc;
    }, {});

    var flatten = xs => xs.reduce((ys, y) => ys.concat(Array.isArray(y) ? flatten(y) : y), []);

    var choices = flatten(
      Object.keys(groupedDeps).map(key => [
        new inquirer.Separator(reporter.format.bold.underline.green(key)),
        new inquirer.Separator(makeHeaderRow()),
        groupedDeps[key],
        new inquirer.Separator(' '),
      ])
    );

    try {
      var red = reporter.format.red('<red>');
      var yellow = reporter.format.yellow('<yellow>');
      var green = reporter.format.green('<green>');
      reporter.info(reporter.lang('legendColorsForVersionUpdates', red, yellow, green));

      var answers = yield reporter.prompt('Choose which packages to update.', choices, {
        name: 'packages',
        type: 'checkbox',
        validate: answer => !!answer.length || 'You must choose at least one package.',
      });

      var getPattern = _ref => {
        var upgradeTo = _ref.upgradeTo;
        return upgradeTo;
      };
      var isHint = x => _ref2 => {
        var hint = _ref2.hint;
        return hint === x;
      };

      for (var hint of [null, 'dev', 'optional', 'peer']) {
        // Reset dependency flags
        flags.dev = hint === 'dev';
        flags.peer = hint === 'peer';
        flags.optional = hint === 'optional';
        flags.ignoreWorkspaceRootCheck = true;
        flags.includeWorkspaceDeps = false;
        flags.workspaceRootIsCwd = false;
        var _deps = answers.filter(isHint(hint));
        if (_deps.length) {
          var _install = new _install2.Install(flags, config, reporter, lockfile);
          var _yield$_install$fetch = yield _install.fetchRequestFromCwd(), packagePatterns = _yield$_install$fetch.requests;
          var depsByWorkspace = _deps.reduce((acc, dep) => {
            var workspaceLoc = dep.workspaceLoc;
            var xs = acc[workspaceLoc] || [];
            acc[workspaceLoc] = xs.concat(dep);
            return acc;
          }, {});
          var cwd = config.cwd;
          for (var loc of Object.keys(depsByWorkspace)) {
            var patterns = depsByWorkspace[loc].map(getPattern);
            (0, _upgrade.cleanLockfile)(lockfile, _deps, packagePatterns, reporter);
            reporter.info(reporter.lang('updateInstalling', getNameFromHint(hint)));
            if (loc !== '') {
              config.cwd = path.resolve(path.dirname(loc));
            }
            var add = new _add.Add(patterns, flags, config, reporter, lockfile);
            yield add.init();
            config.cwd = cwd;
          }
        }
      }
    } catch (e) {
      Promise.reject(e);
    }
  });

  return _run.apply(this, arguments);
}
