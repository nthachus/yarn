'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.getOneTimePassword = getOneTimePassword;
exports.getToken = getToken;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _errors = require('../../errors.js');

function getCredentials() {
  return _getCredentials.apply(this, arguments);
}
function _getCredentials() {
  _getCredentials = (0, _asyncToGenerator2.default)(function* (
    config,
    reporter
  ) {
    var _config$registries$ya = config.registries.yarn.config, username = _config$registries$ya.username, email = _config$registries$ya.email;

    if (username) {
      reporter.info(`${reporter.lang('npmUsername')}: ${username}`);
    } else {
      username = yield reporter.question(reporter.lang('npmUsername'));
      if (!username) {
        return null;
      }
    }

    if (email) {
      reporter.info(`${reporter.lang('npmEmail')}: ${email}`);
    } else {
      email = yield reporter.question(reporter.lang('npmEmail'));
      if (!email) {
        return null;
      }
    }

    yield config.registries.yarn.saveHomeConfig({username, email});

    return {username, email};
  });

  return _getCredentials.apply(this, arguments);
}

function getOneTimePassword(reporter) {
  return reporter.question(reporter.lang('npmOneTimePassword'));
}

function getToken() {
  return _getToken.apply(this, arguments);
}
function _getToken() {
  _getToken = (0, _asyncToGenerator2.default)(function* (
    config,
    reporter,
    name,
    flags,
    registry
  ) {
    if (name === void 0) name = '';
    if (flags === void 0) flags = {};
    if (registry === void 0) registry = '';
    var auth = registry ? config.registries.npm.getAuthByRegistry(registry) : config.registries.npm.getAuth(name);

    if (config.otp) {
      config.registries.npm.setOtp(config.otp);
    }

    if (auth) {
      config.registries.npm.setToken(auth);
      return function revoke() {
        reporter.info(reporter.lang('notRevokingConfigToken'));
        return Promise.resolve();
      };
    }

    var env = process.env.YARN_AUTH_TOKEN || process.env.NPM_AUTH_TOKEN;
    if (env) {
      config.registries.npm.setToken(`Bearer ${env}`);
      return function revoke() {
        reporter.info(reporter.lang('notRevokingEnvToken'));
        return Promise.resolve();
      };
    }

    // make sure we're not running in non-interactive mode before asking for login
    if (flags.nonInteractive || config.nonInteractive) {
      throw new _errors.MessageError(reporter.lang('nonInteractiveNoToken'));
    }

    //
    var creds = yield getCredentials(config, reporter);
    if (!creds) {
      reporter.warn(reporter.lang('loginAsPublic'));
      return function revoke() {
        reporter.info(reporter.lang('noTokenToRevoke'));
        return Promise.resolve();
      };
    }

    var username = creds.username, email = creds.email;
    var password = yield reporter.question(reporter.lang('npmPassword'), {
      password: true,
      required: true,
    });

    //
    var userobj = {
      _id: `org.couchdb.user:${username}`,
      name: username,
      password,
      email,
      type: 'user',
      roles: [],
      date: new Date().toISOString(),
    };

    //
    var res = yield config.registries.npm.request(`-/user/org.couchdb.user:${encodeURIComponent(username)}`, {
      method: 'PUT',
      registry,
      body: userobj,
      auth: {username, password, email},
    });

    if (res && res.ok) {
      reporter.success(reporter.lang('loggedIn'));

      var token = res.token;
      config.registries.npm.setToken(`Bearer ${token}`);

      return /*#__PURE__*/ (function() {
        var _revoke = (0, _asyncToGenerator2.default)(function* () {
          reporter.success(reporter.lang('revokedToken'));
          yield config.registries.npm.request(`-/user/token/${token}`, {
            method: 'DELETE',
            registry,
          });
        });

        function revoke() {
          return _revoke.apply(this, arguments);
        }
        return revoke;
      })();
    } else {
      throw new _errors.MessageError(reporter.lang('incorrectCredentials'));
    }
  });

  return _getToken.apply(this, arguments);
}

function hasWrapper(commander, args) {
  return true;
}

function setFlags(commander) {
  commander.description('Stores registry username and email.');
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    yield getCredentials(config, reporter);
  });

  return _run.apply(this, arguments);
}
