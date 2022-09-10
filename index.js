module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 11);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */



/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var NODE_ENV = process.env.NODE_ENV;

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (NODE_ENV !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

module.exports = x => {
	if (typeof x !== 'string') {
		throw new TypeError('Expected a string, got ' + typeof x);
	}

	// Catches EFBBBF (UTF-8 BOM) because the buffer-to-string
	// conversion translates it to FEFF (UTF-16 BOM)
	if (x.charCodeAt(0) === 0xFEFF) {
		return x.slice(1);
	}

	return x;
};


/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = require("util");

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var Buffer = __webpack_require__(7).Buffer;

var crypto = __webpack_require__(9);
var Transform = __webpack_require__(10).Transform;

var SPEC_ALGORITHMS = ['sha256', 'sha384', 'sha512'];

var BASE64_REGEX = /^[a-z0-9+/]+(?:=?=?)$/i;
var SRI_REGEX = /^([^-]+)-([^?]+)([?\S*]*)$/;
var STRICT_SRI_REGEX = /^([^-]+)-([A-Za-z0-9+/=]{44,88})(\?[\x21-\x7E]*)*$/;
var VCHAR_REGEX = /^[\x21-\x7E]+$/;

class Hash {
  get isHash() {return true;}
  constructor(hash, opts) {
    var strict = !!(opts && opts.strict);
    this.source = hash.trim();
    // 3.1. Integrity metadata (called "Hash" by ssri)
    // https://w3c.github.io/webappsec-subresource-integrity/#integrity-metadata-description
    var match = this.source.match(
    strict ?
    STRICT_SRI_REGEX :
    SRI_REGEX);

    if (!match) {return;}
    if (strict && !SPEC_ALGORITHMS.some(a => a === match[1])) {return;}
    this.algorithm = match[1];
    this.digest = match[2];

    var rawOpts = match[3];
    this.options = rawOpts ? rawOpts.slice(1).split('?') : [];
  }
  hexDigest() {
    return this.digest && Buffer.from(this.digest, 'base64').toString('hex');
  }
  toJSON() {
    return this.toString();
  }
  toString(opts) {
    if (opts && opts.strict) {
      // Strict mode enforces the standard as close to the foot of the
      // letter as it can.
      if (!(
      // The spec has very restricted productions for algorithms.
      // https://www.w3.org/TR/CSP2/#source-list-syntax
      SPEC_ALGORITHMS.some(x => x === this.algorithm) &&
      // Usually, if someone insists on using a "different" base64, we
      // leave it as-is, since there's multiple standards, and the
      // specified is not a URL-safe variant.
      // https://www.w3.org/TR/CSP2/#base64_value
      this.digest.match(BASE64_REGEX) &&
      // Option syntax is strictly visual chars.
      // https://w3c.github.io/webappsec-subresource-integrity/#grammardef-option-expression
      // https://tools.ietf.org/html/rfc5234#appendix-B.1
      (this.options || []).every(opt => opt.match(VCHAR_REGEX))))
      {
        return '';
      }
    }
    var options = this.options && this.options.length ?
    `?${this.options.join('?')}` :
    '';
    return `${this.algorithm}-${this.digest}${options}`;
  }}


class Integrity {
  get isIntegrity() {return true;}
  toJSON() {
    return this.toString();
  }
  toString(opts) {
    opts = opts || {};
    var sep = opts.sep || ' ';
    if (opts.strict) {
      // Entries must be separated by whitespace, according to spec.
      sep = sep.replace(/\S+/g, ' ');
    }
    return Object.keys(this).map(k => {
      return this[k].map(hash => {
        return Hash.prototype.toString.call(hash, opts);
      }).filter(x => x.length).join(sep);
    }).filter(x => x.length).join(sep);
  }
  concat(integrity, opts) {
    var other = typeof integrity === 'string' ?
    integrity :
    stringify(integrity, opts);
    return parse(`${this.toString(opts)} ${other}`, opts);
  }
  hexDigest() {
    return parse(this, { single: true }).hexDigest();
  }
  match(integrity, opts) {
    var other = parse(integrity, opts);
    var algo = other.pickAlgorithm(opts);
    return (
      this[algo] &&
      other[algo] &&
      this[algo].find((hash) =>
      other[algo].find((otherhash) =>
      hash.digest === otherhash.digest)) ||


      false);
  }
  pickAlgorithm(opts) {
    var pickAlgorithm = opts && opts.pickAlgorithm || getPrioritizedHash;
    var keys = Object.keys(this);
    if (!keys.length) {
      throw new Error(`No algorithms available for ${
      JSON.stringify(this.toString())
      }`);
    }
    return keys.reduce((acc, algo) => {
      return pickAlgorithm(acc, algo) || acc;
    });
  }}


module.exports.parse = parse;
function parse(sri, opts) {
  opts = opts || {};
  if (typeof sri === 'string') {
    return _parse(sri, opts);
  } else if (sri.algorithm && sri.digest) {
    var fullSri = new Integrity();
    fullSri[sri.algorithm] = [sri];
    return _parse(stringify(fullSri, opts), opts);
  } else {
    return _parse(stringify(sri, opts), opts);
  }
}

function _parse(integrity, opts) {
  // 3.4.3. Parse metadata
  // https://w3c.github.io/webappsec-subresource-integrity/#parse-metadata
  if (opts.single) {
    return new Hash(integrity, opts);
  }
  return integrity.trim().split(/\s+/).reduce((acc, string) => {
    var hash = new Hash(string, opts);
    if (hash.algorithm && hash.digest) {
      var algo = hash.algorithm;
      if (!acc[algo]) {acc[algo] = [];}
      acc[algo].push(hash);
    }
    return acc;
  }, new Integrity());
}

module.exports.stringify = stringify;
function stringify(obj, opts) {
  if (obj.algorithm && obj.digest) {
    return Hash.prototype.toString.call(obj, opts);
  } else if (typeof obj === 'string') {
    return stringify(parse(obj, opts), opts);
  } else {
    return Integrity.prototype.toString.call(obj, opts);
  }
}

module.exports.fromHex = fromHex;
function fromHex(hexDigest, algorithm, opts) {
  var optString = opts && opts.options && opts.options.length ?
  `?${opts.options.join('?')}` :
  '';
  return parse(
  `${algorithm}-${
  Buffer.from(hexDigest, 'hex').toString('base64')
  }${optString}`, opts);

}

module.exports.fromData = fromData;
function fromData(data, opts) {
  opts = opts || {};
  var algorithms = opts.algorithms || ['sha512'];
  var optString = opts.options && opts.options.length ?
  `?${opts.options.join('?')}` :
  '';
  return algorithms.reduce((acc, algo) => {
    var digest = crypto.createHash(algo).update(data).digest('base64');
    var hash = new Hash(
    `${algo}-${digest}${optString}`,
    opts);

    if (hash.algorithm && hash.digest) {
      var _algo = hash.algorithm;
      if (!acc[_algo]) {acc[_algo] = [];}
      acc[_algo].push(hash);
    }
    return acc;
  }, new Integrity());
}

module.exports.fromStream = fromStream;
function fromStream(stream, opts) {
  opts = opts || {};
  var P = opts.Promise || Promise;
  var istream = integrityStream(opts);
  return new P((resolve, reject) => {
    stream.pipe(istream);
    stream.on('error', reject);
    istream.on('error', reject);
    var sri;
    istream.on('integrity', s => {sri = s;});
    istream.on('end', () => resolve(sri));
    istream.on('data', () => {});
  });
}

module.exports.checkData = checkData;
function checkData(data, sri, opts) {
  opts = opts || {};
  sri = parse(sri, opts);
  if (!Object.keys(sri).length) {
    if (opts.error) {
      throw Object.assign(
      new Error('No valid integrity hashes to check against'), {
        code: 'EINTEGRITY' });


    } else {
      return false;
    }
  }
  var algorithm = sri.pickAlgorithm(opts);
  var digest = crypto.createHash(algorithm).update(data).digest('base64');
  var newSri = parse({ algorithm, digest });
  var match = newSri.match(sri, opts);
  if (match || !opts.error) {
    return match;
  } else if (typeof opts.size === 'number' && data.length !== opts.size) {
    var err = new Error(`data size mismatch when checking ${sri}.\n  Wanted: ${opts.size}\n  Found: ${data.length}`);
    err.code = 'EBADSIZE';
    err.found = data.length;
    err.expected = opts.size;
    err.sri = sri;
    throw err;
  } else {
    var _err = new Error(`Integrity checksum failed when using ${algorithm}: Wanted ${sri}, but got ${newSri}. (${data.length} bytes)`);
    _err.code = 'EINTEGRITY';
    _err.found = newSri;
    _err.expected = sri;
    _err.algorithm = algorithm;
    _err.sri = sri;
    throw _err;
  }
}

module.exports.checkStream = checkStream;
function checkStream(stream, sri, opts) {
  opts = opts || {};
  var P = opts.Promise || Promise;
  var checker = integrityStream(Object.assign({}, opts, {
    integrity: sri }));

  return new P((resolve, reject) => {
    stream.pipe(checker);
    stream.on('error', reject);
    checker.on('error', reject);
    var sri;
    checker.on('verified', s => {sri = s;});
    checker.on('end', () => resolve(sri));
    checker.on('data', () => {});
  });
}

module.exports.integrityStream = integrityStream;
function integrityStream(opts) {
  opts = opts || {};
  // For verification
  var sri = opts.integrity && parse(opts.integrity, opts);
  var goodSri = sri && Object.keys(sri).length;
  var algorithm = goodSri && sri.pickAlgorithm(opts);
  var digests = goodSri && sri[algorithm];
  // Calculating stream
  var algorithms = Array.from(
  new Set(
  (opts.algorithms || ['sha512']).
  concat(algorithm ? [algorithm] : [])));


  var hashes = algorithms.map(crypto.createHash);
  var streamSize = 0;
  var stream = new Transform({
    transform(chunk, enc, cb) {
      streamSize += chunk.length;
      hashes.forEach(h => h.update(chunk, enc));
      cb(null, chunk, enc);
    } }).
  on('end', () => {
    var optString = opts.options && opts.options.length ?
    `?${opts.options.join('?')}` :
    '';
    var newSri = parse(hashes.map((h, i) => {
      return `${algorithms[i]}-${h.digest('base64')}${optString}`;
    }).join(' '), opts);
    // Integrity verification mode
    var match = goodSri && newSri.match(sri, opts);
    if (typeof opts.size === 'number' && streamSize !== opts.size) {
      var err = new Error(`stream size mismatch when checking ${sri}.\n  Wanted: ${opts.size}\n  Found: ${streamSize}`);
      err.code = 'EBADSIZE';
      err.found = streamSize;
      err.expected = opts.size;
      err.sri = sri;
      stream.emit('error', err);
    } else if (opts.integrity && !match) {
      var _err2 = new Error(`${sri} integrity checksum failed when using ${algorithm}: wanted ${digests} but got ${newSri}. (${streamSize} bytes)`);
      _err2.code = 'EINTEGRITY';
      _err2.found = newSri;
      _err2.expected = digests;
      _err2.algorithm = algorithm;
      _err2.sri = sri;
      stream.emit('error', _err2);
    } else {
      stream.emit('size', streamSize);
      stream.emit('integrity', newSri);
      match && stream.emit('verified', match);
    }
  });
  return stream;
}

module.exports.create = createIntegrity;
function createIntegrity(opts) {
  opts = opts || {};
  var algorithms = opts.algorithms || ['sha512'];
  var optString = opts.options && opts.options.length ?
  `?${opts.options.join('?')}` :
  '';

  var hashes = algorithms.map(crypto.createHash);

  return {
    update: function update(chunk, enc) {
      hashes.forEach(h => h.update(chunk, enc));
      return this;
    },
    digest: function digest(enc) {
      var integrity = algorithms.reduce((acc, algo) => {
        var digest = hashes.shift().digest('base64');
        var hash = new Hash(
        `${algo}-${digest}${optString}`,
        opts);

        if (hash.algorithm && hash.digest) {
          var _algo2 = hash.algorithm;
          if (!acc[_algo2]) {acc[_algo2] = [];}
          acc[_algo2].push(hash);
        }
        return acc;
      }, new Integrity());

      return integrity;
    } };

}

var NODE_HASHES = new Set(crypto.getHashes());

// This is a Best Effort™ at a reasonable priority for hash algos
var DEFAULT_PRIORITY = [
'md5', 'whirlpool', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512',
// TODO - it's unclear _which_ of these Node will actually use as its name
//        for the algorithm, so we guesswork it based on the OpenSSL names.
'sha3',
'sha3-256', 'sha3-384', 'sha3-512',
'sha3_256', 'sha3_384', 'sha3_512'].
filter(algo => NODE_HASHES.has(algo));

function getPrioritizedHash(algo1, algo2) {
  return DEFAULT_PRIORITY.indexOf(algo1.toLowerCase()) >= DEFAULT_PRIORITY.indexOf(algo2.toLowerCase()) ?
  algo1 :
  algo2;
}

/***/ }),
/* 6 */
/***/ (function(module) {

module.exports = {yarnVersion: "1.10.0-0"};

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

/* eslint-disable node/no-deprecated-api */
var buffer = __webpack_require__(8)
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}


/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = require("buffer");

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = require("crypto");

/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = require("stream");

/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, "parse", function() { return /* reexport */ lockfile_parse; });
__webpack_require__.d(__webpack_exports__, "stringify", function() { return /* reexport */ stringify; });
__webpack_require__.d(__webpack_exports__, "implodeEntry", function() { return /* binding */ implodeEntry; });
__webpack_require__.d(__webpack_exports__, "explodeEntry", function() { return /* binding */ explodeEntry; });
__webpack_require__.d(__webpack_exports__, "default", function() { return /* binding */ lockfile_Lockfile; });

