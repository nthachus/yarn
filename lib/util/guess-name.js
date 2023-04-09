'use strict';
exports.__esModule = true;
exports.default = guessName;

var url = require('url');

function cleanup(name) {
  name = name.replace(/-\d+\.\d+\.\d+/, '');
  return name.replace(/\.git$|\.zip$|\.tar\.gz$|\.tar\.bz2$/, '');
}

function guessNameFallback(source) {
  // If cannot parse as url, just return cleaned up last part
  var parts = source.split('/');
  return cleanup(parts[parts.length - 1]);
}

function guessName(source) {
  try {
    var parsed = url.parse(source);

    if (!parsed.pathname) {
      return guessNameFallback(source);
    }

    var parts = parsed.pathname.split('/');

    // Priority goes to part that ends with .git
    for (var part of parts) {
      if (part.match(/\.git$/)) {
        return cleanup(part);
      }
    }

    // Most likely a directory
    if (parsed.host == null) {
      return cleanup(parts[parts.length - 1]);
    }

    // A site like github or gitlab
    if (parts.length > 2) {
      return cleanup(parts[2]);
    }

    // Privately hosted package?
    if (parts.length > 1) {
      return cleanup(parts[1]);
    }

    return guessNameFallback(source);
  } catch (e) {
    return guessNameFallback(source);
  }
}
