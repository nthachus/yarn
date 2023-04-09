'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = exports.examples = void 0;
exports.mutate = mutate;
exports.run = void 0;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');
var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));
var _validate = require('../../util/normalize-manifest/validate.js');
var _tag = require('./tag.js');
var _login = require('./login.js');
var _npmRegistry = _interopRequireDefault(require('../../registries/npm-registry.js'));

function mutate() {
  return _mutate.apply(this, arguments);
}
function _mutate() {
  _mutate = (0, _asyncToGenerator2.default)(function* (
    args,
    config,
    reporter,
    buildMessages,
    mutator
  ) {
    if (args.length !== 2 && args.length !== 1) {
      return false;
    }

    var username = args.shift();
    var name = yield (0, _tag.getName)(args, config);
    if (!(0, _validate.isValidPackageName)(name)) {
      throw new _errors.MessageError(reporter.lang('invalidPackageName'));
    }

    var msgs = buildMessages(username, name);
    reporter.step(1, 3, reporter.lang('loggingIn'));
    var revoke = yield (0, _login.getToken)(config, reporter, name);

    reporter.step(2, 3, msgs.info);
    var user = yield config.registries.npm.request(`-/user/org.couchdb.user:${username}`);
    var error = false;
    if (user) {
      // get package
      var pkg = yield config.registries.npm.request(_npmRegistry.default.escapeName(name));
      if (pkg) {
        pkg.maintainers = pkg.maintainers || [];
        error = mutator({name: user.name, email: user.email}, pkg);
      } else {
        error = true;
        reporter.error(reporter.lang('unknownPackage', name));
      }

      // update package
      if (pkg && !error) {
        var res = yield config.registries.npm.request(`${_npmRegistry.default.escapeName(name)}/-rev/${pkg._rev}`, {
          method: 'PUT',
          body: {
            _id: pkg._id,
            _rev: pkg._rev,
            maintainers: pkg.maintainers,
          },
        });

        if (res != null && res.success) {
          reporter.success(msgs.success);
        } else {
          error = true;
          reporter.error(msgs.error);
        }
      }
    } else {
      error = true;
      reporter.error(reporter.lang('unknownUser', username));
    }

    reporter.step(3, 3, reporter.lang('revokingToken'));
    yield revoke();

    if (error) {
      throw new Error();
    } else {
      return true;
    }
  });

  return _mutate.apply(this, arguments);
}

function list() {
  return _list.apply(this, arguments);
}
function _list() {
  _list = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    if (args.length > 1) {
      return false;
    }
    var name = yield (0, _tag.getName)(args, config);
    reporter.step(1, 1, reporter.lang('ownerGetting', name));
    var pkg = yield config.registries.npm.request(name, {unfiltered: true});
    if (pkg) {
      var owners = pkg.maintainers;
      if (!owners || !owners.length) {
        reporter.warn(reporter.lang('ownerNone'));
      } else {
        for (var owner of owners) {
          reporter.info(`${owner.name} <${owner.email}>`);
        }
      }
    } else {
      reporter.error(reporter.lang('ownerGettingFailed'));
    }

    if (pkg) {
      return true;
    } else {
      throw new Error();
    }
  });

  return _list.apply(this, arguments);
}

function remove(config, reporter, flags, args) {
  return mutate(
    args,
    config,
    reporter,
    (username, name) => ({
      info: reporter.lang('ownerRemoving', username, name),
      success: reporter.lang('ownerRemoved'),
      error: reporter.lang('ownerRemoveError'),
    }),
    (user, pkg) => {
      var found = false;

      pkg.maintainers = pkg.maintainers.filter((o) => {
        var match = o.name === user.name;
        found = found || match;
        return !match;
      });

      if (!found) {
        reporter.error(reporter.lang('userNotAnOwner', user.name));
      }

      return found;
    }
  );
}

function setFlags(commander) {
  commander.description('Manages package owners.');
}

var _buildSubCommands = (0, _buildSubCommands2.default)(
  'owner',
  {
    add(config, reporter, flags, args) {
      return mutate(
        args,
        config,
        reporter,
        (username, name) => ({
          info: reporter.lang('ownerAdding', username, name),
          success: reporter.lang('ownerAdded'),
          error: reporter.lang('ownerAddingFailed'),
        }),
        (user, pkg) => {
          for (var owner of pkg.maintainers) {
            if (owner.name === user) {
              reporter.error(reporter.lang('ownerAlready'));
              return true;
            }
          }

          pkg.maintainers.push(user);

          return false;
        }
      );
    },

    rm(config, reporter, flags, args) {
      reporter.warn(`\`yarn owner rm\` is deprecated. Please use \`yarn owner remove\`.`);
      return remove(config, reporter, flags, args);
    },

    remove(config, reporter, flags, args) {
      return remove(config, reporter, flags, args);
    },

    ls(config, reporter, flags, args) {
      reporter.warn(`\`yarn owner ls\` is deprecated. Please use \`yarn owner list\`.`);
      return list(config, reporter, flags, args);
    },

    list(config, reporter, flags, args) {
      return list(config, reporter, flags, args);
    },
  },
  ['add <user> [[<@scope>/]<pkg>]', 'remove <user> [[<@scope>/]<pkg>]', 'list [<@scope>/]<pkg>']
);
exports.run = _buildSubCommands.run;
exports.hasWrapper = _buildSubCommands.hasWrapper;
exports.examples = _buildSubCommands.examples;
