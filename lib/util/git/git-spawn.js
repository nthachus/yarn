'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.spawn = void 0;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));

var path = require('path');

var child = _interopRequireWildcard(require('../child.js'));

var BATCH_MODE_ARGS = new Map([['ssh', '-oBatchMode=yes'], ['plink', '-batch']]);

// Suppress any password prompts since we run these in the background
var env = (0, _extends2.default)(
  {
    GIT_ASKPASS: '',
    GIT_TERMINAL_PROMPT: 0,
  },
  process.env
);

var sshCommand = env.GIT_SSH || 'ssh';
var sshExecutable = path.basename(sshCommand.toLowerCase(), '.exe');
var sshBatchArgs = BATCH_MODE_ARGS.get(sshExecutable);

if (!env.GIT_SSH_COMMAND && sshBatchArgs) {
  // We have to manually specify `GIT_SSH_VARIANT`,
  // because it's not automatically set when using `GIT_SSH_COMMAND` instead of `GIT_SSH`
  // See: https://github.com/yarnpkg/yarn/issues/4729
  env.GIT_SSH_VARIANT = sshExecutable;
  env.GIT_SSH_COMMAND = `"${sshCommand}" ${sshBatchArgs}`;
}

var spawn = function(args, opts) {
  if (opts === void 0) opts = {};
  return child.spawn('git', args, (0, _extends2.default)({}, opts, {env}));
};
exports.spawn = spawn;
