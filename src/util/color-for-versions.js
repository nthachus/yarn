const semver = require('semver');
import {diffWithUnstable} from './semver.js';
import {VERSION_COLOR_SCHEME} from '../constants.js';

export default function(from, to) {
  const validFrom = semver.valid(from);
  const validTo = semver.valid(to);
  let versionBump = 'unknown';
  if (validFrom && validTo) {
    versionBump = diffWithUnstable(validFrom, validTo) || 'unchanged';
  }
  return VERSION_COLOR_SCHEME[versionBump];
}
