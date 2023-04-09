'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.examples = void 0;
exports.getName = getName;
exports.run = exports.hasWrapper = void 0;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));
var _login = require('./login.js');
var _npmRegistry = _interopRequireDefault(require('../../registries/npm-registry.js'));
var _errors = require('../../errors.js');
var _normalizePattern2 = require('../../util/normalize-pattern.js');
var _validate = require('../../util/normalize-manifest/validate.js');

function getName() {
  return _getName.apply(this, arguments);
}
function _getName() {
  _getName = (0, _asyncToGenerator2.default)(function* (args, config) {
    var name = args.shift();

    if (!name) {
      var pkg = yield config.readRootManifest();
      name = pkg.name;
    }

    if (name) {
      if (!(0, _validate.isValidPackageName)(name)) {
        throw new _errors.MessageError(config.reporter.lang('invalidPackageName'));
      }

      return _npmRegistry.default.escapeName(name);
    } else {
      throw new _errors.MessageError(config.reporter.lang('unknownPackageName'));
    }
  });

  return _getName.apply(this, arguments);
}

function list() {
  return _list.apply(this, arguments);
}
function _list() {
  _list = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var name = yield getName(args, config);

    reporter.step(1, 1, reporter.lang('gettingTags'));
    var tags = yield config.registries.npm.request(`-/package/${name}/dist-tags`);

    if (tags) {
      reporter.info(`Package ${name}`);
      for (var _name in tags) {
        reporter.info(`${_name}: ${tags[_name]}`);
      }
    }

    if (!tags) {
      throw new _errors.MessageError(reporter.lang('packageNotFoundRegistry', name, 'npm'));
    }
  });

  return _list.apply(this, arguments);
}

function remove() {
  return _remove.apply(this, arguments);
}
function _remove() {
  _remove = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (args.length !== 2) {
      return false;
    }

    var name = yield getName(args, config);
    var tag = args.shift();

    reporter.step(1, 3, reporter.lang('loggingIn'));
    var revoke = yield (0, _login.getToken)(config, reporter, name);

    reporter.step(2, 3, reporter.lang('deletingTags'));
    var result = yield config.registries.npm.request(`-/package/${name}/dist-tags/${encodeURI(tag)}`, {
      method: 'DELETE',
    });

    if (result === false) {
      reporter.error(reporter.lang('deletedTagFail'));
    } else {
      reporter.success(reporter.lang('deletedTag'));
    }

    reporter.step(3, 3, reporter.lang('revokingToken'));
    yield revoke();

    if (result === false) {
      throw new Error();
    } else {
      return true;
    }
  });

  return _remove.apply(this, arguments);
}

function setFlags(commander) {
  commander.description('Add, remove, or list tags on a package.');
}

var _buildSubCommands = (0, _buildSubCommands2.default)(
  'tag',
  {
    add(config, reporter, flags, args) {
      return (0, _asyncToGenerator2.default)(function* () {
        if (args.length !== 2) {
          return false;
        }

        var _normalizePattern = (0, _normalizePattern2.normalizePattern)(args.shift()), name = _normalizePattern.name, range = _normalizePattern.range, hasVersion = _normalizePattern.hasVersion;
        if (!hasVersion) {
          throw new _errors.MessageError(reporter.lang('requiredVersionInRange'));
        }
        if (!(0, _validate.isValidPackageName)(name)) {
          throw new _errors.MessageError(reporter.lang('invalidPackageName'));
        }

        var tag = args.shift();

        reporter.step(1, 3, reporter.lang('loggingIn'));
        var revoke = yield (0, _login.getToken)(config, reporter, name);

        reporter.step(2, 3, reporter.lang('creatingTag', tag, range));
        var result = yield config.registries.npm.request(
          `-/package/${_npmRegistry.default.escapeName(name)}/dist-tags/${encodeURI(tag)}`,
          {
            method: 'PUT',
            body: range,
          }
        );

        if (result != null && result.ok) {
          reporter.success(reporter.lang('createdTag'));
        } else {
          reporter.error(reporter.lang('createdTagFail'));
        }

        reporter.step(3, 3, reporter.lang('revokingToken'));
        yield revoke();

        if (result != null && result.ok) {
          return true;
        } else {
          throw new Error();
        }
      })();
    },

    rm(config, reporter, flags, args) {
      return (0, _asyncToGenerator2.default)(function* () {
        reporter.warn(`\`yarn tag rm\` is deprecated. Please use \`yarn tag remove\`.`);
        yield remove(config, reporter, flags, args);
      })();
    },

    remove(config, reporter, flags, args) {
      return (0, _asyncToGenerator2.default)(function* () {
        yield remove(config, reporter, flags, args);
      })();
    },

    ls(config, reporter, flags, args) {
      return (0, _asyncToGenerator2.default)(function* () {
        reporter.warn(`\`yarn tag ls\` is deprecated. Please use \`yarn tag list\`.`);
        yield list(config, reporter, flags, args);
      })();
    },

    list(config, reporter, flags, args) {
      return (0, _asyncToGenerator2.default)(function* () {
        yield list(config, reporter, flags, args);
      })();
    },
  },
  ['add <pkg>@<version> [<tag>]', 'remove <pkg> <tag>', 'list [<pkg>]']
);
exports.run = _buildSubCommands.run;
exports.hasWrapper = _buildSubCommands.hasWrapper;
exports.examples = _buildSubCommands.examples;