// CONCATENATED MODULE: ./src/util/misc.js
function sortAlpha(a, b) {
  // sort alphabetically in a deterministic way
  var shortLen = Math.min(a.length, b.length);
  for (var i = 0; i < shortLen; i++) {
    var aChar = a.charCodeAt(i);
    var bChar = b.charCodeAt(i);
    if (aChar !== bChar) {
      return aChar - bChar;
    }
  }
  return a.length - b.length;
}

function entries(obj) {
  var entries = [];
  if (obj) {
    for (var key in obj) {
      entries.push([key, obj[key]]);
    }
  }
  return entries;
}

function removePrefix(pattern, prefix) {
  if (pattern.startsWith(prefix)) {
    pattern = pattern.slice(prefix.length);
  }

  return pattern;
}

function removeSuffix(pattern, suffix) {
  if (pattern.endsWith(suffix)) {
    return pattern.slice(0, -suffix.length);
  }

  return pattern;
}

function addSuffix(pattern, suffix) {
  if (!pattern.endsWith(suffix)) {
    return pattern + suffix;
  }

  return pattern;
}

function hyphenate(str) {
  return str.replace(/[A-Z]/g, match => {
    return '-' + match.charAt(0).toLowerCase();
  });
}

function compareSortedArrays(array1, array2) {
  if (array1.length !== array2.length) {
    return false;
  }
  for (var i = 0, len = array1.length; i < len; i++) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }
  return true;
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
// CONCATENATED MODULE: ./src/util/normalize-pattern.js
/**
 * Explode and normalize a pattern into its name and range.
 */
