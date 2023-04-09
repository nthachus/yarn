'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.resolveVersion = exports.parseRefs = exports.isCommitSha = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _misc = require('../misc.js');

var semver = require('semver');

var REF_PREFIX = 'refs/';
var REF_TAG_PREFIX = 'refs/tags/';
var REF_BRANCH_PREFIX = 'refs/heads/';
var REF_PR_PREFIX = 'refs/pull/';

// This regex is designed to match output from git of the style:
//   ebeb6eafceb61dd08441ffe086c77eb472842494  refs/tags/v0.21.0
// and extract the hash and ref name as capture groups
var GIT_REF_LINE_REGEXP = /^([a-fA-F0-9]+)\s+(refs\/(?:tags|heads|pull|remotes)\/.*)$/;

var COMMIT_SHA_REGEXP = /^[a-f0-9]{5,40}$/;
var REF_NAME_REGEXP = /^refs\/(tags|heads)\/(.+)$/;

var isCommitSha = (target) => COMMIT_SHA_REGEXP.test(target);
exports.isCommitSha = isCommitSha;

var tryVersionAsGitCommit = _ref => {
  var version = _ref.version, refs = _ref.refs, git = _ref.git;
  var lowercaseVersion = version.toLowerCase();
  if (!isCommitSha(lowercaseVersion)) {
    return Promise.resolve(null);
  }
  for (var _ref2 of refs.entries()) {
    var ref = _ref2[0], sha = _ref2[1];
    if (sha.startsWith(lowercaseVersion)) {
      return Promise.resolve({sha, ref});
    }
  }
  return git.resolveCommit(lowercaseVersion);
};

var tryEmptyVersionAsDefaultBranch = _ref3 => {
  var version = _ref3.version, git = _ref3.git;
  return version.trim() === '' ? git.resolveDefaultBranch() : Promise.resolve(null);
};

var tryWildcardVersionAsDefaultBranch = _ref4 => {
  var version = _ref4.version, git = _ref4.git;
  return version === '*' ? git.resolveDefaultBranch() : Promise.resolve(null);
};

var tryRef = (refs, ref) => {
  var sha = refs.get(ref);
  return sha ? {sha, ref} : null;
};

var tryVersionAsFullRef = _ref5 => {
  var version = _ref5.version, refs = _ref5.refs;
  return version.startsWith('refs/') ? tryRef(refs, version) : null;
};

var tryVersionAsTagName = _ref6 => {
  var version = _ref6.version, refs = _ref6.refs;
  return tryRef(refs, `${REF_TAG_PREFIX}${version}`);
};

var tryVersionAsPullRequestNo = _ref7 => {
  var version = _ref7.version, refs = _ref7.refs;
  return tryRef(refs, `${REF_PR_PREFIX}${version}`);
};

var tryVersionAsBranchName = _ref8 => {
  var version = _ref8.version, refs = _ref8.refs;
  return tryRef(refs, `${REF_BRANCH_PREFIX}${version}`);
};

var tryVersionAsDirectRef = _ref9 => {
  var version = _ref9.version, refs = _ref9.refs;
  return tryRef(refs, `${REF_PREFIX}${version}`);
};

var computeSemverNames = _ref10 => {
  var config = _ref10.config, refs = _ref10.refs;
  var names = {
    tags: [],
    heads: [],
  };
  for (var ref of refs.keys()) {
    var match = REF_NAME_REGEXP.exec(ref);
    if (!match) {
      continue;
    }
    var type = match[1], name = match[2];
    if (semver.valid(name, config.looseSemver)) {
      names[type].push(name);
    }
  }
  return names;
};

var findSemver = (version, config, namesList) =>
  config.resolveConstraints(namesList, version);

var tryVersionAsTagSemver = /*#__PURE__*/ (function() {
  var _ref12 = (0, _asyncToGenerator2.default)(function* (
    _ref11,
    names
  ) {
    var version = _ref11.version, config = _ref11.config, refs = _ref11.refs;
    var result = yield findSemver(version.replace(/^semver:/, ''), config, names.tags);
    return result ? tryRef(refs, `${REF_TAG_PREFIX}${result}`) : null;
  });

  return function tryVersionAsTagSemver() {
    return _ref12.apply(this, arguments);
  };
})();

var tryVersionAsBranchSemver = /*#__PURE__*/ (function() {
  var _ref14 = (0, _asyncToGenerator2.default)(function* (
    _ref13,
    names
  ) {
    var version = _ref13.version, config = _ref13.config, refs = _ref13.refs;
    var result = yield findSemver(version.replace(/^semver:/, ''), config, names.heads);
    return result ? tryRef(refs, `${REF_BRANCH_PREFIX}${result}`) : null;
  });

  return function tryVersionAsBranchSemver() {
    return _ref14.apply(this, arguments);
  };
})();

var tryVersionAsSemverRange = /*#__PURE__*/ (function() {
  var _ref15 = (0, _asyncToGenerator2.default)(function* (options) {
    var names = computeSemverNames(options);
    return (yield tryVersionAsTagSemver(options, names)) || tryVersionAsBranchSemver(options, names);
  });

  return function tryVersionAsSemverRange() {
    return _ref15.apply(this, arguments);
  };
})();

var VERSION_RESOLUTION_STEPS = [
  tryEmptyVersionAsDefaultBranch,
  tryVersionAsGitCommit,
  tryVersionAsFullRef,
  tryVersionAsTagName,
  tryVersionAsPullRequestNo,
  tryVersionAsBranchName,
  tryVersionAsSemverRange,
  tryWildcardVersionAsDefaultBranch,
  tryVersionAsDirectRef,
];

/**
 * Resolve a git-url hash (version) to a git commit sha and branch/tag ref
 * Returns null if the version cannot be resolved to any commit
 */

var resolveVersion = /*#__PURE__*/ (function() {
  var _ref16 = (0, _asyncToGenerator2.default)(function* (options) {
    for (var testFunction of VERSION_RESOLUTION_STEPS) {
      var result = yield testFunction(options);
      if (result !== null) {
        return result;
      }
    }
    return null;
  });

  return function resolveVersion() {
    return _ref16.apply(this, arguments);
  };
})();
exports.resolveVersion = resolveVersion;

/**
 * Parse Git ref lines into hash of ref names to SHA hashes
 */

var parseRefs = (stdout) => {
  // store references
  var refs = new Map();

  // line delimited
  var refLines = stdout.split('\n');

  for (var line of refLines) {
    var match = GIT_REF_LINE_REGEXP.exec(line);

    if (match) {
      var sha = match[1], tagName = match[2];

      // As documented in gitrevisions:
      //   https://www.kernel.org/pub/software/scm/git/docs/gitrevisions.html#_specifying_revisions
      // "A suffix ^ followed by an empty brace pair means the object could be a tag,
      //   and dereference the tag recursively until a non-tag object is found."
      // In other words, the hash without ^{} is the hash of the tag,
      //   and the hash with ^{} is the hash of the commit at which the tag was made.
      var name = (0, _misc.removeSuffix)(tagName, '^{}');

      refs.set(name, sha);
    }
  }

  return refs;
};
exports.parseRefs = parseRefs;
