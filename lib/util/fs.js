'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.constants = exports.chmod = exports.access = void 0;
exports.copy = copy;
exports.copyBulk = copyBulk;
exports.exists = void 0;
exports.find = find;
exports.getFileSizeOnDisk = getFileSizeOnDisk;
exports.getFirstSuitableFolder = getFirstSuitableFolder;
exports.glob = void 0;
exports.hardlinkBulk = hardlinkBulk;
exports.hardlinksWork = hardlinksWork;
exports.lstat = exports.lockQueue = exports.link = void 0;
exports.makeTempDir = makeTempDir;
exports.mkdirp = void 0;
exports.normalizeOS = normalizeOS;
exports.open = void 0;
exports.readFile = readFile;
exports.readFileAny = readFileAny;
exports.readFileBuffer = void 0;
exports.readFileRaw = readFileRaw;
exports.readFirstAvailableStream = readFirstAvailableStream;
exports.readJson = readJson;
exports.readJsonAndFile = readJsonAndFile;
exports.stat = exports.rename = exports.realpath = exports.readlink = exports.readdir = void 0;
exports.symlink = symlink;
exports.walk = walk;
exports.writeFile = void 0;
exports.writeFilePreservingEol = writeFilePreservingEol;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var fs = require('fs');
var globModule = require('glob');
var os = require('os');
var path = require('path');

var _blockingQueue = _interopRequireDefault(require('./blocking-queue.js'));
var promise = _interopRequireWildcard(require('./promise.js'));
var _map = _interopRequireDefault(require('./map.js'));
var _fsNormalized = require('./fs-normalized.js');

var constants =
  typeof fs.constants !== 'undefined'
    ? fs.constants
    : {
        R_OK: fs.R_OK,
        W_OK: fs.W_OK,
        X_OK: fs.X_OK,
      };
exports.constants = constants;

var lockQueue = new _blockingQueue.default('fs lock');
exports.lockQueue = lockQueue;

var readFileBuffer = (0, promise.promisify)(fs.readFile);
exports.readFileBuffer = readFileBuffer;
var open = (0, promise.promisify)(fs.open);
exports.open = open;
var writeFile = (0, promise.promisify)(fs.writeFile);
exports.writeFile = writeFile;

var readlink = (0, promise.promisify)(fs.readlink);
exports.readlink = readlink;
var realpath = (0, promise.promisify)(fs.realpath);
exports.realpath = realpath;
var readdir = (0, promise.promisify)(fs.readdir);
exports.readdir = readdir;
var rename = (0, promise.promisify)(fs.rename);
exports.rename = rename;
var access = (0, promise.promisify)(fs.access);
exports.access = access;
var stat = (0, promise.promisify)(fs.stat);
exports.stat = stat;
var mkdirp = (0, promise.promisify)(require('mkdirp'));
exports.mkdirp = mkdirp;
var exists = (0, promise.promisify)(fs.exists, true);
exports.exists = exists;
var lstat = (0, promise.promisify)(fs.lstat);
exports.lstat = lstat;
var chmod = (0, promise.promisify)(fs.chmod);
exports.chmod = chmod;
var link = (0, promise.promisify)(fs.link);
exports.link = link;
var glob = (0, promise.promisify)(globModule);
exports.glob = glob;
exports.unlink = _fsNormalized.unlink;

// fs.copyFile uses the native file copying instructions on the system, performing much better
// than any JS-based solution and consumes fewer resources. Repeated testing to fine tune the
// concurrency level revealed 128 as the sweet spot on a quad-core, 16 CPU Intel system with SSD.
var CONCURRENT_QUEUE_ITEMS = fs.copyFile ? 128 : 4;

var fsSymlink = (0, promise.promisify)(fs.symlink);

var invariant = require('invariant');
var stripBOM = require('strip-bom');

var noop = () => {};