function normalizePattern(pattern) {
  var hasVersion = false;
  var range = 'latest';
  var name = pattern;

  // if we're a scope then remove the @ and add it back later
  var isScoped = false;
  if (name[0] === '@') {
    isScoped = true;
    name = name.slice(1);
  }

  // take first part as the name
  var parts = name.split('@');
  if (parts.length > 1) {
    name = parts.shift();
    range = parts.join('@');

    if (range) {
      hasVersion = true;
    } else {
      range = '*';
    }
  }

  // add back @ scope suffix
  if (isScoped) {
    name = `@${name}`;
  }

  return { name, range, hasVersion };
}
// EXTERNAL MODULE: external "util"
var external_util_ = __webpack_require__(3);
var external_util_default = /*#__PURE__*/__webpack_require__.n(external_util_);

// EXTERNAL MODULE: ./node_modules/invariant/invariant.js
var invariant = __webpack_require__(1);
var invariant_default = /*#__PURE__*/__webpack_require__.n(invariant);

// EXTERNAL MODULE: ./node_modules/strip-bom/index.js
var strip_bom = __webpack_require__(2);
var strip_bom_default = /*#__PURE__*/__webpack_require__.n(strip_bom);

// CONCATENATED MODULE: ./src/constants.js
var DEPENDENCY_TYPES = ['devDependencies', 'dependencies', 'optionalDependencies', 'peerDependencies'];
var RESOLUTIONS = 'resolutions';
var MANIFEST_FIELDS = [RESOLUTIONS].concat(DEPENDENCY_TYPES);

