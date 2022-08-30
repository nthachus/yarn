#!/usr/bin/env node
'use strict';

const {transformFileAsync} = require('@babel/core');
const fs = require('fs');
const path = require('path');

const PATTERN = /\.js$/i;
const basedir = path.resolve(__dirname, '../');
const destDir = path.join(basedir, 'lib');
const sourceDir = path.join(basedir, 'src');

// Promisify
let mkdirP;
if (!fs.promises) {
  fs.promises = ['stat', 'lstat', 'mkdir', 'readdir', 'writeFile'].reduce((acc, fn) => {
    acc[fn] = (...args) =>
      new Promise((resolve, reject) => {
        fs[fn].apply(
          fs,
          args.concat((err, result) => (!err ? resolve(result) : reject(err)))
        );
      });

    return acc;
  }, {});

  mkdirP = p =>
    new Promise((resolve, reject) => {
      fs.promises.mkdir(p).then(
        () => resolve(p),
        err => {
          if (err.code === 'ENOENT') {
            const d = path.dirname(p);
            mkdirP(d).then(() => mkdirP(p).then(() => resolve(d), reject), reject);
          } else {
            fs.promises.stat(p).then(st => (st.isDirectory() ? resolve() : reject(st)), reject);
          }
        }
      );
    });
} else {
  mkdirP = p => fs.promises.mkdir(p, {recursive: true});
}

const compileFile = file =>
  new Promise((resolve, reject) => {
    transformFileAsync(file).then(result => {
      const outFile = path.join(destDir, path.relative(sourceDir, file));

      mkdirP(path.dirname(outFile)).then(() => {
        fs.promises.writeFile(outFile, result.code).then(() => resolve(outFile), reject);
      }, reject);
    }, reject);
  });

const compileDir = dir =>
  new Promise((resolveA, rejectA) => {
    fs.promises.readdir(dir).then(files => {
      const arr = files.map(file => {
        const subDir = path.join(dir, file);

        return new Promise((resolve, reject) => {
          fs.promises.lstat(subDir).then(st => {
            if (st.isDirectory()) {
              compileDir(subDir).then(resolve, reject);
            } else if (PATTERN.test(subDir)) {
              compileFile(subDir).then(resolve, reject);
            } else {
              resolve();
            }
          }, reject);
        });
      });

      Promise.all(arr).then(resolveA, rejectA);
    }, rejectA);
  });

compileDir(sourceDir).then(console.log, console.error);
