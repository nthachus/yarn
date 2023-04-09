'use strict';
exports.__esModule = true;
exports.clearLine = clearLine;
exports.clearNthLine = clearNthLine;
exports.toStartOfLine = toStartOfLine;
exports.writeOnNthLine = writeOnNthLine;

var tty = require('tty');

var readline = require('readline');
var _require = require('chalk'), supportsColor = _require.supportsColor;

var CLEAR_WHOLE_LINE = 0;
var CLEAR_RIGHT_OF_CURSOR = 1;

function clearLine(stdout) {
  if (!supportsColor) {
    if (stdout instanceof tty.WriteStream) {
      if (stdout.columns > 0) {
        stdout.write(`\r${' '.repeat(stdout.columns - 1)}`);
      }
      stdout.write(`\r`);
    }
    return;
  }

  readline.clearLine(stdout, CLEAR_WHOLE_LINE);
  readline.cursorTo(stdout, 0);
}

function toStartOfLine(stdout) {
  if (!supportsColor) {
    stdout.write('\r');
    return;
  }

  readline.cursorTo(stdout, 0);
}

function writeOnNthLine(stdout, n, msg) {
  if (!supportsColor) {
    return;
  }

  if (n == 0) {
    readline.cursorTo(stdout, 0);
    stdout.write(msg);
    readline.clearLine(stdout, CLEAR_RIGHT_OF_CURSOR);
    return;
  }
  readline.cursorTo(stdout, 0);
  readline.moveCursor(stdout, 0, -n);
  stdout.write(msg);
  readline.clearLine(stdout, CLEAR_RIGHT_OF_CURSOR);
  readline.cursorTo(stdout, 0);
  readline.moveCursor(stdout, 0, n);
}

function clearNthLine(stdout, n) {
  if (!supportsColor) {
    return;
  }

  if (n == 0) {
    clearLine(stdout);
    return;
  }
  readline.cursorTo(stdout, 0);
  readline.moveCursor(stdout, 0, -n);
  readline.clearLine(stdout, CLEAR_WHOLE_LINE);
  readline.moveCursor(stdout, 0, n);
}