var SUPPORTED_NODE_VERSIONS = '^4.8.0 || ^5.7.0 || ^6.2.2 || >=8.0.0';

var YARN_REGISTRY = 'https://registry.yarnpkg.com';

var YARN_DOCS = 'https://yarnpkg.com/en/docs/cli/';
var YARN_INSTALLER_SH = 'https://yarnpkg.com/install.sh';
var YARN_INSTALLER_MSI = 'https://yarnpkg.com/latest.msi';

var SELF_UPDATE_VERSION_URL = 'https://yarnpkg.com/latest-version';

// cache version, bump whenever we make backwards incompatible changes
var CACHE_VERSION = 2;

// lockfile version, bump whenever we make backwards incompatible changes
var LOCKFILE_VERSION = 1;

// max amount of network requests to perform concurrently
var NETWORK_CONCURRENCY = 8;

// HTTP timeout used when downloading packages
var NETWORK_TIMEOUT = 30 * 1000; // in milliseconds

// max amount of child processes to execute concurrently
var CHILD_CONCURRENCY = 5;

var REQUIRED_PACKAGE_KEYS = ['name', 'version', '_uid'];

var NODE_MODULES_FOLDER = 'node_modules';
var NODE_PACKAGE_JSON = 'package.json';

var META_FOLDER = '.yarn-meta';
var INTEGRITY_FILENAME = '.yarn-integrity';
var LOCKFILE_FILENAME = 'yarn.lock';
var METADATA_FILENAME = '.yarn-metadata.json';
var TARBALL_FILENAME = '.yarn-tarball.tgz';
var CLEAN_FILENAME = '.yarnclean';

var NPM_LOCK_FILENAME = 'package-lock.json';
var NPM_SHRINKWRAP_FILENAME = 'npm-shrinkwrap.json';

var DEFAULT_INDENT = '  ';
var SINGLE_INSTANCE_PORT = 31997;
var SINGLE_INSTANCE_FILENAME = '.yarn-single-instance';

var VERSION_COLOR_SCHEME = {
  major: 'red',
  premajor: 'red',
  minor: 'yellow',
  preminor: 'yellow',
  patch: 'green',
  prepatch: 'green',
  prerelease: 'red',
  unchanged: 'white',
  unknown: 'red' };
// CONCATENATED MODULE: ./src/errors.js
class MessageError extends Error {
  constructor(msg, code) {
    super(msg);
    this.code = code;
  }}


class ProcessSpawnError extends MessageError {
  constructor(msg, code, process) {
    super(msg, code);
    this.process = process;
  }}


class SecurityError extends MessageError {}

class ProcessTermError extends MessageError {}

class ResponseError extends Error {
  constructor(msg, responseCode) {
    super(msg);
    this.responseCode = responseCode;
  }}
// CONCATENATED MODULE: ./src/util/map.js
function nullify() {var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (Array.isArray(obj)) {
    for (var item of obj) {
      nullify(item);
    }
  } else if (obj !== null && typeof obj === 'object' || typeof obj === 'function') {
    Object.setPrototypeOf(obj, null);

    // for..in can only be applied to 'object', not 'function'
    if (typeof obj === 'object') {
      for (var key in obj) {
        nullify(obj[key]);
      }
    }
  }

  return obj;
}
// CONCATENATED MODULE: ./src/lockfile/parse.js








