!function() {
  "use strict";
  var __webpack_modules__ = {
    957: function(module, __unused_webpack_exports, __webpack_require__) {
      var Buffer = __webpack_require__(181).Buffer, crypto = __webpack_require__(113), SPEC_ALGORITHMS = (__webpack_require__(781).Transform, 
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
    596: function(module) {
      function isNothing(subject) {
        return null == subject;
      }
      module.exports.isNothing = isNothing, module.exports.isObject = function(subject) {
        return "object" == typeof subject && null !== subject;
      }, module.exports.toArray = function(sequence) {
        return Array.isArray(sequence) ? sequence : isNothing(sequence) ? [] : [ sequence ];
      }, module.exports.repeat = function(string, count) {
        var cycle, result = "";
        for (cycle = 0; cycle < count; cycle += 1) result += string;
        return result;
      }, module.exports.isNegativeZero = function(number) {
        return 0 === number && Number.NEGATIVE_INFINITY === 1 / number;
      }, module.exports.extend = function(target, source) {
        var index, length, key, sourceKeys;
        if (source) for (index = 0, length = (sourceKeys = Object.keys(source)).length; index < length; index += 1) target[key = sourceKeys[index]] = source[key];
        return target;
      };
    },
    884: function(module) {
      function YAMLException(reason, mark) {
        Error.call(this), this.name = "YAMLException", this.reason = reason, this.mark = mark, 
        this.message = (this.reason || "(unknown reason)") + (this.mark ? " " + this.mark.toString() : ""), 
        Error.captureStackTrace ? Error.captureStackTrace(this, this.constructor) : this.stack = (new Error).stack || "";
      }
      YAMLException.prototype = Object.create(Error.prototype), YAMLException.prototype.constructor = YAMLException, 
      YAMLException.prototype.toString = function(compact) {
        var result = this.name + ": ";
        return result += this.reason || "(unknown reason)", !compact && this.mark && (result += " " + this.mark.toString()), 
        result;
      }, module.exports = YAMLException;
    },
    334: function(module, __unused_webpack_exports, __webpack_require__) {
      var common = __webpack_require__(596);
      function Mark(name, buffer, position, line, column) {
        this.name = name, this.buffer = buffer, this.position = position, this.line = line, 
        this.column = column;
      }
      Mark.prototype.getSnippet = function(indent, maxLength) {
        var head, start, tail, end, snippet;
        if (!this.buffer) return null;
        for (indent = indent || 4, maxLength = maxLength || 75, head = "", start = this.position; start > 0 && -1 === "\0\r\n\u2028\u2029".indexOf(this.buffer.charAt(start - 1)); ) if (start -= 1, 
        this.position - start > maxLength / 2 - 1) {
          head = " ... ", start += 5;
          break;
        }
        for (tail = "", end = this.position; end < this.buffer.length && -1 === "\0\r\n\u2028\u2029".indexOf(this.buffer.charAt(end)); ) if ((end += 1) - this.position > maxLength / 2 - 1) {
          tail = " ... ", end -= 5;
          break;
        }
        return snippet = this.buffer.slice(start, end), common.repeat(" ", indent) + head + snippet + tail + "\n" + common.repeat(" ", indent + this.position - start + head.length) + "^";
      }, Mark.prototype.toString = function(compact) {
        var snippet, where = "";
        return this.name && (where += 'in "' + this.name + '" '), where += "at line " + (this.line + 1) + ", column " + (this.column + 1), 
        compact || (snippet = this.getSnippet()) && (where += ":\n" + snippet), where;
      }, module.exports = Mark;
    },
    409: function(module, __unused_webpack_exports, __webpack_require__) {
      var common = __webpack_require__(596), YAMLException = __webpack_require__(884), Type = __webpack_require__(899);
      function compileList(schema, name, result) {
        var exclude = [];
        return schema.include.forEach((function(includedSchema) {
          result = compileList(includedSchema, name, result);
        })), schema[name].forEach((function(currentType) {
          result.forEach((function(previousType, previousIndex) {
            previousType.tag === currentType.tag && previousType.kind === currentType.kind && exclude.push(previousIndex);
          })), result.push(currentType);
        })), result.filter((function(type, index) {
          return -1 === exclude.indexOf(index);
        }));
      }
      function Schema(definition) {
        this.include = definition.include || [], this.implicit = definition.implicit || [], 
        this.explicit = definition.explicit || [], this.implicit.forEach((function(type) {
          if (type.loadKind && "scalar" !== type.loadKind) throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
        })), this.compiledImplicit = compileList(this, "implicit", []), this.compiledExplicit = compileList(this, "explicit", []), 
        this.compiledTypeMap = function() {
          var index, length, result = {
            scalar: {},
            sequence: {},
            mapping: {},
            fallback: {}
          };
          function collectType(type) {
            result[type.kind][type.tag] = result.fallback[type.tag] = type;
          }
          for (index = 0, length = arguments.length; index < length; index += 1) arguments[index].forEach(collectType);
          return result;
        }(this.compiledImplicit, this.compiledExplicit);
      }
      Schema.DEFAULT = null, Schema.create = function() {
        var schemas, types;
        switch (arguments.length) {
         case 1:
          schemas = Schema.DEFAULT, types = arguments[0];
          break;

         case 2:
          schemas = arguments[0], types = arguments[1];
          break;

         default:
          throw new YAMLException("Wrong number of arguments for Schema.create function");
        }
        if (schemas = common.toArray(schemas), types = common.toArray(types), !schemas.every((function(schema) {
          return schema instanceof Schema;
        }))) throw new YAMLException("Specified list of super schemas (or a single Schema object) contains a non-Schema object.");
        if (!types.every((function(type) {
          return type instanceof Type;
        }))) throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        return new Schema({
          include: schemas,
          explicit: types
        });
      }, module.exports = Schema;
    },
    318: function(module, __unused_webpack_exports, __webpack_require__) {
      var Schema = __webpack_require__(409);
      module.exports = new Schema({
        include: [ __webpack_require__(796) ]
      });
    },
    972: function(module, __unused_webpack_exports, __webpack_require__) {
      var Schema = __webpack_require__(409);
      module.exports = new Schema({
        include: [ __webpack_require__(318) ],
        implicit: [ __webpack_require__(145), __webpack_require__(243) ],
        explicit: [ __webpack_require__(964), __webpack_require__(878), __webpack_require__(244), __webpack_require__(138) ]
      });
    },
    322: function(module, __unused_webpack_exports, __webpack_require__) {
      var Schema = __webpack_require__(409);
      module.exports = new Schema({
        explicit: [ __webpack_require__(483), __webpack_require__(745), __webpack_require__(553) ]
      });
    },
    796: function(module, __unused_webpack_exports, __webpack_require__) {
      var Schema = __webpack_require__(409);
      module.exports = new Schema({
        include: [ __webpack_require__(322) ],
        implicit: [ __webpack_require__(22), __webpack_require__(648), __webpack_require__(979), __webpack_require__(456) ]
      });
    },
    899: function(module, __unused_webpack_exports, __webpack_require__) {
      var YAMLException = __webpack_require__(884), TYPE_CONSTRUCTOR_OPTIONS = [ "kind", "resolve", "construct", "instanceOf", "predicate", "represent", "defaultStyle", "styleAliases" ], YAML_NODE_KINDS = [ "scalar", "sequence", "mapping" ];
      module.exports = function(tag, options) {
        if (options = options || {}, Object.keys(options).forEach((function(name) {
          if (-1 === TYPE_CONSTRUCTOR_OPTIONS.indexOf(name)) throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
        })), this.tag = tag, this.kind = options.kind || null, this.resolve = options.resolve || function() {
          return !0;
        }, this.construct = options.construct || function(data) {
          return data;
        }, this.instanceOf = options.instanceOf || null, this.predicate = options.predicate || null, 
        this.represent = options.represent || null, this.defaultStyle = options.defaultStyle || null, 
        this.styleAliases = function(map) {
          var result = {};
          return null !== map && Object.keys(map).forEach((function(style) {
            map[style].forEach((function(alias) {
              result[String(alias)] = style;
            }));
          })), result;
        }(options.styleAliases || null), -1 === YAML_NODE_KINDS.indexOf(this.kind)) throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
      };
    },
    964: function(module, __unused_webpack_exports, __webpack_require__) {
      var NodeBuffer;
      try {
        NodeBuffer = __webpack_require__(300).Buffer;
      } catch (__) {}
      var Type = __webpack_require__(899), BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
      module.exports = new Type("tag:yaml.org,2002:binary", {
        kind: "scalar",
        resolve: function(data) {
          if (null === data) return !1;
          var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
          for (idx = 0; idx < max; idx++) if (!((code = map.indexOf(data.charAt(idx))) > 64)) {
            if (code < 0) return !1;
            bitlen += 6;
          }
          return bitlen % 8 == 0;
        },
        construct: function(data) {
          var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
          for (idx = 0; idx < max; idx++) idx % 4 == 0 && idx && (result.push(bits >> 16 & 255), 
          result.push(bits >> 8 & 255), result.push(255 & bits)), bits = bits << 6 | map.indexOf(input.charAt(idx));
          return 0 === (tailbits = max % 4 * 6) ? (result.push(bits >> 16 & 255), result.push(bits >> 8 & 255), 
          result.push(255 & bits)) : 18 === tailbits ? (result.push(bits >> 10 & 255), result.push(bits >> 2 & 255)) : 12 === tailbits && result.push(bits >> 4 & 255), 
          NodeBuffer ? NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result) : result;
        },
        predicate: function(object) {
          return NodeBuffer && NodeBuffer.isBuffer(object);
        },
        represent: function(object) {
          var idx, tail, result = "", bits = 0, max = object.length, map = BASE64_MAP;
          for (idx = 0; idx < max; idx++) idx % 3 == 0 && idx && (result += map[bits >> 18 & 63], 
          result += map[bits >> 12 & 63], result += map[bits >> 6 & 63], result += map[63 & bits]), 
          bits = (bits << 8) + object[idx];
          return 0 === (tail = max % 3) ? (result += map[bits >> 18 & 63], result += map[bits >> 12 & 63], 
          result += map[bits >> 6 & 63], result += map[63 & bits]) : 2 === tail ? (result += map[bits >> 10 & 63], 
          result += map[bits >> 4 & 63], result += map[bits << 2 & 63], result += map[64]) : 1 === tail && (result += map[bits >> 2 & 63], 
          result += map[bits << 4 & 63], result += map[64], result += map[64]), result;
        }
      });
    },
    648: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899);
      module.exports = new Type("tag:yaml.org,2002:bool", {
        kind: "scalar",
        resolve: function(data) {
          if (null === data) return !1;
          var max = data.length;
          return 4 === max && ("true" === data || "True" === data || "TRUE" === data) || 5 === max && ("false" === data || "False" === data || "FALSE" === data);
        },
        construct: function(data) {
          return "true" === data || "True" === data || "TRUE" === data;
        },
        predicate: function(object) {
          return "[object Boolean]" === Object.prototype.toString.call(object);
        },
        represent: {
          lowercase: function(object) {
            return object ? "true" : "false";
          },
          uppercase: function(object) {
            return object ? "TRUE" : "FALSE";
          },
          camelcase: function(object) {
            return object ? "True" : "False";
          }
        },
        defaultStyle: "lowercase"
      });
    },
    456: function(module, __unused_webpack_exports, __webpack_require__) {
      var common = __webpack_require__(596), Type = __webpack_require__(899), YAML_FLOAT_PATTERN = new RegExp("^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$");
      var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
      module.exports = new Type("tag:yaml.org,2002:float", {
        kind: "scalar",
        resolve: function(data) {
          return null !== data && !(!YAML_FLOAT_PATTERN.test(data) || "_" === data[data.length - 1]);
        },
        construct: function(data) {
          var value, sign, base, digits;
          return sign = "-" === (value = data.replace(/_/g, "").toLowerCase())[0] ? -1 : 1, 
          digits = [], "+-".indexOf(value[0]) >= 0 && (value = value.slice(1)), ".inf" === value ? 1 === sign ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY : ".nan" === value ? NaN : value.indexOf(":") >= 0 ? (value.split(":").forEach((function(v) {
            digits.unshift(parseFloat(v, 10));
          })), value = 0, base = 1, digits.forEach((function(d) {
            value += d * base, base *= 60;
          })), sign * value) : sign * parseFloat(value, 10);
        },
        predicate: function(object) {
          return "[object Number]" === Object.prototype.toString.call(object) && (object % 1 != 0 || common.isNegativeZero(object));
        },
        represent: function(object, style) {
          var res;
          if (isNaN(object)) switch (style) {
           case "lowercase":
            return ".nan";

           case "uppercase":
            return ".NAN";

           case "camelcase":
            return ".NaN";
          } else if (Number.POSITIVE_INFINITY === object) switch (style) {
           case "lowercase":
            return ".inf";

           case "uppercase":
            return ".INF";

           case "camelcase":
            return ".Inf";
          } else if (Number.NEGATIVE_INFINITY === object) switch (style) {
           case "lowercase":
            return "-.inf";

           case "uppercase":
            return "-.INF";

           case "camelcase":
            return "-.Inf";
          } else if (common.isNegativeZero(object)) return "-0.0";
          return res = object.toString(10), SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
        },
        defaultStyle: "lowercase"
      });
    },
    979: function(module, __unused_webpack_exports, __webpack_require__) {
      var common = __webpack_require__(596), Type = __webpack_require__(899);
      function isOctCode(c) {
        return 48 <= c && c <= 55;
      }
      function isDecCode(c) {
        return 48 <= c && c <= 57;
      }
      module.exports = new Type("tag:yaml.org,2002:int", {
        kind: "scalar",
        resolve: function(data) {
          if (null === data) return !1;
          var ch, c, max = data.length, index = 0, hasDigits = !1;
          if (!max) return !1;
          if ("-" !== (ch = data[index]) && "+" !== ch || (ch = data[++index]), "0" === ch) {
            if (index + 1 === max) return !0;
            if ("b" === (ch = data[++index])) {
              for (index++; index < max; index++) if ("_" !== (ch = data[index])) {
                if ("0" !== ch && "1" !== ch) return !1;
                hasDigits = !0;
              }
              return hasDigits && "_" !== ch;
            }
            if ("x" === ch) {
              for (index++; index < max; index++) if ("_" !== (ch = data[index])) {
                if (!(48 <= (c = data.charCodeAt(index)) && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102)) return !1;
                hasDigits = !0;
              }
              return hasDigits && "_" !== ch;
            }
            for (;index < max; index++) if ("_" !== (ch = data[index])) {
              if (!isOctCode(data.charCodeAt(index))) return !1;
              hasDigits = !0;
            }
            return hasDigits && "_" !== ch;
          }
          if ("_" === ch) return !1;
          for (;index < max; index++) if ("_" !== (ch = data[index])) {
            if (":" === ch) break;
            if (!isDecCode(data.charCodeAt(index))) return !1;
            hasDigits = !0;
          }
          return !(!hasDigits || "_" === ch) && (":" !== ch || /^(:[0-5]?[0-9])+$/.test(data.slice(index)));
        },
        construct: function(data) {
          var ch, base, value = data, sign = 1, digits = [];
          return -1 !== value.indexOf("_") && (value = value.replace(/_/g, "")), "-" !== (ch = value[0]) && "+" !== ch || ("-" === ch && (sign = -1), 
          ch = (value = value.slice(1))[0]), "0" === value ? 0 : "0" === ch ? "b" === value[1] ? sign * parseInt(value.slice(2), 2) : "x" === value[1] ? sign * parseInt(value, 16) : sign * parseInt(value, 8) : -1 !== value.indexOf(":") ? (value.split(":").forEach((function(v) {
            digits.unshift(parseInt(v, 10));
          })), value = 0, base = 1, digits.forEach((function(d) {
            value += d * base, base *= 60;
          })), sign * value) : sign * parseInt(value, 10);
        },
        predicate: function(object) {
          return "[object Number]" === Object.prototype.toString.call(object) && object % 1 == 0 && !common.isNegativeZero(object);
        },
        represent: {
          binary: function(obj) {
            return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
          },
          octal: function(obj) {
            return obj >= 0 ? "0" + obj.toString(8) : "-0" + obj.toString(8).slice(1);
          },
          decimal: function(obj) {
            return obj.toString(10);
          },
          hexadecimal: function(obj) {
            return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
          }
        },
        defaultStyle: "decimal",
        styleAliases: {
          binary: [ 2, "bin" ],
          octal: [ 8, "oct" ],
          decimal: [ 10, "dec" ],
          hexadecimal: [ 16, "hex" ]
        }
      });
    },
    553: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899);
      module.exports = new Type("tag:yaml.org,2002:map", {
        kind: "mapping",
        construct: function(data) {
          return null !== data ? data : {};
        }
      });
    },
    243: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899);
      module.exports = new Type("tag:yaml.org,2002:merge", {
        kind: "scalar",
        resolve: function(data) {
          return "<<" === data || null === data;
        }
      });
    },
    22: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899);
      module.exports = new Type("tag:yaml.org,2002:null", {
        kind: "scalar",
        resolve: function(data) {
          if (null === data) return !0;
          var max = data.length;
          return 1 === max && "~" === data || 4 === max && ("null" === data || "Null" === data || "NULL" === data);
        },
        construct: function() {
          return null;
        },
        predicate: function(object) {
          return null === object;
        },
        represent: {
          canonical: function() {
            return "~";
          },
          lowercase: function() {
            return "null";
          },
          uppercase: function() {
            return "NULL";
          },
          camelcase: function() {
            return "Null";
          }
        },
        defaultStyle: "lowercase"
      });
    },
    878: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899), _hasOwnProperty = Object.prototype.hasOwnProperty, _toString = Object.prototype.toString;
      module.exports = new Type("tag:yaml.org,2002:omap", {
        kind: "sequence",
        resolve: function(data) {
          if (null === data) return !0;
          var index, length, pair, pairKey, pairHasKey, objectKeys = [], object = data;
          for (index = 0, length = object.length; index < length; index += 1) {
            if (pair = object[index], pairHasKey = !1, "[object Object]" !== _toString.call(pair)) return !1;
            for (pairKey in pair) if (_hasOwnProperty.call(pair, pairKey)) {
              if (pairHasKey) return !1;
              pairHasKey = !0;
            }
            if (!pairHasKey) return !1;
            if (-1 !== objectKeys.indexOf(pairKey)) return !1;
            objectKeys.push(pairKey);
          }
          return !0;
        },
        construct: function(data) {
          return null !== data ? data : [];
        }
      });
    },
    244: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899), _toString = Object.prototype.toString;
      module.exports = new Type("tag:yaml.org,2002:pairs", {
        kind: "sequence",
        resolve: function(data) {
          if (null === data) return !0;
          var index, length, pair, keys, result, object = data;
          for (result = new Array(object.length), index = 0, length = object.length; index < length; index += 1) {
            if (pair = object[index], "[object Object]" !== _toString.call(pair)) return !1;
            if (1 !== (keys = Object.keys(pair)).length) return !1;
            result[index] = [ keys[0], pair[keys[0]] ];
          }
          return !0;
        },
        construct: function(data) {
          if (null === data) return [];
          var index, length, pair, keys, result, object = data;
          for (result = new Array(object.length), index = 0, length = object.length; index < length; index += 1) pair = object[index], 
          keys = Object.keys(pair), result[index] = [ keys[0], pair[keys[0]] ];
          return result;
        }
      });
    },
    745: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899);
      module.exports = new Type("tag:yaml.org,2002:seq", {
        kind: "sequence",
        construct: function(data) {
          return null !== data ? data : [];
        }
      });
    },
    138: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899), _hasOwnProperty = Object.prototype.hasOwnProperty;
      module.exports = new Type("tag:yaml.org,2002:set", {
        kind: "mapping",
        resolve: function(data) {
          if (null === data) return !0;
          var key, object = data;
          for (key in object) if (_hasOwnProperty.call(object, key) && null !== object[key]) return !1;
          return !0;
        },
        construct: function(data) {
          return null !== data ? data : {};
        }
      });
    },
    483: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899);
      module.exports = new Type("tag:yaml.org,2002:str", {
        kind: "scalar",
        construct: function(data) {
          return null !== data ? data : "";
        }
      });
    },
    145: function(module, __unused_webpack_exports, __webpack_require__) {
      var Type = __webpack_require__(899), YAML_DATE_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"), YAML_TIMESTAMP_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$");
      module.exports = new Type("tag:yaml.org,2002:timestamp", {
        kind: "scalar",
        resolve: function(data) {
          return null !== data && (null !== YAML_DATE_REGEXP.exec(data) || null !== YAML_TIMESTAMP_REGEXP.exec(data));
        },
        construct: function(data) {
          var match, year, month, day, hour, minute, second, date, fraction = 0, delta = null;
          if (null === (match = YAML_DATE_REGEXP.exec(data)) && (match = YAML_TIMESTAMP_REGEXP.exec(data)), 
          null === match) throw new Error("Date resolve error");
          if (year = +match[1], month = +match[2] - 1, day = +match[3], !match[4]) return new Date(Date.UTC(year, month, day));
          if (hour = +match[4], minute = +match[5], second = +match[6], match[7]) {
            for (fraction = match[7].slice(0, 3); fraction.length < 3; ) fraction += "0";
            fraction = +fraction;
          }
          return match[9] && (delta = 6e4 * (60 * +match[10] + +(match[11] || 0)), "-" === match[9] && (delta = -delta)), 
          date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction)), delta && date.setTime(date.getTime() - delta), 
          date;
        },
        instanceOf: Date,
        represent: function(object) {
          return object.toISOString();
        }
      });
    },
    403: function(module) {
      module.exports = x => {
        if ("string" != typeof x) throw new TypeError("Expected a string, got " + typeof x);
        return 65279 === x.charCodeAt(0) ? x.slice(1) : x;
      };
    },
    312: function(module, __unused_webpack_exports, __webpack_require__) {
      var common = __webpack_require__(596), YAMLException = __webpack_require__(884), Mark = __webpack_require__(334), DEFAULT_SAFE_SCHEMA = __webpack_require__(972), DEFAULT_FULL_SCHEMA = module.exports.FAILSAFE_SCHEMA = __webpack_require__(322), _hasOwnProperty = Object.prototype.hasOwnProperty, PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/, PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/, PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/, PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i, PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
      function _class(obj) {
        return Object.prototype.toString.call(obj);
      }
      function is_EOL(c) {
        return 10 === c || 13 === c;
      }
      function is_WHITE_SPACE(c) {
        return 9 === c || 32 === c;
      }
      function is_WS_OR_EOL(c) {
        return 9 === c || 32 === c || 10 === c || 13 === c;
      }
      function is_FLOW_INDICATOR(c) {
        return 44 === c || 91 === c || 93 === c || 123 === c || 125 === c;
      }
      function fromHexCode(c) {
        var lc;
        return 48 <= c && c <= 57 ? c - 48 : 97 <= (lc = 32 | c) && lc <= 102 ? lc - 97 + 10 : -1;
      }
      function simpleEscapeSequence(c) {
        return 48 === c ? "\0" : 97 === c ? "" : 98 === c ? "\b" : 116 === c || 9 === c ? "\t" : 110 === c ? "\n" : 118 === c ? "\v" : 102 === c ? "\f" : 114 === c ? "\r" : 101 === c ? "" : 32 === c ? " " : 34 === c ? '"' : 47 === c ? "/" : 92 === c ? "\\" : 78 === c ? "" : 95 === c ? " " : 76 === c ? "\u2028" : 80 === c ? "\u2029" : "";
      }
      function charFromCodepoint(c) {
        return c <= 65535 ? String.fromCharCode(c) : String.fromCharCode(55296 + (c - 65536 >> 10), 56320 + (c - 65536 & 1023));
      }
      for (var simpleEscapeCheck = new Array(256), simpleEscapeMap = new Array(256), i = 0; i < 256; i++) simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0, 
      simpleEscapeMap[i] = simpleEscapeSequence(i);
      function State(input, options) {
        this.input = input, this.filename = options.filename || null, this.schema = options.schema || DEFAULT_FULL_SCHEMA, 
        this.onWarning = options.onWarning || null, this.legacy = options.legacy || !1, 
        this.json = options.json || !1, this.listener = options.listener || null, this.implicitTypes = this.schema.compiledImplicit, 
        this.typeMap = this.schema.compiledTypeMap, this.length = input.length, this.position = 0, 
        this.line = 0, this.lineStart = 0, this.lineIndent = 0, this.documents = [];
      }
      function generateError(state, message) {
        return new YAMLException(message, new Mark(state.filename, state.input, state.position, state.line, state.position - state.lineStart));
      }
      function throwError(state, message) {
        throw generateError(state, message);
      }
      function throwWarning(state, message) {
        state.onWarning && state.onWarning.call(null, generateError(state, message));
      }
      var directiveHandlers = {
        YAML: function(state, name, args) {
          var match, major, minor;
          null !== state.version && throwError(state, "duplication of %YAML directive"), 1 !== args.length && throwError(state, "YAML directive accepts exactly one argument"), 
          null === (match = /^([0-9]+)\.([0-9]+)$/.exec(args[0])) && throwError(state, "ill-formed argument of the YAML directive"), 
          major = parseInt(match[1], 10), minor = parseInt(match[2], 10), 1 !== major && throwError(state, "unacceptable YAML version of the document"), 
          state.version = args[0], state.checkLineBreaks = minor < 2, 1 !== minor && 2 !== minor && throwWarning(state, "unsupported YAML version of the document");
        },
        TAG: function(state, name, args) {
          var handle, prefix;
          2 !== args.length && throwError(state, "TAG directive accepts exactly two arguments"), 
          handle = args[0], prefix = args[1], PATTERN_TAG_HANDLE.test(handle) || throwError(state, "ill-formed tag handle (first argument) of the TAG directive"), 
          _hasOwnProperty.call(state.tagMap, handle) && throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle'), 
          PATTERN_TAG_URI.test(prefix) || throwError(state, "ill-formed tag prefix (second argument) of the TAG directive"), 
          state.tagMap[handle] = prefix;
        }
      };
      function captureSegment(state, start, end, checkJson) {
        var _position, _length, _character, _result;
        if (start < end) {
          if (_result = state.input.slice(start, end), checkJson) for (_position = 0, _length = _result.length; _position < _length; _position += 1) 9 === (_character = _result.charCodeAt(_position)) || 32 <= _character && _character <= 1114111 || throwError(state, "expected valid JSON character"); else PATTERN_NON_PRINTABLE.test(_result) && throwError(state, "the stream contains non-printable characters");
          state.result += _result;
        }
      }
      function mergeMappings(state, destination, source, overridableKeys) {
        var sourceKeys, key, index, quantity;
        for (common.isObject(source) || throwError(state, "cannot merge mappings; the provided source object is unacceptable"), 
        index = 0, quantity = (sourceKeys = Object.keys(source)).length; index < quantity; index += 1) key = sourceKeys[index], 
        _hasOwnProperty.call(destination, key) || (destination[key] = source[key], overridableKeys[key] = !0);
      }
      function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
        var index, quantity;
        if (Array.isArray(keyNode)) for (index = 0, quantity = (keyNode = Array.prototype.slice.call(keyNode)).length; index < quantity; index += 1) Array.isArray(keyNode[index]) && throwError(state, "nested arrays are not supported inside keys"), 
        "object" == typeof keyNode && "[object Object]" === _class(keyNode[index]) && (keyNode[index] = "[object Object]");
        if ("object" == typeof keyNode && "[object Object]" === _class(keyNode) && (keyNode = "[object Object]"), 
        keyNode = String(keyNode), null === _result && (_result = {}), "tag:yaml.org,2002:merge" === keyTag) if (Array.isArray(valueNode)) for (index = 0, 
        quantity = valueNode.length; index < quantity; index += 1) mergeMappings(state, _result, valueNode[index], overridableKeys); else mergeMappings(state, _result, valueNode, overridableKeys); else state.json || _hasOwnProperty.call(overridableKeys, keyNode) || !_hasOwnProperty.call(_result, keyNode) || (state.line = startLine || state.line, 
        state.position = startPos || state.position, throwError(state, "duplicated mapping key")), 
        _result[keyNode] = valueNode, delete overridableKeys[keyNode];
        return _result;
      }
      function readLineBreak(state) {
        var ch;
        10 === (ch = state.input.charCodeAt(state.position)) ? state.position++ : 13 === ch ? (state.position++, 
        10 === state.input.charCodeAt(state.position) && state.position++) : throwError(state, "a line break is expected"), 
        state.line += 1, state.lineStart = state.position;
      }
      function skipSeparationSpace(state, allowComments, checkIndent) {
        for (var lineBreaks = 0, ch = state.input.charCodeAt(state.position); 0 !== ch; ) {
          for (;is_WHITE_SPACE(ch); ) ch = state.input.charCodeAt(++state.position);
          if (allowComments && 35 === ch) do {
            ch = state.input.charCodeAt(++state.position);
          } while (10 !== ch && 13 !== ch && 0 !== ch);
          if (!is_EOL(ch)) break;
          for (readLineBreak(state), ch = state.input.charCodeAt(state.position), lineBreaks++, 
          state.lineIndent = 0; 32 === ch; ) state.lineIndent++, ch = state.input.charCodeAt(++state.position);
        }
        return -1 !== checkIndent && 0 !== lineBreaks && state.lineIndent < checkIndent && throwWarning(state, "deficient indentation"), 
        lineBreaks;
      }
      function testDocumentSeparator(state) {
        var ch, _position = state.position;
        return !(45 !== (ch = state.input.charCodeAt(_position)) && 46 !== ch || ch !== state.input.charCodeAt(_position + 1) || ch !== state.input.charCodeAt(_position + 2) || (_position += 3, 
        0 !== (ch = state.input.charCodeAt(_position)) && !is_WS_OR_EOL(ch)));
      }
      function writeFoldedLines(state, count) {
        1 === count ? state.result += " " : count > 1 && (state.result += common.repeat("\n", count - 1));
      }
      function readBlockSequence(state, nodeIndent) {
        var _line, ch, _tag = state.tag, _anchor = state.anchor, _result = [], detected = !1;
        for (null !== state.anchor && (state.anchorMap[state.anchor] = _result), ch = state.input.charCodeAt(state.position); 0 !== ch && 45 === ch && is_WS_OR_EOL(state.input.charCodeAt(state.position + 1)); ) if (detected = !0, 
        state.position++, skipSeparationSpace(state, !0, -1) && state.lineIndent <= nodeIndent) _result.push(null), 
        ch = state.input.charCodeAt(state.position); else if (_line = state.line, composeNode(state, nodeIndent, 3, !1, !0), 
        _result.push(state.result), skipSeparationSpace(state, !0, -1), ch = state.input.charCodeAt(state.position), 
        (state.line === _line || state.lineIndent > nodeIndent) && 0 !== ch) throwError(state, "bad indentation of a sequence entry"); else if (state.lineIndent < nodeIndent) break;
        return !!detected && (state.tag = _tag, state.anchor = _anchor, state.kind = "sequence", 
        state.result = _result, !0);
      }
      function readTagProperty(state) {
        var _position, tagHandle, tagName, ch, isVerbatim = !1, isNamed = !1;
        if (33 !== (ch = state.input.charCodeAt(state.position))) return !1;
        if (null !== state.tag && throwError(state, "duplication of a tag property"), 60 === (ch = state.input.charCodeAt(++state.position)) ? (isVerbatim = !0, 
        ch = state.input.charCodeAt(++state.position)) : 33 === ch ? (isNamed = !0, tagHandle = "!!", 
        ch = state.input.charCodeAt(++state.position)) : tagHandle = "!", _position = state.position, 
        isVerbatim) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (0 !== ch && 62 !== ch);
          state.position < state.length ? (tagName = state.input.slice(_position, state.position), 
          ch = state.input.charCodeAt(++state.position)) : throwError(state, "unexpected end of the stream within a verbatim tag");
        } else {
          for (;0 !== ch && !is_WS_OR_EOL(ch); ) 33 === ch && (isNamed ? throwError(state, "tag suffix cannot contain exclamation marks") : (tagHandle = state.input.slice(_position - 1, state.position + 1), 
          PATTERN_TAG_HANDLE.test(tagHandle) || throwError(state, "named tag handle cannot contain such characters"), 
          isNamed = !0, _position = state.position + 1)), ch = state.input.charCodeAt(++state.position);
          tagName = state.input.slice(_position, state.position), PATTERN_FLOW_INDICATORS.test(tagName) && throwError(state, "tag suffix cannot contain flow indicator characters");
        }
        return tagName && !PATTERN_TAG_URI.test(tagName) && throwError(state, "tag name cannot contain such characters: " + tagName), 
        isVerbatim ? state.tag = tagName : _hasOwnProperty.call(state.tagMap, tagHandle) ? state.tag = state.tagMap[tagHandle] + tagName : "!" === tagHandle ? state.tag = "!" + tagName : "!!" === tagHandle ? state.tag = "tag:yaml.org,2002:" + tagName : throwError(state, 'undeclared tag handle "' + tagHandle + '"'), 
        !0;
      }
      function readAnchorProperty(state) {
        var _position, ch;
        if (38 !== (ch = state.input.charCodeAt(state.position))) return !1;
        for (null !== state.anchor && throwError(state, "duplication of an anchor property"), 
        ch = state.input.charCodeAt(++state.position), _position = state.position; 0 !== ch && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch); ) ch = state.input.charCodeAt(++state.position);
        return state.position === _position && throwError(state, "name of an anchor node must contain at least one character"), 
        state.anchor = state.input.slice(_position, state.position), !0;
      }
      function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
        var allowBlockStyles, allowBlockScalars, allowBlockCollections, typeIndex, typeQuantity, type, flowIndent, blockIndent, indentStatus = 1, atNewLine = !1, hasContent = !1;
        if (null !== state.listener && state.listener("open", state), state.tag = null, 
        state.anchor = null, state.kind = null, state.result = null, allowBlockStyles = allowBlockScalars = allowBlockCollections = 4 === nodeContext || 3 === nodeContext, 
        allowToSeek && skipSeparationSpace(state, !0, -1) && (atNewLine = !0, state.lineIndent > parentIndent ? indentStatus = 1 : state.lineIndent === parentIndent ? indentStatus = 0 : state.lineIndent < parentIndent && (indentStatus = -1)), 
        1 === indentStatus) for (;readTagProperty(state) || readAnchorProperty(state); ) skipSeparationSpace(state, !0, -1) ? (atNewLine = !0, 
        allowBlockCollections = allowBlockStyles, state.lineIndent > parentIndent ? indentStatus = 1 : state.lineIndent === parentIndent ? indentStatus = 0 : state.lineIndent < parentIndent && (indentStatus = -1)) : allowBlockCollections = !1;
        if (allowBlockCollections && (allowBlockCollections = atNewLine || allowCompact), 
        1 !== indentStatus && 4 !== nodeContext || (flowIndent = 1 === nodeContext || 2 === nodeContext ? parentIndent : parentIndent + 1, 
        blockIndent = state.position - state.lineStart, 1 === indentStatus ? allowBlockCollections && (readBlockSequence(state, blockIndent) || function(state, nodeIndent, flowIndent) {
          var following, allowCompact, _line, _pos, ch, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = {}, keyTag = null, keyNode = null, valueNode = null, atExplicitKey = !1, detected = !1;
          for (null !== state.anchor && (state.anchorMap[state.anchor] = _result), ch = state.input.charCodeAt(state.position); 0 !== ch; ) {
            if (following = state.input.charCodeAt(state.position + 1), _line = state.line, 
            _pos = state.position, 63 !== ch && 58 !== ch || !is_WS_OR_EOL(following)) {
              if (!composeNode(state, flowIndent, 2, !1, !0)) break;
              if (state.line === _line) {
                for (ch = state.input.charCodeAt(state.position); is_WHITE_SPACE(ch); ) ch = state.input.charCodeAt(++state.position);
                if (58 === ch) is_WS_OR_EOL(ch = state.input.charCodeAt(++state.position)) || throwError(state, "a whitespace character is expected after the key-value separator within a block mapping"), 
                atExplicitKey && (storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null), 
                keyTag = keyNode = valueNode = null), detected = !0, atExplicitKey = !1, allowCompact = !1, 
                keyTag = state.tag, keyNode = state.result; else {
                  if (!detected) return state.tag = _tag, state.anchor = _anchor, !0;
                  throwError(state, "can not read an implicit mapping pair; a colon is missed");
                }
              } else {
                if (!detected) return state.tag = _tag, state.anchor = _anchor, !0;
                throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
              }
            } else 63 === ch ? (atExplicitKey && (storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null), 
            keyTag = keyNode = valueNode = null), detected = !0, atExplicitKey = !0, allowCompact = !0) : atExplicitKey ? (atExplicitKey = !1, 
            allowCompact = !0) : throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"), 
            state.position += 1, ch = following;
            if ((state.line === _line || state.lineIndent > nodeIndent) && (composeNode(state, nodeIndent, 4, !0, allowCompact) && (atExplicitKey ? keyNode = state.result : valueNode = state.result), 
            atExplicitKey || (storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos), 
            keyTag = keyNode = valueNode = null), skipSeparationSpace(state, !0, -1), ch = state.input.charCodeAt(state.position)), 
            state.lineIndent > nodeIndent && 0 !== ch) throwError(state, "bad indentation of a mapping entry"); else if (state.lineIndent < nodeIndent) break;
          }
          return atExplicitKey && storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null), 
          detected && (state.tag = _tag, state.anchor = _anchor, state.kind = "mapping", state.result = _result), 
          detected;
        }(state, blockIndent, flowIndent)) || function(state, nodeIndent) {
          var _line, _result, terminator, isPair, isExplicitPair, isMapping, keyNode, keyTag, valueNode, ch, readNext = !0, _tag = state.tag, _anchor = state.anchor, overridableKeys = {};
          if (91 === (ch = state.input.charCodeAt(state.position))) terminator = 93, isMapping = !1, 
          _result = []; else {
            if (123 !== ch) return !1;
            terminator = 125, isMapping = !0, _result = {};
          }
          for (null !== state.anchor && (state.anchorMap[state.anchor] = _result), ch = state.input.charCodeAt(++state.position); 0 !== ch; ) {
            if (skipSeparationSpace(state, !0, nodeIndent), (ch = state.input.charCodeAt(state.position)) === terminator) return state.position++, 
            state.tag = _tag, state.anchor = _anchor, state.kind = isMapping ? "mapping" : "sequence", 
            state.result = _result, !0;
            readNext || throwError(state, "missed comma between flow collection entries"), valueNode = null, 
            isPair = isExplicitPair = !1, 63 === ch && is_WS_OR_EOL(state.input.charCodeAt(state.position + 1)) && (isPair = isExplicitPair = !0, 
            state.position++, skipSeparationSpace(state, !0, nodeIndent)), _line = state.line, 
            composeNode(state, nodeIndent, 1, !1, !0), keyTag = state.tag, keyNode = state.result, 
            skipSeparationSpace(state, !0, nodeIndent), ch = state.input.charCodeAt(state.position), 
            !isExplicitPair && state.line !== _line || 58 !== ch || (isPair = !0, ch = state.input.charCodeAt(++state.position), 
            skipSeparationSpace(state, !0, nodeIndent), composeNode(state, nodeIndent, 1, !1, !0), 
            valueNode = state.result), isMapping ? storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode) : isPair ? _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode)) : _result.push(keyNode), 
            skipSeparationSpace(state, !0, nodeIndent), 44 === (ch = state.input.charCodeAt(state.position)) ? (readNext = !0, 
            ch = state.input.charCodeAt(++state.position)) : readNext = !1;
          }
          throwError(state, "unexpected end of the stream within a flow collection");
        }(state, flowIndent) ? hasContent = !0 : (allowBlockScalars && function(state, nodeIndent) {
          var captureStart, folding, tmp, ch, c, chomping = 1, didReadContent = !1, detectedIndent = !1, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = !1;
          if (124 === (ch = state.input.charCodeAt(state.position))) folding = !1; else {
            if (62 !== ch) return !1;
            folding = !0;
          }
          for (state.kind = "scalar", state.result = ""; 0 !== ch; ) if (43 === (ch = state.input.charCodeAt(++state.position)) || 45 === ch) 1 === chomping ? chomping = 43 === ch ? 3 : 2 : throwError(state, "repeat of a chomping mode identifier"); else {
            if (!((tmp = 48 <= (c = ch) && c <= 57 ? c - 48 : -1) >= 0)) break;
            0 === tmp ? throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one") : detectedIndent ? throwError(state, "repeat of an indentation width identifier") : (textIndent = nodeIndent + tmp - 1, 
            detectedIndent = !0);
          }
          if (is_WHITE_SPACE(ch)) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (is_WHITE_SPACE(ch));
            if (35 === ch) do {
              ch = state.input.charCodeAt(++state.position);
            } while (!is_EOL(ch) && 0 !== ch);
          }
          for (;0 !== ch; ) {
            for (readLineBreak(state), state.lineIndent = 0, ch = state.input.charCodeAt(state.position); (!detectedIndent || state.lineIndent < textIndent) && 32 === ch; ) state.lineIndent++, 
            ch = state.input.charCodeAt(++state.position);
            if (!detectedIndent && state.lineIndent > textIndent && (textIndent = state.lineIndent), 
            is_EOL(ch)) emptyLines++; else {
              if (state.lineIndent < textIndent) {
                3 === chomping ? state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines) : 1 === chomping && didReadContent && (state.result += "\n");
                break;
              }
              for (folding ? is_WHITE_SPACE(ch) ? (atMoreIndented = !0, state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines)) : atMoreIndented ? (atMoreIndented = !1, 
              state.result += common.repeat("\n", emptyLines + 1)) : 0 === emptyLines ? didReadContent && (state.result += " ") : state.result += common.repeat("\n", emptyLines) : state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines), 
              didReadContent = !0, detectedIndent = !0, emptyLines = 0, captureStart = state.position; !is_EOL(ch) && 0 !== ch; ) ch = state.input.charCodeAt(++state.position);
              captureSegment(state, captureStart, state.position, !1);
            }
          }
          return !0;
        }(state, flowIndent) || function(state, nodeIndent) {
          var ch, captureStart, captureEnd;
          if (39 !== (ch = state.input.charCodeAt(state.position))) return !1;
          for (state.kind = "scalar", state.result = "", state.position++, captureStart = captureEnd = state.position; 0 !== (ch = state.input.charCodeAt(state.position)); ) if (39 === ch) {
            if (captureSegment(state, captureStart, state.position, !0), 39 !== (ch = state.input.charCodeAt(++state.position))) return !0;
            captureStart = state.position, state.position++, captureEnd = state.position;
          } else is_EOL(ch) ? (captureSegment(state, captureStart, captureEnd, !0), writeFoldedLines(state, skipSeparationSpace(state, !1, nodeIndent)), 
          captureStart = captureEnd = state.position) : state.position === state.lineStart && testDocumentSeparator(state) ? throwError(state, "unexpected end of the document within a single quoted scalar") : (state.position++, 
          captureEnd = state.position);
          throwError(state, "unexpected end of the stream within a single quoted scalar");
        }(state, flowIndent) || function(state, nodeIndent) {
          var captureStart, captureEnd, hexLength, hexResult, tmp, ch, c;
          if (34 !== (ch = state.input.charCodeAt(state.position))) return !1;
          for (state.kind = "scalar", state.result = "", state.position++, captureStart = captureEnd = state.position; 0 !== (ch = state.input.charCodeAt(state.position)); ) {
            if (34 === ch) return captureSegment(state, captureStart, state.position, !0), state.position++, 
            !0;
            if (92 === ch) {
              if (captureSegment(state, captureStart, state.position, !0), is_EOL(ch = state.input.charCodeAt(++state.position))) skipSeparationSpace(state, !1, nodeIndent); else if (ch < 256 && simpleEscapeCheck[ch]) state.result += simpleEscapeMap[ch], 
              state.position++; else if ((tmp = 120 === (c = ch) ? 2 : 117 === c ? 4 : 85 === c ? 8 : 0) > 0) {
                for (hexLength = tmp, hexResult = 0; hexLength > 0; hexLength--) (tmp = fromHexCode(ch = state.input.charCodeAt(++state.position))) >= 0 ? hexResult = (hexResult << 4) + tmp : throwError(state, "expected hexadecimal character");
                state.result += charFromCodepoint(hexResult), state.position++;
              } else throwError(state, "unknown escape sequence");
              captureStart = captureEnd = state.position;
            } else is_EOL(ch) ? (captureSegment(state, captureStart, captureEnd, !0), writeFoldedLines(state, skipSeparationSpace(state, !1, nodeIndent)), 
            captureStart = captureEnd = state.position) : state.position === state.lineStart && testDocumentSeparator(state) ? throwError(state, "unexpected end of the document within a double quoted scalar") : (state.position++, 
            captureEnd = state.position);
          }
          throwError(state, "unexpected end of the stream within a double quoted scalar");
        }(state, flowIndent) ? hasContent = !0 : !function(state) {
          var _position, alias, ch;
          if (42 !== (ch = state.input.charCodeAt(state.position))) return !1;
          for (ch = state.input.charCodeAt(++state.position), _position = state.position; 0 !== ch && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch); ) ch = state.input.charCodeAt(++state.position);
          return state.position === _position && throwError(state, "name of an alias node must contain at least one character"), 
          alias = state.input.slice(_position, state.position), state.anchorMap.hasOwnProperty(alias) || throwError(state, 'unidentified alias "' + alias + '"'), 
          state.result = state.anchorMap[alias], skipSeparationSpace(state, !0, -1), !0;
        }(state) ? function(state, nodeIndent, withinFlowCollection) {
          var following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, ch, _kind = state.kind, _result = state.result;
          if (is_WS_OR_EOL(ch = state.input.charCodeAt(state.position)) || is_FLOW_INDICATOR(ch) || 35 === ch || 38 === ch || 42 === ch || 33 === ch || 124 === ch || 62 === ch || 39 === ch || 34 === ch || 37 === ch || 64 === ch || 96 === ch) return !1;
          if ((63 === ch || 45 === ch) && (is_WS_OR_EOL(following = state.input.charCodeAt(state.position + 1)) || withinFlowCollection && is_FLOW_INDICATOR(following))) return !1;
          for (state.kind = "scalar", state.result = "", captureStart = captureEnd = state.position, 
          hasPendingContent = !1; 0 !== ch; ) {
            if (58 === ch) {
              if (is_WS_OR_EOL(following = state.input.charCodeAt(state.position + 1)) || withinFlowCollection && is_FLOW_INDICATOR(following)) break;
            } else if (35 === ch) {
              if (is_WS_OR_EOL(state.input.charCodeAt(state.position - 1))) break;
            } else {
              if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) break;
              if (is_EOL(ch)) {
                if (_line = state.line, _lineStart = state.lineStart, _lineIndent = state.lineIndent, 
                skipSeparationSpace(state, !1, -1), state.lineIndent >= nodeIndent) {
                  hasPendingContent = !0, ch = state.input.charCodeAt(state.position);
                  continue;
                }
                state.position = captureEnd, state.line = _line, state.lineStart = _lineStart, state.lineIndent = _lineIndent;
                break;
              }
            }
            hasPendingContent && (captureSegment(state, captureStart, captureEnd, !1), writeFoldedLines(state, state.line - _line), 
            captureStart = captureEnd = state.position, hasPendingContent = !1), is_WHITE_SPACE(ch) || (captureEnd = state.position + 1), 
            ch = state.input.charCodeAt(++state.position);
          }
          return captureSegment(state, captureStart, captureEnd, !1), !!state.result || (state.kind = _kind, 
          state.result = _result, !1);
        }(state, flowIndent, 1 === nodeContext) && (hasContent = !0, null === state.tag && (state.tag = "?")) : (hasContent = !0, 
        null === state.tag && null === state.anchor || throwError(state, "alias node should not have any properties")), 
        null !== state.anchor && (state.anchorMap[state.anchor] = state.result)) : 0 === indentStatus && (hasContent = allowBlockCollections && readBlockSequence(state, blockIndent))), 
        null !== state.tag && "!" !== state.tag) if ("?" === state.tag) {
          for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) if ((type = state.implicitTypes[typeIndex]).resolve(state.result)) {
            state.result = type.construct(state.result), state.tag = type.tag, null !== state.anchor && (state.anchorMap[state.anchor] = state.result);
            break;
          }
        } else _hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag) ? (type = state.typeMap[state.kind || "fallback"][state.tag], 
        null !== state.result && type.kind !== state.kind && throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"'), 
        type.resolve(state.result) ? (state.result = type.construct(state.result), null !== state.anchor && (state.anchorMap[state.anchor] = state.result)) : throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag")) : throwError(state, "unknown tag !<" + state.tag + ">");
        return null !== state.listener && state.listener("close", state), null !== state.tag || null !== state.anchor || hasContent;
      }
      function readDocument(state) {
        var _position, directiveName, directiveArgs, ch, documentStart = state.position, hasDirectives = !1;
        for (state.version = null, state.checkLineBreaks = state.legacy, state.tagMap = {}, 
        state.anchorMap = {}; 0 !== (ch = state.input.charCodeAt(state.position)) && (skipSeparationSpace(state, !0, -1), 
        ch = state.input.charCodeAt(state.position), !(state.lineIndent > 0 || 37 !== ch)); ) {
          for (hasDirectives = !0, ch = state.input.charCodeAt(++state.position), _position = state.position; 0 !== ch && !is_WS_OR_EOL(ch); ) ch = state.input.charCodeAt(++state.position);
          for (directiveArgs = [], (directiveName = state.input.slice(_position, state.position)).length < 1 && throwError(state, "directive name must not be less than one character in length"); 0 !== ch; ) {
            for (;is_WHITE_SPACE(ch); ) ch = state.input.charCodeAt(++state.position);
            if (35 === ch) {
              do {
                ch = state.input.charCodeAt(++state.position);
              } while (0 !== ch && !is_EOL(ch));
              break;
            }
            if (is_EOL(ch)) break;
            for (_position = state.position; 0 !== ch && !is_WS_OR_EOL(ch); ) ch = state.input.charCodeAt(++state.position);
            directiveArgs.push(state.input.slice(_position, state.position));
          }
          0 !== ch && readLineBreak(state), _hasOwnProperty.call(directiveHandlers, directiveName) ? directiveHandlers[directiveName](state, directiveName, directiveArgs) : throwWarning(state, 'unknown document directive "' + directiveName + '"');
        }
        skipSeparationSpace(state, !0, -1), 0 === state.lineIndent && 45 === state.input.charCodeAt(state.position) && 45 === state.input.charCodeAt(state.position + 1) && 45 === state.input.charCodeAt(state.position + 2) ? (state.position += 3, 
        skipSeparationSpace(state, !0, -1)) : hasDirectives && throwError(state, "directives end mark is expected"), 
        composeNode(state, state.lineIndent - 1, 4, !1, !0), skipSeparationSpace(state, !0, -1), 
        state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position)) && throwWarning(state, "non-ASCII line breaks are interpreted as content"), 
        state.documents.push(state.result), state.position === state.lineStart && testDocumentSeparator(state) ? 46 === state.input.charCodeAt(state.position) && (state.position += 3, 
        skipSeparationSpace(state, !0, -1)) : state.position < state.length - 1 && throwError(state, "end of the stream or a document separator is expected");
      }
      function loadDocuments(input, options) {
        options = options || {}, 0 !== (input = String(input)).length && (10 !== input.charCodeAt(input.length - 1) && 13 !== input.charCodeAt(input.length - 1) && (input += "\n"), 
        65279 === input.charCodeAt(0) && (input = input.slice(1)));
        var state = new State(input, options);
        for (state.input += "\0"; 32 === state.input.charCodeAt(state.position); ) state.lineIndent += 1, 
        state.position += 1;
        for (;state.position < state.length - 1; ) readDocument(state);
        return state.documents;
      }
      function loadAll(input, iterator, options) {
        var index, length, documents = loadDocuments(input, options);
        if ("function" != typeof iterator) return documents;
        for (index = 0, length = documents.length; index < length; index += 1) iterator(documents[index]);
      }
      function load(input, options) {
        var documents = loadDocuments(input, options);
        if (0 !== documents.length) {
          if (1 === documents.length) return documents[0];
          throw new YAMLException("expected a single document in the stream, but found more");
        }
      }
      module.exports.loadAll = loadAll, module.exports.load = load, module.exports.safeLoadAll = function(input, output, options) {
        if ("function" != typeof output) return loadAll(input, common.extend({
          schema: DEFAULT_SAFE_SCHEMA
        }, options));
        loadAll(input, output, common.extend({
          schema: DEFAULT_SAFE_SCHEMA
        }, options));
      }, module.exports.safeLoad = function(input, options) {
        return load(input, common.extend({
          schema: DEFAULT_SAFE_SCHEMA
        }, options));
      };
    },
    181: function(module, exports, __webpack_require__) {
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
        i8: "1.22.19-es1"
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
    function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg), value = info.value;
      } catch (error) {
        return void reject(error);
      }
      info.done ? resolve(value) : Promise.resolve(value).then(_next, _throw);
    }
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
    function nullify(obj) {
      if (void 0 === obj && (obj = {}), Array.isArray(obj)) for (var item of obj) nullify(item); else if ((null !== obj && "object" == typeof obj || "function" == typeof obj) && (Object.setPrototypeOf(obj, null), 
      "object" == typeof obj)) for (var key in obj) nullify(obj[key]);
      return obj;
    }
    var util = __webpack_require__(837), invariant = __webpack_require__(128), parse_stripBOM = __webpack_require__(403), _require = __webpack_require__(312), safeLoad = _require.safeLoad, FAILSAFE_SCHEMA = _require.FAILSAFE_SCHEMA, VERSION_REGEX = /^yarn lockfile v(\d+)$/, TOKEN_TYPES_boolean = "BOOLEAN", TOKEN_TYPES_string = "STRING", TOKEN_TYPES_eof = "EOF", TOKEN_TYPES_colon = "COLON", TOKEN_TYPES_newline = "NEWLINE", TOKEN_TYPES_comment = "COMMENT", TOKEN_TYPES_indent = "INDENT", TOKEN_TYPES_invalid = "INVALID", TOKEN_TYPES_number = "NUMBER", TOKEN_TYPES_comma = "COMMA", VALID_PROP_VALUE_TOKENS = [ TOKEN_TYPES_boolean, TOKEN_TYPES_string, TOKEN_TYPES_number ];
    class Parser {
      constructor(input, fileLoc) {
        void 0 === fileLoc && (fileLoc = "lockfile"), this.token = void 0, this.comments = [], 
        this.tokens = function*(input) {
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
      unexpected(msg) {
        throw void 0 === msg && (msg = "Unexpected token"), new SyntaxError(`${msg} ${this.token.line}:${this.token.col} in ${this.fileLoc}`);
      }
      expect(tokType) {
        this.token.type === tokType ? this.next() : this.unexpected();
      }
      eat(tokType) {
        return this.token.type === tokType && (this.next(), !0);
      }
      parse(indent) {
        void 0 === indent && (indent = 0);
        for (var token, obj = nullify(); ;) {
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
    function parse(str, fileLoc) {
      var error, parser = new Parser(str, fileLoc);
      if (parser.next(), !fileLoc.endsWith(".yml")) try {
        return parser.parse();
      } catch (err) {
        error = err;
      }
      try {
        var result = safeLoad(str, {
          schema: FAILSAFE_SCHEMA
        });
        return "object" == typeof result ? result : {};
      } catch (err) {
        throw error || err;
      }
    }
    function lockfile_parse(str, fileLoc) {
      return void 0 === fileLoc && (fileLoc = "lockfile"), function(str) {
        return str.includes("<<<<<<<") && str.includes("=======") && str.includes(">>>>>>>");
      }(str = parse_stripBOM(str)) ? function(str, fileLoc) {
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
      }(str, fileLoc) : {
        type: "success",
        object: parse(str, fileLoc)
      };
    }
    var fn, firstData, fs = __webpack_require__(147), exists = (fn = fs.exists, firstData = !0, 
    function() {
      var args = Array.prototype.slice.call(arguments, 0);
      return new Promise((function(resolve, reject) {
        args.push((function(err) {
          var res;
          firstData ? (res = err, err = null) : res = arguments.length <= 2 ? arguments[1] : Array.prototype.slice.call(arguments, 1), 
          err ? reject(err) : resolve(res);
        })), fn.apply(null, args);
      }));
    });
    function _readFile(loc, encoding) {
      return new Promise(((resolve, reject) => {
        fs.readFile(loc, encoding, (function(err, content) {
          err ? reject(err) : resolve(content);
        }));
      }));
    }
    function readFile(loc) {
      return _readFile(loc, "utf8").then(normalizeOS);
    }
    function normalizeOS(body) {
      return body.replace(/\r\n/g, "\n");
    }
    var YARN_VERSION = __webpack_require__(598).i8, NODE_VERSION = process.version;
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
    var lockfile_invariant = __webpack_require__(128), lockfile_path = __webpack_require__(17), ssri = __webpack_require__(957);
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
      constructor(_temp) {
        var _ref = void 0 === _temp ? {} : _temp, cache = _ref.cache, source = _ref.source, parseResultType = _ref.parseResultType;
        this.source = source || "", this.cache = cache, this.parseResultType = parseResultType;
      }
      hasEntriesExistWithoutIntegrity() {
        if (!this.cache) return !1;
        for (var key in this.cache) if (!/^.*@(file:|http)/.test(key) && this.cache[key] && !this.cache[key].integrity) return !0;
        return !1;
      }
      static fromDirectory(dir, reporter) {
        return function(fn) {
          return function() {
            var self = this, args = arguments;
            return new Promise((function(resolve, reject) {
              var gen = fn.apply(self, args);
              function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
              }
              function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
              }
              _next(void 0);
            }));
          };
        }((function*() {
          var lockfile, parseResult, lockfileLoc = lockfile_path.join(dir, "yarn.lock"), rawLockfile = "";
          if ((yield exists(lockfileLoc)) ? (parseResult = lockfile_parse(rawLockfile = yield readFile(lockfileLoc), lockfileLoc), 
          reporter && ("merge" === parseResult.type ? reporter.info(reporter.lang("lockfileMerged")) : "conflict" === parseResult.type && reporter.warn(reporter.lang("lockfileConflict"))), 
          lockfile = parseResult.object) : reporter && reporter.info(reporter.lang("noLockfileFound")), 
          lockfile && lockfile.__metadata) {
            lockfile = {};
          }
          return new Lockfile({
            cache: lockfile,
            source: rawLockfile,
            parseResultType: parseResult && parseResult.type
          });
        }))();
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