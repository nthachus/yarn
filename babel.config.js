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
    retainLines: true,
  };
};
