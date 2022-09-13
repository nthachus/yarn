!function() {
  "use strict";
  var __webpack_modules__ = {
    556: function(module, __unused_webpack_exports, __webpack_require__) {
      var Buffer = __webpack_require__(834).Buffer, crypto = __webpack_require__(113), SPEC_ALGORITHMS = (__webpack_require__(781).Transform, 
      [ "sha256", "sha384", "sha512" ]), BASE64_REGEX = /^[a-z0-9+/]+(?:=?=?)$/i, SRI_REGEX = /^([^-]+)-([^?]+)([?\S*]*)$/, STRICT_SRI_REGEX = /^([^-]+)-([A-Za-z0-9+/=]{44,88})(\?[\x21-\x7E]*)*$/, VCHAR_REGEX = /^[\x21-\x7E]+$/;
      class Hash {
        get isHash() {
          return !0;
        }
        constructor(hash, opts) {
          var strict = !(!opts || !opts.strict);
          this.source = hash.trim();
          var match = this.source.match(strict ? STRICT_SRI_REGEX : SRI_REGEX);
          if (match && (!strict || SPEC_ALGORITHMS.some((a => a === match[1])))) {
            this.algorithm = match[1], this.digest = match[2];
            var rawOpts = match[3];
            this.options = rawOpts ? rawOpts.slice(1).split("?") : [];
          }
        }
        hexDigest() {
          return this.digest && Buffer.from(this.digest, "base64").toString("hex");
        }
        toJSON() {
          return this.toString();
        }
        toString(opts) {
          if (opts && opts.strict && !(SPEC_ALGORITHMS.some((x => x === this.algorithm)) && this.digest.match(BASE64_REGEX) && (this.options || []).every((opt => opt.match(VCHAR_REGEX))))) return "";
          var options = this.options && this.options.length ? `?${this.options.join("?")}` : "";
          return `${this.algorithm}-${this.digest}${options}`;
        }
      }
      class Integrity {
        get isIntegrity() {
          return !0;
        }
        toJSON() {
          return this.toString();
        }
        toString(opts) {
          var sep = (opts = opts || {}).sep || " ";
          return opts.strict && (sep = sep.replace(/\S+/g, " ")), Object.keys(this).map((k => this[k].map((hash => Hash.prototype.toString.call(hash, opts))).filter((x => x.length)).join(sep))).filter((x => x.length)).join(sep);
        }
        concat(integrity, opts) {
          var other = "string" == typeof integrity ? integrity : stringify(integrity, opts);
          return parse(`${this.toString(opts)} ${other}`, opts);
        }
        hexDigest() {
          return parse(this, {
            single: !0
          }).hexDigest();
        }
        match(integrity, opts) {
          var other = parse(integrity, opts), algo = other.pickAlgorithm(opts);
          return this[algo] && other[algo] && this[algo].find((hash => other[algo].find((otherhash => hash.digest === otherhash.digest)))) || !1;
        }
        pickAlgorithm(opts) {
          var pickAlgorithm = opts && opts.pickAlgorithm || getPrioritizedHash, keys = Object.keys(this);
          if (!keys.length) throw new Error(`No algorithms available for ${JSON.stringify(this.toString())}`);
          return keys.reduce(((acc, algo) => pickAlgorithm(acc, algo) || acc));
        }
      }
      function parse(sri, opts) {
        if (opts = opts || {}, "string" == typeof sri) return _parse(sri, opts);
        if (sri.algorithm && sri.digest) {
          var fullSri = new Integrity;
          return fullSri[sri.algorithm] = [ sri ], _parse(stringify(fullSri, opts), opts);
        }
        return _parse(stringify(sri, opts), opts);
      }
      function _parse(integrity, opts) {
        return opts.single ? new Hash(integrity, opts) : integrity.trim().split(/\s+/).reduce(((acc, string) => {
          var hash = new Hash(string, opts);
          if (hash.algorithm && hash.digest) {
            var algo = hash.algorithm;
            acc[algo] || (acc[algo] = []), acc[algo].push(hash);
          }
          return acc;
        }), new Integrity);
      }
      function stringify(obj, opts) {
        return obj.algorithm && obj.digest ? Hash.prototype.toString.call(obj, opts) : "string" == typeof obj ? stringify(parse(obj, opts), opts) : Integrity.prototype.toString.call(obj, opts);
      }
      module.exports.parse = parse;
      var NODE_HASHES = new Set(crypto.getHashes()), DEFAULT_PRIORITY = [ "md5", "whirlpool", "sha1", "sha224", "sha256", "sha384", "sha512", "sha3", "sha3-256", "sha3-384", "sha3-512", "sha3_256", "sha3_384", "sha3_512" ].filter((algo => NODE_HASHES.has(algo)));
      function getPrioritizedHash(algo1, algo2) {
        return DEFAULT_PRIORITY.indexOf(algo1.toLowerCase()) >= DEFAULT_PRIORITY.indexOf(algo2.toLowerCase()) ? algo1 : algo2;
      }
    },
    128: function(module) {
      var NODE_ENV = process.env.NODE_ENV;
      module.exports = function(condition, format, a, b, c, d, e, f) {
        if ("production" !== NODE_ENV && void 0 === format) throw new Error("invariant requires an error message argument");
        if (!condition) {
          var error;
          if (void 0 === format) error = new Error("Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings."); else {
            var args = [ a, b, c, d, e, f ], argIndex = 0;
            (error = new Error(format.replace(/%s/g, (function() {
              return args[argIndex++];
            })))).name = "Invariant Violation";
          }
          throw error.framesToPop = 1, error;
        }
      };
    },
    403: function(module) {
      module.exports = x => {
        if ("string" != typeof x) throw new TypeError("Expected a string, got " + typeof x);
        return 65279 === x.charCodeAt(0) ? x.slice(1) : x;
      };
    },
    834: function(module, exports, __webpack_require__) {
      var buffer = __webpack_require__(300), Buffer = buffer.Buffer;
      function copyProps(src, dst) {
        for (var key in src) dst[key] = src[key];
      }
      function SafeBuffer(arg, encodingOrOffset, length) {
        return Buffer(arg, encodingOrOffset, length);
      }
      Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow ? module.exports = buffer : (copyProps(buffer, exports), 
      exports.Buffer = SafeBuffer), copyProps(Buffer, SafeBuffer), SafeBuffer.from = function(arg, encodingOrOffset, length) {
        if ("number" == typeof arg) throw new TypeError("Argument must not be a number");
        return Buffer(arg, encodingOrOffset, length);
      }, SafeBuffer.alloc = function(size, fill, encoding) {
        if ("number" != typeof size) throw new TypeError("Argument must be a number");
        var buf = Buffer(size);
        return void 0 !== fill ? "string" == typeof encoding ? buf.fill(fill, encoding) : buf.fill(fill) : buf.fill(0), 
        buf;
      }, SafeBuffer.allocUnsafe = function(size) {
        if ("number" != typeof size) throw new TypeError("Argument must be a number");
        return Buffer(size);
      }, SafeBuffer.allocUnsafeSlow = function(size) {
        if ("number" != typeof size) throw new TypeError("Argument must be a number");
        return buffer.SlowBuffer(size);
      };
    },
    300: function(module) {
      module.exports = require("buffer");
    },
    113: function(module) {
      module.exports = require("crypto");
    },
    147: function(module) {
      module.exports = require("fs");
    },
    17: function(module) {
      module.exports = require("path");
    },
    781: function(module) {
      module.exports = require("stream");
    },
    837: function(module) {
      module.exports = require("util");
    },
    598: function(module) {
      module.exports = {
        pK: "1.17.0-0"
      };
    }
  }, __webpack_module_cache__ = {};
  function __webpack_require__(moduleId) {
    var cachedModule = __webpack_module_cache__[moduleId];
    if (void 0 !== cachedModule) return cachedModule.exports;
    var module = __webpack_module_cache__[moduleId] = {
      exports: {}
    };
    return __webpack_modules__[moduleId](module, module.exports, __webpack_require__), 
    module.exports;
  }
  __webpack_require__.d = function(exports, definition) {
    for (var key in definition) __webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key) && Object.defineProperty(exports, key, {
      enumerable: !0,
      get: definition[key]
    });
  }, __webpack_require__.o = function(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }, __webpack_require__.r = function(exports) {
    "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(exports, Symbol.toStringTag, {
      value: "Module"
    }), Object.defineProperty(exports, "__esModule", {
      value: !0
    });
  };
  var __webpack_exports__ = {};
  !function() {
    function sortAlpha(a, b) {
      for (var shortLen = Math.min(a.length, b.length), i = 0; i < shortLen; i++) {
        var aChar = a.charCodeAt(i), bChar = b.charCodeAt(i);
        if (aChar !== bChar) return aChar - bChar;
      }
      return a.length - b.length;
    }
    __webpack_require__.r(__webpack_exports__), __webpack_require__.d(__webpack_exports__, {
      default: function() {
        return Lockfile;
      },
      explodeEntry: function() {
        return explodeEntry;
      },
      implodeEntry: function() {
        return implodeEntry;
      },
      parse: function() {
        return lockfile_parse;
      },
      stringify: function() {
        return stringify;
      }
    });
    class MessageError extends Error {
      constructor(msg, code) {
        super(msg), this.code = code;
      }
    }
    function nullify() {
      var obj = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
      if (Array.isArray(obj)) for (var item of obj) nullify(item); else if ((null !== obj && "object" == typeof obj || "function" == typeof obj) && (Object.setPrototypeOf(obj, null), 
      "object" == typeof obj)) for (var key in obj) nullify(obj[key]);
      return obj;
    }
    var util = __webpack_require__(837), invariant = __webpack_require__(128), stripBOM = __webpack_require__(403), VERSION_REGEX = /^yarn lockfile v(\d+)$/, TOKEN_TYPES_boolean = "BOOLEAN", TOKEN_TYPES_string = "STRING", TOKEN_TYPES_eof = "EOF", TOKEN_TYPES_colon = "COLON", TOKEN_TYPES_newline = "NEWLINE", TOKEN_TYPES_comment = "COMMENT", TOKEN_TYPES_indent = "INDENT", TOKEN_TYPES_invalid = "INVALID", TOKEN_TYPES_number = "NUMBER", TOKEN_TYPES_comma = "COMMA", VALID_PROP_VALUE_TOKENS = [ TOKEN_TYPES_boolean, TOKEN_TYPES_string, TOKEN_TYPES_number ];
    class Parser {
      constructor(input) {
        var fileLoc = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "lockfile";
        this.comments = [], this.tokens = function*(input) {
          var lastNewline = !1, line = 1, col = 0;
          function buildToken(type, value) {
            return {
              line: line,
              col: col,
              type: type,
              value: value
            };
          }
          for (;input.length; ) {
            var chop = 0;
            if ("\n" === input[0] || "\r" === input[0]) chop++, "\n" === input[1] && chop++, 
            line++, col = 0, yield buildToken(TOKEN_TYPES_newline); else if ("#" === input[0]) {
              chop++;
              var nextNewline = input.indexOf("\n", chop);
              nextNewline < 0 && (nextNewline = input.length);
              var val = input.substring(chop, nextNewline);
              chop = nextNewline, yield buildToken(TOKEN_TYPES_comment, val);
            } else if (" " === input[0]) if (lastNewline) {
              for (var indentSize = 1, i = 1; " " === input[i]; i++) indentSize++;
              if (indentSize % 2) throw new TypeError("Invalid number of spaces");
              chop = indentSize, yield buildToken(TOKEN_TYPES_indent, indentSize / 2);
            } else chop++; else if ('"' === input[0]) {
              for (var _i = 1; _i < input.length; _i++) if ('"' === input[_i] && ("\\" !== input[_i - 1] || "\\" === input[_i - 2])) {
                _i++;
                break;
              }
              var _val = input.substring(0, _i);
              chop = _i;
              try {
                yield buildToken(TOKEN_TYPES_string, JSON.parse(_val));
              } catch (err) {
                if (!(err instanceof SyntaxError)) throw err;
                yield buildToken(TOKEN_TYPES_invalid);
              }
            } else if (/^[0-9]/.test(input)) {
              var _val2 = /^[0-9]+/.exec(input)[0];
              chop = _val2.length, yield buildToken(TOKEN_TYPES_number, +_val2);
            } else if (/^true/.test(input)) yield buildToken(TOKEN_TYPES_boolean, !0), chop = 4; else if (/^false/.test(input)) yield buildToken(TOKEN_TYPES_boolean, !1), 
            chop = 5; else if (":" === input[0]) yield buildToken(TOKEN_TYPES_colon), chop++; else if ("," === input[0]) yield buildToken(TOKEN_TYPES_comma), 
            chop++; else if (/^[a-zA-Z\/.-]/g.test(input)) {
              for (var _i2 = 0; _i2 < input.length; _i2++) {
                var char = input[_i2];
                if (":" === char || " " === char || "\n" === char || "\r" === char || "," === char) break;
              }
              var name = input.substring(0, _i2);
              chop = _i2, yield buildToken(TOKEN_TYPES_string, name);
            } else yield buildToken(TOKEN_TYPES_invalid);
            chop || (yield buildToken(TOKEN_TYPES_invalid)), col += chop, lastNewline = "\n" === input[0] || "\r" === input[0] && "\n" === input[1], 
            input = input.slice(chop);
          }
          yield buildToken(TOKEN_TYPES_eof);
        }(input), this.fileLoc = fileLoc;
      }
      onComment(token) {
        var value = token.value;
        invariant("string" == typeof value, "expected token value to be a string");
        var comment = value.trim(), versionMatch = comment.match(VERSION_REGEX);
        if (versionMatch) {
          var version = +versionMatch[1];
          if (version > 1) throw new MessageError(`Can't install from a lockfile of version ${version} as you're on an old yarn version that only supports versions up to 1. Run \`$ yarn self-update\` to upgrade to the latest version.`);
        }
        this.comments.push(comment);
      }
      next() {
        var item = this.tokens.next();
        invariant(item, "expected a token");
        var done = item.done, value = item.value;
        if (done || !value) throw new Error("No more tokens");
        return value.type === TOKEN_TYPES_comment ? (this.onComment(value), this.next()) : this.token = value;
      }
      unexpected() {
        throw new SyntaxError(`${arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : "Unexpected token"} ${this.token.line}:${this.token.col} in ${this.fileLoc}`);
      }
      expect(tokType) {
        this.token.type === tokType ? this.next() : this.unexpected();
      }
      eat(tokType) {
        return this.token.type === tokType && (this.next(), !0);
      }
      parse() {
        for (var token, indent = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0, obj = nullify(); ;) {
          var propToken = this.token;
          if (propToken.type === TOKEN_TYPES_newline) {
            var nextToken = this.next();
            if (!indent) continue;
            if (nextToken.type !== TOKEN_TYPES_indent) break;
            if (nextToken.value !== indent) break;
            this.next();
          } else if (propToken.type === TOKEN_TYPES_indent) {
            if (propToken.value !== indent) break;
            this.next();
          } else {
            if (propToken.type === TOKEN_TYPES_eof) break;
            if (propToken.type === TOKEN_TYPES_string) {
              var key = propToken.value;
              invariant(key, "Expected a key");
              var keys = [ key ];
              for (this.next(); this.token.type === TOKEN_TYPES_comma; ) {
                this.next();
                var keyToken = this.token;
                keyToken.type !== TOKEN_TYPES_string && this.unexpected("Expected string");
                var _key = keyToken.value;
                invariant(_key, "Expected a key"), keys.push(_key), this.next();
              }
              var wasColon = this.token.type === TOKEN_TYPES_colon;
              if (wasColon && this.next(), token = this.token, VALID_PROP_VALUE_TOKENS.indexOf(token.type) >= 0) {
                for (var _key2 of keys) obj[_key2] = this.token.value;
                this.next();
              } else if (wasColon) {
                var val = this.parse(indent + 1);
                for (var _key3 of keys) obj[_key3] = val;
                if (indent && this.token.type !== TOKEN_TYPES_indent) break;
              } else this.unexpected("Invalid value type");
            } else this.unexpected(`Unknown token: ${util.inspect(propToken)}`);
          }
        }
        return obj;
      }
    }
    function hasMergeConflicts(str) {
      return str.includes("<<<<<<<") && str.includes("=======") && str.includes(">>>>>>>");
    }
    function parse(str, fileLoc) {
      var parser = new Parser(str, fileLoc);
      return parser.next(), parser.parse();
    }
    function parseWithConflict(str, fileLoc) {
      var variants = function(str) {
        for (var variants = [ [], [] ], lines = str.split(/\r?\n/g), skip = !1; lines.length; ) {
          var line = lines.shift();
          if (line.startsWith("<<<<<<<")) {
            for (;lines.length; ) {
              var conflictLine = lines.shift();
              if ("=======" === conflictLine) {
                skip = !1;
                break;
              }
              skip || conflictLine.startsWith("|||||||") ? skip = !0 : variants[0].push(conflictLine);
            }
            for (;lines.length; ) {
              var _conflictLine = lines.shift();
              if (_conflictLine.startsWith(">>>>>>>")) break;
              variants[1].push(_conflictLine);
            }
          } else variants[0].push(line), variants[1].push(line);
        }
        return [ variants[0].join("\n"), variants[1].join("\n") ];
      }(str);
      try {
        return {
          type: "merge",
          object: Object.assign({}, parse(variants[0], fileLoc), parse(variants[1], fileLoc))
        };
      } catch (err) {
        if (err instanceof SyntaxError) return {
          type: "conflict",
          object: {}
        };
        throw err;
      }
    }
    function lockfile_parse(str) {
      var fileLoc = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : "lockfile";
      return hasMergeConflicts(str = stripBOM(str)) ? parseWithConflict(str, fileLoc) : {
        type: "success",
        object: parse(str, fileLoc)
      };
    }
    var fs = __webpack_require__(147), exists = (__webpack_require__(403), void 0 !== fs.constants ? fs.constants : (fs.R_OK, 
    fs.W_OK, fs.X_OK), fs.existsSync), _readFile = (fs.lstatSync, fs.readFileSync);
    function readFile(loc) {
      return _readFile(loc, "utf8").replace(/\r\n/g, "\n");
    }
    var YARN_VERSION = __webpack_require__(598).pK, NODE_VERSION = process.version;
    function maybeWrap(str) {
      return "boolean" == typeof str || "number" == typeof str || function(str) {
        return 0 === str.indexOf("true") || 0 === str.indexOf("false") || /[:\s\n\\",\[\]]/g.test(str) || /^[0-9]/g.test(str) || !/^[a-zA-Z]/g.test(str);
      }(str) ? JSON.stringify(str) : str;
    }
    var priorities = {
      name: 1,
      version: 2,
      uid: 3,
      resolved: 4,
      integrity: 5,
      registry: 6,
      dependencies: 7
    };
    function priorityThenAlphaSort(a, b) {
      return priorities[a] || priorities[b] ? (priorities[a] || 100) > (priorities[b] || 100) ? 1 : -1 : sortAlpha(a, b);
    }
    function _stringify(obj, options) {
      if ("object" != typeof obj) throw new TypeError;
      for (var indent = options.indent, lines = [], keys = Object.keys(obj).sort(priorityThenAlphaSort), addedKeys = [], i = 0; i < keys.length; i++) {
        var key = keys[i], val = obj[key];
        if (!(null == val || addedKeys.indexOf(key) >= 0)) {
          var valKeys = [ key ];
          if ("object" == typeof val) for (var j = i + 1; j < keys.length; j++) {
            var _key = keys[j];
            val === obj[_key] && valKeys.push(_key);
          }
          var keyLine = valKeys.sort(sortAlpha).map(maybeWrap).join(", ");
          if ("string" == typeof val || "boolean" == typeof val || "number" == typeof val) lines.push(`${keyLine} ${maybeWrap(val)}`); else {
            if ("object" != typeof val) throw new TypeError;
            lines.push(`${keyLine}:\n${_stringify(val, {
              indent: indent + "  "
            })}` + (options.topLevel ? "\n" : ""));
          }
          addedKeys = addedKeys.concat(valKeys);
        }
      }
      return indent + lines.join(`\n${indent}`);
    }
    function stringify(obj, noHeader, enableVersions) {
      var val = _stringify(obj, {
        indent: "",
        topLevel: !0
      });
      if (noHeader) return val;
      var lines = [];
      return lines.push("# THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY."), 
      lines.push("# yarn lockfile v1"), enableVersions && (lines.push(`# yarn v${YARN_VERSION}`), 
      lines.push(`# node ${NODE_VERSION}`)), lines.push("\n"), lines.push(val), lines.join("\n");
    }
    var lockfile_invariant = __webpack_require__(128), path = __webpack_require__(17), ssri = __webpack_require__(556);
    function getName(pattern) {
      return function(pattern) {
        var hasVersion = !1, range = "latest", name = pattern, isScoped = !1;
        "@" === name[0] && (isScoped = !0, name = name.slice(1));
        var parts = name.split("@");
        return parts.length > 1 && (name = parts.shift(), (range = parts.join("@")) ? hasVersion = !0 : range = "*"), 
        isScoped && (name = `@${name}`), {
          name: name,
          range: range,
          hasVersion: hasVersion
        };
      }(pattern).name;
    }
    function blankObjectUndefined(obj) {
      return obj && Object.keys(obj).length ? obj : void 0;
    }
    function keyForRemote(remote) {
      return remote.resolved || (remote.reference && remote.hash ? `${remote.reference}#${remote.hash}` : null);
    }
    function implodeEntry(pattern, obj) {
      var inferredName = getName(pattern), integrity = obj.integrity ? function(integrity) {
        return integrity.toString().split(" ").sort().join(" ");
      }(obj.integrity) : "", imploded = {
        name: inferredName === obj.name ? void 0 : obj.name,
        version: obj.version,
        uid: obj.uid === obj.version ? void 0 : obj.uid,
        resolved: obj.resolved,
        registry: "npm" === obj.registry ? void 0 : obj.registry,
        dependencies: blankObjectUndefined(obj.dependencies),
        optionalDependencies: blankObjectUndefined(obj.optionalDependencies),
        permissions: blankObjectUndefined(obj.permissions),
        prebuiltVariants: blankObjectUndefined(obj.prebuiltVariants)
      };
      return integrity && (imploded.integrity = integrity), imploded;
    }
    function explodeEntry(pattern, obj) {
      obj.optionalDependencies = obj.optionalDependencies || {}, obj.dependencies = obj.dependencies || {}, 
      obj.uid = obj.uid || obj.version, obj.permissions = obj.permissions || {}, obj.registry = obj.registry || "npm", 
      obj.name = obj.name || getName(pattern);
      var integrity = obj.integrity;
      return integrity && integrity.isIntegrity && (obj.integrity = ssri.parse(integrity)), 
      obj;
    }
    class Lockfile {
      constructor() {
        var _ref = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {}, cache = _ref.cache, source = _ref.source, parseResultType = _ref.parseResultType;
        this.source = source || "", this.cache = cache, this.parseResultType = parseResultType;
      }
      hasEntriesExistWithoutIntegrity() {
        if (!this.cache) return !1;
        for (var key in this.cache) if (!/^.*@(file:|http)/.test(key) && this.cache[key] && !this.cache[key].integrity) return !0;
        return !1;
      }
      static fromDirectory(dir, reporter) {
        var lockfile, parseResult, lockfileLoc = path.join(dir, "yarn.lock"), rawLockfile = "";
        return exists(lockfileLoc) ? (parseResult = lockfile_parse(rawLockfile = readFile(lockfileLoc), lockfileLoc), 
        reporter && ("merge" === parseResult.type ? reporter.info(reporter.lang("lockfileMerged")) : "conflict" === parseResult.type && reporter.warn(reporter.lang("lockfileConflict"))), 
        lockfile = parseResult.object) : reporter && reporter.info(reporter.lang("noLockfileFound")), 
        new Lockfile({
          cache: lockfile,
          source: rawLockfile,
          parseResultType: parseResult && parseResult.type
        });
      }
      getLocked(pattern) {
        var cache = this.cache;
        if (cache) {
          var shrunk = pattern in cache && cache[pattern];
          return "string" == typeof shrunk ? this.getLocked(shrunk) : shrunk ? (explodeEntry(pattern, shrunk), 
          shrunk) : void 0;
        }
      }
      removePattern(pattern) {
        var cache = this.cache;
        cache && delete cache[pattern];
      }
      getLockfile(patterns) {
        var lockfile = {}, seen = new Map, sortedPatternsKeys = Object.keys(patterns).sort(sortAlpha);
        for (var pattern of sortedPatternsKeys) {
          var pkg = patterns[pattern], remote = pkg._remote, ref = pkg._reference;
          lockfile_invariant(ref, "Package is missing a reference"), lockfile_invariant(remote, "Package is missing a remote");
          var remoteKey = keyForRemote(remote), seenPattern = remoteKey && seen.get(remoteKey);
          if (seenPattern) lockfile[pattern] = seenPattern, seenPattern.name || getName(pattern) === pkg.name || (seenPattern.name = pkg.name); else {
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
              prebuiltVariants: pkg.prebuiltVariants
            });
            lockfile[pattern] = obj, remoteKey && seen.set(remoteKey, obj);
          }
        }
        return lockfile;
      }
    }
  }(), module.exports = __webpack_exports__;
}();