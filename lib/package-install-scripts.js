'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _config = _interopRequireDefault(require('./config.js'));
var _executeLifecycleScript = _interopRequireDefault(require('./util/execute-lifecycle-script.js'));
var crypto = _interopRequireWildcard(require('./util/crypto.js'));
var fsUtil = _interopRequireWildcard(require('./util/fs.js'));
var _packageNameUtils = require('./util/package-name-utils.js');
var _pack = require('./cli/commands/pack.js');

var fs = require('fs');
var invariant = require('invariant');
var path = require('path');

var INSTALL_STAGES = ['preinstall', 'install', 'postinstall'];

class PackageInstallScripts {
  constructor(config, resolver, force) {
    this.needsPermission = void 0;

    this.installed = 0;
    this.resolver = resolver;
    this.reporter = config.reporter;
    this.config = config;
    this.force = force;
    this.artifacts = {};
  }

  setForce(force) {
    this.force = force;
  }

  setArtifacts(artifacts) {
    this.artifacts = artifacts;
  }

  getArtifacts() {
    return this.artifacts;
  }

  getInstallCommands(pkg) {
    var scripts = pkg.scripts;
    if (scripts) {
      var cmds = [];
      for (var stage of INSTALL_STAGES) {
        var cmd = scripts[stage];
        if (cmd) {
          cmds.push([stage, cmd]);
        }
      }
      return cmds;
    } else {
      return [];
    }
  }

