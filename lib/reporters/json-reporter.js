'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));

var _baseReporter = _interopRequireDefault(require('./base-reporter.js'));

class JSONReporter extends _baseReporter.default {
  constructor(opts) {
    super(opts);

    this._activityId = 0;
    this._progressId = 0;
  }

  _dump(type, data, error) {
    var stdout = this.stdout;
    if (error) {
      stdout = this.stderr;
    }
    stdout.write(`${JSON.stringify({type, data})}\n`);
  }

  _verbose(msg) {
    this._dump('verbose', msg);
  }

  list(type, items, hints) {
    this._dump('list', {type, items, hints});
  }

  tree(type, trees) {
    this._dump('tree', {type, trees});
  }

  step(current, total, message) {
    this._dump('step', {message, current, total});
  }

  inspect(value) {
    this._dump('inspect', value);
  }

  footer(showPeakMemory) {
    this._dump('finished', this.getTotalTime());
  }

  log(msg) {
    this._dump('log', msg);
  }

  command(msg) {
    this._dump('command', msg);
  }

  table(head, body) {
    this._dump('table', {head, body});
  }

  success(msg) {
    this._dump('success', msg);
  }

  error(msg) {
    this._dump('error', msg, true);
  }

  warn(msg) {
    this._dump('warning', msg, true);
  }

  info(msg) {
    this._dump('info', msg);
  }

  activitySet(total, workers) {
    var _this = this;
    if (!this.isTTY || this.noProgress) {
      return super.activitySet(total, workers);
    }

    var id = this._activityId++;
    this._dump('activitySetStart', {id, total, workers});

    var spinners = [];
    var _loop = function(i) {
      var current = 0;
      var header = '';

      spinners.push({
        clear() {},
        setPrefix(_current, _header) {
          current = _current;
          header = _header;
        },
        tick: msg => {
          _this._dump('activitySetTick', {
            id,
            header,
            current,
            worker: i,
            message: msg,
          });
        },
        end() {},
      });
    };
    for (var i = 0; i < workers; i++) {
      _loop(i);
    }

    return {
      spinners,
      end: () => {
        this._dump('activitySetEnd', {id});
      },
    };
  }

  activity() {
    return this._activity({});
  }

  _activity(data) {
    if (!this.isTTY || this.noProgress) {
      return {
        tick() {},
        end() {},
      };
    }

    var id = this._activityId++;
    this._dump('activityStart', (0, _extends2.default)({id}, data));

    return {
      tick: (name) => {
        this._dump('activityTick', {id, name});
      },

      end: () => {
        this._dump('activityEnd', {id});
      },
    };
  }

  progress(total) {
    if (this.noProgress) {
      return function() {
        // noop
      };
    }

    var id = this._progressId++;
    var current = 0;
    this._dump('progressStart', {id, total});

    return () => {
      current++;
      this._dump('progressTick', {id, current});

      if (current === total) {
        this._dump('progressFinish', {id});
      }
    };
  }

  auditAction(recommendation) {
    this._dump('auditAction', recommendation);
  }

  auditAdvisory(resolution, auditAdvisory) {
    this._dump('auditAdvisory', {resolution, advisory: auditAdvisory});
  }

  auditSummary(auditMetadata) {
    this._dump('auditSummary', auditMetadata);
  }
}
exports.default = JSONReporter;
