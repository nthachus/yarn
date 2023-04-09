'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.pack = pack;
exports.packTarball = packTarball;
exports.packWithIgnoreAndHeaders = packWithIgnoreAndHeaders;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _filter = require('../../util/filter.js');
var _errors = require('../../errors.js');

var zlib = require('zlib');
var path = require('path');
var tar = require('tar-fs');
var fs2 = require('fs');
var depsFor = require('hash-for-dep/lib/deps-for');

var FOLDERS_IGNORE = [
  // never allow version control folders
  '.git',
  'CVS',
  '.svn',
  '.hg',

  'node_modules',
];

var DEFAULT_IGNORE = (0, _filter.ignoreLinesToRegex)(
  [].concat(FOLDERS_IGNORE, [
    // ignore cruft
    'yarn.lock',
    '.lock-wscript',
    '.wafpickle-{0..9}',
    '*.swp',
    '._*',
    'npm-debug.log',
    'yarn-error.log',
    '.npmrc',
    '.yarnrc',
    '.yarnrc.yml',
    '.npmignore',
    '.gitignore',
    '.DS_Store',
  ])
);

var NEVER_IGNORE = (0, _filter.ignoreLinesToRegex)([
  // never ignore these files
  '!/package.json',
  '!/readme*',
  '!/+(license|licence)*',
  '!/+(changes|changelog|history)*',
]);

function packTarball() {
  return _packTarball.apply(this, arguments);
}
function _packTarball() {
  _packTarball = (0, _asyncToGenerator2.default)(function* (
    config,
    _temp
  ) {
    var _ref = _temp === void 0 ? {} : _temp, mapHeader = _ref.mapHeader;
    var pkg = yield config.readRootManifest();
    var bundleDependencies = pkg.bundleDependencies, main = pkg.main, onlyFiles = pkg.files;

    // include required files
    var filters = NEVER_IGNORE.slice();
    // include default filters unless `files` is used
    if (!onlyFiles) {
      filters = filters.concat(DEFAULT_IGNORE);
    }
    if (main) {
      filters = filters.concat((0, _filter.ignoreLinesToRegex)(['!/' + main]));
    }

    // include bundleDependencies
    var bundleDependenciesFiles = [];
    if (bundleDependencies) {
      for (var dependency of bundleDependencies) {
        var dependencyList = depsFor(dependency, config.cwd);

        for (var dep of dependencyList) {
          var filesForBundledDep = yield fs.walk(dep.baseDir, null, new Set(FOLDERS_IGNORE));
          bundleDependenciesFiles = bundleDependenciesFiles.concat(filesForBundledDep);
        }
      }
    }

    // `files` field
    if (onlyFiles) {
      var lines = [
        '*', // ignore all files except those that are explicitly included with a negation filter
      ];
      lines = lines.concat(
        onlyFiles.map((filename) => `!${filename}`),
        onlyFiles.map((filename) => `!${path.join(filename, '**')}`)
      );
      var regexes = (0, _filter.ignoreLinesToRegex)(lines, './');
      filters = filters.concat(regexes);
    }

    var files = yield fs.walk(config.cwd, null, new Set(FOLDERS_IGNORE));
    var dotIgnoreFiles = (0, _filter.filterOverridenGitignores)(files);

    // create ignores
    for (var file of dotIgnoreFiles) {
      var raw = yield fs.readFile(file.absolute);
      var _lines = raw.split('\n');

      var _regexes = (0, _filter.ignoreLinesToRegex)(_lines, path.dirname(file.relative));
      filters = filters.concat(_regexes);
    }

    // files to definitely keep, takes precedence over ignore filter
    var keepFiles = new Set();

    // files to definitely ignore
    var ignoredFiles = new Set();

    // list of files that didn't match any of our patterns, if a directory in the chain above was matched
    // then we should inherit it
    var possibleKeepFiles = new Set();

    // apply filters
    (0, _filter.sortFilter)(files, filters, keepFiles, possibleKeepFiles, ignoredFiles);

    // add the files for the bundled dependencies to the set of files to keep
    for (var _file of bundleDependenciesFiles) {
      var realPath = yield fs.realpath(config.cwd);
      keepFiles.add(path.relative(realPath, _file.absolute));
    }

    return packWithIgnoreAndHeaders(
      config.cwd,
      name => {
        var relative = path.relative(config.cwd, name);
        // Don't ignore directories, since we need to recurse inside them to check for unignored files.
        if (fs2.lstatSync(name).isDirectory()) {
          var isParentOfKeptFile = Array.from(keepFiles).some(name => !path.relative(relative, name).startsWith('..'));
          return !isParentOfKeptFile;
        }
        // Otherwise, ignore a file if we're not supposed to keep it.
        return !keepFiles.has(relative);
      },
      {mapHeader}
    );
  });

  return _packTarball.apply(this, arguments);
}

function packWithIgnoreAndHeaders(
  cwd,
  ignoreFunction,
  _temp2
) {
  var _ref2 = _temp2 === void 0 ? {} : _temp2, mapHeader = _ref2.mapHeader;
  return tar.pack(cwd, {
    ignore: ignoreFunction,
    sort: true,
    map: header => {
      var suffix = header.name === '.' ? '' : `/${header.name}`;
      header.name = `package${suffix}`;
      delete header.uid;
      delete header.gid;
      return mapHeader ? mapHeader(header) : header;
    },
  });
}

function pack() {
  return _pack.apply(this, arguments);
}
function _pack() {
  _pack = (0, _asyncToGenerator2.default)(function* (config) {
    var packer = yield packTarball(config);
    var compressor = packer.pipe(new zlib.Gzip());

    return compressor;
  });

  return _pack.apply(this, arguments);
}

function setFlags(commander) {
  commander.description('Creates a compressed gzip archive of package dependencies.');
  commander.option('-f, --filename <filename>', 'filename');
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (
    config,
    reporter,
    flags,
    args
  ) {
    var pkg = yield config.readRootManifest();
    if (!pkg.name) {
      throw new _errors.MessageError(reporter.lang('noName'));
    }
    if (!pkg.version) {
      throw new _errors.MessageError(reporter.lang('noVersion'));
    }

    var normaliseScope = name => (name[0] === '@' ? name.substr(1).replace('/', '-') : name);
    var filename = flags.filename || path.join(config.cwd, `${normaliseScope(pkg.name)}-v${pkg.version}.tgz`);

    yield config.executeLifecycleScript('prepack');

    var stream = yield pack(config);

    yield new Promise((resolve, reject) => {
      stream.pipe(fs2.createWriteStream(filename));
      stream.on('error', reject);
      stream.on('close', resolve);
    });

    yield config.executeLifecycleScript('postpack');

    reporter.success(reporter.lang('packWroteTarball', filename));
  });

  return _run.apply(this, arguments);
}
