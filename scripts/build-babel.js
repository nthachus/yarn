#!/usr/bin/env node
'use strict';

const {transformFileAsync} = require('@babel/core');
const fs = require('fs');
const path = require('path');
const {mkdirP} = require('./_promisify.js');

const PATTERN = /\.js$/i;
const basedir = path.resolve(__dirname, '../');
const destDir = path.join(basedir, 'lib');
const sourceDir = path.join(basedir, 'src');

const compileFile = file =>
  new Promise((resolve, reject) => {
    transformFileAsync(file).then(result => {
      const outFile = path.join(destDir, path.relative(sourceDir, file));

      let content = result.code;
      if (/util\b.execute-lifecycle-script\.js$/i.test(file)) {
        content = content
          .replace(/( _global)\./g, '$1().')
          .replace(
            /( _global)( *= *require\(['"][./]+cli\/commands\/global\b[^;\n]*)/,
            '$12; function $1() { return $12 || ($12$2); }'
          );
      }

      mkdirP(path.dirname(outFile)).then(() => {
        fs.promises.writeFile(outFile, content).then(() => resolve(outFile), reject);
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
