'use strict';
exports.__esModule = true;
exports.default = void 0;

var lockPromises = new Map();

/**
 * Acquires a mutex lock over the given key. If the lock can't be acquired, it waits until it's available.
 * @param key Key to get the lock for.
 * @return {Promise.<Function>} A Promise that resolves when the lock is acquired, with the function that
 * must be called to release the lock.
 */
var _default = (key) => {
  var unlockNext;
  var willLock = new Promise(resolve => (unlockNext = resolve));
  var lockPromise = lockPromises.get(key) || Promise.resolve();
  var willUnlock = lockPromise.then(() => unlockNext);
  lockPromises.set(key, lockPromise.then(() => willLock));
  return willUnlock;
};
exports.default = _default;
