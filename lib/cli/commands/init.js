'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.getGitConfigInfo = getGitConfigInfo;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
exports.shouldRunInCurrentCwd = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _util = require('../../util/normalize-manifest/util.js');
var _index = require('../../registries/index.js');
var _githubResolver = _interopRequireDefault(require('../../resolvers/exotics/github-resolver.js'));
var child = _interopRequireWildcard(require('../../util/child.js'));
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var validate = _interopRequireWildcard(require('../../util/normalize-manifest/validate.js'));
var _constants = require('../../constants');

var objectPath = require('object-path');
var path = require('path');
var yn = require('yn');

function setFlags(commander) {
  commander.description('Interactively creates or updates a package.json file.');
  commander.option('-y, --yes', 'use default options');
  commander.option('-p, --private', 'use default options and private true');
  commander.option('-i, --install <value>', 'install a specific Yarn release');
  commander.option('-2', 'generates the project using Yarn 2');
}

function hasWrapper(commander, args) {
  return true;
}

var shouldRunInCurrentCwd = true;
exports.shouldRunInCurrentCwd = shouldRunInCurrentCwd;

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var installVersion = flags[`2`] ? `berry` : flags.install;
    var forwardedArgs = process.argv.slice(process.argv.indexOf('init', 2) + 1);

    if (installVersion) {
      if (flags[`2`] && process.env.COREPACK_ROOT) {
        yield child.spawn(
          _constants.NODE_BIN_PATH,
          [
            path.join(process.env.COREPACK_ROOT, 'dist/corepack.js'),
            `yarn@${flags.install || `stable`}`,
            `init`,
          ].concat(
            forwardedArgs,
            [`--install=self`]
          ),
          {
            stdio: 'inherit',
            cwd: config.cwd,
          }
        );
      } else {
        var lockfilePath = path.resolve(config.cwd, 'yarn.lock');
        if (!(yield fs.exists(lockfilePath))) {
          yield fs.writeFile(lockfilePath, '');
        }
        yield child.spawn(_constants.NODE_BIN_PATH, [process.argv[1], 'policies', 'set-version', installVersion, '--silent'], {
          stdio: 'inherit',
          cwd: config.cwd,
        });
        yield child.spawn(_constants.NODE_BIN_PATH, [process.argv[1], 'init'].concat(forwardedArgs), {
          stdio: 'inherit',
          cwd: config.cwd,
        });
      }
      return;
    }

    var manifests = yield config.getRootManifests();

    var repository = {};
    var author = {
      name: config.getOption('init-author-name'),
      email: config.getOption('init-author-email'),
      url: config.getOption('init-author-url'),
    };
    if (yield fs.exists(path.join(config.cwd, '.git'))) {
      // get git origin of the cwd
      try {
        repository = {
          type: 'git',
          url: yield child.spawn('git', ['config', 'remote.origin.url'], {
            cwd: config.cwd,
          }),
        };
      } catch (ex) {
        // Ignore - Git repo may not have an origin URL yet (eg. if it only exists locally)
      }

      if (author.name === undefined) {
        author.name = yield getGitConfigInfo('user.name');
      }

      if (author.email === undefined) {
        author.email = yield getGitConfigInfo('user.email');
      }
    }

    var keys = [
      {
        key: 'name',
        question: 'name',
        default: path.basename(config.cwd),
        validation: validate.isValidPackageName,
        validationError: 'invalidPackageName',
      },
      {
        key: 'version',
        question: 'version',
        default: String(config.getOption('init-version')),
      },
      {
        key: 'description',
        question: 'description',
        default: '',
      },
      {
        key: 'main',
        question: 'entry point',
        default: 'index.js',
      },
      {
        key: 'repository',
        question: 'repository url',
        default: (0, _util.extractRepositoryUrl)(repository),
      },
      {
        key: 'author',
        question: 'author',
        default: (0, _util.stringifyPerson)(author),
      },
      {
        key: 'license',
        question: 'license',
        default: String(config.getOption('init-license')),
      },
      {
        key: 'private',
        question: 'private',
        default: config.getOption('init-private') || '',
        inputFormatter: yn,
      },
    ];

    // get answers
    var pkg = {};
    for (var entry of keys) {
      var yes = flags.yes, privateFlag = flags.private;
      var manifestKey = entry.key;
      var question = entry.question, def = entry.default;

      for (var registryName of _index.registryNames) {
        var object = manifests[registryName].object;
        var val = objectPath.get(object, manifestKey);
        if (!val) {
          break;
        }
        if (typeof val === 'object') {
          if (manifestKey === 'author') {
            val = (0, _util.stringifyPerson)(val);
          } else if (manifestKey === 'repository') {
            val = (0, _util.extractRepositoryUrl)(val);
          }
        }
        def = val;
      }

      if (manifestKey === 'private' && privateFlag) {
        def = true;
      }

      if (def) {
        question += ` (${String(def)})`;
      }

      var answer = void 0;
      var validAnswer = false;

      if (yes) {
        answer = def;
      } else {
        // loop until a valid answer is provided, if validation is on entry
        if (entry.validation) {
          while (!validAnswer) {
            answer = (yield reporter.question(question)) || def;
            // validate answer
            if (entry.validation(String(answer))) {
              validAnswer = true;
            } else {
              reporter.error(reporter.lang('invalidPackageName'));
            }
          }
        } else {
          answer = (yield reporter.question(question)) || def;
        }
      }

      if (answer) {
        if (entry.inputFormatter) {
          answer = entry.inputFormatter(answer);
        }
        objectPath.set(pkg, manifestKey, answer);
      }
    }

    if (pkg.repository && _githubResolver.default.isVersion(pkg.repository)) {
      pkg.repository = `https://github.com/${pkg.repository}`;
    }

    // save answers
    var targetManifests = [];
    for (var _registryName of _index.registryNames) {
      var info = manifests[_registryName];
      if (info.exists) {
        targetManifests.push(info);
      }
    }
    if (!targetManifests.length) {
      targetManifests.push(manifests.npm);
    }
    for (var targetManifest of targetManifests) {
      Object.assign(targetManifest.object, pkg);
      reporter.success(`Saved ${path.basename(targetManifest.loc)}`);
    }

    yield config.saveRootManifests(manifests);
  });

  return _run.apply(this, arguments);
}

function getGitConfigInfo() {
  return _getGitConfigInfo.apply(this, arguments);
}
function _getGitConfigInfo() {
  _getGitConfigInfo = (0, _asyncToGenerator2.default)(function* (credential, spawn) {
    if (spawn === void 0) spawn = child.spawn;
    try {
      // try to get author default based on git config
      return yield spawn('git', ['config', credential]);
    } catch (e) {
      return '';
    }
  });

  return _getGitConfigInfo.apply(this, arguments);
}