function buildActionsForCopy() {
  return _buildActionsForCopy.apply(this, arguments);
}
function _buildActionsForCopy() {
  _buildActionsForCopy = (0, _asyncToGenerator2.default)(function* (
    queue,
    events,
    possibleExtraneous,
    reporter
  ) {
    var artifactFiles = new Set(events.artifactFiles || []);
    var files = new Set();

    // initialise events
    var _loop = function(item) {
      var onDone = item.onDone;
      item.onDone = () => {
        events.onProgress(item.dest);
        if (onDone) {
          onDone();
        }
      };
    };
    for (var item of queue) {
      _loop(item);
    }
    events.onStart(queue.length);

    // start building actions
    var actions = {
      file: [],
      symlink: [],
      link: [],
    };

    // custom concurrency logic as we're always executing stacks of CONCURRENT_QUEUE_ITEMS queue items
    // at a time due to the requirement to push items onto the queue
    while (queue.length) {
      var items = queue.splice(0, CONCURRENT_QUEUE_ITEMS);
      yield Promise.all(items.map(build));
    }

    // simulate the existence of some files to prevent considering them extraneous
    for (var file of artifactFiles) {
      if (possibleExtraneous.has(file)) {
        reporter.verbose(reporter.lang('verboseFilePhantomExtraneous', file));
        possibleExtraneous.delete(file);
      }
    }

    for (var loc of possibleExtraneous) {
      if (files.has(loc.toLowerCase())) {
        possibleExtraneous.delete(loc);
      }
    }

    return actions;

    //
    function build() {
      return _build.apply(this, arguments);
    }
    function _build() {
      _build = (0, _asyncToGenerator2.default)(function* (data) {
        var src = data.src, dest = data.dest, type = data.type;
        var onFresh = data.onFresh || noop;
        var onDone = data.onDone || noop;

        // TODO https://github.com/yarnpkg/yarn/issues/3751
        // related to bundled dependencies handling
        if (files.has(dest.toLowerCase())) {
          reporter.verbose(`The case-insensitive file ${dest} shouldn't be copied twice in one bulk copy`);
        } else {
          files.add(dest.toLowerCase());
        }

        if (type === 'symlink') {
          yield mkdirp(path.dirname(dest));
          onFresh();
          actions.symlink.push({
            dest,
            linkname: src,
          });
          onDone();
          return;
        }

        if (events.ignoreBasenames.indexOf(path.basename(src)) >= 0) {
          // ignored file
          return;
        }

        var srcStat = yield lstat(src);
        var srcFiles;

        if (srcStat.isDirectory()) {
          srcFiles = yield readdir(src);
        }

        var destStat;
        try {
          // try accessing the destination
          destStat = yield lstat(dest);
        } catch (e) {
          // proceed if destination doesn't exist, otherwise error
          if (e.code !== 'ENOENT') {
            throw e;
          }
        }

        // if destination exists
        if (destStat) {
          var bothSymlinks = srcStat.isSymbolicLink() && destStat.isSymbolicLink();
          var bothFolders = srcStat.isDirectory() && destStat.isDirectory();
          var bothFiles = srcStat.isFile() && destStat.isFile();

          // EINVAL access errors sometimes happen which shouldn't because node shouldn't be giving
          // us modes that aren't valid. investigate this, it's generally safe to proceed.

          /* if (srcStat.mode !== destStat.mode) {
            try {
              await access(dest, srcStat.mode);
            } catch (err) {}
          } */

          if (bothFiles && artifactFiles.has(dest)) {
            // this file gets changed during build, likely by a custom install script. Don't bother checking it.
            onDone();
            reporter.verbose(reporter.lang('verboseFileSkipArtifact', src));
            return;
          }

          if (bothFiles && srcStat.size === destStat.size && (0, _fsNormalized.fileDatesEqual)(srcStat.mtime, destStat.mtime)) {
            // we can safely assume this is the same file
            onDone();
            reporter.verbose(reporter.lang('verboseFileSkip', src, dest, srcStat.size, +srcStat.mtime));
            return;
          }

          if (bothSymlinks) {
            var srcReallink = yield readlink(src);
            if (srcReallink === (yield readlink(dest))) {
              // if both symlinks are the same then we can continue on
              onDone();
              reporter.verbose(reporter.lang('verboseFileSkipSymlink', src, dest, srcReallink));
              return;
            }
          }

          if (bothFolders) {
            // mark files that aren't in this folder as possibly extraneous
            var destFiles = yield readdir(dest);
            invariant(srcFiles, 'src files not initialised');

            for (var _file of destFiles) {
              if (srcFiles.indexOf(_file) < 0) {
                var _loc = path.join(dest, _file);
                possibleExtraneous.add(_loc);

                if ((yield lstat(_loc)).isDirectory()) {
                  for (var _file2 of yield readdir(_loc)) {
                    possibleExtraneous.add(path.join(_loc, _file2));
                  }
                }
              }
            }
          }
        }

        if (destStat && destStat.isSymbolicLink()) {
          yield (0, _fsNormalized.unlink)(dest);
          destStat = null;
        }

        if (srcStat.isSymbolicLink()) {
          onFresh();
          var linkname = yield readlink(src);
          actions.symlink.push({
            dest,
            linkname,
          });
          onDone();
        } else if (srcStat.isDirectory()) {
          yield* (function* () {
            if (!destStat) {
              reporter.verbose(reporter.lang('verboseFileFolder', dest));
              yield mkdirp(dest);
            }

            var destParts = dest.split(path.sep);
            while (destParts.length) {
              files.add(destParts.join(path.sep).toLowerCase());
              destParts.pop();
            }

            // push all files to queue
            invariant(srcFiles, 'src files not initialised');
            var remaining = srcFiles.length;
            if (!remaining) {
              onDone();
            }
            for (var _file3 of srcFiles) {
              queue.push({
                dest: path.join(dest, _file3),
                onFresh,
                onDone: () => {
                  if (--remaining === 0) {
                    onDone();
                  }
                },
                src: path.join(src, _file3),
              });
            }
          })();
        } else if (srcStat.isFile()) {
          onFresh();
          actions.file.push({
            src,
            dest,
            atime: srcStat.atime,
            mtime: srcStat.mtime,
            mode: srcStat.mode,
          });
          onDone();
        } else {
          throw new Error(`unsure how to copy this: ${src}`);
        }
      });

      return _build.apply(this, arguments);
    }
  });

  return _buildActionsForCopy.apply(this, arguments);
}

