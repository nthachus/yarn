#!/usr/bin/env node
'use strict';

const flowRemoveTypes = require('flow-remove-types');
const fs = require('fs');
const path = require('path');
const {mkdirP} = require('./_promisify.js');

const PATTERN = /\.js$/i;
const TEMPLATE_PATTERN = /\.tpl\.js$/i;

const basedir = path.resolve(__dirname, '../');
const destDir = path.join(basedir, 'tmp');
const sourceDir = path.join(basedir, 'src');

// Transform @flow to ESM
const flowToESM = content =>
  flowRemoveTypes(content, {pretty: true, ignoreUninitializedFields: true})
    .toString()
    .replace(/^\/(\*\s*\*)?\/\s*?\n+/, '')
    .replace(/(?<=^\s*import\b[^,'"]*)(,\s*\{\s*\})+/gm, '')
    .replace(/^\s*import\s+(\*\s+as\s+)?(\w+)\s+from\s*(['"][a-zA-Z_@][^'"]*['"])/gm, 'const $2 = require($3)')
    .replace(
      /^\s*import\s*(\{[^{}]*\})\s*from\s*(['"][a-zA-Z_@][^'"]*['"])/gm,
      (_, p1, p2) => `const ${p1.replace(/\s+as\s+/g, ': ')} = require(${p2})`
    )
    .replace(/^\s*const\s+(\w+) *= *require\((['"][./][^'"]*['"])\)\.default\b/gm, 'import $1 from $2')
    .replace(
      /^\s*const\s*(\{[^{}]*\}) *= *require\((['"][./][^'"]*['"])\)/gm, //
      (m, p1, p2) => (/\.json['"]$/i.test(p2) ? m : `import ${p1.replace(/:\s*/g, ' as ')} from ${p2}`)
    )
    .replace(/^\s*exports\.(\w+ *=)/gm, 'export const $1');

const transformFile = file =>
  new Promise((resolve, reject) => {
    fs.promises.readFile(file, 'utf8').then(content => {
      const result = TEMPLATE_PATTERN.test(file)
        ? 'export default `' + content.replace(/[`\\$]/g, '\\$&') + '`;\n'
        : flowToESM(content);

      const outFile = path.join(destDir, path.relative(sourceDir, file));

      mkdirP(path.dirname(outFile)).then(() => {
        fs.promises.writeFile(outFile, result).then(() => resolve(outFile), reject);
      }, reject);
    }, reject);
  });

const transformDir = dir =>
  new Promise((resolveA, rejectA) => {
    fs.promises.readdir(dir).then(files => {
      const arr = files.map(file => {
        const subDir = path.join(dir, file);

        return new Promise((resolve, reject) => {
          fs.promises.lstat(subDir).then(st => {
            if (st.isDirectory()) {
              transformDir(subDir).then(resolve, reject);
            } else if (PATTERN.test(subDir)) {
              transformFile(subDir).then(resolve, reject);
            } else {
              resolve();
            }
          }, reject);
        });
      });

      Promise.all(arr).then(resolveA, rejectA);
    }, rejectA);
  });

transformDir(sourceDir).then(console.log, console.error);
