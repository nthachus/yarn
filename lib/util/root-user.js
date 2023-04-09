'use strict';
exports.__esModule = true;
exports.default = void 0;
exports.isFakeRoot = isFakeRoot;
exports.isRootUser = isRootUser;

function getUid() {
  if (process.platform !== 'win32' && process.getuid) {
    return process.getuid();
  }
  return null;
}

var _default = isRootUser(getUid()) && !isFakeRoot();
exports.default = _default;

function isFakeRoot() {
  return Boolean(process.env.FAKEROOTKEY);
}

function isRootUser(uid) {
  return uid === 0;
}
