/**
 * Parse input strings like `package-1/package-2` to an array of packages
 */
export default function parsePackagePath(input) {
  return input.match(/(@[^\/]+\/)?([^/]+)/g) || [];
}

const WRONG_PATTERNS = /\/$|\/{2,}|\*+$/;

export function isValidPackagePath(input) {
  return !WRONG_PATTERNS.test(input);
}
