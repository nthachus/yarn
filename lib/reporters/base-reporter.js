/* eslint no-unused-vars: 0 */
'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
exports.stringifyLangArgs = stringifyLangArgs;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _format = require('./format.js');
var languages = _interopRequireWildcard(require('./lang/index.js'));
var isCI = require('is-ci');
var os = require('os');

var util = require('util');
var EventEmitter = require('events').EventEmitter;

function stringifyLangArgs(args) {
  return args.map(function(val) {
    if (val != null && val.inspect) {
      return val.inspect();
    } else {
      try {
        var str = JSON.stringify(val) || val + '';
        // should match all literal line breaks and
        // "u001b" that follow an odd number of backslashes and convert them to ESC
        // we do this because the JSON.stringify process has escaped these characters
        return str
          .replace(/((?:^|[^\\])(?:\\{2})*)\\u001[bB]/g, '$1\u001b')
          .replace(/[\\]r[\\]n|([\\])?[\\]n/g, (match, precededBacklash) => {
            // precededBacklash not null when "\n" is preceded by a backlash ("\\n")
            // match will be "\\n" and we don't replace it with os.EOL
            return precededBacklash ? match : os.EOL;
          });
      } catch (e) {
        return util.inspect(val);
      }
    }
  });
}

class BaseReporter {
  constructor(opts) {
    if (opts === void 0) opts = {};
    this.formatter = void 0;
    this.isSilent = void 0;
    this.peakMemoryInterval = void 0;

    var lang = 'en';
    this.language = lang;

    this.stdout = opts.stdout || process.stdout;
    this.stderr = opts.stderr || process.stderr;
    this.stdin = opts.stdin || this._getStandardInput();
    this.emoji = !!opts.emoji;
    this.nonInteractive = !!opts.nonInteractive;
    this.noProgress = !!opts.noProgress || isCI;
    this.isVerbose = !!opts.verbose;

    // $FlowFixMe: this is valid!
    this.isTTY = this.stdout.isTTY;

    this.peakMemory = 0;
    this.startTime = Date.now();
    this.format = _format.defaultFormatter;
  }

  lang(key) {
    var msg = languages[this.language][key] || languages.en[key];
    if (!msg) {
      throw new ReferenceError(`No message defined for language key ${key}`);
    }

    // stringify args
    var args = Array.prototype.slice.call(arguments, 1);
    var stringifiedArgs = stringifyLangArgs(args);

    // replace $0 placeholders with args
    return msg.replace(/\$(\d+)/g, (str, i) => {
      return stringifiedArgs[i];
    });
  }

  /**
   * `stringifyLangArgs` run `JSON.stringify` on strings too causing
   * them to appear quoted. This marks them as "raw" and prevents
   * the quoting and escaping
   */
  rawText(str) {
    return {
      inspect() {
        return str;
      },
    };
  }

  verbose(msg) {
    if (this.isVerbose) {
      this._verbose(msg);
    }
  }

  verboseInspect(val) {
    if (this.isVerbose) {
      this._verboseInspect(val);
    }
  }

  _verbose(msg) {}
  _verboseInspect(val) {}

  _getStandardInput() {
    var standardInput;

    // Accessing stdin in a win32 headless process (e.g., Visual Studio) may throw an exception.
    try {
      standardInput = process.stdin;
    } catch (e) {
      console.warn(e.message);
      delete process.stdin;
      // $FlowFixMe: this is valid!
      process.stdin = new EventEmitter();
      standardInput = process.stdin;
    }

    return standardInput;
  }

  initPeakMemoryCounter() {
    this.checkPeakMemory();
    this.peakMemoryInterval = setInterval(() => {
      this.checkPeakMemory();
    }, 1000);
    // $FlowFixMe: Node's setInterval returns a Timeout, not a Number
    this.peakMemoryInterval.unref();
  }

  checkPeakMemory() {
    var _process$memoryUsage = process.memoryUsage(), heapTotal = _process$memoryUsage.heapTotal;
    if (heapTotal > this.peakMemory) {
      this.peakMemory = heapTotal;
    }
  }

  close() {
    if (this.peakMemoryInterval) {
      clearInterval(this.peakMemoryInterval);
      this.peakMemoryInterval = null;
    }
  }

  getTotalTime() {
    return Date.now() - this.startTime;
  }

  // TODO
  list(key, items, hints) {}

  // Outputs basic tree structure to console
  tree(key, obj, _temp) {
    var _ref = _temp === void 0 ? {} : _temp, _ref$force = _ref.force, force = _ref$force === void 0 ? false : _ref$force;
  }

  // called whenever we begin a step in the CLI.
  step(current, total, message, emoji) {}

  // a error message has been triggered. this however does not always meant an abrupt
  // program end.
  error(message) {}

  // an info message has been triggered. this provides things like stats and diagnostics.
  info(message) {}

  // a warning message has been triggered.
  warn(message) {}

  // a success message has been triggered.
  success(message) {}

  // a simple log message
  // TODO: rethink the {force} parameter. In the meantime, please don't use it (cf comments in #4143).
  log(message, _temp2) {
    var _ref2 = _temp2 === void 0 ? {} : _temp2, _ref2$force = _ref2.force, force = _ref2$force === void 0 ? false : _ref2$force;
  }

  // a shell command has been executed
  command(command) {}

  // inspect and pretty-print any value
  inspect(value) {}

  // the screen shown at the very start of the CLI
  header(command, pkg) {}

  // the screen shown at the very end of the CLI
  footer(showPeakMemory) {}

  // a table structure
  table(head, body) {}

  // security audit action to resolve advisories
  auditAction(recommendation) {}

  // security audit requires manual review
  auditManualReview() {}

  // security audit advisory
  auditAdvisory(resolution, auditAdvisory) {}

  // summary for security audit report
  auditSummary(auditMetadata) {}

  // render an activity spinner and return a function that will trigger an update
  activity() {
    return {
      tick(name) {},
      end() {},
    };
  }

  //
  activitySet(total, workers) {
    return {
      spinners: Array(workers).fill({
        clear() {},
        setPrefix() {},
        tick() {},
        end() {},
      }),
      end() {},
    };
  }

  //
  question(question, options) {
    if (options === void 0) options = {};
    return Promise.reject(new Error('Not implemented'));
  }

  //
  questionAffirm(question) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var condition = true; // trick eslint
      if (_this.nonInteractive) {
        return true;
      }

      while (condition) {
        var answer = yield _this.question(question);
        answer = answer.toLowerCase();

        if (answer === 'y' || answer === 'yes') {
          return true;
        }
        if (answer === 'n' || answer === 'no') {
          return false;
        }

        _this.error('Invalid answer for question');
      }

      return false;
    })();
  }

  // prompt the user to select an option from an array
  select(header, question, options) {
    return Promise.reject(new Error('Not implemented'));
  }

  // render a progress bar and return a function which when called will trigger an update
  progress(total) {
    return function() {};
  }

  // utility function to disable progress bar
  disableProgress() {
    this.noProgress = true;
  }

  //
  prompt(message, choices, options) {
    if (options === void 0) options = {};
    return Promise.reject(new Error('Not implemented'));
  }
}
exports.default = BaseReporter;
