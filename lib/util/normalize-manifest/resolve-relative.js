'use strict';
exports.__esModule = true;
exports.default = _default;

var _constants = require('../../constants.js');
var _fileResolver = require('../../resolvers/exotics/file-resolver.js');
var _linkResolver = require('../../resolvers/exotics/link-resolver.js');
var invariant = require('invariant');

var path = require('path');

function _default(info, moduleLoc, lockfileFolder) {
  // It won't work if we don't yet know what's the folder we'll use as root. It's not a
  // big deal tho, because it only happens when trying to figure out the root, and we
  // don't need to know the dependencies / devDependencies at this time.
  if (!lockfileFolder) {
    return;
  }

  for (var dependencyType of _constants.DEPENDENCY_TYPES) {
    var dependencies = info[dependencyType];
    if (!dependencies) {
      continue;
    }

    for (var name of Object.keys(dependencies)) {
      var value = dependencies[name];

      if (path.isAbsolute(value)) {
        value = _fileResolver.FILE_PROTOCOL_PREFIX + value;
      }

      var prefix;
      if (value.startsWith(_fileResolver.FILE_PROTOCOL_PREFIX)) {
        prefix = _fileResolver.FILE_PROTOCOL_PREFIX;
      } else if (value.startsWith(_linkResolver.LINK_PROTOCOL_PREFIX)) {
        prefix = _linkResolver.LINK_PROTOCOL_PREFIX;
      } else {
        continue;
      }
      invariant(prefix, 'prefix is definitely defined here');

      var unprefixed = value.substr(prefix.length);
      var hasPathPrefix = /^\.(\/|$)/.test(unprefixed);

      var absoluteTarget = path.resolve(lockfileFolder, moduleLoc, unprefixed);
      var relativeTarget = path.relative(lockfileFolder, absoluteTarget) || '.';

      if (absoluteTarget === lockfileFolder) {
        relativeTarget = '.';
      } else if (hasPathPrefix) {
        // TODO: This logic should be removed during the next major bump
        // If the original value was using the "./" prefix, then we output a similar path.
        // We need to do this because otherwise it would cause problems with already existing
        // lockfile, which would see some of their entries being unrecognized.
        relativeTarget = relativeTarget.replace(/^(?!\.{0,2}\/)/, `./`);
      }

      dependencies[name] = prefix + relativeTarget.replace(/\\/g, '/');
    }
  }
}
