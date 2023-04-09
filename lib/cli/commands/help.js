'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;

var _index = _interopRequireDefault(require('./index.js'));
var constants = _interopRequireWildcard(require('../../constants.js'));
var _misc = require('../../util/misc.js');
var _aliases = _interopRequireDefault(require('../aliases'));
var chalk = require('chalk');

function hasWrapper(flags, args) {
  return false;
}

function setFlags(commander) {
  commander.description('Displays help information.');
}

function run(config, reporter, commander, args) {
  if (args.length) {
    var commandName = args.shift();
    if (Object.prototype.hasOwnProperty.call(_index.default, commandName)) {
      var command = _index.default[commandName];
      if (command) {
        command.setFlags(commander);
        var examples = (command.examples || []).map(example => `    $ yarn ${example}`);
        if (examples.length) {
          commander.on('--help', () => {
            reporter.log(reporter.lang('helpExamples', reporter.rawText(examples.join('\n'))));
          });
        }
        // eslint-disable-next-line yarn-internal/warn-language
        commander.on('--help', () => reporter.log('  ' + command.getDocsInfo + '\n'));
        commander.help();
        return Promise.resolve();
      }
    }
  }

  commander.on('--help', () => {
    var commandsText = [];
    for (var name of Object.keys(_index.default).sort(_misc.sortAlpha)) {
      if (_index.default[name].useless || Object.keys(_aliases.default).map(key => _aliases.default[key]).indexOf(name) > -1) {
        continue;
      }
      if (_aliases.default[name]) {
        commandsText.push(`    - ${(0, _misc.hyphenate)(name)} / ${_aliases.default[name]}`);
      } else {
        commandsText.push(`    - ${(0, _misc.hyphenate)(name)}`);
      }
    }
    reporter.log(reporter.lang('helpCommands', reporter.rawText(commandsText.join('\n'))));
    reporter.log(reporter.lang('helpCommandsMore', reporter.rawText(chalk.bold('yarn help COMMAND'))));
    reporter.log(reporter.lang('helpLearnMore', reporter.rawText(chalk.bold(constants.YARN_DOCS))));
  });

  commander.options.sort(_misc.sortOptionsByFlags);

  commander.help();
  return Promise.resolve();
}
