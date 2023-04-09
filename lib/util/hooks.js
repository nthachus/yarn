'use strict';
exports.__esModule = true;
exports.callThroughHook = callThroughHook;

var YARN_HOOKS_KEY = 'experimentalYarnHooks';

function callThroughHook(type, fn, context) {
  if (typeof global === 'undefined') {
    return fn();
  }

  if (typeof global[YARN_HOOKS_KEY] !== 'object' || !global[YARN_HOOKS_KEY]) {
    return fn();
  }

  var hook = global[YARN_HOOKS_KEY][type];

  if (!hook) {
    return fn();
  }

  return hook(fn, context);
}
