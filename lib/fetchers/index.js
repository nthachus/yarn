'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;

var _baseFetcher = _interopRequireDefault(require('./base-fetcher.js'));
var _copyFetcher = _interopRequireDefault(require('./copy-fetcher.js'));
var _gitFetcher = _interopRequireDefault(require('./git-fetcher.js'));
var _tarballFetcher = _interopRequireDefault(require('./tarball-fetcher.js'));
var _workspaceFetcher = _interopRequireDefault(require('./workspace-fetcher.js'));

exports.base = _baseFetcher.default;
exports.copy = _copyFetcher.default;
exports.git = _gitFetcher.default;
exports.tarball = _tarballFetcher.default;
exports.workspace = _workspaceFetcher.default;