function buildActionsForHardlink() {
  return _buildActionsForHardlink.apply(this, arguments);
}
function _buildActionsForHardlink() {
  _buildActionsForHardlink = (0, _asyncToGenerator2.default)(function* (
    queue,
    events,
    possibleExtraneous,
    reporter
  ) {
    var artifactFiles = new Set(events.artifactFiles || []);
    var files = new Set();

    // initialise events
    var _loop2 = function(item) {
      var onDone = item.onDone || noop;
      item.onDone = () => {
        events.onProgress(item.dest);
        onDone();
      };
    };
    for (var item of queue) {
      _loop2(item);
    }
    events.onStart(queue.length);

    // start building actions
    var actions = {
      file: [],
      symlink: [],
      link: [],
    };

    // custom concurrency logic as we're always executing stacks of CONCURRENT_QUEUE_ITEMS queue items
    // at a time due to the requirement to push items onto the queue
    while (queue.length) {
      var items = queue.splice(0, CONCURRENT_QUEUE_ITEMS);
      yield Promise.all(items.map(build));
    }

    // simulate the existence of some files to prevent considering them extraneous
    for (var file of artifactFiles) {
      if (possibleExtraneous.has(file)) {
        reporter.verbose(reporter.lang('verboseFilePhantomExtraneous', file));
        possibleExtraneous.delete(file);
      }
    }

    for (var loc of possibleExtraneous) {
      if (files.has(loc.toLowerCase())) {
        possibleExtraneous.delete(loc);
      }
    }

    return actions;

    //
    function build() {
      return _build2.apply(this, arguments);
    }
    function _build2() {
      _build2 = (0, _asyncToGenerator2.default)(function* (data) {
        var src = data.src, dest = data.dest;
        var onFresh = data.onFresh || noop;
        var onDone = data.onDone || noop;
        if (files.has(dest.toLowerCase())) {
          // Fixes issue https://github.com/yarnpkg/yarn/issues/2734
          // When bulk hardlinking we have A -> B structure that we want to hardlink to A1 -> B1,
          // package-linker passes that modules A1 and B1 need to be hardlinked,
          // the recursive linking algorithm of A1 ends up scheduling files in B1 to be linked twice which will case
          // an exception.
          onDone();
          return;
        }
        files.add(dest.toLowerCase());

        if (events.ignoreBasenames.indexOf(path.basename(src)) >= 0) {
          // ignored file
          return;
        }

        var srcStat = yield lstat(src);
        var srcFiles;

        if (srcStat.isDirectory()) {
          srcFiles = yield readdir(src);
        }

        var destExists = yield exists(dest);
        if (destExists) {
          var destStat = yield lstat(dest);

          var bothSymlinks = srcStat.isSymbolicLink() && destStat.isSymbolicLink();
          var bothFolders = srcStat.isDirectory() && destStat.isDirectory();
          var bothFiles = srcStat.isFile() && destStat.isFile();

          if (srcStat.mode !== destStat.mode) {
            try {
              yield access(dest, srcStat.mode);
            } catch (err) {
              // EINVAL access errors sometimes happen which shouldn't because node shouldn't be giving
              // us modes that aren't valid. investigate this, it's generally safe to proceed.
              reporter.verbose(err);
            }
          }

          if (bothFiles && artifactFiles.has(dest)) {
            // this file gets changed during build, likely by a custom install script. Don't bother checking it.
            onDone();
            reporter.verbose(reporter.lang('verboseFileSkipArtifact', src));
            return;
          }

          // correct hardlink
          if (bothFiles && srcStat.ino !== null && srcStat.ino === destStat.ino) {
            onDone();
            reporter.verbose(reporter.lang('verboseFileSkip', src, dest, srcStat.ino));
            return;
          }

          if (bothSymlinks) {
            var srcReallink = yield readlink(src);
            if (srcReallink === (yield readlink(dest))) {
              // if both symlinks are the same then we can continue on
              onDone();
              reporter.verbose(reporter.lang('verboseFileSkipSymlink', src, dest, srcReallink));
              return;
            }
          }

          if (bothFolders) {
            // mark files that aren't in this folder as possibly extraneous
            var destFiles = yield readdir(dest);
            invariant(srcFiles, 'src files not initialised');

            for (var _file4 of destFiles) {
              if (srcFiles.indexOf(_file4) < 0) {
                var _loc2 = path.join(dest, _file4);
                possibleExtraneous.add(_loc2);

                if ((yield lstat(_loc2)).isDirectory()) {
                  for (var _file5 of yield readdir(_loc2)) {
                    possibleExtraneous.add(path.join(_loc2, _file5));
                  }
                }
              }
            }
          }
        }

        if (srcStat.isSymbolicLink()) {
          onFresh();
          var linkname = yield readlink(src);
          actions.symlink.push({
            dest,
            linkname,
          });
          onDone();
        } else if (srcStat.isDirectory()) {
          yield* (function* () {
            reporter.verbose(reporter.lang('verboseFileFolder', dest));
            yield mkdirp(dest);

            var destParts = dest.split(path.sep);
            while (destParts.length) {
              files.add(destParts.join(path.sep).toLowerCase());
              destParts.pop();
            }

            // push all files to queue
            invariant(srcFiles, 'src files not initialised');
            var remaining = srcFiles.length;
            if (!remaining) {
              onDone();
            }
            for (var _file6 of srcFiles) {
              queue.push({
                onFresh,
                src: path.join(src, _file6),
                dest: path.join(dest, _file6),
                onDone: () => {
                  if (--remaining === 0) {
                    onDone();
                  }
                },
              });
            }
          })();
        } else if (srcStat.isFile()) {
          onFresh();
          actions.link.push({
            src,
            dest,
            removeDest: destExists,
          });
          onDone();
        } else {
          throw new Error(`unsure how to copy this: ${src}`);
        }
      });

      return _build2.apply(this, arguments);
    }
  });

  return _buildActionsForHardlink.apply(this, arguments);
}

