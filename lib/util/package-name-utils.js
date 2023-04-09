'use strict';
exports.__esModule = true;
exports.getPlatformSpecificPackageFilename = getPlatformSpecificPackageFilename;
exports.getSystemParams = getSystemParams;

function getPlatformSpecificPackageFilename(pkg) {
  // TODO support hash for all subdependencies that have installs scripts
  var normalizeScope = name => (name[0] === '@' ? name.substr(1).replace('/', '-') : name);
  var suffix = getSystemParams();
  return `${normalizeScope(pkg.name)}-v${pkg.version}-${suffix}`;
}

function getSystemParams() {
  // TODO support platform variant for linux
  return `${process.platform}-${process.arch}-${process.versions.modules || ''}`;
}
