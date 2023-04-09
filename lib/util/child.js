/* global child_process$spawnOpts */
'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
exports.__esModule = true;
exports.exec = void 0;
exports.forkp = forkp;
exports.forwardSignalToSpawnedProcesses = forwardSignalToSpawnedProcesses;
exports.queue = void 0;
exports.spawn = spawn;
exports.spawnp = spawnp;

var constants = _interopRequireWildcard(require('../constants.js'));
var _blockingQueue = _interopRequireDefault(require('./blocking-queue.js'));
var _errors = require('../errors.js');
var _promise = require('./promise.js');

var child = require('child_process');
var fs = require('fs');
var path = require('path');

var queue = new _blockingQueue.default('child', constants.CHILD_CONCURRENCY);
exports.queue = queue;

// TODO: this uid check is kinda whack
var uid = 0;

var exec = (0, _promise.promisify)(child.exec);
exports.exec = exec;

function validate(program, opts) {
  if (opts === void 0) opts = {};
  if (program.match(/[\\\/]/)) {
    return;
  }

  if (process.platform === 'win32' && process.env.PATHEXT) {
    var cwd = opts.cwd || process.cwd();
    var pathext = process.env.PATHEXT;

    for (var ext of pathext.split(';')) {
      var candidate = path.join(cwd, `${program}${ext}`);
      if (fs.existsSync(candidate)) {
        throw new Error(`Potentially dangerous call to "${program}" in ${cwd}`);
      }
    }
  }
}

function forkp(program, args, opts) {
  validate(program, opts);
  var key = String(++uid);
  return new Promise((resolve, reject) => {
    var proc = child.fork(program, args, opts);
    spawnedProcesses[key] = proc;

    proc.on('error', error => {
      reject(error);
    });

    proc.on('close', exitCode => {
      resolve(exitCode);
    });
  });
}

function spawnp(program, args, opts) {
  validate(program, opts);
  var key = String(++uid);
  return new Promise((resolve, reject) => {
    var proc = child.spawn(program, args, opts);
    spawnedProcesses[key] = proc;

    proc.on('error', error => {
      reject(error);
    });

    proc.on('close', exitCode => {
      resolve(exitCode);
    });
  });
}

var spawnedProcesses = {};

function forwardSignalToSpawnedProcesses(signal) {
  for (var key of Object.keys(spawnedProcesses)) {
    spawnedProcesses[key].kill(signal);
  }
}

function spawn(
  program,
  args,
  opts,
  onData
) {
  if (opts === void 0) opts = {};
  var key = opts.cwd || String(++uid);
  return queue.push(
    key,
    () =>
      new Promise((resolve, reject) => {
        validate(program, opts);

        var proc = child.spawn(program, args, opts);
        spawnedProcesses[key] = proc;

        var processingDone = false;
        var processClosed = false;
        var err = null;

        var stdout = '';

        proc.on('error', err => {
          if (err.code === 'ENOENT') {
            reject(new _errors.ProcessSpawnError(`Couldn't find the binary ${program}`, err.code, program));
          } else {
            reject(err);
          }
        });

        function updateStdout(chunk) {
          stdout += chunk;
          if (onData) {
            onData(chunk);
          }
        }

        function finish() {
          delete spawnedProcesses[key];
          if (err) {
            reject(err);
          } else {
            resolve(stdout.trim());
          }
        }

        if (typeof opts.process === 'function') {
          opts.process(proc, updateStdout, reject, function() {
            if (processClosed) {
              finish();
            } else {
              processingDone = true;
            }
          });
        } else {
          if (proc.stderr) {
            proc.stderr.on('data', updateStdout);
          }

          if (proc.stdout) {
            proc.stdout.on('data', updateStdout);
          }

          processingDone = true;
        }

        proc.on('close', (code, signal) => {
          if (signal || code >= 1) {
            err = new _errors.ProcessTermError(
              [
                'Command failed.',
                signal ? `Exit signal: ${signal}` : `Exit code: ${code}`,
                `Command: ${program}`,
                `Arguments: ${args.join(' ')}`,
                `Directory: ${opts.cwd || process.cwd()}`,
                `Output:\n${stdout.trim()}`,
              ].join('\n')
            );
            err.EXIT_SIGNAL = signal;
            err.EXIT_CODE = code;
          }

          if (processingDone || err) {
            finish();
          } else {
            processClosed = true;
          }
        });
      })
  );
}
