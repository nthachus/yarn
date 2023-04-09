'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
exports.linkBin = linkBin;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _packageHoister = _interopRequireDefault(require('./package-hoister.js'));
var constants = _interopRequireWildcard(require('./constants.js'));
var promise = _interopRequireWildcard(require('./util/promise.js'));
var _normalizePattern2 = require('./util/normalize-pattern.js');
var _misc = require('./util/misc.js');
var fs = _interopRequireWildcard(require('./util/fs.js'));
var _mutex = _interopRequireDefault(require('./util/mutex.js'));
var _semver = require('./util/semver.js');
var _workspaceLayout = _interopRequireDefault(require('./workspace-layout.js'));

var invariant = require('invariant');
var cmdShim = require('@zkochan/cmd-shim');
var path = require('path');
var semver = require('semver');
// Concurrency for creating bin links disabled because of the issue #1961
var linkBinConcurrency = 1;

function linkBin() {
  return _linkBin.apply(this, arguments);
}
function _linkBin() {
  _linkBin = (0, _asyncToGenerator2.default)(function* (src, dest) {
    if (process.platform === 'win32') {
      var unlockMutex = yield (0, _mutex.default)(src);
      try {
        yield cmdShim(src, dest, {createPwshFile: false});
      } finally {
        unlockMutex();
      }
    } else {
      yield fs.mkdirp(path.dirname(dest));
      yield fs.symlink(src, dest);
      yield fs.chmod(dest, '755');
    }
  });

  return _linkBin.apply(this, arguments);
}

class PackageLinker {
  constructor(config, resolver) {
    this._treeHash = void 0;

    this.resolver = resolver;
    this.reporter = config.reporter;
    this.config = config;
    this.artifacts = {};
    this.topLevelBinLinking = true;
    this.unplugged = [];
  }

  setArtifacts(artifacts) {
    this.artifacts = artifacts;
  }

  setTopLevelBinLinking(topLevelBinLinking) {
    this.topLevelBinLinking = topLevelBinLinking;
  }

  linkSelfDependencies(
    pkg,
    pkgLoc,
    targetBinLoc,
    override
  ) {
    return (0, _asyncToGenerator2.default)(function* () {
      if (override === void 0) override = false;
      targetBinLoc = path.join(targetBinLoc, '.bin');
      yield fs.mkdirp(targetBinLoc);
      targetBinLoc = yield fs.realpath(targetBinLoc);
      pkgLoc = yield fs.realpath(pkgLoc);
      for (var _ref of (0, _misc.entries)(pkg.bin)) {
        var scriptName = _ref[0], scriptCmd = _ref[1];
        var dest = path.join(targetBinLoc, scriptName);
        var src = path.join(pkgLoc, scriptCmd);
        if (!(yield fs.exists(src))) {
          if (!override) {
            // TODO maybe throw an error
            continue;
          }
        }
        yield linkBin(src, dest);
      }
    })();
  }

  linkBinDependencies(pkg, dir) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var deps = [];

      var ref = pkg._reference;
      invariant(ref, 'Package reference is missing');

      var remote = pkg._remote;
      invariant(remote, 'Package remote is missing');

      // link up `bin scripts` in `dependencies`
      for (var pattern of ref.dependencies) {
        var dep = _this.resolver.getStrictResolvedPattern(pattern);
        if (
          // Missing locations means not installed inside node_modules
          dep._reference &&
          dep._reference.locations.length &&
          dep.bin &&
          Object.keys(dep.bin).length
        ) {
          var loc = yield _this.findNearestInstalledVersionOfPackage(dep, dir);
          deps.push({dep, loc});
        }
      }

      // link up the `bin` scripts in bundled dependencies
      if (pkg.bundleDependencies) {
        var _loop = function* (depName) {
          var locs = ref.locations.map(loc => path.join(loc, _this.config.getFolder(pkg), depName));
          try {
            var _dep = yield _this.config.readManifest(locs[0], remote.registry); //all of them should be the same

            if (_dep.bin && Object.keys(_dep.bin).length) {
              deps.push.apply(deps, locs.map(loc => ({dep: _dep, loc})));
            }
          } catch (ex) {
            if (ex.code !== 'ENOENT') {
              throw ex;
            }
            // intentionally ignoring ENOENT error.
            // bundledDependency either does not exist or does not contain a package.json
          }
        };
        for (var depName of pkg.bundleDependencies) {
          yield* _loop(depName);
        }
      }

      // no deps to link
      if (!deps.length) {
        return;
      }