var VERSION_REGEX = /^yarn lockfile v(\d+)$/;

var TOKEN_TYPES = {
  boolean: 'BOOLEAN',
  string: 'STRING',
  identifier: 'IDENTIFIER',
  eof: 'EOF',
  colon: 'COLON',
  newline: 'NEWLINE',
  comment: 'COMMENT',
  indent: 'INDENT',
  invalid: 'INVALID',
  number: 'NUMBER',
  comma: 'COMMA' };


var VALID_PROP_VALUE_TOKENS = [TOKEN_TYPES.boolean, TOKEN_TYPES.string, TOKEN_TYPES.number];

function isValidPropValueToken(token) {
  return VALID_PROP_VALUE_TOKENS.indexOf(token.type) >= 0;
}

function* tokenise(input) {
  var lastNewline = false;
  var line = 1;
  var col = 0;

  function buildToken(type, value) {
    return { line, col, type, value };
  }

  while (input.length) {
    var chop = 0;

    if (input[0] === '\n' || input[0] === '\r') {
      chop++;
      // If this is a \r\n line, ignore both chars but only add one new line
      if (input[1] === '\n') {
        chop++;
      }
      line++;
      col = 0;
      yield buildToken(TOKEN_TYPES.newline);
    } else if (input[0] === '#') {
      chop++;

      var val = '';
      while (input[chop] !== '\n') {
        val += input[chop];
        chop++;
      }
      yield buildToken(TOKEN_TYPES.comment, val);
    } else if (input[0] === ' ') {
      if (lastNewline) {
        var indent = '';
        for (var i = 0; input[i] === ' '; i++) {
          indent += input[i];
        }

        if (indent.length % 2) {
          throw new TypeError('Invalid number of spaces');
        } else {
          chop = indent.length;
          yield buildToken(TOKEN_TYPES.indent, indent.length / 2);
        }
      } else {
        chop++;
      }
    } else if (input[0] === '"') {
      var _val = '';

      for (var _i = 0;; _i++) {
        var currentChar = input[_i];
        _val += currentChar;

        if (_i > 0 && currentChar === '"') {
          var isEscaped = input[_i - 1] === '\\' && input[_i - 2] !== '\\';
          if (!isEscaped) {
            break;
          }
        }
      }

      chop = _val.length;

      try {
        yield buildToken(TOKEN_TYPES.string, JSON.parse(_val));
      } catch (err) {
        if (err instanceof SyntaxError) {
          yield buildToken(TOKEN_TYPES.invalid);
        } else {
          throw err;
        }
      }
    } else if (/^[0-9]/.test(input)) {
      var _val2 = '';
      for (var _i2 = 0; /^[0-9]$/.test(input[_i2]); _i2++) {
        _val2 += input[_i2];
      }
      chop = _val2.length;

      yield buildToken(TOKEN_TYPES.number, +_val2);
    } else if (/^true/.test(input)) {
      yield buildToken(TOKEN_TYPES.boolean, true);
      chop = 4;
    } else if (/^false/.test(input)) {
      yield buildToken(TOKEN_TYPES.boolean, false);
      chop = 5;
    } else if (input[0] === ':') {
      yield buildToken(TOKEN_TYPES.colon);
      chop++;
    } else if (input[0] === ',') {
      yield buildToken(TOKEN_TYPES.comma);
      chop++;
    } else if (/^[a-zA-Z\/-]/g.test(input)) {
      var name = '';
      for (var _i3 = 0; _i3 < input.length; _i3++) {
        var char = input[_i3];
        if (char === ':' || char === ' ' || char === '\n' || char === '\r' || char === ',') {
          break;
        } else {
          name += char;
        }
      }
      chop = name.length;

      yield buildToken(TOKEN_TYPES.string, name);
    } else {
      yield buildToken(TOKEN_TYPES.invalid);
    }

    if (!chop) {
      // will trigger infinite recursion
      yield buildToken(TOKEN_TYPES.invalid);
    }

    col += chop;
    lastNewline = input[0] === '\n' || input[0] === '\r' && input[1] === '\n';
    input = input.slice(chop);
  }

  yield buildToken(TOKEN_TYPES.eof);
}

class parse_Parser {
  constructor(input) {var fileLoc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'lockfile';
    this.comments = [];
    this.tokens = tokenise(input);
    this.fileLoc = fileLoc;
  }

  onComment(token) {
    var value = token.value;
    invariant_default()(typeof value === 'string', 'expected token value to be a string');

    var comment = value.trim();

    var versionMatch = comment.match(VERSION_REGEX);
    if (versionMatch) {
      var version = +versionMatch[1];
      if (version > LOCKFILE_VERSION) {
        throw new MessageError(
        `Can't install from a lockfile of version ${version} as you're on an old yarn version that only supports versions up to ${LOCKFILE_VERSION}. Run \`$ yarn self-update\` to upgrade to the latest version.`);

      }
    }

    this.comments.push(comment);
  }

  next() {
    var item = this.tokens.next();
    invariant_default()(item, 'expected a token');var

    done = item.done,value = item.value;
    if (done || !value) {
      throw new Error('No more tokens');
    } else if (value.type === TOKEN_TYPES.comment) {
      this.onComment(value);
      return this.next();
    } else {
      return this.token = value;
    }
  }

