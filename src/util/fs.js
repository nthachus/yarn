const fs = require('fs');
const globModule = require('glob');
const os = require('os');
const path = require('path');

import BlockingQueue from './blocking-queue.js';
import * as promise from './promise.js';
import {promisify} from './promise.js';
import map from './map.js';
import {copyFile, fileDatesEqual, unlink} from './fs-normalized.js';

export const constants =
  typeof fs.constants !== 'undefined'
    ? fs.constants
    : {
        R_OK: fs.R_OK,
        W_OK: fs.W_OK,
        X_OK: fs.X_OK,
      };

export const lockQueue = new BlockingQueue('fs lock');

export const readFileBuffer = promisify(fs.readFile);
export const open = promisify(fs.open);
export const writeFile = promisify(
  fs.writeFile,
);
export const readlink = promisify(fs.readlink);
export const realpath = promisify(fs.realpath);
export const readdir = promisify(fs.readdir);
export const rename = promisify(fs.rename);
export const access = promisify(fs.access);
export const stat = promisify(fs.stat);
export const mkdirp = promisify(require('mkdirp'));
export const exists = promisify(fs.exists, true);
export const lstat = promisify(fs.lstat);
export const chmod = promisify(fs.chmod);
export const link = promisify(fs.link);
export const glob = promisify(globModule);
export {unlink};

// fs.copyFile uses the native file copying instructions on the system, performing much better
// than any JS-based solution and consumes fewer resources. Repeated testing to fine tune the
// concurrency level revealed 128 as the sweet spot on a quad-core, 16 CPU Intel system with SSD.
const CONCURRENT_QUEUE_ITEMS = fs.copyFile ? 128 : 4;

const fsSymlink = promisify(
  fs.symlink,
);
const invariant = require('invariant');
const stripBOM = require('strip-bom');

const noop = () => {};

