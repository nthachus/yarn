'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = exports.autoRun = void 0;
exports.main = main;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var http = require('http');
var net = require('net');
var path = require('path');
var commander = require('commander');
var fs = require('fs');
var invariant = require('invariant');
var lockfile = require('proper-lockfile');
var loudRejection = require('loud-rejection');
var onDeath = require('death');
var semver = require('semver');

var _index = require('../reporters/index.js');
var _index2 = require('../registries/index.js');
var _index3 = _interopRequireDefault(require('./commands/index.js'));
var constants = _interopRequireWildcard(require('../constants.js'));
var network = _interopRequireWildcard(require('../util/network.js'));
var _errors = require('../errors.js');
var _config = _interopRequireDefault(require('../config.js'));
var _rc = require('../rc.js');
var _child = require('../util/child.js');
var _yarnVersion = require('../util/yarn-version.js');
var _signalHandler = _interopRequireDefault(require('../util/signal-handler.js'));
var _conversion = require('../util/conversion.js');
var _errors2 = require('../errors');

var fn = typeof process.stdout.prependListener === 'function' ? 'prependListener' : 'on';
process.stdout[fn]('error', err => {
  // swallow err only if downstream consumer process closed pipe early
  if (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED') {
    return;
  }
  throw err;
});

function findProjectRoot(base) {
  var prev = null;
  var dir = base;

  do {
    if (fs.existsSync(path.join(dir, constants.NODE_PACKAGE_JSON))) {
      return dir;
    }

    prev = dir;
    dir = path.dirname(dir);
  } while (dir !== prev);

  return base;
}

