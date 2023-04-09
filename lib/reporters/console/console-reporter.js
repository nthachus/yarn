'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _baseReporter = _interopRequireDefault(require('../base-reporter.js'));
var _progressBar = _interopRequireDefault(require('./progress-bar.js'));
var _spinnerProgress = _interopRequireDefault(require('./spinner-progress.js'));
var _util = require('./util.js');
var _misc = require('../../util/misc.js');
var _treeHelper = require('./helpers/tree-helper.js');
var inquirer = require('inquirer');
var Table = require('cli-table3');

var _require = require('util'), inspect = _require.inspect;
var readline = require('readline');
var chalk = require('chalk');
var stripAnsi = require('strip-ansi');
var read = require('read');
var tty = require('tty');

var AUDIT_COL_WIDTHS = [15, 62];

var auditSeverityColors = {
  info: chalk.bold,
  low: chalk.bold,
  moderate: chalk.yellow,
  high: chalk.red,
  critical: chalk.bgRed,
};

// fixes bold on windows
if (process.platform === 'win32' && !(process.env.TERM && /^xterm/i.test(process.env.TERM))) {
  chalk.bold._styles[0].close += '\u001b[m';
}

class ConsoleReporter extends _baseReporter.default {
  constructor(opts) {
    super(opts);
    this._progressBar = void 0;

    this._lastCategorySize = 0;
    this._spinners = new Set();
    this.format = chalk;
    this.format.stripColor = stripAnsi;
    this.isSilent = !!opts.isSilent;
  }

  _prependEmoji(msg, emoji) {
    if (this.emoji && emoji && this.isTTY) {
      msg = `${emoji}  ${msg}`;
    }
    return msg;
  }

  _logCategory(category, color, msg) {
    this._lastCategorySize = category.length;
    this._log(`${this.format[color](category)} ${msg}`);
  }

  _verbose(msg) {
    this._logCategory('verbose', 'grey', `${process.uptime()} ${msg}`);
  }

  _verboseInspect(obj) {
    this.inspect(obj);
  }

  close() {
    for (var spinner of this._spinners) {
      spinner.stop();
    }
    this._spinners.clear();
    this.stopProgress();
    super.close();
  }

  table(head, body) {
    var _this = this;
    //
    head = head.map((field) => this.format.underline(field));

    //
    var rows = [head].concat(body);

    // get column widths
    var cols = [];
    var _loop = function(i) {
      var widths = rows.map((row) => _this.format.stripColor(row[i]).length);
      cols[i] = Math.max.apply(Math, widths);
    };
    for (var i = 0; i < head.length; i++) {
      _loop(i);
    }

    //
    var builtRows = rows.map((row) => {
      for (var _i = 0; _i < row.length; _i++) {
        var field = row[_i];
        var padding = cols[_i] - this.format.stripColor(field).length;

        row[_i] = field + ' '.repeat(padding);
      }
      return row.join(' ');
    });

    this.log(builtRows.join('\n'));
  }

  step(current, total, msg, emoji) {
    msg = this._prependEmoji(msg, emoji);

    if (msg.endsWith('?')) {
      msg = `${(0, _misc.removeSuffix)(msg, '?')}...?`;
    } else {
      msg += '...';
    }

    this.log(`${this.format.dim(`[${current}/${total}]`)} ${msg}`);
  }

  inspect(value) {
    if (typeof value !== 'number' && typeof value !== 'string') {
      value = inspect(value, {
        breakLength: 0,
        colors: this.isTTY,
        depth: null,
        maxArrayLength: null,
      });
    }

    this.log(String(value), {force: true});
  }

  list(key, items, hints) {
    var gutterWidth = (this._lastCategorySize || 2) - 1;

    if (hints) {
      for (var item of items) {
        this._log(`${' '.repeat(gutterWidth)}- ${this.format.bold(item)}`);
        this._log(`  ${' '.repeat(gutterWidth)} ${hints[item]}`);
      }
    } else {
      for (var _item of items) {
        this._log(`${' '.repeat(gutterWidth)}- ${_item}`);
      }
    }
  }