async function buildActionsForCopy(
  queue,
  events,
  possibleExtraneous,
  reporter,
) {
  const artifactFiles = new Set(events.artifactFiles || []);
  const files = new Set();

  // initialise events
  for (const item of queue) {
    const onDone = item.onDone;
    item.onDone = () => {
      events.onProgress(item.dest);
      if (onDone) {
        onDone();
      }
    };
  }
  events.onStart(queue.length);

  // start building actions
  const actions = {
    file: [],
    symlink: [],
    link: [],
  };

  // custom concurrency logic as we're always executing stacks of CONCURRENT_QUEUE_ITEMS queue items
  // at a time due to the requirement to push items onto the queue
  while (queue.length) {
    const items = queue.splice(0, CONCURRENT_QUEUE_ITEMS);
    await Promise.all(items.map(build));
  }

  // simulate the existence of some files to prevent considering them extraneous
  for (const file of artifactFiles) {
    if (possibleExtraneous.has(file)) {
      reporter.verbose(reporter.lang('verboseFilePhantomExtraneous', file));
      possibleExtraneous.delete(file);
    }
  }

  for (const loc of possibleExtraneous) {
    if (files.has(loc.toLowerCase())) {
      possibleExtraneous.delete(loc);
    }
  }

  return actions;

  //
  async function build(data) {
    const {src, dest, type} = data;
    const onFresh = data.onFresh || noop;
    const onDone = data.onDone || noop;

    // TODO https://github.com/yarnpkg/yarn/issues/3751
    // related to bundled dependencies handling
    if (files.has(dest.toLowerCase())) {
      reporter.verbose(`The case-insensitive file ${dest} shouldn't be copied twice in one bulk copy`);
    } else {
      files.add(dest.toLowerCase());
    }

    if (type === 'symlink') {
      await mkdirp(path.dirname(dest));
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

    const srcStat = await lstat(src);
    let srcFiles;

    if (srcStat.isDirectory()) {
      srcFiles = await readdir(src);
    }

    let destStat;
    try {
      // try accessing the destination
      destStat = await lstat(dest);
    } catch (e) {
      // proceed if destination doesn't exist, otherwise error
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }

    // if destination exists
    if (destStat) {
      const bothSymlinks = srcStat.isSymbolicLink() && destStat.isSymbolicLink();
      const bothFolders = srcStat.isDirectory() && destStat.isDirectory();
      const bothFiles = srcStat.isFile() && destStat.isFile();

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

      if (bothFiles && srcStat.size === destStat.size && fileDatesEqual(srcStat.mtime, destStat.mtime)) {
        // we can safely assume this is the same file
        onDone();
        reporter.verbose(reporter.lang('verboseFileSkip', src, dest, srcStat.size, +srcStat.mtime));
        return;
      }

      if (bothSymlinks) {
        const srcReallink = await readlink(src);
        if (srcReallink === (await readlink(dest))) {
          // if both symlinks are the same then we can continue on
          onDone();
          reporter.verbose(reporter.lang('verboseFileSkipSymlink', src, dest, srcReallink));
          return;
        }
      }

      if (bothFolders) {
        // mark files that aren't in this folder as possibly extraneous
        const destFiles = await readdir(dest);
        invariant(srcFiles, 'src files not initialised');

        for (const file of destFiles) {
          if (srcFiles.indexOf(file) < 0) {
            const loc = path.join(dest, file);
            possibleExtraneous.add(loc);

            if ((await lstat(loc)).isDirectory()) {
              for (const file of await readdir(loc)) {
                possibleExtraneous.add(path.join(loc, file));
              }
            }
          }
        }
      }
    }

    if (destStat && destStat.isSymbolicLink()) {
      await unlink(dest);
      destStat = null;
    }

    if (srcStat.isSymbolicLink()) {
      onFresh();
      const linkname = await readlink(src);
      actions.symlink.push({
        dest,
        linkname,
      });
      onDone();
    } else if (srcStat.isDirectory()) {
      if (!destStat) {
        reporter.verbose(reporter.lang('verboseFileFolder', dest));
        await mkdirp(dest);
      }

      const destParts = dest.split(path.sep);
      while (destParts.length) {
        files.add(destParts.join(path.sep).toLowerCase());
        destParts.pop();
      }

      // push all files to queue
      invariant(srcFiles, 'src files not initialised');
      let remaining = srcFiles.length;
      if (!remaining) {
        onDone();
      }
      for (const file of srcFiles) {
        queue.push({
          dest: path.join(dest, file),
          onFresh,
          onDone: () => {
            if (--remaining === 0) {
              onDone();
            }
          },
          src: path.join(src, file),
        });
      }
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
  }
}

async function buildActionsForHardlink(
  queue,
  events,
  possibleExtraneous,
  reporter,
) {
  const artifactFiles = new Set(events.artifactFiles || []);
  const files = new Set();

  // initialise events
  for (const item of queue) {
    const onDone = item.onDone || noop;
    item.onDone = () => {
      events.onProgress(item.dest);
      onDone();
    };
  }
  events.onStart(queue.length);

  // start building actions
  const actions = {
    file: [],
    symlink: [],
    link: [],
  };

  // custom concurrency logic as we're always executing stacks of CONCURRENT_QUEUE_ITEMS queue items
  // at a time due to the requirement to push items onto the queue
  while (queue.length) {
    const items = queue.splice(0, CONCURRENT_QUEUE_ITEMS);
    await Promise.all(items.map(build));
  }

  // simulate the existence of some files to prevent considering them extraneous
  for (const file of artifactFiles) {
    if (possibleExtraneous.has(file)) {
      reporter.verbose(reporter.lang('verboseFilePhantomExtraneous', file));
      possibleExtraneous.delete(file);
    }
  }

  for (const loc of possibleExtraneous) {
    if (files.has(loc.toLowerCase())) {
      possibleExtraneous.delete(loc);
    }
  }

  return actions;

  //
  async function build(data) {
    const {src, dest} = data;
    const onFresh = data.onFresh || noop;
    const onDone = data.onDone || noop;
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

    const srcStat = await lstat(src);
    let srcFiles;

    if (srcStat.isDirectory()) {
      srcFiles = await readdir(src);
    }

    const destExists = await exists(dest);
    if (destExists) {
      const destStat = await lstat(dest);

      const bothSymlinks = srcStat.isSymbolicLink() && destStat.isSymbolicLink();
      const bothFolders = srcStat.isDirectory() && destStat.isDirectory();
      const bothFiles = srcStat.isFile() && destStat.isFile();

      if (srcStat.mode !== destStat.mode) {
        try {
          await access(dest, srcStat.mode);
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
        const srcReallink = await readlink(src);
        if (srcReallink === (await readlink(dest))) {
          // if both symlinks are the same then we can continue on
          onDone();
          reporter.verbose(reporter.lang('verboseFileSkipSymlink', src, dest, srcReallink));
          return;
        }
      }

      if (bothFolders) {
        // mark files that aren't in this folder as possibly extraneous
        const destFiles = await readdir(dest);
        invariant(srcFiles, 'src files not initialised');

        for (const file of destFiles) {
          if (srcFiles.indexOf(file) < 0) {
            const loc = path.join(dest, file);
            possibleExtraneous.add(loc);

            if ((await lstat(loc)).isDirectory()) {
              for (const file of await readdir(loc)) {
                possibleExtraneous.add(path.join(loc, file));
              }
            }
          }
        }
      }
    }

    if (srcStat.isSymbolicLink()) {
      onFresh();
      const linkname = await readlink(src);
      actions.symlink.push({
        dest,
        linkname,
      });
      onDone();
    } else if (srcStat.isDirectory()) {
      reporter.verbose(reporter.lang('verboseFileFolder', dest));
      await mkdirp(dest);

      const destParts = dest.split(path.sep);
      while (destParts.length) {
        files.add(destParts.join(path.sep).toLowerCase());
        destParts.pop();
      }

      // push all files to queue
      invariant(srcFiles, 'src files not initialised');
      let remaining = srcFiles.length;
      if (!remaining) {
        onDone();
      }
      for (const file of srcFiles) {
        queue.push({
          onFresh,
          src: path.join(src, file),
          dest: path.join(dest, file),
          onDone: () => {
            if (--remaining === 0) {
              onDone();
            }
          },
        });
      }
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
  }
}

export function copy(src, dest, reporter) {
  return copyBulk([{src, dest}], reporter);
}

export async function copyBulk(
  queue,
  reporter,
  _events,
) {
  const events = {
    onStart: (_events && _events.onStart) || noop,
    onProgress: (_events && _events.onProgress) || noop,
    possibleExtraneous: _events ? _events.possibleExtraneous : new Set(),
    ignoreBasenames: (_events && _events.ignoreBasenames) || [],
    artifactFiles: (_events && _events.artifactFiles) || [],
  };

  const actions = await buildActionsForCopy(queue, events, events.possibleExtraneous, reporter);
  events.onStart(actions.file.length + actions.symlink.length + actions.link.length);

  const fileActions = actions.file;

  const currentlyWriting = new Map();

  await promise.queue(
    fileActions,
    async (data) => {
      let writePromise;
      while ((writePromise = currentlyWriting.get(data.dest))) {
        await writePromise;
      }

      reporter.verbose(reporter.lang('verboseFileCopy', data.src, data.dest));
      const copier = copyFile(data, () => currentlyWriting.delete(data.dest));
      currentlyWriting.set(data.dest, copier);
      events.onProgress(data.dest);
      return copier;
    },
    CONCURRENT_QUEUE_ITEMS,
  );

  // we need to copy symlinks last as they could reference files we were copying
  const symlinkActions = actions.symlink;
  await promise.queue(symlinkActions, (data) => {
    const linkname = path.resolve(path.dirname(data.dest), data.linkname);
    reporter.verbose(reporter.lang('verboseFileSymlink', data.dest, linkname));
    return symlink(linkname, data.dest);
  });
}

export async function hardlinkBulk(
  queue,
  reporter,
  _events,
) {
  const events = {
    onStart: (_events && _events.onStart) || noop,
    onProgress: (_events && _events.onProgress) || noop,
    possibleExtraneous: _events ? _events.possibleExtraneous : new Set(),
    artifactFiles: (_events && _events.artifactFiles) || [],
    ignoreBasenames: [],
  };

  const actions = await buildActionsForHardlink(queue, events, events.possibleExtraneous, reporter);
  events.onStart(actions.file.length + actions.symlink.length + actions.link.length);

  const fileActions = actions.link;

  await promise.queue(
    fileActions,
    async (data) => {
      reporter.verbose(reporter.lang('verboseFileLink', data.src, data.dest));
      if (data.removeDest) {
        await unlink(data.dest);
      }
      await link(data.src, data.dest);
    },
    CONCURRENT_QUEUE_ITEMS,
  );

  // we need to copy symlinks last as they could reference files we were copying
  const symlinkActions = actions.symlink;
  await promise.queue(symlinkActions, (data) => {
    const linkname = path.resolve(path.dirname(data.dest), data.linkname);
    reporter.verbose(reporter.lang('verboseFileSymlink', data.dest, linkname));
    return symlink(linkname, data.dest);
  });
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

export function readFile(loc) {
  return _readFile(loc, 'utf8').then(normalizeOS);
}

export function readFileRaw(loc) {
  return _readFile(loc, 'binary');
}

export async function readFileAny(files) {
  for (const file of files) {
    if (await exists(file)) {
      return readFile(file);
    }
  }
  return null;
}

export async function readJson(loc) {
  return (await readJsonAndFile(loc)).object;
}

export async function readJsonAndFile(
  loc,
) {
  const file = await readFile(loc);
  try {
    return {
      object: map(JSON.parse(stripBOM(file))),
      content: file,
    };
  } catch (err) {
    err.message = `${loc}: ${err.message}`;
    throw err;
  }
}

export async function find(filename, dir) {
  const parts = dir.split(path.sep);

  while (parts.length) {
    const loc = parts.concat(filename).join(path.sep);

    if (await exists(loc)) {
      return loc;
    } else {
      parts.pop();
    }
  }

  return false;
}

export async function symlink(src, dest) {
  if (process.platform !== 'win32') {
    // use relative paths otherwise which will be retained if the directory is moved
    src = path.relative(path.dirname(dest), src);
    // When path.relative returns an empty string for the current directory, we should instead use
    // '.', which is a valid fs.symlink target.
    src = src || '.';
  }

  try {
    const stats = await lstat(dest);
    if (stats.isSymbolicLink()) {
      const resolved = dest;
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
  await unlink(dest);

  if (process.platform === 'win32') {
    // use directory junctions if possible on win32, this requires absolute paths
    await fsSymlink(src, dest, 'junction');
  } else {
    await fsSymlink(src, dest);
  }
}

export async function walk(
  dir,
  relativeDir,
  ignoreBasenames = new Set(),
) {
  let files = [];

  let filenames = await readdir(dir);
  if (ignoreBasenames.size) {
    filenames = filenames.filter(name => !ignoreBasenames.has(name));
  }

  for (const name of filenames) {
    const relative = relativeDir ? path.join(relativeDir, name) : name;
    const loc = path.join(dir, name);
    const stat = await lstat(loc);

    files.push({
      relative,
      basename: name,
      absolute: loc,
      mtime: +stat.mtime,
    });

    if (stat.isDirectory()) {
      files = files.concat(await walk(loc, relative, ignoreBasenames));
    }
  }

  return files;
}

export async function getFileSizeOnDisk(loc) {
  const stat = await lstat(loc);
  const {size, blksize: blockSize} = stat;

  return Math.ceil(size / blockSize) * blockSize;
}

export function normalizeOS(body) {
  return body.replace(/\r\n/g, '\n');
}

const cr = '\r'.charCodeAt(0);
const lf = '\n'.charCodeAt(0);

async function getEolFromFile(path) {
  if (!(await exists(path))) {
    return undefined;
  }

  const buffer = await readFileBuffer(path);

  for (let i = 0; i < buffer.length; ++i) {
    if (buffer[i] === cr) {
      return '\r\n';
    }
    if (buffer[i] === lf) {
      return '\n';
    }
  }
  return undefined;
}

export async function writeFilePreservingEol(path, data) {
  const eol = (await getEolFromFile(path)) || os.EOL;
  if (eol !== '\n') {
    data = data.replace(/\n/g, eol);
  }
  await writeFile(path, data);
}

export async function hardlinksWork(dir) {
  const filename = 'test-file' + Math.random();
  const file = path.join(dir, filename);
  const fileLink = path.join(dir, filename + '-link');
  try {
    await writeFile(file, 'test');
    await link(file, fileLink);
  } catch (err) {
    return false;
  } finally {
    await unlink(file);
    await unlink(fileLink);
  }
  return true;
}

// not a strict polyfill for Node's fs.mkdtemp
export async function makeTempDir(prefix) {
  const dir = path.join(os.tmpdir(), `yarn-${prefix || ''}-${Date.now()}-${Math.random()}`);
  await unlink(dir);
  await mkdirp(dir);
  return dir;
}

export async function readFirstAvailableStream(paths) {
  for (const path of paths) {
    try {
      const fd = await open(path, 'r');
      return fs.createReadStream(path, {fd});
    } catch (err) {
      // Try the next one
    }
  }
  return null;
}

export async function getFirstSuitableFolder(
  paths,
  mode = constants.W_OK | constants.X_OK, // eslint-disable-line no-bitwise
) {
  const result = {
    skipped: [],
    folder: null,
  };

  for (const folder of paths) {
    try {
      await mkdirp(folder);
      await access(folder, mode);

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
}
