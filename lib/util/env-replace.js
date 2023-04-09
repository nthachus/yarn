'use strict';
exports.__esModule = true;
exports.default = envReplace;

var ENV_EXPR = /(\\*)\$\{([^}]+)\}/g;

function envReplace(value, env) {
  if (env === void 0) env = process.env;
  if (typeof value !== 'string' || !value) {
    return value;
  }

  return value.replace(ENV_EXPR, (match, esc, envVarName) => {
    if (esc.length && esc.length % 2) {
      return match;
    }
    if (undefined === env[envVarName]) {
      throw new Error('Failed to replace env in config: ' + match);
    }
    return env[envVarName] || '';
  });
}