  walk(loc) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var files = yield fsUtil.walk(loc, null, new Set(_this.config.registryFolders));
      var mtimes = new Map();
      for (var file of files) {
        mtimes.set(file.relative, file.mtime);
      }
      return mtimes;
    })();
  }

  saveBuildArtifacts(
    loc,
    pkg,
    beforeFiles,
    spinner
  ) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var afterFiles = yield _this2.walk(loc);

      // work out what files have been created/modified
      var buildArtifacts = [];
      for (var _ref of afterFiles) {
        var file = _ref[0], mtime = _ref[1];
        if (!beforeFiles.has(file) || beforeFiles.get(file) !== mtime) {
          buildArtifacts.push(file);
        }
      }

      if (!buildArtifacts.length) {
        // nothing else to do here since we have no build artifacts
        return;
      }

      // set build artifacts
      var ref = pkg._reference;
      invariant(ref, 'expected reference');
      _this2.artifacts[`${pkg.name}@${pkg.version}`] = buildArtifacts;
    })();
  }

  install(cmds, pkg, spinner) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var ref = pkg._reference;
      invariant(ref, 'expected reference');
      var locs = ref.locations;

      var updateProgress;

      if (cmds.length > 0) {
        updateProgress = data => {
          var dataStr = data
            .toString() // turn buffer into string
            .trim(); // trim whitespace

          invariant(spinner && spinner.tick, 'We should have spinner and its ticker here');
          if (dataStr) {
            spinner.tick(
              dataStr
                // Only get the last line
                .substr(dataStr.lastIndexOf('\n') + 1)
                // change tabs to spaces as they can interfere with the console
                .replace(/\t/g, ' ')
            );
          }
        };
      }

      try {
        var _loop = function* (_ref2) {
          var stage = _ref2[0], cmd = _ref2[1];
          yield Promise.all(
            locs.map(/*#__PURE__*/ (function() {
              var _ref3 = (0, _asyncToGenerator2.default)(function* (loc) {
                var _yield$executeLifecyc = yield (0, _executeLifecycleScript.default)({
                  stage,
                  config: _this3.config,
                  cwd: loc,
                  cmd,
                  isInteractive: false,
                  updateProgress,
                });
                var stdout = _yield$executeLifecyc.stdout;
                _this3.reporter.verbose(stdout);
              });

              return function() {
                return _ref3.apply(this, arguments);
              };
            })())
          );
        };
        for (var _ref2 of cmds) {
          yield* _loop(_ref2);
        }
      } catch (err) {
        err.message = `${locs.join(', ')}: ${err.message}`;

        invariant(ref, 'expected reference');

        if (ref.optional) {
          ref.ignore = true;
          ref.incompatible = true;
          _this3.reporter.warn(_this3.reporter.lang('optionalModuleScriptFail', err.message));
          _this3.reporter.info(_this3.reporter.lang('optionalModuleFail'));

          // Cleanup node_modules
          try {
            yield Promise.all(
              locs.map(/*#__PURE__*/ (function() {
                var _ref4 = (0, _asyncToGenerator2.default)(function* (loc) {
                  yield fsUtil.unlink(loc);
                });

                return function() {
                  return _ref4.apply(this, arguments);
                };
              })())
            );
          } catch (e) {
            _this3.reporter.error(_this3.reporter.lang('optionalModuleCleanupFail', e.message));
          }
        } else {
          throw err;
        }
      }
    })();
  }

  packageCanBeInstalled(pkg) {
    var cmds = this.getInstallCommands(pkg);
    if (!cmds.length) {
      return false;
    }
    if (this.config.packBuiltPackages && pkg.prebuiltVariants) {
      for (var variant in pkg.prebuiltVariants) {
        if (pkg._remote && pkg._remote.reference && pkg._remote.reference.includes(variant)) {
          return false;
        }
      }
    }
    var ref = pkg._reference;
    invariant(ref, 'Missing package reference');
    if (!ref.fresh && !this.force) {
      // this package hasn't been touched
      return false;
    }

    // Don't run lifecycle scripts for hoisted packages
    if (!ref.locations.length) {
      return false;
    }

    // we haven't actually written this module out
    if (ref.ignore) {
      return false;
    }
    return true;
  }

  runCommand(spinner, pkg) {
    var _this4 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var cmds = _this4.getInstallCommands(pkg);
      spinner.setPrefix(++_this4.installed, pkg.name);
      yield _this4.install(cmds, pkg, spinner);
    })();
  }

  // detect if there is a circularDependency in the dependency tree
  detectCircularDependencies(root, seenManifests, pkg) {
    var ref = pkg._reference;
    invariant(ref, 'expected reference');

    var deps = ref.dependencies;
    for (var dep of deps) {
      var pkgDep = this.resolver.getStrictResolvedPattern(dep);
      if (seenManifests.has(pkgDep)) {
        // there is a cycle but not with the root
        continue;
      }
      seenManifests.add(pkgDep);
      // found a dependency pointing to root
      if (pkgDep == root) {
        return true;
      }
      if (this.detectCircularDependencies(root, seenManifests, pkgDep)) {
        return true;
      }
    }
    return false;
  }

  // find the next package to be installed
  findInstallablePackage(workQueue, installed) {
    for (var pkg of workQueue) {
      var ref = pkg._reference;
      invariant(ref, 'expected reference');
      var deps = ref.dependencies;

      var dependenciesFulfilled = true;
      for (var dep of deps) {
        var pkgDep = this.resolver.getStrictResolvedPattern(dep);
        if (!installed.has(pkgDep)) {
          dependenciesFulfilled = false;
          break;
        }
      }

      // all dependencies are installed
      if (dependenciesFulfilled) {
        return pkg;
      }

      // detect circular dependency, mark this pkg as installable to break the circle
      if (this.detectCircularDependencies(pkg, new Set(), pkg)) {
        return pkg;
      }
    }
    return null;
  }

  worker(
    spinner,
    workQueue,
    installed,
    waitQueue
  ) {
    var _this5 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      while (workQueue.size > 0) {
        // find a installable package
        var pkg = _this5.findInstallablePackage(workQueue, installed);

        // can't find a package to install, register into waitQueue
        if (pkg == null) {
          spinner.clear();
          yield new Promise(resolve => waitQueue.add(resolve));
          continue;
        }

        // found a package to install
        workQueue.delete(pkg);
        if (_this5.packageCanBeInstalled(pkg)) {
          yield _this5.runCommand(spinner, pkg);
        }
        installed.add(pkg);
        for (var workerResolve of waitQueue) {
          workerResolve();
        }
        waitQueue.clear();
      }
    })();
  }

  init(seedPatterns) {
    var _this6 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var workQueue = new Set();
      var installed = new Set();
      var pkgs = _this6.resolver.getTopologicalManifests(seedPatterns);
      var installablePkgs = 0;
      // A map to keep track of what files exist before installation
      var beforeFilesMap = new Map();
      for (var pkg of pkgs) {
        if (_this6.packageCanBeInstalled(pkg)) {
          var ref = pkg._reference;
          invariant(ref, 'expected reference');
          yield Promise.all(
            ref.locations.map(/*#__PURE__*/ (function() {
              var _ref5 = (0, _asyncToGenerator2.default)(function* (loc) {
                beforeFilesMap.set(loc, yield _this6.walk(loc));
                installablePkgs += 1;
              });

              return function() {
                return _ref5.apply(this, arguments);
              };
            })())
          );
        }
        workQueue.add(pkg);
      }

      var set = _this6.reporter.activitySet(installablePkgs, Math.min(installablePkgs, _this6.config.childConcurrency));

      // waitQueue acts like a semaphore to allow workers to register to be notified
      // when there are more work added to the work queue
      var waitQueue = new Set();
      yield Promise.all(set.spinners.map(spinner => _this6.worker(spinner, workQueue, installed, waitQueue)));
      // generate built package as prebuilt one for offline mirror
      var offlineMirrorPath = _this6.config.getOfflineMirrorPath();
      if (_this6.config.packBuiltPackages && offlineMirrorPath) {
        var _loop2 = function* (_pkg) {
          if (_this6.packageCanBeInstalled(_pkg)) {
            var prebuiltPath = path.join(offlineMirrorPath, 'prebuilt');
            yield fsUtil.mkdirp(prebuiltPath);
            var prebuiltFilename = (0, _packageNameUtils.getPlatformSpecificPackageFilename)(_pkg);
            prebuiltPath = path.join(prebuiltPath, prebuiltFilename + '.tgz');
            var _ref6 = _pkg._reference;
            invariant(_ref6, 'expected reference');
            var builtPackagePaths = _ref6.locations;

            yield Promise.all(
              builtPackagePaths.map(/*#__PURE__*/ (function() {
                var _ref7 = (0, _asyncToGenerator2.default)(function* (builtPackagePath) {
                  // don't use pack command, we want to avoid the file filters logic
                  var stream = yield (0, _pack.packWithIgnoreAndHeaders)(builtPackagePath);

                  var hash = yield new Promise((resolve, reject) => {
                    var validateStream = new crypto.HashStream();
                    stream
                      .pipe(validateStream)
                      .pipe(fs.createWriteStream(prebuiltPath))
                      .on('error', reject)
                      .on('close', () => resolve(validateStream.getHash()));
                  });
                  _pkg.prebuiltVariants = _pkg.prebuiltVariants || {};
                  _pkg.prebuiltVariants[prebuiltFilename] = hash;
                });

                return function() {
                  return _ref7.apply(this, arguments);
                };
              })())
            );
          }
        };
        for (var _pkg of pkgs) {
          yield* _loop2(_pkg);
        }
      } else {
        // cache all build artifacts
        var _loop3 = function* (_pkg2) {
          if (_this6.packageCanBeInstalled(_pkg2)) {
            var _ref8 = _pkg2._reference;
            invariant(_ref8, 'expected reference');
            var beforeFiles = _ref8.locations.map(loc => beforeFilesMap.get(loc));
            yield Promise.all(
              beforeFiles.map(/*#__PURE__*/ (function() {
                var _ref9 = (0, _asyncToGenerator2.default)(function* (b, index) {
                  invariant(b, 'files before installation should always be recorded');
                  yield _this6.saveBuildArtifacts(_ref8.locations[index], _pkg2, b, set.spinners[0]);
                });

                return function() {
                  return _ref9.apply(this, arguments);
                };
              })())
            );
          }
        };
        for (var _pkg2 of pkgs) {
          yield* _loop3(_pkg2);
        }
      }

      set.end();
    })();
  }
}
exports.default = PackageInstallScripts;
