'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.generatePnpMap = generatePnpMap;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _generatePnpMapApiTpl = _interopRequireDefault(require('./generate-pnp-map-api.tpl.js'));
var fs = _interopRequireWildcard(require('./fs.js'));

var crypto = require('crypto');
var invariant = require('invariant');
var path = require('path');

var backwardSlashRegExp = /\\/g;

var OFFLINE_CACHE_EXTENSION = `.zip`;

function generateMaps(packageInformationStores, blacklistedLocations) {
  var code = ``;

  // Bake the information stores into our generated code
  code += `let packageInformationStores = new Map([\n`;
  for (var _ref of packageInformationStores) {
    var packageName = _ref[0], packageInformationStore = _ref[1];
    code += `  [${JSON.stringify(packageName)}, new Map([\n`;
    for (var _ref2 of packageInformationStore) {
      var packageReference = _ref2[0], _ref2$ = _ref2[1], packageLocation = _ref2$.packageLocation, packageDependencies = _ref2$.packageDependencies;
      code += `    [${JSON.stringify(packageReference)}, {\n`;
      code += `      packageLocation: path.resolve(__dirname, ${JSON.stringify(packageLocation)}),\n`;
      code += `      packageDependencies: new Map([\n`;
      for (var _ref3 of packageDependencies.entries()) {
        var dependencyName = _ref3[0], dependencyReference = _ref3[1];
        code += `        [${JSON.stringify(dependencyName)}, ${JSON.stringify(dependencyReference)}],\n`;
      }
      code += `      ]),\n`;
      code += `    }],\n`;
    }
    code += `  ])],\n`;
  }
  code += `]);\n`;

  code += `\n`;

  // Also bake an inverse map that will allow us to find the package information based on the path
  code += `let locatorsByLocations = new Map([\n`;
  for (var blacklistedLocation of blacklistedLocations) {
    code += `  [${JSON.stringify(blacklistedLocation)}, blacklistedLocator],\n`;
  }
  for (var _ref4 of packageInformationStores) {
    var _packageName = _ref4[0], _packageInformationStore = _ref4[1];
    for (var _ref5 of _packageInformationStore) {
      var _packageReference = _ref5[0], _packageLocation = _ref5[1].packageLocation;
      if (_packageName !== null) {
        code += `  [${JSON.stringify(_packageLocation)}, ${JSON.stringify({
          name: _packageName,
          reference: _packageReference,
        })}],\n`;
      } else {
        code += `  [${JSON.stringify(_packageLocation)}, topLevelLocator],\n`;
      }
    }
  }
  code += `]);\n`;

  return code;
}

function generateFindPackageLocator(packageInformationStores) {
  var code = ``;

  // We get the list of each string length we'll need to check in order to find the current package context
  var lengths = new Map();

  for (var packageInformationStore of packageInformationStores.values()) {
    for (var _ref6 of packageInformationStore.values()) {
      var packageLocation = _ref6.packageLocation;
      if (packageLocation === null) {
        continue;
      }

      var length = packageLocation.length;
      var count = (lengths.get(length) || 0) + 1;

      lengths.set(length, count);
    }
  }

  // We must try the larger lengths before the smaller ones, because smaller ones might also match the longest ones
  // (for instance, /project/path will match /project/path/.pnp/global/node_modules/pnp-cf5f9c17b8f8db)
  var sortedLengths = Array.from(lengths.entries()).sort((a, b) => {
    return b[0] - a[0];
  });

  // Generate a function that, given a file path, returns the associated package name
  code += `exports.findPackageLocator = function findPackageLocator(location) {\n`;
  code += `  let relativeLocation = normalizePath(path.relative(__dirname, location));\n`;
  code += `\n`;
  code += `  if (!relativeLocation.match(isStrictRegExp))\n`;
  code += `    relativeLocation = \`./\${relativeLocation}\`;\n`;
  code += `\n`;
  code += `  if (location.match(isDirRegExp) && relativeLocation.charAt(relativeLocation.length - 1) !== '/')\n`;
  code += `    relativeLocation = \`\${relativeLocation}/\`;\n`;
  code += `\n`;
  code += `  let match;\n`;

  for (var _ref7 of sortedLengths) {
    var _length = _ref7[0];
    code += `\n`;
    code += `  if (relativeLocation.length >= ${_length} && relativeLocation[${_length - 1}] === '/')\n`;
    code += `    if (match = locatorsByLocations.get(relativeLocation.substr(0, ${_length})))\n`;
    code += `      return blacklistCheck(match);\n`;
  }

  code += `\n`;
  code += `  return null;\n`;
  code += `};\n`;

  return code;
}