  unexpected() {var msg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Unexpected token';
    throw new SyntaxError(`${msg} ${this.token.line}:${this.token.col} in ${this.fileLoc}`);
  }

  expect(tokType) {
    if (this.token.type === tokType) {
      this.next();
    } else {
      this.unexpected();
    }
  }

  eat(tokType) {
    if (this.token.type === tokType) {
      this.next();
      return true;
    } else {
      return false;
    }
  }

  parse() {var indent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var obj = nullify();

    while (true) {
      var propToken = this.token;

      if (propToken.type === TOKEN_TYPES.newline) {
        var nextToken = this.next();
        if (!indent) {
          // if we have 0 indentation then the next token doesn't matter
          continue;
        }

        if (nextToken.type !== TOKEN_TYPES.indent) {
          // if we have no indentation after a newline then we've gone down a level
          break;
        }

        if (nextToken.value === indent) {
          // all is good, the indent is on our level
          this.next();
        } else {
          // the indentation is less than our level
          break;
        }
      } else if (propToken.type === TOKEN_TYPES.indent) {
        if (propToken.value === indent) {
          this.next();
        } else {
          break;
        }
      } else if (propToken.type === TOKEN_TYPES.eof) {
        break;
      } else if (propToken.type === TOKEN_TYPES.string) {
        // property key
        var key = propToken.value;
        invariant_default()(key, 'Expected a key');

        var keys = [key];
        this.next();

        // support multiple keys
        while (this.token.type === TOKEN_TYPES.comma) {
          this.next(); // skip comma

          var keyToken = this.token;
          if (keyToken.type !== TOKEN_TYPES.string) {
            this.unexpected('Expected string');
          }

          var _key = keyToken.value;
          invariant_default()(_key, 'Expected a key');
          keys.push(_key);
          this.next();
        }

        var valToken = this.token;

        if (valToken.type === TOKEN_TYPES.colon) {
          // object
          this.next();

          // parse object
          var val = this.parse(indent + 1);

          for (var _key2 of keys) {
            obj[_key2] = val;
          }

          if (indent && this.token.type !== TOKEN_TYPES.indent) {
            break;
          }
        } else if (isValidPropValueToken(valToken)) {
          // plain value
          for (var _key3 of keys) {
            obj[_key3] = valToken.value;
          }

          this.next();
        } else {
          this.unexpected('Invalid value type');
        }
      } else {
        this.unexpected(`Unknown token: ${external_util_default.a.inspect(propToken)}`);
      }
    }

    return obj;
  }}


var MERGE_CONFLICT_ANCESTOR = '|||||||';
var MERGE_CONFLICT_END = '>>>>>>>';
var MERGE_CONFLICT_SEP = '=======';
var MERGE_CONFLICT_START = '<<<<<<<';

/**
                                       * Extract the two versions of the lockfile from a merge conflict.
                                       */
function extractConflictVariants(str) {
  var variants = [[], []];
  var lines = str.split(/\r?\n/g);
  var skip = false;

  while (lines.length) {
    var line = lines.shift();
    if (line.startsWith(MERGE_CONFLICT_START)) {
      // get the first variant
      while (lines.length) {
        var conflictLine = lines.shift();
        if (conflictLine === MERGE_CONFLICT_SEP) {
          skip = false;
          break;
        } else if (skip || conflictLine.startsWith(MERGE_CONFLICT_ANCESTOR)) {
          skip = true;
          continue;
        } else {
          variants[0].push(conflictLine);
        }
      }

      // get the second variant
      while (lines.length) {
        var _conflictLine = lines.shift();
        if (_conflictLine.startsWith(MERGE_CONFLICT_END)) {
          break;
        } else {
          variants[1].push(_conflictLine);
        }
      }
    } else {
      variants[0].push(line);
      variants[1].push(line);
    }
  }

  return [variants[0].join('\n'), variants[1].join('\n')];
}

/**
   * Check if a lockfile has merge conflicts.
   */
function hasMergeConflicts(str) {
  return str.includes(MERGE_CONFLICT_START) && str.includes(MERGE_CONFLICT_SEP) && str.includes(MERGE_CONFLICT_END);
}

/**
   * Parse the lockfile.
   */
function parse(str, fileLoc) {
  var parser = new parse_Parser(str, fileLoc);
  parser.next();
  return parser.parse();
}

/**
   * Parse and merge the two variants in a conflicted lockfile.
   */
function parseWithConflict(str, fileLoc) {
  var variants = extractConflictVariants(str);
  try {
    return { type: 'merge', object: Object.assign({}, parse(variants[0], fileLoc), parse(variants[1], fileLoc)) };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { type: 'conflict', object: {} };
    } else {
      throw err;
    }
  }
}

/* harmony default export */ var lockfile_parse = (function (str) {var fileLoc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'lockfile';
  str = strip_bom_default()(str);
  return hasMergeConflicts(str) ? parseWithConflict(str, fileLoc) : { type: 'success', object: parse(str, fileLoc) };
});
// EXTERNAL MODULE: external "fs"
var external_fs_ = __webpack_require__(0);
var external_fs_default = /*#__PURE__*/__webpack_require__.n(external_fs_);

