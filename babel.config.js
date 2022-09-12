'use strict';

module.exports = api => {
  const isLoader = api.caller(c => c && c.name === 'babel-loader');

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {node: '4'},
          exclude: [/^transform-(classes|arrow|for-of|regenerator)\b/],
          modules: !isLoader ? 'auto' : false,
        },
      ],
    ],
    overrides: [
      {
        test: './src/constants.js',
        plugins: [['@babel/preset-env/plugins/transform-spread', {loose: true}]],
      },
    ],
    retainLines: true,
  };
};
