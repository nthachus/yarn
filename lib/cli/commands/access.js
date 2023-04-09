'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.run = exports.hasWrapper = exports.examples = void 0;
exports.setFlags = setFlags;

var _buildSubCommands2 = _interopRequireDefault(require('./_build-sub-commands.js'));

var notYetImplemented = () => Promise.reject(new Error('This command is not implemented yet.'));

function setFlags(commander) {
  commander.description('Has not been implemented yet');
}

var _buildSubCommands = (0, _buildSubCommands2.default)(
  'access',
  {
    public: notYetImplemented,
    restricted: notYetImplemented,
    grant: notYetImplemented,
    revoke: notYetImplemented,
    lsPackages: notYetImplemented,
    lsCollaborators: notYetImplemented,
    edit: notYetImplemented,
  },
  [
    'WARNING: This command yet to be implemented.',
    'public [<package>]',
    'restricted [<package>]',
    'grant <read-only|read-write> <scope:team> [<package>]',
    'revoke <scope:team> [<package>]',
    'ls-packages [<user>|<scope>|<scope:team>]',
    'ls-collaborators [<package> [<user>]]',
    'edit [<package>]',
  ]
);
exports.run = _buildSubCommands.run;
exports.hasWrapper = _buildSubCommands.hasWrapper;
exports.examples = _buildSubCommands.examples;
