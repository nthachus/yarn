/**
 * Determines the current version of Yarn itself.
 */

'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.getInstallationMethod = getInstallationMethod;
exports.version = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _fs = require('./fs');

var fs = require('fs');
var path = require('path');

// This will be bundled directly in the .js file for production builds
var _require = require('../../package.json'), version = _require.version, originalInstallationMethod = _require.installationMethod;
exports.version = version;

function getInstallationMethod() {
  return _getInstallationMethod.apply(this, arguments);
}
function _getInstallationMethod() {
  _getInstallationMethod = (0, _asyncToGenerator2.default)(function* () {
    var installationMethod = originalInstallationMethod;

    // If there's a package.json in the parent directory, it could have an
    // override for the installation method, so we should prefer that over
    // whatever was originally in Yarn's package.json. This is the case with
    // systems such as Homebrew, which take the tarball and modify the
    // installation method so we're aware of the fact that Yarn was installed via
    // Homebrew (so things like update notifications can point out the correct
    // command to upgrade).
    try {
      var manifestPath = path.join(__dirname, '..', 'package.json');
      if (fs.existsSync(manifestPath)) {
        // non-async version is deprecated
        var manifest = yield (0, _fs.readJson)(manifestPath);
        if (manifest.installationMethod) {
          installationMethod = manifest.installationMethod;
        }
      }
    } catch (e) {
      // Ignore any errors; this is not critical functionality.
    }
    return installationMethod;
  });

  return _getInstallationMethod.apply(this, arguments);
}
