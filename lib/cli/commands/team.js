'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.run = exports.hasWrapper = exports.examples = void 0;
exports.setFlags = setFlags;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));
var _login = require('./login.js');

function explodeScopeTeam(arg, requireTeam, reporter) {
  var _arg$split = arg.split(':'), scope = _arg$split[0], team = _arg$split[1], parts = _arg$split.slice(2);

  if (parts.length) {
    return false;
  }

  if (requireTeam && !team) {
    return false;
  }

  return {
    scope: scope || '',
    team: team || '',
    user: '',
  };
}

function warnDeprecation(reporter, deprecationWarning) {
  var command = 'yarn team';
  reporter.warn(
    reporter.lang(
      'deprecatedCommand',
      `${command} ${deprecationWarning.deprecatedCommand}`,
      `${command} ${deprecationWarning.currentCommand}`
    )
  );
}

function wrapRequired(
  callback,
  requireTeam,
  deprecationInfo
) {
  return /*#__PURE__*/ (function() {
    var _ref = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
      if (deprecationInfo) {
        warnDeprecation(reporter, deprecationInfo);
      }

      if (!args.length) {
        return false;
      }

      var parts = explodeScopeTeam(args[0], requireTeam, reporter);
      if (!parts) {
        return false;
      }

      reporter.step(1, 3, reporter.lang('loggingIn'));
      var revoke = yield (0, _login.getToken)(config, reporter);

      var res = yield callback(parts, config, reporter, flags, args);
      if (!res) {
        return res;
      }

      reporter.step(3, 3, reporter.lang('revokingToken'));
      yield revoke();
      return true;
    });

    return function() {
      return _ref.apply(this, arguments);
    };
  })();
}

function wrapRequiredTeam(
  callback,
  requireTeam,
  subCommandDeprecated
) {
  if (requireTeam === void 0) requireTeam = true;
  return wrapRequired(
    function(
      parts,
      config,
      reporter,
      flags,
      args
    ) {
      if (args.length === 1) {
        return callback(parts, config, reporter, flags, args);
      } else {
        return false;
      }
    },
    requireTeam,
    subCommandDeprecated
  );
}

function wrapRequiredUser(callback, subCommandDeprecated) {
  return wrapRequired(
    function(
      parts,
      config,
      reporter,
      flags,
      args
    ) {
      if (args.length === 2) {
        return callback(
          (0, _extends2.default)(
            {
              user: args[1],
            },
            parts
          ),
          config,
          reporter,
          flags,
          args
        );
      } else {
        return false;
      }
    },
    true,
    subCommandDeprecated
  );
}

function removeTeamUser() {
  return _removeTeamUser.apply(this, arguments);
}
function _removeTeamUser() {
  _removeTeamUser = (0, _asyncToGenerator2.default)(function* (parts, config, reporter) {
    reporter.step(2, 3, reporter.lang('teamRemovingUser'));
    reporter.inspect(
      yield config.registries.npm.request(`team/${parts.scope}/${parts.team}/user`, {
        method: 'DELETE',
        body: {
          user: parts.user,
        },
      })
    );
    return true;
  });

  return _removeTeamUser.apply(this, arguments);
}

function list() {
  return _list.apply(this, arguments);
}
function _list() {
  _list = (0, _asyncToGenerator2.default)(function* (parts, config, reporter) {
    reporter.step(2, 3, reporter.lang('teamListing'));
    var uriParams = '?format=cli';
    if (parts.team) {
      reporter.inspect(yield config.registries.npm.request(`team/${parts.scope}/${parts.team}/user${uriParams}`));
    } else {
      reporter.inspect(yield config.registries.npm.request(`org/${parts.scope}/team${uriParams}`));
    }
    return true;
  });

  return _list.apply(this, arguments);
}

function setFlags(commander) {
  commander.description('Maintain team memberships');
}

var _buildSubCommands = (0, _buildSubCommands2.default)(
  'team',
  {
    create: wrapRequiredTeam(/*#__PURE__*/ (function() {
      var _ref2 = (0, _asyncToGenerator2.default)(function* (
        parts,
        config,
        reporter,
        flags,
        args
      ) {
        reporter.step(2, 3, reporter.lang('teamCreating'));
        reporter.inspect(
          yield config.registries.npm.request(`team/${parts.scope}`, {
            method: 'PUT',
            body: {
              team: parts.team,
            },
          })
        );
        return true;
      });

      return function() {
        return _ref2.apply(this, arguments);
      };
    })()),

    destroy: wrapRequiredTeam(/*#__PURE__*/ (function() {
      var _ref3 = (0, _asyncToGenerator2.default)(function* (
        parts,
        config,
        reporter,
        flags,
        args
      ) {
        reporter.step(2, 3, reporter.lang('teamRemoving'));
        reporter.inspect(
          yield config.registries.npm.request(`team/${parts.scope}/${parts.team}`, {
            method: 'DELETE',
          })
        );
        return true;
      });

      return function() {
        return _ref3.apply(this, arguments);
      };
    })()),

    add: wrapRequiredUser(/*#__PURE__*/ (function() {
      var _ref4 = (0, _asyncToGenerator2.default)(function* (
        parts,
        config,
        reporter,
        flags,
        args
      ) {
        reporter.step(2, 3, reporter.lang('teamAddingUser'));
        reporter.inspect(
          yield config.registries.npm.request(`team/${parts.scope}/${parts.team}/user`, {
            method: 'PUT',
            body: {
              user: parts.user,
            },
          })
        );
        return true;
      });

      return function() {
        return _ref4.apply(this, arguments);
      };
    })()),

    rm: wrapRequiredUser(
      function(parts, config, reporter, flags, args) {
        removeTeamUser(parts, config, reporter);
      },
      {
        deprecatedCommand: 'rm',
        currentCommand: 'remove',
      }
    ),

    remove: wrapRequiredUser(function(
      parts,
      config,
      reporter,
      flags,
      args
    ) {
      removeTeamUser(parts, config, reporter);
    }),

    ls: wrapRequiredTeam(
      function(parts, config, reporter, flags, args) {
        list(parts, config, reporter);
      },
      false,
      {
        deprecatedCommand: 'ls',
        currentCommand: 'list',
      }
    ),

    list: wrapRequiredTeam(function(
      parts,
      config,
      reporter,
      flags,
      args
    ) {
      list(parts, config, reporter);
    }, false),
  },
  [
    'create <scope:team>',
    'destroy <scope:team>',
    'add <scope:team> <user>',
    'remove <scope:team> <user>',
    'list <scope>|<scope:team>',
  ]
);
exports.run = _buildSubCommands.run;
exports.hasWrapper = _buildSubCommands.hasWrapper;
exports.examples = _buildSubCommands.examples;