function getPackageInformationStores() {
  return _getPackageInformationStores.apply(this, arguments);
}
function _getPackageInformationStores() {
  _getPackageInformationStores = (0, _asyncToGenerator2.default)(function* (
    config,
    seedPatterns,
    _ref8
  ) {
    var resolver = _ref8.resolver, reporter = _ref8.reporter, targetPath = _ref8.targetPath, workspaceLayout = _ref8.workspaceLayout;
    var targetDirectory = path.dirname(targetPath);
    var offlineCacheFolder = config.offlineCacheFolder;

    var packageInformationStores = new Map();
    var blacklistedLocations = new Set();

    var getCachePath = (fsPath) => {
      var cacheRelativePath = normalizePath(path.relative(config.cacheFolder, fsPath));

      // if fsPath is not inside cacheRelativePath, we just skip it
      if (cacheRelativePath.match(/^\.\.\//)) {
        return null;
      }

      return cacheRelativePath;
    };

    var resolveOfflineCacheFolder = (fsPath) => {
      if (!offlineCacheFolder) {
        return fsPath;
      }

      var cacheRelativePath = getCachePath(fsPath);

      // if fsPath is not inside the cache, we shouldn't replace it (workspace)
      if (!cacheRelativePath) {
        return fsPath;
      }

      var components = cacheRelativePath.split(/\//g);
      var cacheEntry = components[0], internalPath = components.slice(1);

      return path.resolve(offlineCacheFolder, `${cacheEntry}${OFFLINE_CACHE_EXTENSION}`, internalPath.join('/'));
    };

    var normalizePath = (fsPath) => {
      return process.platform === 'win32' ? fsPath.replace(backwardSlashRegExp, '/') : fsPath;
    };

    var normalizeDirectoryPath = (fsPath) => {
      var relativePath = normalizePath(path.relative(targetDirectory, resolveOfflineCacheFolder(fsPath)));

      if (!relativePath.match(/^\.{0,2}\//) && !path.isAbsolute(relativePath)) {
        relativePath = `./${relativePath}`;
      }

      return relativePath.replace(/\/?$/, '/');
    };

    var getHashFrom = (data) => {
      var hashGenerator = crypto.createHash('sha1');

      for (var datum of data) {
        hashGenerator.update(datum);
      }

      return hashGenerator.digest('hex');
    };

    var getResolverEntry = pattern => {
      var pkg = resolver.getStrictResolvedPattern(pattern);
      var ref = pkg._reference;

      if (!ref) {
        return null;
      }

      invariant(ref.locations.length <= 1, 'Must have at most one location (usually in the cache)');
      var loc = ref.locations[0];

      if (!loc) {
        return null;
      }

      return {pkg, ref, loc};
    };

    var visit = /*#__PURE__*/ (function() {
      var _ref10 = (0, _asyncToGenerator2.default)(function* (
        precomputedResolutions,
        seedPatterns,
        parentData
      ) {
        if (parentData === void 0) parentData = [];
        var resolutions = new Map(precomputedResolutions);
        var locations = new Map();

        // This first pass will compute the package reference of each of the given patterns
        // They will usually be the package version, but not always. We need to do this in a pre-process pass, because the
        // dependencies might depend on one another, so if we need to replace one of them, we need to compute it first
        var _loop = function* (pattern) {
          var entry = getResolverEntry(pattern);

          if (!entry) {
            return 'continue';
          }

          var pkg = entry.pkg, ref = entry.ref;
          var loc = entry.loc;

          var packageName = pkg.name;
          var packageReference = pkg.version;

          // If we have peer dependencies, then we generate a new virtual reference based on the parent one
          // We cannot generate this reference based on what those peer references resolve to, because they might not have
          // been computed yet (for example, consider the case where A has a peer dependency on B, and B a peer dependency
          // on A; it's valid, but it prevents us from computing A and B - and it's even worse with 3+ packages involved)
          var peerDependencies = new Set(Array.from(Object.keys(pkg.peerDependencies || {})));

          // As an optimization, we only setup virtual packages if their underlying packages are referenced multiple times
          // in the tree. This allow us to avoid having to create symlinks in the majority of cases
          if (peerDependencies.size > 0 && ref.requests.length > 1) {
            var hash = getHashFrom([].concat(parentData, [packageName, packageReference]));

            var symlinkSource;
            var symlinkFile;

            switch (ref.remote.type) {
              case 'workspace':
                {
                  symlinkSource = loc;
                  symlinkFile = path.resolve(config.lockfileFolder, '.pnp', 'workspaces', `pnp-${hash}`, packageName);

                  loc = symlinkFile;
                }
                break;

              default:
                {
                  var isFromCache = getCachePath(loc);

                  var hashName =
                    isFromCache && offlineCacheFolder ? `pnp-${hash}${OFFLINE_CACHE_EXTENSION}` : `pnp-${hash}`;
                  var newLoc = path.resolve(
                    config.lockfileFolder,
                    '.pnp',
                    'externals',
                    hashName,
                    'node_modules',
                    packageName
                  );

                  // The `node_modules/<pkgName>` part is already there when the package comes from the cache
                  if (isFromCache) {
                    var getBase = source => path.resolve(source, '../'.repeat(1 + packageName.split('/').length));
                    symlinkSource = resolveOfflineCacheFolder(getBase(loc));
                    symlinkFile = getBase(newLoc);
                  } else {
                    symlinkSource = loc;
                    symlinkFile = newLoc;
                  }

                  loc = newLoc;
                }
                break;
            }

            yield fs.mkdirp(path.dirname(symlinkFile));
            yield fs.symlink(symlinkSource, symlinkFile);

            packageReference = `pnp:${hash}`;

            // We blacklist this path so that we can print a nicer error message if someone tries to require it (it usually
            // means that they're using realpath on the return value of require.resolve)
            blacklistedLocations.add(normalizeDirectoryPath(loc));
          }

          // Now that we have the final reference, we need to store it
          resolutions.set(packageName, packageReference);
          locations.set(packageName, loc);
        };
        for (var pattern of seedPatterns) {
          var _ret = yield* _loop(pattern);
          if (_ret === 'continue') continue;
        }

        // Now that we have the final references, we can start the main loop, which will insert the packages into the store
        // if they aren't already there, and recurse over their own children
        var _loop2 = function* (_pattern) {
          var entry = getResolverEntry(_pattern);

          if (!entry) {
            return 'continue';
          }

          var pkg = entry.pkg, ref = entry.ref;

          var packageName = pkg.name;

          var packageReference = resolutions.get(packageName);
          invariant(packageReference, `Package reference should have been computed during the pre-pass`);

          var loc = locations.get(packageName);
          invariant(loc, `Package location should have been computed during the pre-pass`);

          // We can early exit if the package is already registered with the exact same name and reference, since even if
          // we might get slightly different dependencies (depending on how things were optimized), both sets are valid
          var packageInformationStore = packageInformationStores.get(packageName);

          if (!packageInformationStore) {
            packageInformationStore = new Map();
            packageInformationStores.set(packageName, packageInformationStore);
          }

          var packageInformation = packageInformationStore.get(packageReference);

          if (packageInformation) {
            return 'continue';
          }

          packageInformation = {
            packageLocation: normalizeDirectoryPath(loc),
            packageDependencies: new Map(),
          };

          // Split the dependencies between direct/peer - we will only recurse on the former
          var peerDependencies = new Set(Array.from(Object.keys(pkg.peerDependencies || {})));
          var directDependencies = ref.dependencies.filter(pattern => {
            var pkg = resolver.getStrictResolvedPattern(pattern);
            return !pkg || !peerDependencies.has(pkg.name);
          });

          // We inject the partial information in the store right now so that we won't cycle indefinitely
          packageInformationStore.set(packageReference, packageInformation);

          // We must inject the peer dependencies before iterating; one of our dependencies might have a peer dependency
          // on one of our peer dependencies, so it must be available from the start (we don't have to do that for direct
          // dependencies, because the "visit" function that will iterate over them will automatically add the to the
          // candidate resolutions as part of the first step, cf above)

          for (var dependencyName of peerDependencies) {
            var dependencyReference = resolutions.get(dependencyName);

            if (dependencyReference) {
              packageInformation.packageDependencies.set(dependencyName, dependencyReference);
            }
          }

          var childResolutions = yield visit(packageInformation.packageDependencies, directDependencies, [
            packageName,
            packageReference,
          ]);

          // We can now inject into our package the resolutions we got from the visit function
          for (var _ref11 of childResolutions.entries()) {
            var name = _ref11[0], reference = _ref11[1];
            packageInformation.packageDependencies.set(name, reference);
          }

          // Finally, unless a package depends on a previous version of itself (that would be weird but correct...), we
          // inject them an implicit dependency to themselves (so that they can require themselves)
          if (!packageInformation.packageDependencies.has(packageName)) {
            packageInformation.packageDependencies.set(packageName, packageReference);
          }
        };
        for (var _pattern of seedPatterns) {
          var _ret2 = yield* _loop2(_pattern);
          if (_ret2 === 'continue') continue;
        }

        return resolutions;
      });

      return function visit() {
        return _ref10.apply(this, arguments);
      };
    })();

    // If we have workspaces, we need to iterate over them all in order to add them to the map
    // This is because they might not be declared as dependencies of the top-level project (and with reason, since the
    // top-level package might depend on a different than the one provided in the workspaces - cf Babel, which depends
    // on an old version of itself in order to compile itself)
    if (workspaceLayout) {
      for (var name of Object.keys(workspaceLayout.workspaces)) {
        var pkg = workspaceLayout.workspaces[name].manifest;

        // Skip the aggregator, since it's essentially a duplicate of the top-level package that we'll iterate later on
        if (pkg.workspaces) {
          continue;
        }

        var ref = pkg._reference;
        invariant(ref, `Workspaces should have a reference`);

        invariant(ref.locations.length === 1, `Workspaces should have exactly one location`);
        var loc = ref.locations[0];
        invariant(loc, `Workspaces should have a location`);

        var packageInformationStore = packageInformationStores.get(name);

        if (!packageInformationStore) {
          packageInformationStore = new Map();
          packageInformationStores.set(name, packageInformationStore);
        }

        packageInformationStore.set(pkg.version, {
          packageLocation: normalizeDirectoryPath(loc),
          packageDependencies: yield visit(new Map(), ref.dependencies, [name, pkg.version]),
        });
      }
    }

    // Register the top-level package in our map
    // This will recurse on each of its dependencies as well.
    packageInformationStores.set(
      null,
      new Map([
        [
          null,
          {
            packageLocation: normalizeDirectoryPath(config.lockfileFolder),
            packageDependencies: yield visit(new Map(), seedPatterns),
          },
        ],
      ])
    );

    return [packageInformationStores, blacklistedLocations];
  });

  return _getPackageInformationStores.apply(this, arguments);
}

function generatePnpMap() {
  return _generatePnpMap.apply(this, arguments);
}
function _generatePnpMap() {
  _generatePnpMap = (0, _asyncToGenerator2.default)(function* (
    config,
    seedPatterns,
    _ref9
  ) {
    var resolver = _ref9.resolver, reporter = _ref9.reporter, workspaceLayout = _ref9.workspaceLayout, targetPath = _ref9.targetPath;
    var _yield$getPackageInfo = yield getPackageInformationStores(config, seedPatterns, {
      resolver,
      reporter,
      targetPath,
      workspaceLayout,
    });
    var packageInformationStores = _yield$getPackageInfo[0], blacklistedLocations = _yield$getPackageInfo[1];

    var setupStaticTables = [
      generateMaps(packageInformationStores, blacklistedLocations),
      generateFindPackageLocator(packageInformationStores),
    ].join(``);

    return _generatePnpMapApiTpl.default
      .replace(/\$\$SHEBANG/g, config.plugnplayShebang)
      .replace(/\$\$BLACKLIST/g, JSON.stringify(config.plugnplayBlacklist))
      .replace(/\$\$SETUP_STATIC_TABLES\(\);/g, setupStaticTables);
  });

  return _generatePnpMap.apply(this, arguments);
}
