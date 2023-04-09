'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.makePortableProxyScript = makePortableProxyScript;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var fs = _interopRequireWildcard(require('./fs.js'));

var path = require('path');

function makePortableProxyScriptUnix() {
  return _makePortableProxyScriptUnix.apply(this, arguments);
}
function _makePortableProxyScriptUnix() {
  _makePortableProxyScriptUnix = (0, _asyncToGenerator2.default)(function* (
    source,
    destination,
    options
  ) {
    var environment = options.extraEnvironment
      ? Array.from(options.extraEnvironment.entries()).map(_ref => {
          var key = _ref[0], value = _ref[1];
          return `${key}="${value}"`;
        }).join(' ') + ' '
      : '';

    var prependedArguments = options.prependArguments
      ? ' ' + options.prependArguments.map(arg => `"${arg}"`).join(' ')
      : '';
    var appendedArguments = options.appendArguments
      ? ' ' + options.appendArguments.map(arg => `"${arg}"`).join(' ')
      : '';

    var filePath = `${destination}/${options.proxyBasename || path.basename(source)}`;

    // Unless impossible we want to preserve any symlinks used to call us when forwarding the call to the binary (so we
    // cannot use realpath or transform relative paths into absolute ones), but we also need to tell the sh interpreter
    // that the symlink should be resolved relative to the script directory (hence dirname "$0" at runtime).
    var sourcePath = path.isAbsolute(source) ? source : `$(dirname "$0")/../${source}`;

    yield fs.mkdirp(destination);

    if (process.platform === 'win32') {
      yield fs.writeFile(
        filePath + '.cmd',
        `@${environment}"${sourcePath}" ${prependedArguments} ${appendedArguments} %*\r\n`
      );
    } else {
      yield fs.writeFile(
        filePath,
        `#!/bin/sh\n\n${environment}exec "${sourcePath}"${prependedArguments} "$@"${appendedArguments}\n`
      );
      yield fs.chmod(filePath, 0o755);
    }
  });

  return _makePortableProxyScriptUnix.apply(this, arguments);
}

function makePortableProxyScript(
  source,
  destination,
  // $FlowFixMe Flow doesn't support exact types with empty default values
  options
) {
  if (options === void 0) options = {};
  return makePortableProxyScriptUnix(source, destination, options);
}
