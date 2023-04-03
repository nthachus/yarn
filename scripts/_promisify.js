'use strict';

const fs = require('fs');
const path = require('path');

let mkdirP;
if (!fs.promises) {
  fs.promises = ['stat', 'lstat', 'mkdir', 'readdir', 'readFile', 'writeFile'].reduce((acc, fn) => {
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

exports.mkdirP = mkdirP;
