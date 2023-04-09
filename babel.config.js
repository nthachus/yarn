'use strict';

module.exports = api => {
  const isLoader = api.caller(c => c && c.name === 'babel-loader');

  const envOptions = {
    targets: {node: '4'},
    modules: !isLoader ? 'auto' : false,
    loose: true,
    exclude: [/^transform-(regenerator|classes|for-of|arrow|function)\b/],
  };
  const runtimeOpts = {
    regenerator: false,
    version: '7.17.9',
    useESModules: !!isLoader,
  };

  return {
    presets: [['@babel/preset-env', envOptions]],
    plugins: [['@babel/plugin-transform-runtime', runtimeOpts]],
    overrides: [
      {
        test: ['./src/registries/yarn-registry.js', './src/cli/commands/policies.js'],
        plugins: [['babel-plugin-array-includes']],
      },
      {
        test: /\bnode_modules[\\/]/, // (?!rxjs\b._esm\w*)
        presets: [['@babel/preset-env', {...envOptions, modules: 'cjs'}]],
        plugins: [['@babel/plugin-transform-runtime', {...runtimeOpts, useESModules: false}]],
      },
    ],
    retainLines: true,
  };
};
