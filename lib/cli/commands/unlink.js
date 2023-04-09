'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _link = require('./link.js');
var _global = require('./global');

var path = require('path');

function setFlags(commander) {
  commander.description('Unlink a previously created symlink for a package.');
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (args.length) {
      for (var name of args) {
        var linkLoc = path.join(config.linkFolder, name);
        if (yield fs.exists(linkLoc)) {
          yield fs.unlink(path.join(yield (0, _link.getRegistryFolder)(config, name), name));
          reporter.success(reporter.lang('linkDisusing', name));
          reporter.info(reporter.lang('linkDisusingMessage', name));
        } else {
          throw new _errors.MessageError(reporter.lang('linkMissing', name));
        }
      }
    } else {
      // remove from registry
      var manifest = yield config.readRootManifest();
      var _name = manifest.name;
      if (!_name) {
        throw new _errors.MessageError(reporter.lang('unknownPackageName'));
      }

      var _linkLoc = path.join(config.linkFolder, _name);
      if (yield fs.exists(_linkLoc)) {
        // If there is a `bin` defined in the package.json,
        // link each bin to the global bin
        if (manifest.bin) {
          var globalBinFolder = yield (0, _global.getBinFolder)(config, flags);
          for (var binName in manifest.bin) {
            var binDestLoc = path.join(globalBinFolder, binName);
            if (yield fs.exists(binDestLoc)) {
              yield fs.unlink(binDestLoc);
              if (process.platform === 'win32') {
                yield fs.unlink(binDestLoc + '.cmd');
              }
            }
          }
        }

        yield fs.unlink(_linkLoc);

        reporter.success(reporter.lang('linkUnregistered', _name));
        reporter.info(reporter.lang('linkUnregisteredMessage', _name));
      } else {
        throw new _errors.MessageError(reporter.lang('linkMissing', _name));
      }
    }
  });

  return _run.apply(this, arguments);
}
