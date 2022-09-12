'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.sortAlpha = sortAlpha;
exports.sortOptionsByFlags = sortOptionsByFlags;
exports.entries = entries;
exports.removePrefix = removePrefix;
exports.removeSuffix = removeSuffix;
exports.addSuffix = addSuffix;
exports.hyphenate = hyphenate;
exports.compareSortedArrays = compareSortedArrays;
exports.sleep = sleep;

function sortAlpha(a, b) {
  // sort alphabetically in a deterministic way
  var shortLen = Math.min(a.length, b.length);
  for (var i = 0; i < shortLen; i++) {
    var aChar = a.charCodeAt(i);
    var bChar = b.charCodeAt(i);
    if (aChar !== bChar) {
      return aChar - bChar;
    }
  }
  return a.length - b.length;
}

function sortOptionsByFlags(a, b) {
  var aOpt = a.flags.replace(/-/g, '');
  var bOpt = b.flags.replace(/-/g, '');
  return sortAlpha(aOpt, bOpt);
}

function entries(obj) {
  var entries = [];
  if (obj) {
    for (var key in obj) {
      entries.push([key, obj[key]]);
    }
  }
  return entries;
}

function removePrefix(pattern, prefix) {
  if (pattern.startsWith(prefix)) {
    pattern = pattern.slice(prefix.length);
  }

  return pattern;
}

function removeSuffix(pattern, suffix) {
  if (pattern.endsWith(suffix)) {
    return pattern.slice(0, -suffix.length);
  }

  return pattern;
}

function addSuffix(pattern, suffix) {
  if (!pattern.endsWith(suffix)) {
    return pattern + suffix;
  }

  return pattern;
}

function hyphenate(str) {
  return str.replace(/[A-Z]/g, match => {
    return '-' + match.charAt(0).toLowerCase();
  });
}

function compareSortedArrays(array1, array2) {
  if (array1.length !== array2.length) {
    return false;
  }
  for (var i = 0, len = array1.length; i < len; i++) {
    if (array1[i] !== array2[i]) {
      return false;
    }
  }
  return true;
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
