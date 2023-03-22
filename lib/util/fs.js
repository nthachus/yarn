'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.exists = exports.constants = void 0;
exports.getFileSizeOnDisk = getFileSizeOnDisk;
exports.lstat = void 0;
exports.normalizeOS = normalizeOS;
exports.readFile = readFile;
exports.readFileAny = readFileAny;
exports.readFileRaw = readFileRaw;
exports.readJson = readJson;
exports.readJsonAndFile = readJsonAndFile;

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
var _map = _interopRequireDefault(require('./map.js'));

var fs = require('fs');
var stripBOM = require('strip-bom');

var constants =
  typeof fs.constants !== 'undefined'
    ? fs.constants
    : {
        R_OK: fs.R_OK,
        W_OK: fs.W_OK,
        X_OK: fs.X_OK,
      };
exports.constants = constants;

var exists = fs.existsSync;
exports.exists = exists;
var lstat = fs.lstatSync;
exports.lstat = lstat;

var _readFile = fs.readFileSync;

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
      object: (0, _map.default)(JSON.parse(stripBOM(file))),
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
