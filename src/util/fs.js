import fs from 'fs';
import map from './map.js';
import stripBOM from 'strip-bom';

export const constants =
  typeof fs.constants !== 'undefined'
    ? fs.constants
    : {
        R_OK: fs.R_OK,
        W_OK: fs.W_OK,
        X_OK: fs.X_OK,
      };

export const exists = fs.existsSync;
export const lstat = fs.lstatSync;

const _readFile = fs.readFileSync;

export function readFile(loc) {
  return normalizeOS(_readFile(loc, 'utf8'));
}

export function readFileRaw(loc) {
  return _readFile(loc, 'binary');
}

export function readFileAny(files) {
  for (const file of files) {
    if (exists(file)) {
      return readFile(file);
    }
  }
  return null;
}

export function readJson(loc) {
  return readJsonAndFile(loc).object;
}

export function readJsonAndFile(loc) {
  const file = readFile(loc);
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

export function getFileSizeOnDisk(loc) {
  const stat = lstat(loc);
  const {size, blksize: blockSize} = stat;

  return Math.ceil(size / blockSize) * blockSize;
}

export function normalizeOS(body) {
  return body.replace(/\r\n/g, '\n');
}
