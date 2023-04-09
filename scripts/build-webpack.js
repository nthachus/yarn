#!/usr/bin/env node
'use strict';

const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

const basedir = path.resolve(__dirname, '../');
const resolveDepPath = f => path.resolve(basedir, 'node_modules', f);

// Use the real node __dirname and __filename in order to get Yarn's source
// files on the user's system. See constants.js
const nodeOptions = {
  __filename: false,
  __dirname: false,
};

const baseConfig = {
  mode: 'production',
  context: basedir,
  module: {
    rules: [
      {
        test: /\.[cm]?js$/i,
        exclude: [
          /node_modules[\\/](@babel.runtime)\b/,
          /node_modules[\\/](ajv|arr|array|asap|balanced|bcrypt|braces|bytes|ci|cli-width|code|currently|decode|escape|expand|extend|external|extglob|fast|fill|for|glob-\w*|har|hash|heimdalljs|http|iconv|invariant|is-(ci|deflate|equal|extendable|fullwidth|gzip|number|plain|primitive|windows)|isobject|js-yaml|jsbn|json-schema|kind|leven|loud|micromatch|mime|mute|node|number|object|os|parse|path|prepend|preserve|process|qs|query|randomatic|regex|repeat|request|run|safer?|spdx|strict|strip|tough|tunnel|tweetnacl)\b/,
          /(?<!node_modules[\\/]\w+.)node_modules[\\/](string)\b/,
        ],
        loader: 'babel-loader',
        options: {cacheDirectory: true},
      },
      {
        test: /node_modules[\\/]ssri.index\.js$/i,
        loader: 'webpack/lib/replace-loader',
        options: {
          search: /^module\.exports\.(?!(parse|stringify|from(Hex|Data)|integrityStream)\b)\w+ *=/gm,
          replace: '//$&',
        },
      },
      {
        test: /node_modules[\\/]js-yaml\b.lib\b.js-yaml.loader\.js$/i,
        loader: 'webpack/lib/replace-loader',
        options: {
          search: /^(var DEFAULT_FULL_SCHEMA)( *= *require\('\.\/schema)\/default_full\b/m,
          replace: '$1 = module.exports.FAILSAFE_SCHEMA$2/failsafe',
        },
      },
      // optimize output
      {
        test: /node_modules[\\/]((safe-buffer|kind-of|spdx-correct).index|(@babel.runtime\b.helpers|(har-validator|http-signature)\b.lib|mute-stream)\b.\w*)\.js$/i,
        loader: 'webpack/lib/replace-loader',
        options: {search: /^('use strict';?)?/, replace: "'use strict';\n"},
      },
    ],
  },
  resolve: {
    alias: {'js-yaml$': resolveDepPath('js-yaml/lib/js-yaml/loader.js')},
  },
  output: {
    libraryTarget: 'commonjs2',
  },
  target: 'node4',
  node: nodeOptions,
  optimization: {
    nodeEnv: false,
    // minimize: false,
    minimizer: [
      new webpack.TerserPlugin({
        terserOptions: {format: {beautify: true, indent_level: 2}, mangle: false},
        extractComments: {condition: /(@preserve|@lic|@cc_on|^\**!)[^*]/i, banner: false},
      }),
    ],
  },
};

const usedRxjsFn =
  'Subject|defer|empty|from|fromEvent|of|concatMap|filter|flatMap|map|publish|reduce|share|take|takeUntil';

const usedLodashFn = [
  ...['findIndex', 'flatten', 'last', 'uniq'], // Array
  ...['filter', 'find', 'map', 'sum'], // Collection + Math
  ...['clone', 'isArray', 'isBoolean', 'isFunction', 'isNumber', 'isPlainObject', 'isString'], // Lang
  ...['assign', 'defaults', 'extend', 'omit', 'set'], // Object
];

const compiler = webpack([
  {
    ...baseConfig,
    name: 'lockfile',
    entry: {'packages/lockfile/index': './src/lockfile/index'},
    output: {...baseConfig.output, path: basedir},
    module: {
      rules: [
        ...baseConfig.module.rules,
        {
          test: /node_modules[\\/]ssri.index\.js$/i,
          loader: 'webpack/lib/replace-loader',
          options: {search: /^module\.exports\.(?!parse\b)\w+ *=/gm, replace: '//$&'},
        },
        {
          test: path.resolve(basedir, 'src/util/misc.js'),
          loader: 'webpack/lib/replace-loader',
          options: {search: /^const \w+ *= *require\('camelcase\b/m, replace: '//$&'},
        },
        // unused exports
        {
          test: path.resolve(basedir, 'src/constants.js'),
          loader: 'webpack/lib/replace-loader',
          options: {
            search:
              /^[\s\S]*\n(export const )(YARN_REGISTRY\b[\s\S]*\n)function getPreferredCacheDirectories\b[\s\S]*\n\1(META_FOLDER\b[\s\S]*\n)\1ENV_PATH_KEY\b[\s\S]*/,
            replace: '$1$2$1$3',
          },
        },
        {
          test: path.resolve(basedir, 'src/util/fs.js'),
          loader: 'webpack/lib/replace-loader',
          options: {
            search:
              /^(const fs *= *require\b.*\n)[\s\S]*\n(import \{\s*promisify\b.*\n)[\s\S]*\n(export const exists\b.*\n)[\s\S]*\n(function _readFile\b[\s\S]*\n)const cr\b[\s\S]*/,
            replace: '$1$2$3$4',
          },
        },
        {
          test: path.resolve(basedir, 'src/errors.js'),
          loader: 'webpack/lib/replace-loader',
          options: {search: /^export class ResponseError extends Error\b[\s\S]*/m, replace: ''},
        },
      ],
    },
  },
  {
    ...baseConfig,
    name: 'cli',
    entry: {'lib/cli': './src/cli/index'},
    module: {
      rules: [
        ...baseConfig.module.rules,
        {
          test: path.join(basedir, 'package.json'),
          loader: 'webpack/lib/replace-loader',
          options: {search: /,\s*"packageManager":[\s\S]*/, replace: '\n}'},
        },
        // circular dependencies
        {
          test: path.resolve(basedir, 'src/util/execute-lifecycle-script.js'),
          loader: 'webpack/lib/replace-loader',
          options: {search: /^import .*? from '\.+\/cli\/commands\/global\b/m, replace: '//$&'},
        },
        {
          test: path.resolve(basedir, 'src/cli/index.js'),
          loader: 'webpack/lib/replace-loader',
          options: {
            search: /\b(autoRun) *= *module\.children\.length\b(.*;\s*if \()require\.main *=== *module\b/,
            replace: '$1 = 0$2$1',
          },
        },
        {
          test: /node_modules[\\/]hash-for-dep\b.lib.pkg\.js$/i,
          loader: 'webpack/lib/replace-loader',
          options: {search: /\brequire(\(\w+)/g, replace: '__non_webpack_require__$1'},
        },
        // too old packages
        {
          test: /node_modules[\\/](mz\b.fs|thenify.index)\.js$/i,
          loader: 'webpack/lib/replace-loader',
          options: {search: /^var Promise *= *require\(['"]any-promise\b/m, replace: '//$&'},
        },
        {
          test: /node_modules[\\/]heimdalljs\b.dist.heimdalljs\.cjs\.js$/i,
          loader: 'webpack/lib/replace-loader',
          options: {search: /^var rsvp *= *require\b.*([\s\S]* )rsvp\.(Promise)\b/m, replace: "'use strict';$1$2"},
        },
        {
          test: /node_modules[\\/]readable-stream\b.lib._stream_readable\.js$/i,
          loader: 'webpack/lib/replace-loader',
          options: {search: /\b(require\('string_decoder)\/('\))/g, replace: '$1$2'},
        },
        // optimize output
        {
          test: /node_modules[\\/]rxjs\b._esm\w*.(operators\b.)?index\.js$/i,
          loader: 'webpack/lib/replace-loader',
          options: {
            search: new RegExp(`^export\\s+\\{[^{}]*\\b(?!(${usedRxjsFn})\\b)\\w+\\s*\\}`, 'gm'),
            replace: '//$&',
          },
        },
        {
          test: /node_modules[\\/]lodash.index\.js$/i,
          loader: 'webpack/lib/replace-loader',
          options: {
            search: /^(module\.exports *= *)(require\('\.\/)lodash('\))/m,
            replace: `$1{\n${usedLodashFn.map(f => f + ': $2' + f + '$3').join(',\n')}\n}`,
          },
        },
        {
          test: /node_modules[\\/]jsprim\b.lib.jsprim\.js$/i,
          loader: 'webpack/lib/replace-loader',
          options: {search: /^(var mod_(util|verror|jsonschema)|exports\.validateJson\w*) *=/gm, replace: '//$&'},
        },
        {
          test: /node_modules[\\/]external-editor\b.main.index\.js$/i,
          loader: 'webpack/lib/replace-loader',
          options: {
            multiple: [
              {
                search: /^Object\.defineProperty\(exports\b[\s\S]*?\nvar (\w+Error)_1 *=/m,
                replace: (m, p) =>
                  /^var __extends *=.*\{\n[\s\S]*?\n\}.*/m.exec(
                    fs.readFileSync(resolveDepPath(`external-editor/main/errors/${p}.js`), 'utf8')
                  )[0] + m,
              },
              {
                search: /^var (\w+Error)_1 *= *require\(['"]\.\/errors\/\1\b.*/gm,
                replace: (_, p) =>
                  new RegExp(`^var ${p} *=.*\\{\\n[\\s\\S]*?\\n\\}.*`, 'm').exec(
                    fs.readFileSync(resolveDepPath(`external-editor/main/errors/${p}.js`), 'utf8')
                  )[0],
              },
              {search: / \w+Error_1\./g, replace: ' '},
            ],
          },
        },
      ],
    },
    resolve: {
      mainFields: ['es2015', 'module', 'main'],
      alias: {
        ...baseConfig.resolve.alias,
        retry$: resolveDepPath('retry/lib/retry.js'),
        'node-emoji$': resolveDepPath('node-emoji/lib/emoji.js'),
        lodash$: resolveDepPath('lodash/index.js'),
        'cli-table3$': resolveDepPath('cli-table3/src/table.js'),
        'mime-db$': resolveDepPath('mime-db/db.json'),
        'colors/safe$': resolveDepPath('colors/lib/colors.js'),
        'http-signature$': resolveDepPath('http-signature/lib/signer.js'),
      },
    },
    plugins: [
      new webpack.BannerPlugin({banner: '#!/usr/bin/env node', raw: true, test: /\bcli\.js$/}),
      new webpack.CopyPlugin({
        patterns: [
          {from: '{bin/**,LICENSE,*.md}', context: basedir},
          {from: 'preinstall.js', context: 'scripts'},
          {
            from: 'package.json',
            transform(content) {
              const {dependencies: _, devDependencies: _d, ...pkg} = JSON.parse(content);
              pkg.scripts = {preinstall: 'node ./preinstall.js'};
              return (pkg.installationMethod = 'tar'), JSON.stringify(pkg, null, 2) + '\n';
            },
          },
          {from: 'node_modules/v8-compile-cache/v8-compile-cache.js', to: 'lib/'},
        ],
      }),
      // circular dependencies
      new webpack.ReplaceCodePlugin([
        {search: ' getGlobalBinFolder(', replace: ' getBinFolder(', test: /\bcli\.js$/},
        {search: ' globalRun(', replace: ' global_run(', test: /\bcli\.js$/},
      ]),
    ],
    optimization: {
      ...baseConfig.optimization,
      splitChunks: {
        cacheGroups: {
          vendors: {test: /\bnode_modules[\\/](?!@babel.runtime\b.\w*.esm\b)/, name: 'lib/vendors', chunks: 'all'},
        },
      },
    },
  },
]);

compiler.run((err, stats) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(
    stats.toString({colors: true, modulesSpace: Infinity, nestedModules: true, nestedModulesSpace: Infinity})
  );
});
