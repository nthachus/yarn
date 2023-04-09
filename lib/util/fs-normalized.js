// This module serves as a wrapper for file operations that are inconsistant across node and OS versions.

'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.unlink = exports.fileDatesEqual = exports.copyFile = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var fs = require('fs');
var _promise = require('./promise.js');

var _fs = require('./fs');

var disableTimestampCorrection = undefined; // OS dependent. will be detected on first file copy.

var readFileBuffer = (0, _promise.promisify)(fs.readFile);
var close = (0, _promise.promisify)(fs.close);
var lstat = (0, _promise.promisify)(fs.lstat);
var open = (0, _promise.promisify)(fs.open);
var futimes = (0, _promise.promisify)(fs.futimes);

var write = (0, _promise.promisify)(fs.write);

var unlink = (0, _promise.promisify)(require('rimraf'));
exports.unlink = unlink;

/**
 * Unlinks the destination to force a recreation. This is needed on case-insensitive file systems
 * to force the correct naming when the filename has changed only in character-casing. (Jest -> jest).
 */
var copyFile = /*#__PURE__*/ (function() {
  var _ref = (0, _asyncToGenerator2.default)(function* (data, cleanup) {
    // $FlowFixMe: Flow doesn't currently support COPYFILE_FICLONE
    var ficloneFlag = _fs.constants.COPYFILE_FICLONE || 0;
    try {
      yield unlink(data.dest);
      yield copyFilePoly(data.src, data.dest, ficloneFlag, data);
    } finally {
      if (cleanup) {
        cleanup();
      }
    }
  });

  return function copyFile() {
    return _ref.apply(this, arguments);
  };
})();
exports.copyFile = copyFile;

// Node 8.5.0 introduced `fs.copyFile` which is much faster, so use that when available.
// Otherwise we fall back to reading and writing files as buffers.
var copyFilePoly = (
  src,
  dest,
  flags,
  data
) => {
  if (fs.copyFile) {
    return new Promise((resolve, reject) =>
      fs.copyFile(src, dest, flags, err => {
        if (err) {
          reject(err);
        } else {
          fixTimes(undefined, dest, data).then(() => resolve()).catch(ex => reject(ex));
        }
      })
    );
  } else {
    return copyWithBuffer(src, dest, flags, data);
  }
};

var copyWithBuffer = /*#__PURE__*/ (function() {
  var _ref2 = (0, _asyncToGenerator2.default)(function* (
    src,
    dest,
    flags,
    data
  ) {
    // Use open -> write -> futimes -> close sequence to avoid opening the file twice:
    // one with writeFile and one with utimes
    var fd = yield open(dest, 'w', data.mode);
    try {
      var buffer = yield readFileBuffer(src);
      yield write(fd, buffer, 0, buffer.length);
      yield fixTimes(fd, dest, data);
    } finally {
      yield close(fd);
    }
  });

  return function copyWithBuffer() {
    return _ref2.apply(this, arguments);
  };
})();

// We want to preserve file timestamps when copying a file, since yarn uses them to decide if a file has
// changed compared to the cache.
// There are some OS specific cases here:
// * On linux, fs.copyFile does not preserve timestamps, but does on OSX and Win.
// * On windows, you must open a file with write permissions to call `fs.futimes`.
// * On OSX you can open with read permissions and still call `fs.futimes`.
function fixTimes() {
  return _fixTimes.apply(this, arguments);
}
function _fixTimes() {
  _fixTimes = (0, _asyncToGenerator2.default)(function* (fd, dest, data) {
    var doOpen = fd === undefined;
    var openfd = fd ? fd : -1;

    if (disableTimestampCorrection === undefined) {
      // if timestamps match already, no correction is needed.
      // the need to correct timestamps varies based on OS and node versions.
      var destStat = yield lstat(dest);
      disableTimestampCorrection = fileDatesEqual(destStat.mtime, data.mtime);
    }

    if (disableTimestampCorrection) {
      return;
    }

    if (doOpen) {
      try {
        openfd = yield open(dest, 'a', data.mode);
      } catch (er) {
        // file is likely read-only
        try {
          openfd = yield open(dest, 'r', data.mode);
        } catch (err) {
          // We can't even open this file for reading.
          return;
        }
      }
    }

    try {
      if (openfd) {
        yield futimes(openfd, data.atime, data.mtime);
      }
    } catch (er) {
      // If `futimes` throws an exception, we probably have a case of a read-only file on Windows.
      // In this case we can just return. The incorrect timestamp will just cause that file to be recopied
      // on subsequent installs, which will effect yarn performance but not break anything.
    } finally {
      if (doOpen && openfd) {
        yield close(openfd);
      }
    }
  });

  return _fixTimes.apply(this, arguments);
}

// Compare file timestamps.
// Some versions of Node on windows zero the milliseconds when utime is used.
var fileDatesEqual = (a, b) => {
  var aTime = a.getTime();
  var bTime = b.getTime();

  if (process.platform !== 'win32') {
    return aTime === bTime;
  }

  // See https://github.com/nodejs/node/pull/12607
  // Submillisecond times from stat and utimes are truncated on Windows,
  // causing a file with mtime 8.0079998 and 8.0081144 to become 8.007 and 8.008
  // and making it impossible to update these files to their correct timestamps.
  if (Math.abs(aTime - bTime) <= 1) {
    return true;
  }

  var aTimeSec = Math.floor(aTime / 1000);
  var bTimeSec = Math.floor(bTime / 1000);

  // See https://github.com/nodejs/node/issues/2069
  // Some versions of Node on windows zero the milliseconds when utime is used
  // So if any of the time has a milliseconds part of zero we suspect that the
  // bug is present and compare only seconds.
  if (aTime - aTimeSec * 1000 === 0 || bTime - bTimeSec * 1000 === 0) {
    return aTimeSec === bTimeSec;
  }

  return aTime === bTime;
};
exports.fileDatesEqual = fileDatesEqual;
