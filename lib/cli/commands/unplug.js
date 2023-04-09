'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.clearAll = clearAll;
exports.clearSome = clearSome;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _install = require('./install.js');
var _errors = require('../../errors.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));

var path = require('path');

function hasWrapper(commander) {
  return true;
}

function setFlags(commander) {
  commander.description(
    'Temporarily copies a package (with an optional @range suffix) outside of the global cache for debugging purposes'
  );
  commander.usage('unplug [packages ...] [flags]');
  commander.option('--clear', 'Delete the selected packages');
  commander.option('--clear-all', 'Delete all unplugged packages');
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (!config.plugnplayEnabled) {
      throw new _errors.MessageError(reporter.lang('unplugDisabled'));
    }
    if (!args.length && flags.clear) {
      throw new _errors.MessageError(reporter.lang('tooFewArguments', 1));
    }
    if (args.length && flags.clearAll) {
      throw new _errors.MessageError(reporter.lang('noArguments'));
    }

    if (flags.clearAll) {
      yield clearAll(config);
    } else if (flags.clear) {
      yield clearSome(config, new Set(args));
    } else if (args.length > 0) {
      var lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder, reporter);
      yield (0, _install.wrapLifecycle)(config, flags, /*#__PURE__*/ (0, _asyncToGenerator2.default)(function* () {
        var install = new _install.Install(flags, config, reporter, lockfile);
        install.linker.unplugged = args;
        yield install.init();
      }));
    }

    var unpluggedPackageFolders = yield config.listUnpluggedPackageFolders();

    for (var target of unpluggedPackageFolders.values()) {
      reporter.log(target, {force: true});
    }
  });

  return _run.apply(this, arguments);
}

function clearSome() {
  return _clearSome.apply(this, arguments);
}
function _clearSome() {
  _clearSome = (0, _asyncToGenerator2.default)(function* (config, filters) {
    var unpluggedPackageFolders = yield config.listUnpluggedPackageFolders();
    var removeList = [];

    for (var _ref2 of unpluggedPackageFolders.entries()) {
      var unpluggedName = _ref2[0], target = _ref2[1];
      var _yield$fs$readJson = yield fs.readJson(path.join(target, 'package.json')), name = _yield$fs$readJson.name;
      var toBeRemoved = filters.has(name);

      if (toBeRemoved) {
        removeList.push(path.join(config.getUnpluggedPath(), unpluggedName));
      }
    }

    if (removeList.length === unpluggedPackageFolders.size) {
      yield fs.unlink(config.getUnpluggedPath());
    } else {
      for (var unpluggedPackagePath of removeList) {
        yield fs.unlink(unpluggedPackagePath);
      }
    }
  });

  return _clearSome.apply(this, arguments);
}

function clearAll() {
  return _clearAll.apply(this, arguments);
}
function _clearAll() {
  _clearAll = (0, _asyncToGenerator2.default)(function* (config) {
    yield fs.unlink(config.getUnpluggedPath());
  });

  return _clearAll.apply(this, arguments);
}
