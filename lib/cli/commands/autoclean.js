'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.clean = clean;
exports.hasWrapper = hasWrapper;
exports.requireLockfile = exports.noArguments = void 0;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _index = require('../../registries/index.js');
var _filter = require('../../util/filter.js');
var _constants = require('../../constants.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));

var invariant = require('invariant');
var path = require('path');

var requireLockfile = true;
exports.requireLockfile = requireLockfile;
var noArguments = true;
exports.noArguments = noArguments;

var DEFAULT_FILTER = `
# test directories
__tests__
test
tests
powered-test

# asset directories
docs
doc
website
images
assets

# examples
example
examples

# code coverage directories
coverage
.nyc_output

# build scripts
Makefile
Gulpfile.js
Gruntfile.js

# configs
appveyor.yml
circle.yml
codeship-services.yml
codeship-steps.yml
wercker.yml
.tern-project
.gitattributes
.editorconfig
.*ignore
.eslintrc
.jshintrc
.flowconfig
.documentup.json
.yarn-metadata.json
.travis.yml

# misc
*.md
`.trim();

function clean() {
  return _clean.apply(this, arguments);
}
function _clean() {
  _clean = (0, _asyncToGenerator2.default)(function* (
    config,
    reporter
  ) {
    var loc = path.join(config.lockfileFolder, _constants.CLEAN_FILENAME);
    var file = yield fs.readFile(loc);
    var lines = file.split('\n');
    var filters = (0, _filter.ignoreLinesToRegex)(lines);

    var removedFiles = 0;
    var removedSize = 0;

    // build list of possible module folders
    var locs = new Set();
    for (var registryFolder of config.registryFolders) {
      locs.add(path.resolve(config.lockfileFolder, registryFolder));
    }

    var workspaceRootFolder = config.workspaceRootFolder;
    if (workspaceRootFolder) {
      var manifest = yield config.findManifest(workspaceRootFolder, false);
      invariant(manifest && manifest.workspaces, 'We must find a manifest with a "workspaces" property');

      var workspaces = yield config.resolveWorkspaces(workspaceRootFolder, manifest);

      for (var workspaceName of Object.keys(workspaces)) {
        for (var name of _index.registryNames) {
          var registry = config.registries[name];
          locs.add(path.join(workspaces[workspaceName].loc, registry.folder));
        }
      }
    }

    for (var folder of locs) {
      if (!(yield fs.exists(folder))) {
        continue;
      }

      var spinner = reporter.activity();
      var files = yield fs.walk(folder);
      var _sortFilter = (0, _filter.sortFilter)(files, filters), ignoreFiles = _sortFilter.ignoreFiles;
      spinner.end();

      var tick = reporter.progress(ignoreFiles.size);
      // TODO make sure `main` field of all modules isn't ignored

      for (var _file of ignoreFiles) {
        var _loc = path.join(folder, _file);
        var stat = yield fs.lstat(_loc);
        removedSize += stat.size;
        removedFiles++;
      }

      for (var _file2 of ignoreFiles) {
        var _loc2 = path.join(folder, _file2);
        yield fs.unlink(_loc2);
        tick();
      }
    }

    return {removedFiles, removedSize};
  });

  return _clean.apply(this, arguments);
}

function runInit() {
  return _runInit.apply(this, arguments);
}
function _runInit() {
  _runInit = (0, _asyncToGenerator2.default)(function* (cwd, reporter) {
    reporter.step(1, 1, reporter.lang('cleanCreatingFile', _constants.CLEAN_FILENAME));
    var cleanLoc = path.join(cwd, _constants.CLEAN_FILENAME);
    yield fs.writeFile(cleanLoc, `${DEFAULT_FILTER}\n`, {flag: 'wx'});
    reporter.info(reporter.lang('cleanCreatedFile', _constants.CLEAN_FILENAME));
  });

  return _runInit.apply(this, arguments);
}

function runAutoClean() {
  return _runAutoClean.apply(this, arguments);
}
function _runAutoClean() {
  _runAutoClean = (0, _asyncToGenerator2.default)(function* (config, reporter) {
    reporter.step(1, 1, reporter.lang('cleaning'));
    var _yield$clean = yield clean(config, reporter), removedFiles = _yield$clean.removedFiles, removedSize = _yield$clean.removedSize;
    reporter.info(reporter.lang('cleanRemovedFiles', removedFiles));
    reporter.info(reporter.lang('cleanSavedSize', Number((removedSize / 1024 / 1024).toFixed(2))));
  });

  return _runAutoClean.apply(this, arguments);
}

function checkForCleanFile() {
  return _checkForCleanFile.apply(this, arguments);
}
function _checkForCleanFile() {
  _checkForCleanFile = (0, _asyncToGenerator2.default)(function* (cwd) {
    var cleanLoc = path.join(cwd, _constants.CLEAN_FILENAME);
    var exists = yield fs.exists(cleanLoc);
    return exists;
  });

  return _checkForCleanFile.apply(this, arguments);
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var cleanFileExists = yield checkForCleanFile(config.cwd);

    if (flags.init && cleanFileExists) {
      reporter.info(reporter.lang('cleanAlreadyExists', _constants.CLEAN_FILENAME));
    } else if (flags.init) {
      yield runInit(config.cwd, reporter);
    } else if (flags.force && cleanFileExists) {
      yield runAutoClean(config, reporter);
    } else if (cleanFileExists) {
      reporter.info(reporter.lang('cleanRequiresForce', _constants.CLEAN_FILENAME));
    } else {
      reporter.info(reporter.lang('cleanDoesNotExist', _constants.CLEAN_FILENAME));
    }
  });

  return _run.apply(this, arguments);
}

function setFlags(commander) {
  commander.description('Cleans and removes unnecessary files from package dependencies.');
  commander.usage('autoclean [flags]');
  commander.option('-I, --init', `Create "${_constants.CLEAN_FILENAME}" file with the default entries.`);
  commander.option('-F, --force', `Run autoclean using the existing "${_constants.CLEAN_FILENAME}" file.`);
}

function hasWrapper(commander) {
  return true;
}