  header(command, pkg) {
    this.log(this.format.bold(`${pkg.name} ${command} v${pkg.version}`));
  }

  footer(showPeakMemory) {
    this.stopProgress();

    var totalTime = (this.getTotalTime() / 1000).toFixed(2);
    var msg = `Done in ${totalTime}s.`;
    if (showPeakMemory) {
      var peakMemory = (this.peakMemory / 1024 / 1024).toFixed(2);
      msg += ` Peak memory usage ${peakMemory}MB.`;
    }
    this.log(this._prependEmoji(msg, '✨'));
  }

  log(msg, _temp) {
    var _ref = _temp === void 0 ? {} : _temp, _ref$force = _ref.force, force = _ref$force === void 0 ? false : _ref$force;
    this._lastCategorySize = 0;
    this._log(msg, {force});
  }

  _log(msg, _temp2) {
    var _ref2 = _temp2 === void 0 ? {} : _temp2, _ref2$force = _ref2.force, force = _ref2$force === void 0 ? false : _ref2$force;
    if (this.isSilent && !force) {
      return;
    }
    (0, _util.clearLine)(this.stdout);
    this.stdout.write(`${msg}\n`);
  }

  success(msg) {
    this._logCategory('success', 'green', msg);
  }

  error(msg) {
    (0, _util.clearLine)(this.stderr);
    this.stderr.write(`${this.format.red('error')} ${msg}\n`);
  }

  info(msg) {
    this._logCategory('info', 'blue', msg);
  }

  command(command) {
    this.log(this.format.dim(`$ ${command}`));
  }

  warn(msg) {
    (0, _util.clearLine)(this.stderr);
    this.stderr.write(`${this.format.yellow('warning')} ${msg}\n`);
  }

  question(question, options) {
    if (options === void 0) options = {};
    if (!process.stdout.isTTY) {
      return Promise.reject(new Error("Can't answer a question unless a user TTY"));
    }

    return new Promise((resolve, reject) => {
      read(
        {
          prompt: `${this.format.dim('question')} ${question}: `,
          silent: !!options.password,
          output: this.stdout,
          input: this.stdin,
        },
        (err, answer) => {
          if (err) {
            if (err.message === 'canceled') {
              process.exitCode = 1;
            }
            reject(err);
          } else {
            if (!answer && options.required) {
              this.error(this.lang('answerRequired'));
              resolve(this.question(question, options));
            } else {
              resolve(answer);
            }
          }
        }
      );
    });
  }
  // handles basic tree output to console
  tree(key, trees, _temp3) {
    var _ref3 = _temp3 === void 0 ? {} : _temp3, _ref3$force = _ref3.force, force = _ref3$force === void 0 ? false : _ref3$force;
    this.stopProgress();
    //
    if (this.isSilent && !force) {
      return;
    }
    var output = (_ref4, titlePrefix, childrenPrefix) => {
      var name = _ref4.name, children = _ref4.children, hint = _ref4.hint, color = _ref4.color;
      var formatter = this.format;
      var out = (0, _treeHelper.getFormattedOutput)({
        prefix: titlePrefix,
        hint,
        color,
        name,
        formatter,
      });
      this.stdout.write(out);

      if (children && children.length) {
        (0, _treeHelper.recurseTree)((0, _treeHelper.sortTrees)(children), childrenPrefix, output);
      }
    };
    (0, _treeHelper.recurseTree)((0, _treeHelper.sortTrees)(trees), '', output);
  }