function copy(src, dest, reporter) {
  return copyBulk([{src, dest}], reporter);
}

function copyBulk() {
  return _copyBulk.apply(this, arguments);
}
function _copyBulk() {
  _copyBulk = (0, _asyncToGenerator2.default)(function* (
    queue,
    reporter,
    _events
  ) {
    var events = {
      onStart: (_events && _events.onStart) || noop,
      onProgress: (_events && _events.onProgress) || noop,
      possibleExtraneous: _events ? _events.possibleExtraneous : new Set(),
      ignoreBasenames: (_events && _events.ignoreBasenames) || [],
      artifactFiles: (_events && _events.artifactFiles) || [],
    };

    var actions = yield buildActionsForCopy(queue, events, events.possibleExtraneous, reporter);
    events.onStart(actions.file.length + actions.symlink.length + actions.link.length);

    var fileActions = actions.file;

    var currentlyWriting = new Map();

    yield promise.queue(
      fileActions,
      /*#__PURE__*/ (function() {
        var _ref = (0, _asyncToGenerator2.default)(function* (data) {
          var writePromise;
          while ((writePromise = currentlyWriting.get(data.dest))) {
            yield writePromise;
          }

          reporter.verbose(reporter.lang('verboseFileCopy', data.src, data.dest));
          var copier = (0, _fsNormalized.copyFile)(data, () => currentlyWriting.delete(data.dest));
          currentlyWriting.set(data.dest, copier);
          events.onProgress(data.dest);
          return copier;
        });

        return function() {
          return _ref.apply(this, arguments);
        };
      })(),
      CONCURRENT_QUEUE_ITEMS
    );

    // we need to copy symlinks last as they could reference files we were copying
    var symlinkActions = actions.symlink;
    yield promise.queue(symlinkActions, (data) => {
      var linkname = path.resolve(path.dirname(data.dest), data.linkname);
      reporter.verbose(reporter.lang('verboseFileSymlink', data.dest, linkname));
      return symlink(linkname, data.dest);
    });
  });

  return _copyBulk.apply(this, arguments);
}