      // write the executables
      for (var _ref2 of deps) {
        var _dep2 = _ref2.dep, _loc = _ref2.loc;
        if (_dep2._reference && _dep2._reference.locations.length) {
          invariant(!_dep2._reference.isPlugnplay, "Plug'n'play packages should not be referenced here");
          yield _this.linkSelfDependencies(_dep2, _loc, dir);
        }
      }
    })();
  }

  //find the installation location of ref that would be used in binLoc based on node module resolution
  findNearestInstalledVersionOfPackage(pkg, binLoc) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var ref = pkg._reference;
      invariant(ref, 'expected pkg reference for ' + pkg.name);
      var moduleFolder = _this2.config.getFolder(pkg);
      yield fs.mkdirp(binLoc);
      var realBinLoc = yield fs.realpath(binLoc);

      var allLocations = [].concat(ref.locations);
      var realLocations = yield Promise.all(ref.locations.map(loc => fs.realpath(loc)));
      realLocations.forEach(loc => allLocations.indexOf(loc) !== -1 || allLocations.push(loc));

      var locationBinLocPairs = allLocations.map(loc => [loc, binLoc]);
      if (binLoc !== realBinLoc) {
        locationBinLocPairs.push.apply(locationBinLocPairs, allLocations.map(loc => [loc, realBinLoc]));
      }

      var distancePairs = locationBinLocPairs.map(_ref3 => {
        var loc = _ref3[0], curBinLoc = _ref3[1];
        var distance = 0;
        var curLoc = curBinLoc;
        var notFound = false;

        while (path.join(curLoc, ref.name) !== loc && path.join(curLoc, moduleFolder, ref.name) !== loc) {
          var next = path.dirname(curLoc);
          if (curLoc === next) {
            notFound = true;
            break;
          }

          distance++;
          curLoc = next;
        }
        return notFound ? null : [loc, distance];
      });

      //remove items where path was not found
      var filteredDistancePairs = distancePairs.filter(d => d);
      //filteredDistancePairs;

      invariant(filteredDistancePairs.length > 0, `could not find a copy of ${pkg.name} to link in ${binLoc}`);

      //get smallest distance from package location
      var minItem = filteredDistancePairs.reduce((min, cur) => {
        return cur[1] < min[1] ? cur : min;
      });

      invariant(minItem[1] >= 0, 'could not find a target for bin dir of ' + minItem.toString());
      return minItem[0];
    })();
  }

  getFlatHoistedTree(
    patterns,
    workspaceLayout,
    _temp
  ) {
    var _ref4 = _temp === void 0 ? {} : _temp, ignoreOptional = _ref4.ignoreOptional;
    var hoister = new _packageHoister.default(this.config, this.resolver, {ignoreOptional, workspaceLayout});
    hoister.seed(patterns);
    if (this.config.focus) {
      hoister.markShallowWorkspaceEntries();
    }
    return hoister.init();
  }

  copyModules(
    patterns,
    workspaceLayout,
    _temp2
  ) {
    var _this3 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _ref5 = _temp2 === void 0 ? {} : _temp2, linkDuplicates = _ref5.linkDuplicates, ignoreOptional = _ref5.ignoreOptional;
      var flatTree = _this3.getFlatHoistedTree(patterns, workspaceLayout, {ignoreOptional});
      // sorted tree makes file creation and copying not to interfere with each other
      flatTree = flatTree.sort(function(dep1, dep2) {
        return dep1[0].localeCompare(dep2[0]);
      });

      // list of artifacts in modules to remove from extraneous removal
      var artifactFiles = [];

      var copyQueue = new Map();
      var hardlinkQueue = new Map();
      var hardlinksEnabled = linkDuplicates && (yield fs.hardlinksWork(_this3.config.cwd));

      var copiedSrcs = new Map();
      var symlinkPaths = new Map();
      var _loop2 = function* (_ref6) {
        var folder = _ref6[0], _ref6$ = _ref6[1], pkg = _ref6$.pkg, loc = _ref6$.loc, isShallow = _ref6$.isShallow;
        var remote = pkg._remote || {type: ''};
        var ref = pkg._reference;
        var dest = folder;
        invariant(ref, 'expected package reference');

        var src = loc;
        var type = '';
        if (remote.type === 'link') {
          // replace package source from incorrect cache location (workspaces and link: are not cached)
          // with a symlink source
          src = remote.reference;
          type = 'symlink';
        } else if (workspaceLayout && remote.type === 'workspace' && !isShallow) {
          src = remote.reference;
          type = 'symlink';
          // to get real path for non hoisted dependencies
          symlinkPaths.set(dest, src);
        } else {
          // backwards compatibility: get build artifacts from metadata
          // does not apply to symlinked dependencies
          var metadata = yield _this3.config.readPackageMetadata(src);
          for (var file of metadata.artifacts) {
            artifactFiles.push(path.join(dest, file));
          }
        }

        for (var _ref13 of symlinkPaths.entries()) {
          var symlink = _ref13[0], realpath = _ref13[1];
          if (dest.indexOf(symlink + path.sep) === 0) {
            // after hoisting we end up with this structure
            // root/node_modules/workspace-package(symlink)/node_modules/package-a
            // fs.copy operations can't copy files through a symlink, so all the paths under workspace-package
            // need to be replaced with a real path, except for the symlink root/node_modules/workspace-package
            dest = dest.replace(symlink, realpath);
          }
        }

        if (_this3.config.plugnplayEnabled) {
          ref.isPlugnplay = true;
          if (yield _this3._isUnplugged(pkg, ref)) {
            dest = _this3.config.generatePackageUnpluggedPath(ref);

            // We don't skip the copy if the unplugged package isn't materialized yet
            if (yield fs.exists(dest)) {
              ref.addLocation(dest);
              return 'continue';
            }
          } else {
            ref.addLocation(src);
            return 'continue';
          }
        }

        ref.addLocation(dest);

        var integrityArtifacts = _this3.artifacts[`${pkg.name}@${pkg.version}`];
        if (integrityArtifacts) {
          for (var _file of integrityArtifacts) {
            artifactFiles.push(path.join(dest, _file));
          }
        }

        var copiedDest = copiedSrcs.get(src);
        if (!copiedDest) {
          // no point to hardlink to a symlink
          if (hardlinksEnabled && type !== 'symlink') {
            copiedSrcs.set(src, dest);
          }
          copyQueue.set(dest, {
            src,
            dest,
            type,
            onFresh() {
              if (ref) {
                ref.setFresh(true);
              }
            },
          });
        } else {
          hardlinkQueue.set(dest, {
            src: copiedDest,
            dest,
            onFresh() {
              if (ref) {
                ref.setFresh(true);
              }
            },
          });
        }
      };
      for (var _ref6 of flatTree) {
        var _ret = yield* _loop2(_ref6);
        if (_ret === 'continue') continue;
      }

      var possibleExtraneous = new Set();
      var scopedPaths = new Set();

      var findExtraneousFiles = /*#__PURE__*/ (function() {
        var _ref7 = (0, _asyncToGenerator2.default)(function* (basePath) {
          for (var folder of _this3.config.registryFolders) {
            var loc = path.resolve(basePath, folder);

            if (yield fs.exists(loc)) {
              var files = yield fs.readdir(loc);

              for (var file of files) {
                var filepath = path.join(loc, file);

                // it's a scope, not a package
                if (file[0] === '@') {
                  scopedPaths.add(filepath);

                  for (var subfile of yield fs.readdir(filepath)) {
                    possibleExtraneous.add(path.join(filepath, subfile));
                  }
                } else if (file[0] === '.' && file !== '.bin') {
                  if (!(yield fs.lstat(filepath)).isDirectory()) {
                    possibleExtraneous.add(filepath);
                  }
                } else {
                  possibleExtraneous.add(filepath);
                }
              }
            }
          }
        });

        return function findExtraneousFiles() {
          return _ref7.apply(this, arguments);
        };
      })();

      yield findExtraneousFiles(_this3.config.lockfileFolder);
      if (workspaceLayout) {
        for (var workspaceName of Object.keys(workspaceLayout.workspaces)) {
          yield findExtraneousFiles(workspaceLayout.workspaces[workspaceName].loc);
        }
      }

      // If an Extraneous is an entry created via "yarn link", we prevent it from being overwritten.
      // Unfortunately, the only way we can know if they have been created this way is to check if they
      // are symlinks - problem is that it then conflicts with the newly introduced "link:" protocol,
      // which also creates symlinks :( a somewhat weak fix is to check if the symlink target is registered
      // inside the linkFolder, in which case we assume it has been created via "yarn link". Otherwise, we
      // assume it's a link:-managed dependency, and overwrite it as usual.
      var linkTargets = new Map();

      var linkedModules;
      try {
        linkedModules = yield fs.readdir(_this3.config.linkFolder);
      } catch (err) {
        if (err.code === 'ENOENT') {
          linkedModules = [];
        } else {
          throw err;
        }
      }

      // TODO: Consolidate this logic with `this.config.linkedModules` logic
      for (var entry of linkedModules) {
        var entryPath = path.join(_this3.config.linkFolder, entry);
        var stat = yield fs.lstat(entryPath);

        if (stat.isSymbolicLink()) {
          try {
            var entryTarget = yield fs.realpath(entryPath);
            linkTargets.set(entry, entryTarget);
          } catch (err) {
            _this3.reporter.warn(_this3.reporter.lang('linkTargetMissing', entry));
            yield fs.unlink(entryPath);
          }
        } else if (stat.isDirectory() && entry[0] === '@') {
          // if the entry is directory beginning with '@', then we're dealing with a package scope, which
          // means we must iterate inside to retrieve the package names it contains
          var scopeName = entry;

          for (var entry2 of yield fs.readdir(entryPath)) {
            var entryPath2 = path.join(entryPath, entry2);
            var stat2 = yield fs.lstat(entryPath2);

            if (stat2.isSymbolicLink()) {
              var packageName = `${scopeName}/${entry2}`;
              try {
                var _entryTarget = yield fs.realpath(entryPath2);
                linkTargets.set(packageName, _entryTarget);
              } catch (err) {
                _this3.reporter.warn(_this3.reporter.lang('linkTargetMissing', packageName));
                yield fs.unlink(entryPath2);
              }
            }
          }
        }
      }

      for (var loc of possibleExtraneous) {
        var _packageName = path.basename(loc);
        var _scopeName = path.basename(path.dirname(loc));

        if (_scopeName[0] === `@`) {
          _packageName = `${_scopeName}/${_packageName}`;
        }

        if (
          (yield fs.lstat(loc)).isSymbolicLink() &&
          linkTargets.has(_packageName) &&
          linkTargets.get(_packageName) === (yield fs.realpath(loc))
        ) {
          possibleExtraneous.delete(loc);
          copyQueue.delete(loc);
        }
      }

      //
      var tick;
      yield fs.copyBulk(Array.from(copyQueue.values()), _this3.reporter, {
        possibleExtraneous,
        artifactFiles,

        ignoreBasenames: [constants.METADATA_FILENAME, constants.TARBALL_FILENAME, '.bin'],

        onStart: (num) => {
          tick = _this3.reporter.progress(num);
        },

        onProgress(src) {
          if (tick) {
            tick();
          }
        },
      });

      yield fs.hardlinkBulk(Array.from(hardlinkQueue.values()), _this3.reporter, {
        possibleExtraneous,
        artifactFiles,

        onStart: (num) => {
          tick = _this3.reporter.progress(num);
        },

        onProgress(src) {
          if (tick) {
            tick();
          }
        },
      });

      // remove all extraneous files that weren't in the tree
      for (var _loc2 of possibleExtraneous) {
        _this3.reporter.verbose(_this3.reporter.lang('verboseFileRemoveExtraneous', _loc2));
        yield fs.unlink(_loc2);
      }

      // remove any empty scoped directories
      for (var scopedPath of scopedPaths) {
        var files = yield fs.readdir(scopedPath);
        if (files.length === 0) {
          yield fs.unlink(scopedPath);
        }
      }

      // create binary links
      if (_this3.config.getOption('bin-links') && _this3.config.binLinks !== false) {
        var topLevelDependencies = _this3.determineTopLevelBinLinkOrder(flatTree);
        var tickBin = _this3.reporter.progress(flatTree.length + topLevelDependencies.length);

        // create links in transient dependencies
        yield promise.queue(
          flatTree,
          /*#__PURE__*/ (function() {
            var _ref9 = (0, _asyncToGenerator2.default)(function* (_ref8) {
              var dest = _ref8[0], _ref8$ = _ref8[1], pkg = _ref8$.pkg, isNohoist = _ref8$.isNohoist, parts = _ref8$.parts;
              if (pkg._reference && pkg._reference.locations.length && !pkg._reference.isPlugnplay) {
                var binLoc = path.join(dest, _this3.config.getFolder(pkg));
                yield _this3.linkBinDependencies(pkg, binLoc);
                if (isNohoist) {
                  // if nohoist, we need to override the binLink to point to the local destination
                  var parentBinLoc = _this3.getParentBinLoc(parts, flatTree);
                  yield _this3.linkSelfDependencies(pkg, dest, parentBinLoc, true);
                }
                tickBin();
              }
              tickBin();
            });

            return function() {
              return _ref9.apply(this, arguments);
            };
          })(),
          linkBinConcurrency
        );

        // create links at top level for all dependencies.
        yield promise.queue(
          topLevelDependencies,
          /*#__PURE__*/ (function() {
            var _ref11 = (0, _asyncToGenerator2.default)(function* (_ref10) {
              var dest = _ref10[0], pkg = _ref10[1].pkg;
              if (
                pkg._reference &&
                pkg._reference.locations.length &&
                !pkg._reference.isPlugnplay &&
                pkg.bin &&
                Object.keys(pkg.bin).length
              ) {
                var binLoc;
                if (_this3.config.modulesFolder) {
                  binLoc = path.join(_this3.config.modulesFolder);
                } else {
                  binLoc = path.join(_this3.config.lockfileFolder, _this3.config.getFolder(pkg));
                }
                yield _this3.linkSelfDependencies(pkg, dest, binLoc);
              }
              tickBin();
            });

            return function() {
              return _ref11.apply(this, arguments);
            };
          })(),
          linkBinConcurrency
        );
      }

      for (var _ref12 of flatTree) {
        var pkg = _ref12[1].pkg;
        yield _this3._warnForMissingBundledDependencies(pkg);
      }
    })();
  }

  _buildTreeHash(flatTree) {
    var hash = new Map();
    for (var _ref14 of flatTree) {
      var dest = _ref14[0], hoistManifest = _ref14[1];
      var key = hoistManifest.parts.join('#');
      hash.set(key, [dest, hoistManifest]);
    }
    this._treeHash = hash;
    return hash;
  }

  getParentBinLoc(parts, flatTree) {
    var hash = this._treeHash || this._buildTreeHash(flatTree);
    var parent = parts.slice(0, -1).join('#');
    var tuple = hash.get(parent);
    if (!tuple) {
      throw new Error(`failed to get parent '${parent}' binLoc`);
    }
    var dest = tuple[0], hoistManifest = tuple[1];
    var parentBinLoc = path.join(dest, this.config.getFolder(hoistManifest.pkg));

    return parentBinLoc;
  }

  determineTopLevelBinLinkOrder(flatTree) {
    var linksToCreate = new Map();
    for (var _ref15 of flatTree) {
      var dest = _ref15[0], hoistManifest = _ref15[1];
      var pkg = hoistManifest.pkg, isDirectRequire = hoistManifest.isDirectRequire, isNohoist = hoistManifest.isNohoist, isShallow = hoistManifest.isShallow;
      var name = pkg.name;

      // nohoist and shallow packages should not be linked at topLevel bin
      if (!isNohoist && !isShallow && (isDirectRequire || (this.topLevelBinLinking && !linksToCreate.has(name)))) {
        linksToCreate.set(name, [dest, hoistManifest]);
      }
    }

    // Sort the array so that direct dependencies will be linked last.
    // Bin links are overwritten if they already exist, so this will cause direct deps to take precedence.
    // If someone finds this to be incorrect later, you could also consider sorting descending by
    //   `linkToCreate.level` which is the dependency tree depth. Direct deps will have level 0 and transitive
    //   deps will have level > 0.
    var transientBins = [];
    var topLevelBins = [];
    for (var linkToCreate of Array.from(linksToCreate.values())) {
      if (linkToCreate[1].isDirectRequire) {
        topLevelBins.push(linkToCreate);
      } else {
        transientBins.push(linkToCreate);
      }
    }
    return [].concat(transientBins, topLevelBins);
  }

  resolvePeerModules() {
    var _this4 = this;
    var _loop3 = function(pkg) {
      var peerDeps = pkg.peerDependencies;
      var peerDepsMeta = pkg.peerDependenciesMeta;

      if (!peerDeps) {
        return 'continue';
      }

      var ref = pkg._reference;
      invariant(ref, 'Package reference is missing');

      // TODO: We are taking the "shortest" ref tree but there may be multiple ref trees with the same length
      var refTree = ref.requests.map(req => req.parentNames).sort((arr1, arr2) => arr1.length - arr2.length)[0];

      var getLevelDistance = pkgRef => {
        var minDistance = Infinity;
        for (var req of pkgRef.requests) {
          var distance = refTree.length - req.parentNames.length;

          if (distance >= 0 && distance < minDistance && req.parentNames.every((name, idx) => name === refTree[idx])) {
            minDistance = distance;
          }
        }

        return minDistance;
      };

      for (var peerDepName in peerDeps) {
        var range = peerDeps[peerDepName];
        var meta = peerDepsMeta && peerDepsMeta[peerDepName];

        var isOptional = !!(meta && meta.optional);

        var peerPkgs = _this4.resolver.getAllInfoForPackageName(peerDepName);

        var peerError = 'unmetPeer';
        var resolvedLevelDistance = Infinity;
        var resolvedPeerPkg = void 0;
        for (var peerPkg of peerPkgs) {
          var peerPkgRef = peerPkg._reference;
          if (!(peerPkgRef && peerPkgRef.patterns)) {
            continue;
          }
          var levelDistance = getLevelDistance(peerPkgRef);
          if (isFinite(levelDistance) && levelDistance < resolvedLevelDistance) {
            if (_this4._satisfiesPeerDependency(range, peerPkgRef.version)) {
              resolvedLevelDistance = levelDistance;
              resolvedPeerPkg = peerPkgRef;
            } else {
              peerError = 'incorrectPeer';
            }
          }
        }

        if (resolvedPeerPkg) {
          ref.addDependencies(resolvedPeerPkg.patterns);
          _this4.reporter.verbose(
            _this4.reporter.lang(
              'selectedPeer',
              `${pkg.name}@${pkg.version}`,
              `${peerDepName}@${resolvedPeerPkg.version}`,
              resolvedPeerPkg.level
            )
          );
        } else if (!isOptional) {
          _this4.reporter.warn(
            _this4.reporter.lang(
              peerError,
              `${refTree.join(' > ')} > ${pkg.name}@${pkg.version}`,
              `${peerDepName}@${range}`
            )
          );
        }
      }
    };
    for (var pkg of this.resolver.getManifests()) {
      var _ret2 = _loop3(pkg);
      if (_ret2 === 'continue') continue;
    }
  }

  _satisfiesPeerDependency(range, version) {
    return range === '*' || (0, _semver.satisfiesWithPrereleases)(version, range, this.config.looseSemver);
  }

  _warnForMissingBundledDependencies(pkg) {
    var _this5 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var ref = pkg._reference;
      invariant(ref, 'missing package ref ' + pkg.name);

      if (pkg.bundleDependencies) {
        var _loop4 = function* (depName) {
          var locs = ref.locations.map(loc => path.join(loc, _this5.config.getFolder(pkg), depName));
          var locsExist = yield Promise.all(locs.map(loc => fs.exists(loc)));
          if (locsExist.some(e => !e)) {
            //if any of the locs do not exist
            var pkgHuman = `${pkg.name}@${pkg.version}`;
            _this5.reporter.warn(_this5.reporter.lang('missingBundledDependency', pkgHuman, depName));
          }
        };
        for (var depName of pkg.bundleDependencies) {
          yield* _loop4(depName);
        }
      }
    })();
  }

  _isUnplugged(pkg, ref) {
    var _this6 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      // If an unplugged folder exists for the specified package, we simply use it
      if (yield fs.exists(_this6.config.generatePackageUnpluggedPath(ref))) {
        return true;
      }

      // If the package has a postinstall script, we also unplug it (otherwise they would run into the cache)
      if (
        !_this6.config.ignoreScripts &&
        pkg.scripts &&
        (pkg.scripts.preinstall || pkg.scripts.install || pkg.scripts.postinstall)
      ) {
        return true;
      }

      // Check whether the user explicitly requested for the package to be unplugged
      return _this6.unplugged.some(patternToUnplug => {
        var _normalizePattern = (0, _normalizePattern2.normalizePattern)(patternToUnplug), name = _normalizePattern.name, range = _normalizePattern.range, hasVersion = _normalizePattern.hasVersion;
        var satisfiesSemver = hasVersion ? semver.satisfies(ref.version, range) : true;
        return name === ref.name && satisfiesSemver;
      });
    })();
  }

  init(
    patterns,
    workspaceLayout,
    _temp3
  ) {
    var _this7 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var _ref16 = _temp3 === void 0 ? {} : _temp3, linkDuplicates = _ref16.linkDuplicates, ignoreOptional = _ref16.ignoreOptional;
      _this7.resolvePeerModules();
      yield _this7.copyModules(patterns, workspaceLayout, {linkDuplicates, ignoreOptional});

      if (!_this7.config.plugnplayEnabled) {
        yield fs.unlink(`${_this7.config.lockfileFolder}/${constants.PNP_FILENAME}`);
      }
    })();
  }
}
exports.default = PackageLinker;