  activitySet(total, workers) {
    var _this2 = this;
    if (!this.isTTY || this.noProgress) {
      return super.activitySet(total, workers);
    }

    var spinners = [];
    var reporterSpinners = this._spinners;

    for (var i = 1; i < workers; i++) {
      this.log('');
    }

    var _loop2 = function(_i2) {
      var spinner = new _spinnerProgress.default(_this2.stderr, _i2);
      reporterSpinners.add(spinner);
      spinner.start();

      var prefix = null;
      var current = 0;
      var updatePrefix = () => {
        spinner.setPrefix(`${_this2.format.dim(`[${current === 0 ? '-' : current}/${total}]`)} `);
      };
      var clear = () => {
        prefix = null;
        current = 0;
        updatePrefix();
        spinner.setText('waiting...');
      };
      clear();

      spinners.unshift({
        clear,

        setPrefix(_current, _prefix) {
          current = _current;
          prefix = _prefix;
          spinner.setText(prefix);
          updatePrefix();
        },

        tick(msg) {
          if (prefix) {
            msg = `${prefix}: ${msg}`;
          }
          spinner.setText(msg);
        },

        end() {
          spinner.stop();
          reporterSpinners.delete(spinner);
        },
      });
    };
    for (var _i2 = 0; _i2 < workers; _i2++) {
      _loop2(_i2);
    }

    return {
      spinners,
      end: () => {
        for (var spinner of spinners) {
          spinner.end();
        }
        readline.moveCursor(this.stdout, 0, -workers + 1);
      },
    };
  }

  activity() {
    if (!this.isTTY) {
      return {
        tick() {},
        end() {},
      };
    }
    var reporterSpinners = this._spinners;

    var spinner = new _spinnerProgress.default(this.stderr);
    spinner.start();

    reporterSpinners.add(spinner);

    return {
      tick(name) {
        spinner.setText(name);
      },

      end() {
        spinner.stop();
        reporterSpinners.delete(spinner);
      },
    };
  }

