'use strict';
exports.__esModule = true;
exports.filterOverridenGitignores = filterOverridenGitignores;
exports.ignoreLinesToRegex = ignoreLinesToRegex;
exports.matchesFilter = matchesFilter;
exports.sortFilter = sortFilter;

var _misc = require('./misc.js');

var mm = require('micromatch');
var path = require('path');

var WHITESPACE_RE = /^\s+$/;

function sortFilter(
  files,
  filters,
  keepFiles,
  possibleKeepFiles,
  ignoreFiles
) {
  if (keepFiles === void 0) keepFiles = new Set();
  if (possibleKeepFiles === void 0) possibleKeepFiles = new Set();
  if (ignoreFiles === void 0) ignoreFiles = new Set();
  for (var file of files) {
    var keep = false;

    // always keep a file if a ! pattern matches it
    for (var filter of filters) {
      if (filter.isNegation && matchesFilter(filter, file.basename, file.relative)) {
        keep = true;
        break;
      }
    }

    //
    if (keep) {
      keepFiles.add(file.relative);
      continue;
    }

    // otherwise don't keep it if a pattern matches it
    keep = true;
    for (var _filter of filters) {
      if (!_filter.isNegation && matchesFilter(_filter, file.basename, file.relative)) {
        keep = false;
        break;
      }
    }

    if (keep) {
      possibleKeepFiles.add(file.relative);
    } else {
      ignoreFiles.add(file.relative);
    }
  }

  // exclude file
  for (var _file of possibleKeepFiles) {
    var parts = path.dirname(_file).split(path.sep);

    while (parts.length) {
      var folder = parts.join(path.sep);
      if (ignoreFiles.has(folder)) {
        ignoreFiles.add(_file);
        break;
      }
      parts.pop();
    }
  }

  //
  for (var _file2 of possibleKeepFiles) {
    if (!ignoreFiles.has(_file2)) {
      keepFiles.add(_file2);
    }
  }

  //
  for (var _file3 of keepFiles) {
    var _parts = path.dirname(_file3).split(path.sep);

    while (_parts.length) {
      // deregister this folder from being ignored, any files inside
      // will still be marked as ignored
      ignoreFiles.delete(_parts.join(path.sep));
      _parts.pop();
    }
  }

  return {ignoreFiles, keepFiles};
}

function matchesFilter(filter, basename, loc) {
  var filterByBasename = true;
  if (filter.base && filter.base !== '.') {
    loc = path.relative(filter.base, loc);
    filterByBasename = false;
  }
  // the micromatch regex expects unix path separators
  loc = loc.replace(/\\/g, '/');

  return (
    filter.regex.test(loc) ||
    filter.regex.test(`/${loc}`) ||
    (filterByBasename && filter.regex.test(basename)) ||
    mm.isMatch(loc, filter.pattern)
  );
}

function ignoreLinesToRegex(lines, base) {
  if (base === void 0) base = '.';
  return (
    lines
      // create regex
      .map((line) => {
        // remove empty lines, comments, etc
        if (line === '' || line === '!' || line[0] === '#' || WHITESPACE_RE.test(line)) {
          return null;
        }

        var pattern = line;
        var isNegation = false;

        // hide the fact that it's a negation from minimatch since we'll handle this specifically
        // ourselves
        if (pattern[0] === '!') {
          isNegation = true;
          pattern = pattern.slice(1);
        }

        // remove trailing slash
        pattern = (0, _misc.removeSuffix)(pattern, '/');

        var regex = mm.makeRe(pattern.trim(), {dot: true, nocase: true});

        if (regex) {
          return {
            base,
            isNegation,
            pattern,
            regex,
          };
        } else {
          return null;
        }
      })
      .filter(Boolean)
  );
}

function filterOverridenGitignores(files) {
  var IGNORE_FILENAMES = ['.yarnignore', '.npmignore', '.gitignore'];
  var GITIGNORE_NAME = IGNORE_FILENAMES[2];
  return files.filter(file => IGNORE_FILENAMES.indexOf(file.basename) > -1).reduce((acc, file) => {
    if (file.basename !== GITIGNORE_NAME) {
      return [].concat(acc, [file]);
    } else {
      //don't include .gitignore if .npmignore or .yarnignore are present
      var dir = path.dirname(file.absolute);
      var higherPriorityIgnoreFilePaths = [path.join(dir, IGNORE_FILENAMES[0]), path.join(dir, IGNORE_FILENAMES[1])];
      var hasHigherPriorityFiles = files.find(
        file => higherPriorityIgnoreFilePaths.indexOf(path.normalize(file.absolute)) > -1
      );
      if (!hasHigherPriorityFiles) {
        return [].concat(acc, [file]);
      }
    }
    return acc;
  }, []);
}
