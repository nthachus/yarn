'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.examples = void 0;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var _lockfile = require('../../lockfile');

function hasWrapper(commander, args) {
  return false;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var manifest;
    if (flags.useManifest) {
      manifest = yield config.readJson(flags.useManifest);
    } else {
      manifest = yield config.readRootManifest();
    }
    if (!manifest.name) {
      throw new _errors.MessageError(reporter.lang('noName'));
    }
    if (!manifest.version) {
      throw new _errors.MessageError(reporter.lang('noVersion'));
    }

    var entry = {
      name: manifest.name,
      version: manifest.version,
      resolved: flags.resolved,
      registry: flags.registry || manifest._registry,
      optionalDependencies: manifest.optionalDependencies,
      dependencies: manifest.dependencies,
    };
    var pattern = flags.pattern || `${entry.name}@${entry.version}`;
    reporter.log(
      (0, _lockfile.stringify)({
        [pattern]: (0, _lockfile.implodeEntry)(pattern, entry),
      })
    );
  });

  return _run.apply(this, arguments);
}

function setFlags(commander) {
  commander.description('Generates a lock file entry.');
  commander.option('--use-manifest <location>', 'description');
  commander.option('--resolved <resolved>', 'description');
  commander.option('--registry <registry>', 'description');
}

var examples = [
  'generate-lock-entry',
  'generate-lock-entry --use-manifest ./package.json',
  'generate-lock-entry --resolved local-file.tgz#hash',
];
exports.examples = examples;
