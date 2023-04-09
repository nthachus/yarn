'use strict';
exports.__esModule = true;
exports.promisify = promisify;
exports.queue = queue;
exports.wait = wait;

function wait(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
}

function promisify(fn, firstData) {
  return function() {
    var args = Array.prototype.slice.call(arguments, 0);
    return new Promise(function(resolve, reject) {
      args.push(function(err) {
        var res;

        if (firstData) {
          res = err;
          err = null;
        } else if (arguments.length <= 2) {
          res = arguments[1];
        } else {
          res = Array.prototype.slice.call(arguments, 1);
        }

        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });

      fn.apply(null, args);
    });
  };
}

function queue(
  arr,
  promiseProducer,
  concurrency
) {
  if (concurrency === void 0) concurrency = Infinity;
  concurrency = Math.min(concurrency, arr.length);

  // clone
  arr = arr.slice();

  var results = [];
  var total = arr.length;
  if (!total) {
    return Promise.resolve(results);
  }

  return new Promise((resolve, reject) => {
    for (var i = 0; i < concurrency; i++) {
      next();
    }

    function next() {
      var item = arr.shift();
      var promise = promiseProducer(item);

      promise.then(function(result) {
        results.push(result);

        total--;
        if (total === 0) {
          resolve(results);
        } else {
          if (arr.length) {
            next();
          }
        }
      }, reject);
    }
  });
}
