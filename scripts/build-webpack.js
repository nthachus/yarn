#!/usr/bin/env node
'use strict';

const webpack = require('webpack');
const path = require('path');

const basedir = path.resolve(__dirname, '../');

// Use the real node __dirname and __filename in order to get Yarn's source
// files on the user's system. See constants.js
const nodeOptions = {
  __filename: false,
  __dirname: false,
};

const compiler = webpack({
  mode: 'production',
  entry: {
    index: './src/lockfile/index',
  },
  context: basedir,
  optimization: {
    nodeEnv: false,
    minimize: false,
  },
  module: {
    rules: [
      {
        test: /\.js$/i,
        exclude: /node_modules\b(?!.ssri\b)/i,
        loader: 'babel-loader',
        options: {cacheDirectory: true},
      },
      {
        test: /node_modules.ssri.index\.js$/i,
        loader: 'string-replace-loader',
        options: {
          search: '^module\\.exports\\.(\\w+) = \\1\\w*;?$',
          flags: 'gm',
          replace: (m, m1) => (m1 === 'parse' ? m : `// ${m}`),
        },
      },
      {
        test: /node_modules.js-yaml.lib.js-yaml\.js$/i,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {search: '^var dumper = require', flags: 'm', replace: '// $&'},
            {
              search: '^module\\.exports\\.(\\w+) *= (require|loader|dumper)\\b.*;$',
              flags: 'gm',
              replace: (m, m1) => (/^(safeLoad|FAILSAFE_SCHEMA)/.test(m1) ? m : `// ${m}`),
            },
          ],
        },
      },
      {
        test: /node_modules.js-yaml.lib.js-yaml.loader\.js$/i,
        loader: 'string-replace-loader',
        options: {
          multiple: [
            {
              search: '^module\\.exports\\.(\\w+) *= \\1\\w*;$',
              flags: 'gm',
              replace: (m, m1) => (/^safeLoad/.test(m1) ? m : `// ${m}`),
            },
            {search: '^var DEFAULT_FULL_SCHEMA = require', flags: 'm', replace: '// $&'},
            {search: '|| DEFAULT_FULL_SCHEMA;', replace: '|| DEFAULT_SAFE_SCHEMA;'},
          ],
        },
      },
    ],
  },
  plugins: [
    new webpack.CopyPlugin([
      {from: '{LICENSE*,*.md}', to: '[name].[ext]'},
      {
        from: 'package.json',
        transform(content) {
          content = String(content).replace(/,\s*"yarnVersion":[\s\S]*/, '\n}');
          const pkg = JSON.parse(content);

          pkg.files = [(pkg.main = 'index.js')];
          return JSON.stringify(pkg, null, 2);
        },
      },
    ]),
    new webpack.ReplaceCodePlugin({
      search: /= JSON\.parse\("\{\\"name\\":.*\\"yarnVersion\\":\\"(.*?)\\".*\}"\)/,
      replace: '= {yarnVersion: "$1"}',
    }),
  ],
  output: {
    libraryTarget: 'commonjs2',
  },
  target: 'node',
  node: nodeOptions,
});

compiler.run((err, stats) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stats.toString({colors: true, modules: true, maxModules: Infinity}));
});
