'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.getRegistryFolder = getRegistryFolder;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _global = require('./global');

var invariant = require('invariant');
var cmdShim = require('@zkochan/cmd-shim');
var path = require('path');

function getRegistryFolder() {
  return _getRegistryFolder.apply(this, arguments);
}
function _getRegistryFolder() {
  _getRegistryFolder = (0, _asyncToGenerator2.default)(function* (config, name) {
    if (config.modulesFolder) {
      return config.modulesFolder;
    }

    var src = path.join(config.linkFolder, name);
    var _yield$config$readMan = yield config.readManifest(src), _registry = _yield$config$readMan._registry;
    invariant(_registry, 'expected registry');

    var registryFolder = config.registries[_registry].folder;
    return path.join(config.cwd, registryFolder);
  });

  return _getRegistryFolder.apply(this, arguments);
}

function hasWrapper(commander, args) {
  return true;
}

function setFlags(commander) {
  commander.description('Symlink a package folder during development.');
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (args.length) {
      for (var name of args) {
        var src = path.join(config.linkFolder, name);

        if (yield fs.exists(src)) {
          var folder = yield getRegistryFolder(config, name);
          var dest = path.join(folder, name);

          yield fs.unlink(dest);
          yield fs.mkdirp(path.dirname(dest));
          yield fs.symlink(src, dest);
          reporter.success(reporter.lang('linkUsing', name));
        } else {
          throw new _errors.MessageError(reporter.lang('linkMissing', name));
        }
      }
    } else {
      // add cwd module to the global registry
      var manifest = yield config.readRootManifest();
      var _name = manifest.name;
      if (!_name) {
        throw new _errors.MessageError(reporter.lang('unknownPackageName'));
      }

      var linkLoc = path.join(config.linkFolder, _name);
      if (yield fs.exists(linkLoc)) {
        reporter.warn(reporter.lang('linkCollision', _name));
      } else {
        yield fs.mkdirp(path.dirname(linkLoc));
        yield fs.symlink(config.cwd, linkLoc);

        // If there is a `bin` defined in the package.json,
        // link each bin to the global bin
        if (manifest.bin) {
          var globalBinFolder = yield (0, _global.getBinFolder)(config, flags);
          for (var binName in manifest.bin) {
            var binSrc = manifest.bin[binName];
            var binSrcLoc = path.join(linkLoc, binSrc);
            var binDestLoc = path.join(globalBinFolder, binName);
            if (yield fs.exists(binDestLoc)) {
              reporter.warn(reporter.lang('binLinkCollision', binName));
            } else {
              if (process.platform === 'win32') {
                yield cmdShim(binSrcLoc, binDestLoc, {createPwshFile: false});
              } else {
                yield fs.symlink(binSrcLoc, binDestLoc);
              }
            }
          }
        }

        reporter.success(reporter.lang('linkRegistered', _name));
        reporter.info(reporter.lang('linkRegisteredMessage', _name));
      }
    }
  });

  return _run.apply(this, arguments);
}
