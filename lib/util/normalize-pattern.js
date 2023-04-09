'use strict';
exports.__esModule = true;
exports.normalizePattern = normalizePattern;

/**
 * Explode and normalize a pattern into its name and range.
 */

function normalizePattern(pattern) {
  var hasVersion = false;
  var range = 'latest';
  var name = pattern;

  // if we're a scope then remove the @ and add it back later
  var isScoped = false;
  if (name[0] === '@') {
    isScoped = true;
    name = name.slice(1);
  }

  // take first part as the name
  var parts = name.split('@');
  if (parts.length > 1) {
    name = parts.shift();
    range = parts.join('@');

    if (range) {
      hasVersion = true;
    } else {
      range = '*';
    }
  }

  // add back @ scope suffix
  if (isScoped) {
    name = `@${name}`;
  }

  return {name, range, hasVersion};
}