// CONCATENATED MODULE: ./src/util/fs.js




var constants =
typeof external_fs_default.a.constants !== 'undefined' ?
external_fs_default.a.constants :
{
  R_OK: external_fs_default.a.R_OK,
  W_OK: external_fs_default.a.W_OK,
  X_OK: external_fs_default.a.X_OK };


var exists = external_fs_default.a.existsSync;
var lstat = external_fs_default.a.lstatSync;

var _readFile = external_fs_default.a.readFileSync;

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
      object: nullify(JSON.parse(strip_bom_default()(file))),
      content: file };

  } catch (err) {
    err.message = `${loc}: ${err.message}`;
    throw err;
  }
}

function getFileSizeOnDisk(loc) {
  var stat = lstat(loc);var
  size = stat.size,blockSize = stat.blksize;

  return Math.ceil(size / blockSize) * blockSize;
}

function normalizeOS(body) {
  return body.replace(/\r\n/g, '\n');
}
// EXTERNAL MODULE: external "path"
var external_path_ = __webpack_require__(4);
var external_path_default = /*#__PURE__*/__webpack_require__.n(external_path_);

// EXTERNAL MODULE: ./node_modules/ssri/index.js
var ssri = __webpack_require__(5);

// EXTERNAL MODULE: ./package.json
var package_0 = __webpack_require__(6);

// CONCATENATED MODULE: ./src/lockfile/stringify.js




var NODE_VERSION = process.version;

function shouldWrapKey(str) {
  return (
    str.indexOf('true') === 0 ||
    str.indexOf('false') === 0 ||
    /[:\s\n\\",\[\]]/g.test(str) ||
    /^[0-9]/g.test(str) ||
    !/^[a-zA-Z]/g.test(str));

}

function maybeWrap(str) {
  if (typeof str === 'boolean' || typeof str === 'number' || shouldWrapKey(str)) {
    return JSON.stringify(str);
  } else {
    return str;
  }
}

var priorities = {
  name: 1,
  version: 2,
  uid: 3,
  resolved: 4,
  integrity: 5,
  registry: 6,
  dependencies: 7 };


function priorityThenAlphaSort(a, b) {
  if (priorities[a] || priorities[b]) {
    return (priorities[a] || 100) > (priorities[b] || 100) ? 1 : -1;
  } else {
    return sortAlpha(a, b);
  }
}

function _stringify(obj, options) {
  if (typeof obj !== 'object') {
    throw new TypeError();
  }

  var indent = options.indent;
  var lines = [];

  // Sorting order needs to be consistent between runs, we run native sort by name because there are no
  // problems with it being unstable because there are no to keys the same
  // However priorities can be duplicated and native sort can shuffle things from run to run
  var keys = Object.keys(obj).sort(priorityThenAlphaSort);

  var addedKeys = [];

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var val = obj[key];
    if (val == null || addedKeys.indexOf(key) >= 0) {
      continue;
    }

    var valKeys = [key];

    // get all keys that have the same value equality, we only want this for objects
    if (typeof val === 'object') {
      for (var j = i + 1; j < keys.length; j++) {
        var _key = keys[j];
        if (val === obj[_key]) {
          valKeys.push(_key);
        }
      }
    }

    var keyLine = valKeys.sort(sortAlpha).map(maybeWrap).join(', ');

    if (typeof val === 'string' || typeof val === 'boolean' || typeof val === 'number') {
      lines.push(`${keyLine} ${maybeWrap(val)}`);
    } else if (typeof val === 'object') {
      lines.push(`${keyLine}:\n${_stringify(val, { indent: indent + '  ' })}` + (options.topLevel ? '\n' : ''));
    } else {
      throw new TypeError();
    }

    addedKeys = addedKeys.concat(valKeys);
  }

  return indent + lines.join(`\n${indent}`);
}

function stringify(obj, noHeader, enableVersions) {
  var val = _stringify(obj, {
    indent: '',
    topLevel: true });

  if (noHeader) {
    return val;
  }

  var lines = [];
  lines.push('# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.');
  lines.push(`# yarn lockfile v${LOCKFILE_VERSION}`);
  if (enableVersions) {
    lines.push(`# yarn v${package_0.yarnVersion}`);
    lines.push(`# node ${NODE_VERSION}`);
  }
  lines.push('\n');
  lines.push(val);

  return lines.join('\n');
}
// CONCATENATED MODULE: ./src/lockfile/index.js













function getName(pattern) {
  return normalizePattern(pattern).name;
}

function blankObjectUndefined(obj) {
  return obj && Object.keys(obj).length ? obj : undefined;
}

function keyForRemote(remote) {
  return remote.resolved || (remote.reference && remote.hash ? `${remote.reference}#${remote.hash}` : null);
}

function serializeIntegrity(integrity) {
  // We need this because `Integrity.toString()` does not use sorting to ensure a stable string output
  // See https://git.io/vx2Hy
  return integrity.toString().split(' ').sort().join(' ');
}

