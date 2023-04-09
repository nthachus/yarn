'use strict';
exports.__esModule = true;
exports.default = handleSignals;

var _child = require('./child.js');

function forwardSignalAndExit(signal) {
  (0, _child.forwardSignalToSpawnedProcesses)(signal);
  // We want to exit immediately here since `SIGTERM` means that
  // If we lose stdout messages due to abrupt exit, shoot the messenger?
  process.exit(1); // eslint-disable-line no-process-exit
}

function handleSignals() {
  process.on('SIGTERM', () => {
    forwardSignalAndExit('SIGTERM');
  });
}
