'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.cleanDependencies = cleanDependencies;
exports.default = _default;
exports.isValidPackageName = isValidPackageName;

var _errors = require('../../errors.js');
var _util = require('./util.js');
var _typos = _interopRequireDefault(require('./typos.js'));

var isBuiltinModule = require('is-builtin-module');

var strings = ['name', 'version'];

var dependencyKeys = [
  // npm registry will include optionalDependencies in dependencies and we'll want to dedupe them from the
  // other fields first
  'optionalDependencies',

  // it's seemingly common to include a dependency in dependencies and devDependencies of the same name but
  // different ranges, this can cause a lot of issues with our determinism and the behaviour of npm is
  // currently unspecified.
  'dependencies',

  'devDependencies',
];

function isValidName(name) {
  return !name.match(/[\/@\s\+%:]/) && encodeURIComponent(name) === name;
}

function isValidScopedName(name) {
  if (name[0] !== '@') {
    return false;
  }

  var parts = name.slice(1).split('/');
  return parts.length === 2 && isValidName(parts[0]) && isValidName(parts[1]);
}

function isValidPackageName(name) {
  return isValidName(name) || isValidScopedName(name);
}

function _default(info, isRoot, reporter, warn) {
  if (isRoot) {
    for (var key in _typos.default) {
      if (key in info) {
        warn(reporter.lang('manifestPotentialTypo', key, _typos.default[key]));
      }
    }
  }

  // validate name
  var name = info.name;
  if (typeof name === 'string') {
    if (isRoot && isBuiltinModule(name)) {
      warn(reporter.lang('manifestBuiltinModule', name));
    }

    // cannot start with a dot
    if (name[0] === '.') {
      throw new _errors.MessageError(reporter.lang('manifestNameDot'));
    }

    // cannot contain the following characters
    if (!isValidPackageName(name)) {
      throw new _errors.MessageError(reporter.lang('manifestNameIllegalChars'));
    }

    // cannot equal node_modules or favicon.ico
    var lower = name.toLowerCase();
    if (lower === 'node_modules' || lower === 'favicon.ico') {
      throw new _errors.MessageError(reporter.lang('manifestNameBlacklisted'));
    }
  }

  // validate license
  if (isRoot && !info.private) {
    if (typeof info.license === 'string') {
      var license = info.license.replace(/\*$/g, '');
      if (!(0, _util.isValidLicense)(license)) {
        warn(reporter.lang('manifestLicenseInvalid'));
      }
    } else {
      warn(reporter.lang('manifestLicenseNone'));
    }
  }

  // validate strings
  for (var _key of strings) {
    var val = info[_key];
    if (val && typeof val !== 'string') {
      throw new _errors.MessageError(reporter.lang('manifestStringExpected', _key));
    }
  }

  cleanDependencies(info, isRoot, reporter, warn);
}

function cleanDependencies(info, isRoot, reporter, warn) {
  // get dependency objects
  var depTypes = [];
  for (var type of dependencyKeys) {
    var deps = info[type];
    if (!deps || typeof deps !== 'object') {
      continue;
    }
    depTypes.push([type, deps]);
  }

  // aggregate all non-trivial deps (not '' or '*')
  var nonTrivialDeps = new Map();
  for (var _ref of depTypes) {
    var _type = _ref[0], _deps = _ref[1];
    for (var name of Object.keys(_deps)) {
      var version = _deps[name];
      if (!nonTrivialDeps.has(name) && version && version !== '*') {
        nonTrivialDeps.set(name, {type: _type, version});
      }
    }
  }

  // overwrite first dep of package with non-trivial version, remove the rest
  var setDeps = new Set();
  for (var _ref2 of depTypes) {
    var _type2 = _ref2[0], _deps2 = _ref2[1];
    for (var _name of Object.keys(_deps2)) {
      var _version = _deps2[_name];

      var dep = nonTrivialDeps.get(_name);
      if (dep) {
        if (_version && _version !== '*' && _version !== dep.version && isRoot) {
          // only throw a warning when at the root
          warn(reporter.lang('manifestDependencyCollision', dep.type, _name, dep.version, _type2, _version));
        }
        _version = dep.version;
      }

      if (setDeps.has(_name)) {
        delete _deps2[_name];
      } else {
        _deps2[_name] = _version;
        setDeps.add(_name);
      }
    }
  }
}
