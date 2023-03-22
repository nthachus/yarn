'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.default = _default;

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
var _constants = require('../constants.js');
var _errors = require('../errors.js');
var _map = _interopRequireDefault(require('../util/map.js'));

var util = require('util');
var invariant = require('invariant');
var stripBOM = require('strip-bom');

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
  comma: 'COMMA',
};

var VALID_PROP_VALUE_TOKENS = [TOKEN_TYPES.boolean, TOKEN_TYPES.string, TOKEN_TYPES.number];

function isValidPropValueToken(token) {
  return VALID_PROP_VALUE_TOKENS.indexOf(token.type) >= 0;
}

function* tokenise(input) {
  var lastNewline = false;
  var line = 1;
  var col = 0;

  function buildToken(type, value) {
    return {line, col, type, value};
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

      var nextNewline = input.indexOf('\n', chop);
      if (nextNewline < 0) {
        nextNewline = input.length;
      }
      var val = input.substring(chop, nextNewline);
      chop = nextNewline;
      yield buildToken(TOKEN_TYPES.comment, val);
    } else if (input[0] === ' ') {
      if (lastNewline) {
        var indentSize = 1;
        for (var i = 1; input[i] === ' '; i++) {
          indentSize++;
        }

        if (indentSize % 2) {
          throw new TypeError('Invalid number of spaces');
        } else {
          chop = indentSize;
          yield buildToken(TOKEN_TYPES.indent, indentSize / 2);
        }
      } else {
        chop++;
      }
    } else if (input[0] === '"') {
      var _i = 1;
      for (; _i < input.length; _i++) {
        if (input[_i] === '"') {
          var isEscaped = input[_i - 1] === '\\' && input[_i - 2] !== '\\';
          if (!isEscaped) {
            _i++;
            break;
          }
        }
      }
      var _val = input.substring(0, _i);
      chop = _i;

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
      var _val2 = /^[0-9]+/.exec(input)[0];
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
    } else if (/^[a-zA-Z\/.-]/g.test(input)) {
      var _i2 = 0;
      for (; _i2 < input.length; _i2++) {
        var char = input[_i2];
        if (char === ':' || char === ' ' || char === '\n' || char === '\r' || char === ',') {
          break;
        }
      }
      var name = input.substring(0, _i2);
      chop = _i2;

      yield buildToken(TOKEN_TYPES.string, name);
    } else {
      yield buildToken(TOKEN_TYPES.invalid);
    }

    if (!chop) {
      // will trigger infinite recursion
      yield buildToken(TOKEN_TYPES.invalid);
    }

    col += chop;
    lastNewline = input[0] === '\n' || (input[0] === '\r' && input[1] === '\n');
    input = input.slice(chop);
  }

  yield buildToken(TOKEN_TYPES.eof);
}

class Parser {
  constructor(input) {
    var fileLoc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'lockfile';

    this.comments = [];
    this.tokens = tokenise(input);
    this.fileLoc = fileLoc;
  }

  onComment(token) {
    var value = token.value;
    invariant(typeof value === 'string', 'expected token value to be a string');

    var comment = value.trim();

    var versionMatch = comment.match(VERSION_REGEX);
    if (versionMatch) {
      var version = +versionMatch[1];
      if (version > _constants.LOCKFILE_VERSION) {
        throw new _errors.MessageError(
          `Can't install from a lockfile of version ${version} as you're on an old yarn version that only supports versions up to ${_constants.LOCKFILE_VERSION}. Run \`$ yarn self-update\` to upgrade to the latest version.`
        );
      }
    }

    this.comments.push(comment);
  }

  next() {
    var item = this.tokens.next();
    invariant(item, 'expected a token');

    var done = item.done, value = item.value;
    if (done || !value) {
      throw new Error('No more tokens');
    } else if (value.type === TOKEN_TYPES.comment) {
      this.onComment(value);
      return this.next();
    } else {
      return (this.token = value);
    }
  }

  unexpected() {
    var msg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Unexpected token';
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

  parse() {
    var indent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    var obj = (0, _map.default)();

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
        invariant(key, 'Expected a key');

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
          invariant(_key, 'Expected a key');
          keys.push(_key);
          this.next();
        }

        var wasColon = this.token.type === TOKEN_TYPES.colon;
        if (wasColon) {
          this.next();
        }

        if (isValidPropValueToken(this.token)) {
          // plain value
          for (var _key2 of keys) {
            obj[_key2] = this.token.value;
          }

          this.next();
        } else if (wasColon) {
          // parse object
          var val = this.parse(indent + 1);

          for (var _key3 of keys) {
            obj[_key3] = val;
          }

          if (indent && this.token.type !== TOKEN_TYPES.indent) {
            break;
          }
        } else {
          this.unexpected('Invalid value type');
        }
      } else {
        this.unexpected(`Unknown token: ${util.inspect(propToken)}`);
      }
    }

    return obj;
  }
}

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
  var parser = new Parser(str, fileLoc);
  parser.next();
  return parser.parse();
}

/**
 * Parse and merge the two variants in a conflicted lockfile.
 */
function parseWithConflict(str, fileLoc) {
  var variants = extractConflictVariants(str);
  try {
    return {type: 'merge', object: Object.assign({}, parse(variants[0], fileLoc), parse(variants[1], fileLoc))};
  } catch (err) {
    if (err instanceof SyntaxError) {
      return {type: 'conflict', object: {}};
    } else {
      throw err;
    }
  }
}

function _default(str) {
  var fileLoc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'lockfile';

  str = stripBOM(str);
  return hasMergeConflicts(str) ? parseWithConflict(str, fileLoc) : {type: 'success', object: parse(str, fileLoc)};
}
