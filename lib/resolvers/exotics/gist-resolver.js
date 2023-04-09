'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
exports.explodeGistFragment = explodeGistFragment;

var _errors = require('../../errors.js');
var _gitResolver = _interopRequireDefault(require('./git-resolver.js'));
var _exoticResolver = _interopRequireDefault(require('./exotic-resolver.js'));
var util = _interopRequireWildcard(require('../../util/misc.js'));

function explodeGistFragment(fragment, reporter) {
  fragment = util.removePrefix(fragment, 'gist:');

  var parts = fragment.split('#');

  if (parts.length <= 2) {
    return {
      id: parts[0],
      hash: parts[1] || '',
    };
  } else {
    throw new _errors.MessageError(reporter.lang('invalidGistFragment', fragment));
  }
}

class GistResolver extends _exoticResolver.default {
  constructor(request, fragment) {
    super(request, fragment);

    var _explodeGistFragment = explodeGistFragment(fragment, this.reporter), id = _explodeGistFragment.id, hash = _explodeGistFragment.hash;
    this.id = id;
    this.hash = hash;
  }

  resolve() {
    return this.fork(_gitResolver.default, false, `https://gist.github.com/${this.id}.git#${this.hash}`);
  }
}
exports.default = GistResolver;

GistResolver.protocol = 'gist';
