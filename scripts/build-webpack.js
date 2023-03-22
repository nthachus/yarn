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
    // minimize: false,
    minimizer: [
      new webpack.TerserPlugin({
        terserOptions: {format: {beautify: true, indent_level: 2}, mangle: false},
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.[cm]?js$/i,
        exclude: /node_modules[\\/](invariant|safe-buffer|strip-bom)\b/i,
        loader: 'babel-loader',
        options: {cacheDirectory: true},
      },
      {
        test: /node_modules[\\/]ssri.index\.js$/i,
        loader: 'webpack/lib/replace-loader',
        options: {search: /^module\.exports\.(?!parse\b)\w+ *=/gm, replace: '//$&'},
      },
      {
        test: /\bsrc[\\/]errors\.js$/i,
        loader: 'webpack/lib/replace-loader',
        options: {search: /^export class ResponseError .*\{[\s\S]*\}/m, replace: '/*$&*/'},
      },
      {
        test: /\bsrc[\\/]constants\.js$/i,
        loader: 'webpack/lib/replace-loader',
        options: {search: /^export const \w+ *= *\[.*\.{3}.*\];?$/gm, replace: '//$&'},
      },
      {
        test: /node_modules[\\/]safe-buffer.index\.js$/i,
        loader: 'webpack/lib/replace-loader',
        options: {search: /^/, replace: "'use strict';\n"},
      },
    ],
  },
  plugins: [
    new webpack.CopyPlugin({
      patterns: [
        {from: '{LICENSE*,*.md}', to: '[name][ext]'},
        {
          from: 'package.json',
          transform(content) {
            const pkg = JSON.parse(String(content).replace(/,\s*"yarnVersion":[\s\S]*/, '\n}'));
            return (pkg.files = [(pkg.main = 'index.js')]), JSON.stringify(pkg, null, 2);
          },
        },
      ],
    }),
    new webpack.ReplaceCodePlugin([
      {search: /^(\s*object:) map(\(JSON\.parse\()/m, replace: '$1 nullify$2'}, // webpack 5.74 issue
    ]),
  ],
  output: {
    libraryTarget: 'commonjs2',
  },
  target: 'node4',
  node: nodeOptions,
});

compiler.run((err, stats) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stats.toString({colors: true, nestedModules: true, modulesSpace: Infinity}));
});