function main() {
  return _main.apply(this, arguments);
}
function _main() {
  _main = (0, _asyncToGenerator2.default)(function* (_ref) {
    var startArgs = _ref.startArgs,
      args = _ref.args,
      endArgs = _ref.endArgs;
    var collect = (val, acc) => {
      acc.push(val);
      return acc;
    };

    loudRejection();
    (0, _signalHandler.default)();

    // set global options
    commander.version(_yarnVersion.version, '-v, --version');
    commander.usage('[command] [flags]');
    commander.option('--no-default-rc', 'prevent Yarn from automatically detecting yarnrc and npmrc files');
    commander.option(
      '--use-yarnrc <path>',
      'specifies a yarnrc file that Yarn should use (.yarnrc only, not .npmrc)',
      collect,
      []
    );
    commander.option('--verbose', 'output verbose messages on internal operations');
    commander.option('--offline', 'trigger an error if any required dependencies are not available in local cache');
    commander.option('--prefer-offline', 'use network only if dependencies are not available in local cache');
    commander.option('--enable-pnp, --pnp', "enable the Plug'n'Play installation");
    commander.option('--disable-pnp', "disable the Plug'n'Play installation");
    commander.option('--strict-semver');
    commander.option('--json', 'format Yarn log messages as lines of JSON (see jsonlines.org)');
    commander.option('--ignore-scripts', "don't run lifecycle scripts");
    commander.option('--har', 'save HAR output of network traffic');
    commander.option('--ignore-platform', 'ignore platform checks');
    commander.option('--ignore-engines', 'ignore engines check');
    commander.option('--ignore-optional', 'ignore optional dependencies');
    commander.option('--force', 'install and build packages even if they were built before, overwrite lockfile');
    commander.option('--skip-integrity-check', 'run install without checking if node_modules is installed');
    commander.option('--check-files', 'install will verify file tree of packages for consistency');
    commander.option('--no-bin-links', "don't generate bin links when setting up packages");
    commander.option('--flat', 'only allow one version of a package');
    commander.option('--prod, --production [prod]', '', _conversion.boolify);
    commander.option('--no-lockfile', "don't read or generate a lockfile");
    commander.option('--pure-lockfile', "don't generate a lockfile");
    commander.option('--frozen-lockfile', "don't generate a lockfile and fail if an update is needed");
    commander.option('--update-checksums', 'update package checksums from current repository');
    commander.option('--link-duplicates', 'create hardlinks to the repeated modules in node_modules');
    commander.option('--link-folder <path>', 'specify a custom folder to store global links');
    commander.option('--global-folder <path>', 'specify a custom folder to store global packages');
    commander.option(
      '--modules-folder <path>',
      'rather than installing modules into the node_modules folder relative to the cwd, output them here'
    );
    commander.option('--preferred-cache-folder <path>', 'specify a custom folder to store the yarn cache if possible');
    commander.option('--cache-folder <path>', 'specify a custom folder that must be used to store the yarn cache');
    commander.option('--mutex <type>[:specifier]', 'use a mutex to ensure only one yarn instance is executing');
    commander.option(
      '--emoji [bool]',
      'enable emoji in output',
      _conversion.boolify,
      process.platform === 'darwin' ||
        process.env.TERM_PROGRAM === 'Hyper' ||
        process.env.TERM_PROGRAM === 'HyperTerm' ||
        process.env.TERM_PROGRAM === 'Terminus'
    );
    commander.option('-s, --silent', 'skip Yarn console logs, other types of logs (script output) will be printed');
    commander.option('--cwd <cwd>', 'working directory to use', process.cwd());
    commander.option('--proxy <host>', '');
    commander.option('--https-proxy <host>', '');
    commander.option('--registry <url>', 'override configuration registry');
    commander.option('--no-progress', 'disable progress bar');
    commander.option('--network-concurrency <number>', 'maximum number of concurrent network requests', parseInt);
    commander.option('--network-timeout <milliseconds>', 'TCP timeout for network requests', parseInt);
    commander.option('--non-interactive', 'do not show interactive prompts');
    commander.option(
      '--scripts-prepend-node-path [bool]',
      'prepend the node executable dir to the PATH in scripts',
      _conversion.boolify
    );
    commander.option('--no-node-version-check', 'do not warn when using a potentially unsupported Node version');
    commander.option('--focus', 'Focus on a single workspace by installing remote copies of its sibling workspaces.');
    commander.option('--otp <otpcode>', 'one-time password for two factor authentication');
    commander.option('--package-date-limit <time>', 'only install package version that have release date before this');

    // if -v is the first command, then always exit after returning the version
    if (args[0] === '-v') {
      console.log(_yarnVersion.version.trim());
      process.exitCode = 0;
      return;
    }

    // get command name
    var firstNonFlagIndex = args.findIndex((arg, idx, arr) => {
      var isOption = arg.startsWith('-');
      var prev = idx > 0 && arr[idx - 1];
      var prevOption = prev && prev.startsWith('-') && commander.optionFor(prev);
      var boundToPrevOption = prevOption && (prevOption.optional || prevOption.required);

      return !isOption && !boundToPrevOption;
    });
    var preCommandArgs;
    var commandName = '';
    if (firstNonFlagIndex > -1) {
      preCommandArgs = args.slice(0, firstNonFlagIndex);
      commandName = args[firstNonFlagIndex];
      args = args.slice(firstNonFlagIndex + 1);
    } else {
      preCommandArgs = args;
      args = [];
    }

    var isKnownCommand = Object.prototype.hasOwnProperty.call(_index3.default, commandName);
    var isHelp = arg => arg === '--help' || arg === '-h';
    var helpInPre = preCommandArgs.findIndex(isHelp);
    var helpInArgs = args.findIndex(isHelp);
    var setHelpMode = () => {
      if (isKnownCommand) {
        args.unshift(commandName);
      }
      commandName = 'help';
      isKnownCommand = true;
    };

    if (helpInPre > -1) {
      preCommandArgs.splice(helpInPre);
      setHelpMode();
    } else if (isKnownCommand && helpInArgs === 0) {
      args.splice(helpInArgs);
      setHelpMode();
    }

    if (!commandName) {
      commandName = 'install';
      isKnownCommand = true;
    }
    if (commandName === 'set' && args[0] === 'version') {
      commandName = 'policies';
      args.splice(0, 1, 'set-version');
      isKnownCommand = true;
    }
    if (!isKnownCommand) {
      // if command is not recognized, then set default to `run`
      args.unshift(commandName);
      commandName = 'run';
    }
    var command = _index3.default[commandName];

    var warnAboutRunDashDash = false;
    // we are using "yarn <script> -abc", "yarn run <script> -abc", or "yarn node -abc", we want -abc
    // to be script options, not yarn options

    // PROXY_COMMANDS is a map of command name to the number of preservedArgs
    var PROXY_COMMANDS = {
      run: 1, // yarn run {command}
      create: 1, // yarn create {project}
      node: 0, // yarn node
      workspaces: 1, // yarn workspaces {command}
      workspace: 2, // yarn workspace {package} {command}
    };
    if (PROXY_COMMANDS.hasOwnProperty(commandName)) {
      if (endArgs.length === 0) {
        // $FlowFixMe doesn't like that PROXY_COMMANDS doesn't have keys for all commands.
        var preservedArgs = PROXY_COMMANDS[commandName];

        // If the --into option immediately follows the command (or the script name in the "run/create"
        // case), we parse them as regular options so that we can cd into them
        if (args[preservedArgs] === `--into`) {
          preservedArgs += 2;
        }
        endArgs = ['--'].concat(args.splice(preservedArgs));
      } else {
        warnAboutRunDashDash = true;
      }
    }

    args = [].concat(preCommandArgs, args);

    command.setFlags(commander);
    commander.parse([].concat(
      startArgs,
      [
        // we use this for https://github.com/tj/commander.js/issues/346, otherwise
        // it will strip some args that match with any options
        'this-arg-will-get-stripped-later',
      ],
      (0, _rc.getRcArgs)(commandName, args),
      args
    ));
    commander.args = commander.args.concat(endArgs.slice(1));

    // we strip cmd
    console.assert(commander.args.length >= 1);
    console.assert(commander.args[0] === 'this-arg-will-get-stripped-later');
    commander.args.shift();

    //
    var Reporter = commander.json ? _index.JSONReporter : _index.ConsoleReporter;
    var reporter = new Reporter({
      emoji: process.stdout.isTTY && commander.emoji,
      verbose: commander.verbose,
      noProgress: !commander.progress,
      isSilent: (0, _conversion.boolifyWithDefault)(process.env.YARN_SILENT, false) || commander.silent,
      nonInteractive: commander.nonInteractive,
    });

    var exit = exitCode => {
      process.exitCode = exitCode || 0;
      reporter.close();
    };

    reporter.initPeakMemoryCounter();

    var config = new _config.default(reporter);
    var outputWrapperEnabled = (0, _conversion.boolifyWithDefault)(process.env.YARN_WRAP_OUTPUT, true);
    var shouldWrapOutput =
      outputWrapperEnabled &&
      !commander.json &&
      command.hasWrapper(commander, commander.args) &&
      !(commandName === 'init' && commander[`2`]);

    if (shouldWrapOutput) {
      reporter.header(commandName, {name: 'yarn', version: _yarnVersion.version});
    }

    if (commander.nodeVersionCheck && !semver.satisfies(process.versions.node, constants.SUPPORTED_NODE_VERSIONS)) {
      reporter.warn(reporter.lang('unsupportedNodeVersion', process.versions.node, constants.SUPPORTED_NODE_VERSIONS));
    }

    if (command.noArguments && commander.args.length) {
      reporter.error(reporter.lang('noArguments'));
      reporter.info(command.getDocsInfo);
      exit(1);
      return;
    }

    //
    if (commander.yes) {
      reporter.warn(reporter.lang('yesWarning'));
    }

    //
    if (!commander.offline && network.isOffline()) {
      reporter.warn(reporter.lang('networkWarning'));
    }

    //
    var run = () => {
      invariant(command, 'missing command');

      if (warnAboutRunDashDash) {
        reporter.warn(reporter.lang('dashDashDeprecation'));
      }

      return command.run(config, reporter, commander, commander.args).then(exitCode => {
        if (shouldWrapOutput) {
          reporter.footer(false);
        }
        return exitCode;
      });
    };

    //
    var runEventuallyWithFile = (mutexFilename, isFirstTime) => {
      return new Promise(resolve => {
        var lockFilename = mutexFilename || path.join(config.cwd, constants.SINGLE_INSTANCE_FILENAME);
        lockfile.lock(lockFilename, {realpath: false}, (err, release) => {
          if (err) {
            if (isFirstTime) {
              reporter.warn(reporter.lang('waitingInstance'));
            }
            setTimeout(() => {
              resolve(runEventuallyWithFile(mutexFilename, false));
            }, 200); // do not starve the CPU
          } else {
            onDeath(() => {
              process.exitCode = 1;
            });
            resolve(run().then(() => new Promise(resolve => release(resolve))));
          }
        });
      });
    };

    var runEventuallyWithNetwork = (mutexPort) => {
      return new Promise((resolve, reject) => {
        var connectionOptions = {
          port: +mutexPort || constants.SINGLE_INSTANCE_PORT,
          host: 'localhost',
        };

        function startServer() {
          var clients = new Set();
          var server = http.createServer(manager);

          // The server must not prevent us from exiting
          server.unref();

          // No socket must timeout, so that they aren't closed before we exit
          server.timeout = 0;

          // If we fail to setup the server, we ask the existing one for its name
          server.on('error', () => {
            reportServerName();
          });

          // If we succeed, keep track of all the connected sockets to close them later
          server.on('connection', socket => {
            clients.add(socket);
            socket.on('close', () => {
              clients.delete(socket);
            });
          });

          server.listen(connectionOptions, () => {
            // Don't forget to kill the sockets if we're being killed via signals
            onDeath(killSockets);

            // Also kill the sockets if we finish, whether it's a success or a failure
            run().then(
              res => {
                killSockets();
                resolve(res);
              },
              err => {
                killSockets();
                reject(err);
              }
            );
          });

          function manager(request, response) {
            response.writeHead(200);
            response.end(JSON.stringify({cwd: config.cwd, pid: process.pid}));
          }

          function killSockets() {
            try {
              server.close();
            } catch (err) {
              // best effort
            }

            for (var socket of clients) {
              try {
                socket.destroy();
              } catch (err) {
                // best effort
              }
            }

            // If the process hasn't exited in the next 5s, it has stalled and we abort
            var timeout = setTimeout(() => {
              console.error('Process stalled');
              if (process._getActiveHandles) {
                console.error('Active handles:');
                // $FlowFixMe: getActiveHandles is undocumented, but it exists
                for (var handle of process._getActiveHandles()) {
                  console.error(`  - ${handle.constructor.name}`);
                }
              }
              // eslint-disable-next-line no-process-exit
              process.exit(1);
            }, 5000);

            // This timeout must not prevent us from exiting
            // $FlowFixMe: Node's setTimeout returns a Timeout, not a Number
            timeout.unref();
          }
        }

        function reportServerName() {
          var request = http.get(connectionOptions, response => {
            var buffers = [];

            response.on('data', buffer => {
              buffers.push(buffer);
            });

            response.on('end', () => {
              try {
                var _JSON$parse = JSON.parse(Buffer.concat(buffers).toString()), _cwd = _JSON$parse.cwd, pid = _JSON$parse.pid;
                reporter.warn(reporter.lang('waitingNamedInstance', pid, _cwd));
              } catch (error) {
                reporter.verbose(error);
                reject(new Error(reporter.lang('mutexPortBusy', connectionOptions.port)));
                return;
              }
              waitForTheNetwork();
            });

            response.on('error', () => {
              startServer();
            });
          });

          request.on('error', () => {
            startServer();
          });
        }

        function waitForTheNetwork() {
          var socket = net.createConnection(connectionOptions);

          socket.on('error', () => {
            // catch & ignore, the retry is handled in 'close'
          });

          socket.on('close', () => {
            startServer();
          });
        }

        startServer();
      });
    };

    function onUnexpectedError(err) {
      function indent(str) {
        return '\n  ' + str.trim().split('\n').join('\n  ');
      }

      var log = [];
      log.push(`Arguments: ${indent(process.argv.join(' '))}`);
      log.push(`PATH: ${indent(process.env.PATH || 'undefined')}`);
      log.push(`Yarn version: ${indent(_yarnVersion.version)}`);
      log.push(`Node version: ${indent(process.versions.node)}`);
      log.push(`Platform: ${indent(process.platform + ' ' + process.arch)}`);

      log.push(`Trace: ${indent(err.stack)}`);

      // add manifests
      for (var registryName of _index2.registryNames) {
        var possibleLoc = path.join(config.cwd, _index2.registries[registryName].filename);
        var manifest = fs.existsSync(possibleLoc) ? fs.readFileSync(possibleLoc, 'utf8') : 'No manifest';
        log.push(`${registryName} manifest: ${indent(manifest)}`);
      }

      // lockfile
      var lockLoc = path.join(
        config.lockfileFolder || config.cwd, // lockfileFolder might not be set at this point
        constants.LOCKFILE_FILENAME
      );
      var lockfile = fs.existsSync(lockLoc) ? fs.readFileSync(lockLoc, 'utf8') : 'No lockfile';
      log.push(`Lockfile: ${indent(lockfile)}`);

      var errorReportLoc = writeErrorReport(log);

      reporter.error(reporter.lang('unexpectedError', err.message));

      if (errorReportLoc) {
        reporter.info(reporter.lang('bugReport', errorReportLoc));
      }
    }

    function writeErrorReport(log) {
      var errorReportLoc = config.enableMetaFolder
        ? path.join(config.cwd, constants.META_FOLDER, 'yarn-error.log')
        : path.join(config.cwd, 'yarn-error.log');

      try {
        fs.writeFileSync(errorReportLoc, log.join('\n\n') + '\n');
      } catch (err) {
        reporter.error(reporter.lang('fileWriteError', errorReportLoc, err.message));
        return undefined;
      }

      return errorReportLoc;
    }

    var cwd = command.shouldRunInCurrentCwd ? commander.cwd : findProjectRoot(commander.cwd);

    var folderOptionKeys = ['linkFolder', 'globalFolder', 'preferredCacheFolder', 'cacheFolder', 'modulesFolder'];

    // Resolve all folder options relative to cwd
    var resolvedFolderOptions = {};
    folderOptionKeys.forEach(folderOptionKey => {
      var folderOption = commander[folderOptionKey];
      var resolvedFolderOption = folderOption ? path.resolve(commander.cwd, folderOption) : folderOption;
      resolvedFolderOptions[folderOptionKey] = resolvedFolderOption;
    });

    yield config
      .init((0, _extends2.default)(
        {
          cwd,
          commandName,
        },
        resolvedFolderOptions,
        {
          enablePnp: commander.pnp,
          disablePnp: commander.disablePnp,
          enableDefaultRc: commander.defaultRc,
          extraneousYarnrcFiles: commander.useYarnrc,
          binLinks: commander.binLinks,
          preferOffline: commander.preferOffline,
          captureHar: commander.har,
          ignorePlatform: commander.ignorePlatform,
          ignoreEngines: commander.ignoreEngines,
          ignoreScripts: commander.ignoreScripts,
          offline: commander.preferOffline || commander.offline,
          looseSemver: !commander.strictSemver,
          production: commander.production,
          httpProxy: commander.proxy,
          httpsProxy: commander.httpsProxy,
          registry: commander.registry,
          networkConcurrency: commander.networkConcurrency,
          networkTimeout: commander.networkTimeout,
          nonInteractive: commander.nonInteractive,
          updateChecksums: commander.updateChecksums,
          focus: commander.focus,
          otp: commander.otp,
          packageDateLimit: commander.packageDateLimit,
        }
      ))
      .then(() => {
        // lockfile check must happen after config.init sets lockfileFolder
        if (command.requireLockfile && !fs.existsSync(path.join(config.lockfileFolder, constants.LOCKFILE_FILENAME))) {
          throw new _errors.MessageError(reporter.lang('noRequiredLockfile'));
        }

        // option "no-progress" stored in yarn config
        var noProgressConfig = config.registries.yarn.getOption('no-progress');

        if (noProgressConfig) {
          reporter.disableProgress();
        }

        // verbose logs outputs process.uptime() with this line we can sync uptime to absolute time on the computer
        reporter.verbose(`current time: ${new Date().toISOString()}`);

        var mutex = commander.mutex;
        if (mutex && typeof mutex === 'string') {
          var separatorLoc = mutex.indexOf(':');
          var mutexType;
          var mutexSpecifier;
          if (separatorLoc === -1) {
            mutexType = mutex;
            mutexSpecifier = undefined;
          } else {
            mutexType = mutex.substring(0, separatorLoc);
            mutexSpecifier = mutex.substring(separatorLoc + 1);
          }

          if (mutexType === 'file') {
            return runEventuallyWithFile(mutexSpecifier, true).then(exit);
          } else if (mutexType === 'network') {
            return runEventuallyWithNetwork(mutexSpecifier).then(exit);
          } else {
            throw new _errors.MessageError(`Unknown single instance type ${mutexType}`);
          }
        } else {
          return run().then(exit);
        }
      })
      .catch((err) => {
        reporter.verbose(err.stack);

        if (err instanceof _errors2.ProcessTermError && reporter.isSilent) {
          return exit(err.EXIT_CODE || 1);
        }

        if (err instanceof _errors.MessageError) {
          reporter.error(err.message);
        } else {
          onUnexpectedError(err);
        }

        if (command.getDocsInfo) {
          reporter.info(command.getDocsInfo);
        }

        if (err instanceof _errors2.ProcessTermError) {
          return exit(err.EXIT_CODE || 1);
        }

        return exit(1);
      });
  });

  return _main.apply(this, arguments);
}

