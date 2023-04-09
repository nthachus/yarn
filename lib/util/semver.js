'use strict';
exports.__esModule = true;
exports.diffWithUnstable = diffWithUnstable;
exports.satisfiesWithPrereleases = satisfiesWithPrereleases;

var semver = require('semver');

/**
 * Returns whether the given semver version satisfies the given range. Notably this supports
 * prerelease versions so that "2.0.0-rc.0" satisfies the range ">=1.0.0", for example.
 */

function satisfiesWithPrereleases(version, range, loose) {
  if (loose === void 0) loose = false;
  var semverRange;
  try {
    // $FlowFixMe: Add a definition for the Range class
    semverRange = new semver.Range(range, loose);
  } catch (err) {
    return false;
  }

  if (!version) {
    return false;
  }
  var semverVersion;
  try {
    semverVersion = new semver.SemVer(version, semverRange.loose);
  } catch (err) {
    return false;
  }

  // A range has multiple sets of comparators. A version must satisfy all comparators in a set
  // and at least one set to satisfy the range.
  return semverRange.set.some(comparatorSet => {
    // node-semver converts ~ and ^ ranges into pairs of >= and < ranges but the upper bounds don't
    // properly exclude prerelease versions. For example, "^1.0.0" is converted to ">=1.0.0 <2.0.0",
    // which includes "2.0.0-pre" since prerelease versions are lower than their non-prerelease
    // counterparts. As a practical workaround we make upper-bound ranges exclude prereleases and
    // convert "<2.0.0" to "<2.0.0-0", for example.
    comparatorSet = comparatorSet.map(comparator => {
      if (comparator.operator !== '<' || !comparator.value || comparator.semver.prerelease.length) {
        return comparator;
      }

      // "0" is the lowest prerelease version
      comparator.semver.inc('pre', 0);

      var comparatorString = comparator.operator + comparator.semver.version;
      // $FlowFixMe: Add a definition for the Comparator class
      return new semver.Comparator(comparatorString, comparator.loose);
    });

    return !comparatorSet.some(comparator => !comparator.test(semverVersion));
  });
}

var PRE_RELEASES = {
  major: 'premajor',
  minor: 'preminor',
  patch: 'prepatch',
};

/**
 * Returns the difference between two versions as a semantic string representation.
 * Similar to the `diff` method in node-semver, but it also accounts for unstable versions,
 * like 0.x.x or 0.0.x.
 */

function diffWithUnstable(version1, version2) {
  if (semver.eq(version1, version2) === false) {
    var v1 = semver.parse(version1);
    var v2 = semver.parse(version2);

    if (v1 != null && v2 != null) {
      var isPreRelease = v1.prerelease.length > 0 || v2.prerelease.length > 0;
      var preMajor = v1.major === 0 || v2.major === 0;
      var preMinor = preMajor && (v1.minor === 0 || v2.minor === 0);

      var diff = null;

      if (v1.major !== v2.major) {
        diff = 'major';
      } else if (v1.minor !== v2.minor) {
        if (preMajor) {
          // If the major version number is zero (0.x.x), treat a change
          // of the minor version number as a major change.
          diff = 'major';
        } else {
          diff = 'minor';
        }
      } else if (v1.patch !== v2.patch) {
        if (preMinor) {
          // If the major & minor version numbers are zero (0.0.x), treat a change
          // of the patch version number as a major change.
          diff = 'major';
        } else if (preMajor) {
          // If the major version number is zero (0.x.x), treat a change
          // of the patch version number as a minor change.
          diff = 'minor';
        } else {
          diff = 'patch';
        }
      }

      if (isPreRelease) {
        if (diff != null) {
          diff = PRE_RELEASES[diff];
        } else {
          diff = 'prerelease';
        }
      }

      return diff;
    }
  }

  return null;
}