function hardlinkBulk() {
  return _hardlinkBulk.apply(this, arguments);
}
function _hardlinkBulk() {
  _hardlinkBulk = (0, _asyncToGenerator2.default)(function* (
    queue,
    reporter,
    _events
  ) {
    var events = {
      onStart: (_events && _events.onStart) || noop,
      onProgress: (_events && _events.onProgress) || noop,
      possibleExtraneous: _events ? _events.possibleExtraneous : new Set(),
      artifactFiles: (_events && _events.artifactFiles) || [],
      ignoreBasenames: [],
    };

    var actions = yield buildActionsForHardlink(queue, events, events.possibleExtraneous, reporter);
    events.onStart(actions.file.length + actions.symlink.length + actions.link.length);

    var fileActions = actions.link;

    yield promise.queue(
      fileActions,
      /*#__PURE__*/ (function() {
        var _ref2 = (0, _asyncToGenerator2.default)(function* (data) {
          reporter.verbose(reporter.lang('verboseFileLink', data.src, data.dest));
          if (data.removeDest) {
            yield (0, _fsNormalized.unlink)(data.dest);
          }
          yield link(data.src, data.dest);
        });

        return function() {
          return _ref2.apply(this, arguments);
        };
      })(),
      CONCURRENT_QUEUE_ITEMS
    );

    // we need to copy symlinks last as they could reference files we were copying
    var symlinkActions = actions.symlink;
    yield promise.queue(symlinkActions, (data) => {
      var linkname = path.resolve(path.dirname(data.dest), data.linkname);
      reporter.verbose(reporter.lang('verboseFileSymlink', data.dest, linkname));
      return symlink(linkname, data.dest);
    });
  });

  return _hardlinkBulk.apply(this, arguments);
}