function implodeEntry(pattern, obj) {
  var inferredName = getName(pattern);
  var integrity = obj.integrity ? serializeIntegrity(obj.integrity) : '';
  var imploded = {
    name: inferredName === obj.name ? undefined : obj.name,
    version: obj.version,
    uid: obj.uid === obj.version ? undefined : obj.uid,
    resolved: obj.resolved,
    registry: obj.registry === 'npm' ? undefined : obj.registry,
    dependencies: blankObjectUndefined(obj.dependencies),
    optionalDependencies: blankObjectUndefined(obj.optionalDependencies),
    permissions: blankObjectUndefined(obj.permissions),
    prebuiltVariants: blankObjectUndefined(obj.prebuiltVariants) };

  if (integrity) {
    imploded.integrity = integrity;
  }
  return imploded;
}

function explodeEntry(pattern, obj) {
  obj.optionalDependencies = obj.optionalDependencies || {};
  obj.dependencies = obj.dependencies || {};
  obj.uid = obj.uid || obj.version;
  obj.permissions = obj.permissions || {};
  obj.registry = obj.registry || 'npm';
  obj.name = obj.name || getName(pattern);
  var integrity = obj.integrity;
  if (integrity && integrity.isIntegrity) {
    obj.integrity = Object(ssri["parse"])(integrity);
  }
  return obj;
}

class lockfile_Lockfile {
  constructor() {var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},cache = _ref.cache,source = _ref.source,parseResultType = _ref.parseResultType;
    // source string if the `cache` was parsed
    this.source = source || '';
    this.cache = cache;
    this.parseResultType = parseResultType;
  }

  // if true, we're parsing an old yarn file and need to update integrity fields
  hasEntriesExistWithoutIntegrity() {
    if (!this.cache) {
      return false;
    }

    for (var key in this.cache) {
      // $FlowFixMe - `this.cache` is clearly defined at this point
      if (!/^.*@(file:|http)/.test(key) && this.cache[key] && !this.cache[key].integrity) {
        return true;
      }
    }

    return false;
  }

  static fromDirectory(dir, reporter) {
    // read the manifest in this directory
    var lockfileLoc = external_path_default.a.join(dir, LOCKFILE_FILENAME);

    var lockfile;
    var rawLockfile = '';
    var parseResult;

    if (exists(lockfileLoc)) {
      rawLockfile = readFile(lockfileLoc);
      parseResult = lockfile_parse(rawLockfile, lockfileLoc);

      if (reporter) {
        if (parseResult.type === 'merge') {
          reporter.info(reporter.lang('lockfileMerged'));
        } else if (parseResult.type === 'conflict') {
          reporter.warn(reporter.lang('lockfileConflict'));
        }
      }

      lockfile = parseResult.object;
    } else if (reporter) {
      reporter.info(reporter.lang('noLockfileFound'));
    }

    return new lockfile_Lockfile({ cache: lockfile, source: rawLockfile, parseResultType: parseResult && parseResult.type });
  }

  getLocked(pattern) {
    var cache = this.cache;
    if (!cache) {
      return undefined;
    }

    var shrunk = pattern in cache && cache[pattern];

    if (typeof shrunk === 'string') {
      return this.getLocked(shrunk);
    } else if (shrunk) {
      explodeEntry(pattern, shrunk);
      return shrunk;
    }

    return undefined;
  }

  removePattern(pattern) {
    var cache = this.cache;
    if (!cache) {
      return;
    }
    delete cache[pattern];
  }

  getLockfile(patterns) {
    var lockfile = {};
    var seen = new Map();

    // order by name so that lockfile manifest is assigned to the first dependency with this manifest
    // the others that have the same remoteKey will just refer to the first
    // ordering allows for consistency in lockfile when it is serialized
    var sortedPatternsKeys = Object.keys(patterns).sort(sortAlpha);

    for (var pattern of sortedPatternsKeys) {
      var pkg = patterns[pattern];var
      remote = pkg._remote,ref = pkg._reference;
      invariant_default()(ref, 'Package is missing a reference');
      invariant_default()(remote, 'Package is missing a remote');

      var remoteKey = keyForRemote(remote);
      var seenPattern = remoteKey && seen.get(remoteKey);
      if (seenPattern) {
        // no point in duplicating it
        lockfile[pattern] = seenPattern;

        // if we're relying on our name being inferred and two of the patterns have
        // different inferred names then we need to set it
        if (!seenPattern.name && getName(pattern) !== pkg.name) {
          seenPattern.name = pkg.name;
        }
        continue;
      }
      var obj = implodeEntry(pattern, {
        name: pkg.name,
        version: pkg.version,
        uid: pkg._uid,
        resolved: remote.resolved,
        integrity: remote.integrity,
        registry: remote.registry,
        dependencies: pkg.dependencies,
        peerDependencies: pkg.peerDependencies,
        optionalDependencies: pkg.optionalDependencies,
        permissions: ref.permissions,
        prebuiltVariants: pkg.prebuiltVariants });


      lockfile[pattern] = obj;

      if (remoteKey) {
        seen.set(remoteKey, obj);
      }
    }

    return lockfile;
  }}

/***/ })
/******/ ]);