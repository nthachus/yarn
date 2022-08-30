'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.readFile = readFile;
exports.readFileRaw = readFileRaw;
exports.readFileAny = readFileAny;
exports.readJson = readJson;
exports.readJsonAndFile = readJsonAndFile;
exports.getFileSizeOnDisk = getFileSizeOnDisk;
exports.normalizeOS = normalizeOS;
exports.lstat = exports.exists = exports.constants = void 0;

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
var _fs = _interopRequireDefault(require('fs'));
var _map = _interopRequireDefault(require('./map.js'));
var _stripBOM = _interopRequireDefault(require('strip-bom'));

var constants =
  typeof _fs.default.constants !== 'undefined'
    ? _fs.default.constants
    : {
        R_OK: _fs.default.R_OK,
        W_OK: _fs.default.W_OK,
        X_OK: _fs.default.X_OK,
      };
exports.constants = constants;

var exists = _fs.default.existsSync;
exports.exists = exists;
var lstat = _fs.default.lstatSync;
exports.lstat = lstat;

var _readFile = _fs.default.readFileSync;

function readFile(loc) {
  return normalizeOS(_readFile(loc, 'utf8'));
}

function readFileRaw(loc) {
  return _readFile(loc, 'binary');
}

function readFileAny(files) {
  for (var file of files) {
    if (exists(file)) {
      return readFile(file);
    }
  }
  return null;
}

function readJson(loc) {
  return readJsonAndFile(loc).object;
}

function readJsonAndFile(loc) {
  var file = readFile(loc);
  try {
    return {
      object: (0, _map.default)(JSON.parse((0, _stripBOM.default)(file))),
      content: file,
    };
  } catch (err) {
    err.message = `${loc}: ${err.message}`;
    throw err;
  }
}

function getFileSizeOnDisk(loc) {
  var stat = lstat(loc);
  var size = stat.size, blockSize = stat.blksize;

  return Math.ceil(size / blockSize) * blockSize;
}

function normalizeOS(body) {
  return body.replace(/\r\n/g, '\n');
}