function _readFile(loc, encoding) {
  return new Promise((resolve, reject) => {
    fs.readFile(loc, encoding, function(err, content) {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
}

function readFile(loc) {
  return _readFile(loc, 'utf8').then(normalizeOS);
}

function readFileRaw(loc) {
  return _readFile(loc, 'binary');
}

function readFileAny() {
  return _readFileAny.apply(this, arguments);
}
function _readFileAny() {
  _readFileAny = (0, _asyncToGenerator2.default)(function* (files) {
    for (var file of files) {
      if (yield exists(file)) {
        return readFile(file);
      }
    }
    return null;
  });

  return _readFileAny.apply(this, arguments);
}

function readJson() {
  return _readJson.apply(this, arguments);
}
function _readJson() {
  _readJson = (0, _asyncToGenerator2.default)(function* (loc) {
    return (yield readJsonAndFile(loc)).object;
  });

  return _readJson.apply(this, arguments);
}

function readJsonAndFile() {
  return _readJsonAndFile.apply(this, arguments);
}
function _readJsonAndFile() {
  _readJsonAndFile = (0, _asyncToGenerator2.default)(function* (loc) {
    var file = yield readFile(loc);
    try {
      return {
        object: (0, _map.default)(JSON.parse(stripBOM(file))),
        content: file,
      };
    } catch (err) {
      err.message = `${loc}: ${err.message}`;
      throw err;
    }
  });

  return _readJsonAndFile.apply(this, arguments);
}

function find() {
  return _find.apply(this, arguments);
}
function _find() {
  _find = (0, _asyncToGenerator2.default)(function* (filename, dir) {
    var parts = dir.split(path.sep);

    while (parts.length) {
      var loc = parts.concat(filename).join(path.sep);

      if (yield exists(loc)) {
        return loc;
      } else {
        parts.pop();
      }
    }

    return false;
  });

  return _find.apply(this, arguments);
}

function symlink() {
  return _symlink.apply(this, arguments);
}
function _symlink() {
  _symlink = (0, _asyncToGenerator2.default)(function* (src, dest) {
    if (process.platform !== 'win32') {
      // use relative paths otherwise which will be retained if the directory is moved
      src = path.relative(path.dirname(dest), src);
      // When path.relative returns an empty string for the current directory, we should instead use
      // '.', which is a valid fs.symlink target.
      src = src || '.';
    }

    try {
      var stats = yield lstat(dest);
      if (stats.isSymbolicLink()) {
        var resolved = dest;
        if (resolved === src) {
          return;
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    // We use rimraf for unlink which never throws an ENOENT on missing target
    yield (0, _fsNormalized.unlink)(dest);

    if (process.platform === 'win32') {
      // use directory junctions if possible on win32, this requires absolute paths
      yield fsSymlink(src, dest, 'junction');
    } else {
      yield fsSymlink(src, dest);
    }
  });

  return _symlink.apply(this, arguments);
}

function walk() {
  return _walk.apply(this, arguments);
}
function _walk() {
  _walk = (0, _asyncToGenerator2.default)(function* (
    dir,
    relativeDir,
    ignoreBasenames
  ) {
    if (ignoreBasenames === void 0) ignoreBasenames = new Set();
    var files = [];

    var filenames = yield readdir(dir);
    if (ignoreBasenames.size) {
      filenames = filenames.filter(name => !ignoreBasenames.has(name));
    }

    for (var name of filenames) {
      var relative = relativeDir ? path.join(relativeDir, name) : name;
      var loc = path.join(dir, name);
      var _stat = yield lstat(loc);

      files.push({
        relative,
        basename: name,
        absolute: loc,
        mtime: +_stat.mtime,
      });

      if (_stat.isDirectory()) {
        files = files.concat(yield walk(loc, relative, ignoreBasenames));
      }
    }

    return files;
  });

  return _walk.apply(this, arguments);
}

function getFileSizeOnDisk() {
  return _getFileSizeOnDisk.apply(this, arguments);
}
function _getFileSizeOnDisk() {
  _getFileSizeOnDisk = (0, _asyncToGenerator2.default)(function* (loc) {
    var stat = yield lstat(loc);
    var size = stat.size, blockSize = stat.blksize;

    return Math.ceil(size / blockSize) * blockSize;
  });

  return _getFileSizeOnDisk.apply(this, arguments);
}

function normalizeOS(body) {
  return body.replace(/\r\n/g, '\n');
}

var cr = '\r'.charCodeAt(0);
var lf = '\n'.charCodeAt(0);

function getEolFromFile() {
  return _getEolFromFile.apply(this, arguments);
}
function _getEolFromFile() {
  _getEolFromFile = (0, _asyncToGenerator2.default)(function* (path) {
    if (!(yield exists(path))) {
      return undefined;
    }

    var buffer = yield readFileBuffer(path);

    for (var i = 0; i < buffer.length; ++i) {
      if (buffer[i] === cr) {
        return '\r\n';
      }
      if (buffer[i] === lf) {
        return '\n';
      }
    }
    return undefined;
  });

  return _getEolFromFile.apply(this, arguments);
}

function writeFilePreservingEol() {
  return _writeFilePreservingEol.apply(this, arguments);
}
function _writeFilePreservingEol() {
  _writeFilePreservingEol = (0, _asyncToGenerator2.default)(function* (path, data) {
    var eol = (yield getEolFromFile(path)) || os.EOL;
    if (eol !== '\n') {
      data = data.replace(/\n/g, eol);
    }
    yield writeFile(path, data);
  });

  return _writeFilePreservingEol.apply(this, arguments);
}

function hardlinksWork() {
  return _hardlinksWork.apply(this, arguments);
}
function _hardlinksWork() {
  _hardlinksWork = (0, _asyncToGenerator2.default)(function* (dir) {
    var filename = 'test-file' + Math.random();
    var file = path.join(dir, filename);
    var fileLink = path.join(dir, filename + '-link');
    try {
      yield writeFile(file, 'test');
      yield link(file, fileLink);
    } catch (err) {
      return false;
    } finally {
      yield (0, _fsNormalized.unlink)(file);
      yield (0, _fsNormalized.unlink)(fileLink);
    }
    return true;
  });

  return _hardlinksWork.apply(this, arguments);
}

// not a strict polyfill for Node's fs.mkdtemp
function makeTempDir() {
  return _makeTempDir.apply(this, arguments);
}
function _makeTempDir() {
  _makeTempDir = (0, _asyncToGenerator2.default)(function* (prefix) {
    var dir = path.join(os.tmpdir(), `yarn-${prefix || ''}-${Date.now()}-${Math.random()}`);
    yield (0, _fsNormalized.unlink)(dir);
    yield mkdirp(dir);
    return dir;
  });

  return _makeTempDir.apply(this, arguments);
}

function readFirstAvailableStream() {
  return _readFirstAvailableStream.apply(this, arguments);
}
function _readFirstAvailableStream() {
  _readFirstAvailableStream = (0, _asyncToGenerator2.default)(function* (paths) {
    for (var _path of paths) {
      try {
        var fd = yield open(_path, 'r');
        return fs.createReadStream(_path, {fd});
      } catch (err) {
        // Try the next one
      }
    }
    return null;
  });

  return _readFirstAvailableStream.apply(this, arguments);
}

function getFirstSuitableFolder() {
  return _getFirstSuitableFolder.apply(this, arguments);
}
function _getFirstSuitableFolder() {
  _getFirstSuitableFolder = (0, _asyncToGenerator2.default)(function* (
    paths,
    mode
  ) {
    if (mode === void 0) mode = constants.W_OK | constants.X_OK; // eslint-disable-line no-bitwise
    var result = {
      skipped: [],
      folder: null,
    };

    for (var folder of paths) {
      try {
        yield mkdirp(folder);
        yield access(folder, mode);

        result.folder = folder;

        return result;
      } catch (error) {
        result.skipped.push({
          error,
          folder,
        });
      }
    }
    return result;
  });

  return _getFirstSuitableFolder.apply(this, arguments);
}