function start() {
  return _start.apply(this, arguments);
}
function _start() {
  _start = (0, _asyncToGenerator2.default)(function* () {
    var rc = (0, _rc.getRcConfigForCwd)(process.cwd(), process.argv.slice(2));
    var yarnPath = rc['yarn-path'] || rc['yarnPath'];

    if (yarnPath && !(0, _conversion.boolifyWithDefault)(process.env.YARN_IGNORE_PATH, false)) {
      var argv = process.argv.slice(2);
      var opts = {stdio: 'inherit', env: Object.assign({}, process.env, {YARN_IGNORE_PATH: 1})};
      var exitCode = 0;

      process.on(`SIGINT`, () => {
        // We don't want SIGINT to kill our process; we want it to kill the
        // innermost process, whose end will cause our own to exit.
      });

      (0, _signalHandler.default)();

      try {
        if (/\.[cm]?js$/.test(yarnPath)) {
          exitCode = yield (0, _child.spawnp)(process.execPath, [yarnPath].concat(argv), opts);
        } else {
          exitCode = yield (0, _child.spawnp)(yarnPath, argv, opts);
        }
      } catch (firstError) {
        try {
          exitCode = yield (0, _child.forkp)(yarnPath, argv, opts);
        } catch (error) {
          throw firstError;
        }
      }

      process.exitCode = exitCode;
    } else {
      // ignore all arguments after a --
      var doubleDashIndex = process.argv.findIndex(element => element === '--');
      var startArgs = process.argv.slice(0, 2);
      var args = process.argv.slice(2, doubleDashIndex === -1 ? process.argv.length : doubleDashIndex);
      var endArgs = doubleDashIndex === -1 ? [] : process.argv.slice(doubleDashIndex);

      yield main({startArgs, args, endArgs});
    }
  });

  return _start.apply(this, arguments);
}

// When this module is compiled via Webpack, its child
// count will be 0 since it is a single-file bundle.
var autoRun = module.children.length === 0;
exports.autoRun = autoRun;

if (require.main === module) {
  start().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

exports.default = start;