  select(header, question, options) {
    if (!this.isTTY) {
      return Promise.reject(new Error("Can't answer a question unless a user TTY"));
    }

    var rl = readline.createInterface({
      input: this.stdin,
      output: this.stdout,
      terminal: true,
    });

    var questions = options.map((opt) => opt.name);
    var answers = options.map((opt) => opt.value);

    function toIndex(input) {
      var index = answers.indexOf(input);

      if (index >= 0) {
        return index;
      } else {
        return +input;
      }
    }

    return new Promise(resolve => {
      this.info(header);

      for (var i = 0; i < questions.length; i++) {
        this.log(`  ${this.format.dim(`${i + 1})`)} ${questions[i]}`);
      }

      var ask = () => {
        rl.question(`${question}: `, input => {
          var index = toIndex(input);

          if (isNaN(index)) {
            this.log('Not a number');
            ask();
            return;
          }

          if (index <= 0 || index > options.length) {
            this.log('Outside answer range');
            ask();
            return;
          }

          // get index
          index--;
          rl.close();
          resolve(answers[index]);
        });
      };

      ask();
    });
  }

  progress(count) {
    if (this.noProgress || count <= 0) {
      return function() {
        // noop
      };
    }

    if (!this.isTTY) {
      return function() {
        // TODO what should the behaviour here be? we could buffer progress messages maybe
      };
    }

    // Clear any potentially old progress bars
    this.stopProgress();

    var bar = (this._progressBar = new _progressBar.default(count, this.stderr, (progress) => {
      if (progress === this._progressBar) {
        this._progressBar = null;
      }
    }));

    bar.render();

    return function() {
      bar.tick();
    };
  }

  stopProgress() {
    if (this._progressBar) {
      this._progressBar.stop();
    }
  }

  prompt(message, choices, options) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      if (options === void 0) options = {};
      if (!process.stdout.isTTY) {
        return Promise.reject(new Error("Can't answer a question unless a user TTY"));
      }

      var pageSize;
      if (process.stdout instanceof tty.WriteStream) {
        pageSize = process.stdout.rows - 2;
      }

      var rl = readline.createInterface({
        input: _this3.stdin,
        output: _this3.stdout,
        terminal: true,
      });

      // $FlowFixMe: Need to update the type of Inquirer
      var prompt = inquirer.createPromptModule({
        input: _this3.stdin,
        output: _this3.stdout,
      });

      var _options = options, _options$name = _options.name, name = _options$name === void 0 ? 'prompt' : _options$name, _options$type = _options.type, type = _options$type === void 0 ? 'input' : _options$type, validate = _options.validate;
      var answers = yield prompt([{name, type, message, choices, pageSize, validate}]);

      rl.close();

      return answers[name];
    })();
  }

  auditSummary(auditMetadata) {
    var totalDependencies = auditMetadata.totalDependencies, vulnerabilities = auditMetadata.vulnerabilities;
    var totalVulnerabilities =
      vulnerabilities.info +
      vulnerabilities.low +
      vulnerabilities.moderate +
      vulnerabilities.high +
      vulnerabilities.critical;
    var summary = this.lang(
      'auditSummary',
      totalVulnerabilities > 0 ? this.rawText(chalk.red(totalVulnerabilities.toString())) : totalVulnerabilities,
      totalDependencies
    );
    this._log(summary);

    if (totalVulnerabilities) {
      var severities = [];
      if (vulnerabilities.info) {
        severities.push(this.lang('auditInfo', vulnerabilities.info));
      }
      if (vulnerabilities.low) {
        severities.push(this.lang('auditLow', vulnerabilities.low));
      }
      if (vulnerabilities.moderate) {
        severities.push(this.lang('auditModerate', vulnerabilities.moderate));
      }
      if (vulnerabilities.high) {
        severities.push(this.lang('auditHigh', vulnerabilities.high));
      }
      if (vulnerabilities.critical) {
        severities.push(this.lang('auditCritical', vulnerabilities.critical));
      }
      this._log(`${this.lang('auditSummarySeverity')} ${severities.join(' | ')}`);
    }
  }

  auditAction(recommendation) {
    var label = recommendation.action.resolves.length === 1 ? 'vulnerability' : 'vulnerabilities';
    this._log(
      this.lang(
        'auditResolveCommand',
        this.rawText(chalk.inverse(recommendation.cmd)),
        recommendation.action.resolves.length,
        this.rawText(label)
      )
    );
    if (recommendation.isBreaking) {
      this._log(this.lang('auditSemverMajorChange'));
    }
  }

  auditManualReview() {
    var tableOptions = {
      colWidths: [78],
    };
    var table = new Table(tableOptions);
    table.push([
      {
        content: this.lang('auditManualReview'),
        vAlign: 'center',
        hAlign: 'center',
      },
    ]);

    this._log(table.toString());
  }

  auditAdvisory(resolution, auditAdvisory) {
    function colorSeverity(severity, message) {
      return auditSeverityColors[severity](message || severity);
    }

    function makeAdvisoryTableRow(patchedIn) {
      var patchRows = [];

      if (patchedIn) {
        patchRows.push({'Patched in': patchedIn});
      }

      return [
        {[chalk.bold(colorSeverity(auditAdvisory.severity))]: chalk.bold(auditAdvisory.title)},
        {Package: auditAdvisory.module_name},
      ].concat(patchRows, [
        {'Dependency of': `${resolution.path.split('>')[0]} ${resolution.dev ? '[dev]' : ''}`},
        {Path: resolution.path.split('>').join(' > ')},
        {'More info': `https://www.npmjs.com/advisories/${auditAdvisory.id}`},
      ]);
    }

    var tableOptions = {
      colWidths: AUDIT_COL_WIDTHS,
      wordWrap: true,
    };
    var table = new Table(tableOptions);
    var patchedIn =
      auditAdvisory.patched_versions.replace(' ', '') === '<0.0.0'
        ? 'No patch available'
        : auditAdvisory.patched_versions;
    table.push.apply(table, makeAdvisoryTableRow(patchedIn));
    this._log(table.toString());
  }
}
exports.default = ConsoleReporter;
