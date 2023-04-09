'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = exports.NohoistResolver = exports.HoistManifest = void 0;
var _extends2 = _interopRequireDefault(require('@babel/runtime/helpers/extends'));

var _config = _interopRequireDefault(require('./config.js'));
var _misc = require('./util/misc.js');
var mm = require('micromatch');
var _workspaceLayout = _interopRequireDefault(require('./workspace-layout.js'));

var invariant = require('invariant');
var path = require('path');

var historyCounter = 0;

var LINK_TYPES = new Set(['workspace', 'link']);

class HoistManifest {
  constructor(
    key,
    parts,
    pkg,
    loc,
    isDirectRequire,
    isRequired,
    isIncompatible
  ) {
    this.nohoistList = void 0;

    this.isDirectRequire = isDirectRequire;
    this.isRequired = isRequired;
    this.isIncompatible = isIncompatible;

    this.loc = loc;
    this.pkg = pkg;
    this.key = key;
    this.parts = parts;
    this.originalKey = key;
    this.previousPaths = [];

    this.history = [];
    this.addHistory(`Start position = ${key}`);

    // nohoist info
    this.isNohoist = false;
    this.originalParentPath = '';

    //focus
    this.shallowPaths = [];
    this.isShallow = false;
  }

  addHistory(msg) {
    this.history.push(`${++historyCounter}: ${msg}`);
  }
}
exports.HoistManifest = HoistManifest;

class PackageHoister {
  constructor(
    config,
    resolver,
    _temp
  ) {
    var _ref = _temp === void 0 ? {} : _temp, ignoreOptional = _ref.ignoreOptional, workspaceLayout = _ref.workspaceLayout;
    this.resolver = resolver;
    this.config = config;

    this.ignoreOptional = ignoreOptional;

    this.taintedKeys = new Map();
    this.levelQueue = [];
    this.tree = new Map();

    this.workspaceLayout = workspaceLayout;

    this.nohoistResolver = new NohoistResolver(config, resolver);
  }

  /**
   * Taint this key and prevent any modules from being hoisted to it.
   */

  taintKey(key, info) {
    var existingTaint = this.taintedKeys.get(key);
    if (existingTaint && existingTaint.loc !== info.loc) {
      return false;
    } else {
      this.taintedKeys.set(key, info);
      return true;
    }
  }

  /**
   * Implode an array of ancestry parts into a key.
   */

  implodeKey(parts) {
    return parts.join('#');
  }

  /**
   * Seed the hoister with patterns taken from the included resolver.
   */

  seed(patterns) {
    var _this = this;
    this.prepass(patterns);

    for (var pattern of this.resolver.dedupePatterns(patterns)) {
      this._seed(pattern, {isDirectRequire: true});
    }

    var _loop = function() {
      var queue = _this.levelQueue;
      if (!queue.length) {
        _this._propagateRequired();
        return {v: void 0};
      }

      _this.levelQueue = [];

      // sort queue to get determinism between runs
      queue = queue.sort((_ref2, _ref3) => {
        var aPattern = _ref2[0], bPattern = _ref3[0];
        return (0, _misc.sortAlpha)(aPattern, bPattern);
      });

      // sort the queue again to hoist packages without peer dependencies first
      var sortedQueue = [];
      var availableSet = new Set();

      var hasChanged = true;
      while (queue.length > 0 && hasChanged) {
        hasChanged = false;

        var queueCopy = queue;
        queue = [];
        for (var t = 0; t < queueCopy.length; ++t) {
          var queueItem = queueCopy[t];
          var _pattern = queueItem[0];
          var pkg = _this.resolver.getStrictResolvedPattern(_pattern);

          var peerDependencies = Object.keys(pkg.peerDependencies || {});
          var areDependenciesFulfilled = peerDependencies.every(peerDependency => availableSet.has(peerDependency));

          if (areDependenciesFulfilled) {
            // Move the package inside our sorted queue
            sortedQueue.push(queueItem);

            // Add it to our set, so that we know it is available
            availableSet.add(_pattern);

            // Schedule a next pass, in case other packages had peer dependencies on this one
            hasChanged = true;
          } else {
            queue.push(queueItem);
          }
        }
      }

      // We might end up with some packages left in the queue, that have not been sorted. We reach this codepath if two
      // packages have a cyclic dependency, or if the peer dependency is provided by a parent package. In these case,
      // nothing we can do, so we just add all of these packages to the end of the sorted queue.
      sortedQueue = sortedQueue.concat(queue);

      for (var _ref4 of sortedQueue) {
        var _pattern2 = _ref4[0], parent = _ref4[1];
        var info = _this._seed(_pattern2, {isDirectRequire: false, parent});
        if (info) {
          _this.hoist(info);
        }
      }
    };
    while (true) {
      var _ret = _loop();
      if (typeof _ret === 'object') return _ret.v;
    }
  }

  /**
   * Seed the hoister with a specific pattern.
   */

  _seed(
    pattern,
    _ref5
  ) {
    var isDirectRequire = _ref5.isDirectRequire, parent = _ref5.parent;
    //
    var pkg = this.resolver.getStrictResolvedPattern(pattern);
    var ref = pkg._reference;
    invariant(ref, 'expected reference');

    //
    var parentParts = [];

    var isIncompatible = ref.incompatible;
    var isMarkedAsOptional = ref.optional && this.ignoreOptional;

    var isRequired = isDirectRequire && !ref.ignore && !isIncompatible && !isMarkedAsOptional;

    if (parent) {
      if (!this.tree.get(parent.key)) {
        return null;
      }
      // non ignored dependencies inherit parent's ignored status
      // parent may transition from ignored to non ignored when hoisted if it is used in another non ignored branch
      if (!isDirectRequire && !isIncompatible && parent.isRequired && !isMarkedAsOptional) {
        isRequired = true;
      }
      parentParts = parent.parts;
    }

    //
    var loc = this.config.generateModuleCachePath(ref);
    var parts = parentParts.concat(pkg.name);
    var key = this.implodeKey(parts);
    var info = new HoistManifest(key, parts, pkg, loc, isDirectRequire, isRequired, isIncompatible);

    this.nohoistResolver.initNohoist(info, parent);

    this.tree.set(key, info);
    this.taintKey(key, info);

    //
    var pushed = new Set();
    for (var depPattern of ref.dependencies) {
      if (!pushed.has(depPattern)) {
        this.levelQueue.push([depPattern, info]);
        pushed.add(depPattern);
      }
    }

    return info;
  }

  /**
   * Propagate inherited ignore statuses from non-ignored to ignored packages
   */

  _propagateRequired() {
    //
    var toVisit = [];

    // enumerate all non-ignored packages
    for (var entry of this.tree.entries()) {
      if (entry[1].isRequired) {
        toVisit.push(entry[1]);
      }
    }

    // visit them
    while (toVisit.length) {
      var info = toVisit.shift();
      var ref = info.pkg._reference;
      invariant(ref, 'expected reference');

      for (var depPattern of ref.dependencies) {
        var depinfo = this._lookupDependency(info, depPattern);

        if (!depinfo) {
          continue;
        }

        var depRef = depinfo.pkg._reference;

        // If it's marked as optional, but the parent is required and the
        // dependency was not listed in `optionalDependencies`, then we mark the
        // dependency as required.
        var isMarkedAsOptional =
          depRef && depRef.optional && this.ignoreOptional && !(info.isRequired && depRef.hint !== 'optional');

        if (!depinfo.isRequired && !depinfo.isIncompatible && !isMarkedAsOptional) {
          depinfo.isRequired = true;
          depinfo.addHistory(`Mark as non-ignored because of usage by ${info.key}`);
          toVisit.push(depinfo);
        }
      }
    }
  }

  /**
   * Looks up the package a dependency resolves to
   */

  _lookupDependency(info, depPattern) {
    //
    var pkg = this.resolver.getStrictResolvedPattern(depPattern);
    var ref = pkg._reference;
    invariant(ref, 'expected reference');

    //
    for (var i = info.parts.length; i >= 0; i--) {
      var checkParts = info.parts.slice(0, i).concat(pkg.name);
      var checkKey = this.implodeKey(checkParts);
      var existing = this.tree.get(checkKey);
      if (existing) {
        return existing;
      }
    }

    return null;
  }

  /**
   * Find the highest position we can hoist this module to.
   */

  getNewParts(key, info, parts) {
    var stepUp = false;

    var highestHoistingPoint = this.nohoistResolver.highestHoistingPoint(info) || 0;
    var fullKey = this.implodeKey(parts);
    var stack = []; // stack of removed parts
    var name = parts.pop();

    if (info.isNohoist) {
      info.addHistory(`Marked as nohoist, will not be hoisted above '${parts[highestHoistingPoint]}'`);
    }

    for (var i = parts.length - 1; i >= highestHoistingPoint; i--) {
      var checkParts = parts.slice(0, i).concat(name);
      var checkKey = this.implodeKey(checkParts);
      info.addHistory(`Looked at ${checkKey} for a match`);

      var existing = this.tree.get(checkKey);

      if (existing) {
        if (existing.loc === info.loc) {
          // switch to non ignored if earlier deduped version was ignored (must be compatible)
          if (!existing.isRequired && info.isRequired) {
            existing.addHistory(`Deduped ${fullKey} to this item, marking as required`);
            existing.isRequired = true;
          } else {
            existing.addHistory(`Deduped ${fullKey} to this item`);
          }

          return {parts: checkParts, duplicate: true};
        } else {
          // everything above will be shadowed and this is a conflict
          info.addHistory(`Found a collision at ${checkKey}`);
          break;
        }
      }

      var existingTaint = this.taintedKeys.get(checkKey);
      if (existingTaint && existingTaint.loc !== info.loc) {
        info.addHistory(`Broken by ${checkKey}`);
        break;
      }
    }

    var peerDependencies = Object.keys(info.pkg.peerDependencies || {});

    // remove redundant parts that wont collide
    hoistLoop: while (parts.length > highestHoistingPoint) {
      // we must not hoist a package higher than its peer dependencies
      for (var peerDependency of peerDependencies) {
        var _checkParts2 = parts.concat(peerDependency);
        var _checkKey2 = this.implodeKey(_checkParts2);
        info.addHistory(`Looked at ${_checkKey2} for a peer dependency match`);

        var _existing2 = this.tree.get(_checkKey2);

        if (_existing2) {
          info.addHistory(`Found a peer dependency requirement at ${_checkKey2}`);
          break hoistLoop;
        }
      }

      var _checkParts = parts.concat(name);
      var _checkKey = this.implodeKey(_checkParts);

      //
      var _existing = this.tree.get(_checkKey);
      if (_existing) {
        stepUp = true;
        break;
      }

      // check if we're trying to hoist ourselves to a previously unflattened module key,
      // this will result in a conflict and we'll need to move ourselves up
      if (key !== _checkKey && this.taintedKeys.has(_checkKey)) {
        stepUp = true;
        break;
      }

      //
      stack.push(parts.pop());
    }

    //
    parts.push(name);

    //
    var isValidPosition = (parts) => {
      // nohoist package can't be hoisted to the "root"
      if (parts.length <= highestHoistingPoint) {
        return false;
      }
      var key = this.implodeKey(parts);
      var existing = this.tree.get(key);
      if (existing && existing.loc === info.loc) {
        return true;
      }

      // ensure there's no taint or the taint is us
      var existingTaint = this.taintedKeys.get(key);
      if (existingTaint && existingTaint.loc !== info.loc) {
        return false;
      }

      return true;
    };

    // we need to special case when we attempt to hoist to the top level as the `existing` logic
    // wont be hit in the above `while` loop and we could conflict
    if (!isValidPosition(parts)) {
      stepUp = true;
    }

    // sometimes we need to step up to a parent module to install ourselves
    while (stepUp && stack.length) {
      info.addHistory(`Stepping up from ${this.implodeKey(parts)}`);

      parts.pop(); // remove `name`
      parts.push(stack.pop(), name);

      if (isValidPosition(parts)) {
        info.addHistory(`Found valid position ${this.implodeKey(parts)}`);
        stepUp = false;
      }
    }

    return {parts, duplicate: false};
  }

  /**
   * Hoist all seeded patterns to their highest positions.
   */

  hoist(info) {
    var oldKey = info.key, rawParts = info.parts;

    // remove this item from the `tree` map so we can ignore it
    this.tree.delete(oldKey);
    var _this$getNewParts = this.getNewParts(oldKey, info, rawParts.slice()), parts = _this$getNewParts.parts, duplicate = _this$getNewParts.duplicate;

    var newKey = this.implodeKey(parts);
    if (duplicate) {
      info.addHistory(`Satisfied from above by ${newKey}`);
      this.declareRename(info, rawParts, parts);
      this.updateHoistHistory(this.nohoistResolver._originalPath(info), this.implodeKey(parts));
      return;
    }

    // update to the new key
    if (oldKey === newKey) {
      info.addHistory(`Didn't hoist - see reason above`);
      this.setKey(info, oldKey, rawParts);
      return;
    }

    //
    this.declareRename(info, rawParts, parts);
    this.setKey(info, newKey, parts);
  }

  /**
   * Declare that a module has been hoisted and update our internal references.
   */

  declareRename(info, oldParts, newParts) {
    // go down the tree from our new position reserving our name
    this.taintParents(info, oldParts.slice(0, -1), newParts.length - 1);
  }

  /**
   * Crawl upwards through a list of ancestry parts and taint a package name.
   */

  taintParents(info, processParts, start) {
    for (var i = start; i < processParts.length; i++) {
      var parts = processParts.slice(0, i).concat(info.pkg.name);
      var key = this.implodeKey(parts);

      if (this.taintKey(key, info)) {
        info.addHistory(`Tainted ${key} to prevent collisions`);
      }
    }
  }

  updateHoistHistory(fromPath, toKey) {
    var info = this.tree.get(toKey);
    invariant(info, `expect to find hoist-to ${toKey}`);
    info.previousPaths.push(fromPath);
  }

  /**
   * Update the key of a module and update our references.
   */

  setKey(info, newKey, parts) {
    var oldKey = info.key;

    info.key = newKey;
    info.parts = parts;
    this.tree.set(newKey, info);

    if (oldKey === newKey) {
      return;
    }

    var fromInfo = this.tree.get(newKey);
    invariant(fromInfo, `expect to find hoist-from ${newKey}`);
    info.previousPaths.push(this.nohoistResolver._originalPath(fromInfo));
    info.addHistory(`New position = ${newKey}`);
  }

  /**
   * Perform a prepass and if there's multiple versions of the same package, hoist the one with
   * the most dependents to the top.
   */

  prepass(patterns) {
    patterns = this.resolver.dedupePatterns(patterns).sort();

    var visited = new Map();

    var occurences = {};

    // visitor to be used inside add() to mark occurences of packages
    var visitAdd = (pkg, ancestry, pattern) => {
      var versions = (occurences[pkg.name] = occurences[pkg.name] || {});
      var version = (versions[pkg.version] = versions[pkg.version] || {
        occurences: new Set(),
        pattern,
      });

      if (ancestry.length) {
        version.occurences.add(ancestry[ancestry.length - 1]);
      }
    };

    // add an occurring package to the above data structure
    var add = (pattern, ancestry, ancestryPatterns) => {
      var pkg = this.resolver.getStrictResolvedPattern(pattern);
      if (ancestry.indexOf(pkg) >= 0) {
        // prevent recursive dependencies
        return;
      }

      var visitedPattern = visited.get(pattern);

      if (visitedPattern) {
        // if a package has been visited before, simply increment occurrences of packages
        // like last time this package was visited
        visitedPattern.forEach(visitPkg => {
          visitAdd(visitPkg.pkg, visitPkg.ancestry, visitPkg.pattern);
        });

        visitAdd(pkg, ancestry, pattern);

        return;
      }

      var ref = pkg._reference;
      invariant(ref, 'expected reference');

      visitAdd(pkg, ancestry, pattern);

      for (var depPattern of ref.dependencies) {
        var depAncestry = ancestry.concat(pkg);
        var depAncestryPatterns = ancestryPatterns.concat(depPattern);
        add(depPattern, depAncestry, depAncestryPatterns);
      }

      visitedPattern = visited.get(pattern) || [];
      visited.set(pattern, visitedPattern);
      visitedPattern.push({pkg, ancestry, pattern});

      ancestryPatterns.forEach(ancestryPattern => {
        var visitedAncestryPattern = visited.get(ancestryPattern);
        if (visitedAncestryPattern) {
          visitedAncestryPattern.push({pkg, ancestry, pattern});
        }
      });
    };

    // get a list of root package names since we can't hoist other dependencies to these spots!
    var rootPackageNames = new Set();
    for (var pattern of patterns) {
      var pkg = this.resolver.getStrictResolvedPattern(pattern);
      rootPackageNames.add(pkg.name);
      add(pattern, [], []);
    }

    for (var packageName of Object.keys(occurences).sort()) {
      var versionOccurences = occurences[packageName];
      var versions = Object.keys(versionOccurences);

      if (versions.length === 1) {
        // only one package type so we'll hoist this to the top anyway
        continue;
      }

      if (this.tree.get(packageName)) {
        // a transitive dependency of a previously hoisted dependency exists
        continue;
      }

      if (rootPackageNames.has(packageName)) {
        // can't replace top level packages
        continue;
      }

      var mostOccurenceCount = void 0;
      var mostOccurencePattern = void 0;
      for (var version of Object.keys(versionOccurences).sort()) {
        var _versionOccurences$ve = versionOccurences[version], _occurences = _versionOccurences$ve.occurences, _pattern3 = _versionOccurences$ve.pattern;
        var occurenceCount = _occurences.size;

        if (!mostOccurenceCount || occurenceCount > mostOccurenceCount) {
          mostOccurenceCount = occurenceCount;
          mostOccurencePattern = _pattern3;
        }
      }
      invariant(mostOccurencePattern, 'expected most occurring pattern');
      invariant(mostOccurenceCount, 'expected most occurring count');

      // only hoist this module if it occured more than once
      if (mostOccurenceCount > 1) {
        this._seed(mostOccurencePattern, {isDirectRequire: false});
      }
    }
  }

  markShallowWorkspaceEntries() {
    var targetWorkspace = this.config.focusedWorkspaceName;
    var targetHoistManifest = this.tree.get(targetWorkspace);
    invariant(targetHoistManifest, `targetHoistManifest from ${targetWorkspace} missing`);

    //dedupe with a set
    var dependentWorkspaces = Array.from(new Set(this._getDependentWorkspaces(targetHoistManifest)));

    var entries = Array.from(this.tree);
    entries.forEach(_ref6 => {
      var key = _ref6[0], info = _ref6[1];
      var splitPath = key.split('#');

      //mark the workspace and any un-hoisted dependencies it has for shallow installation
      var isShallowDependency = dependentWorkspaces.some(w => {
        if (splitPath[0] !== w) {
          //entry is not related to the workspace
          return false;
        }
        if (!splitPath[1]) {
          //entry is the workspace
          return true;
        }
        //don't bother marking dev dependencies or nohoist packages for shallow installation
        var treeEntry = this.tree.get(w);
        invariant(treeEntry, 'treeEntry is not defined for ' + w);
        var pkg = treeEntry.pkg;
        return !info.isNohoist && (!pkg.devDependencies || !(splitPath[1] in pkg.devDependencies));
      });

      if (isShallowDependency) {
        info.shallowPaths = [null];
        return;
      }

      //if package foo is at TARGET_WORKSPACE/node_modules/foo, the hoisted version of foo
      //should be installed under each shallow workspace that uses it
      //(unless that workspace has its own version of foo, in which case that should be installed)
      if (splitPath.length !== 2 || splitPath[0] !== targetWorkspace) {
        return;
      }
      var unhoistedDependency = splitPath[1];
      var unhoistedInfo = this.tree.get(unhoistedDependency);
      if (!unhoistedInfo) {
        return;
      }
      dependentWorkspaces.forEach(w => {
        if (this._packageDependsOnHoistedPackage(w, unhoistedDependency, false)) {
          unhoistedInfo.shallowPaths.push(w);
        }
      });
    });
  }

  _getDependentWorkspaces(
    parent,
    allowDevDeps,
    alreadySeen
  ) {
    if (allowDevDeps === void 0) allowDevDeps = true;
    if (alreadySeen === void 0) alreadySeen = new Set();
    var parentName = parent.pkg.name;
    if (alreadySeen.has(parentName)) {
      return [];
    }

    alreadySeen.add(parentName);
    invariant(this.workspaceLayout, 'missing workspaceLayout');
    var _this$workspaceLayout = this.workspaceLayout, virtualManifestName = _this$workspaceLayout.virtualManifestName, workspaces = _this$workspaceLayout.workspaces;

    var directDependencies = [];
    var ignored = [];
    Object.keys(workspaces).forEach(workspace => {
      if (alreadySeen.has(workspace) || workspace === virtualManifestName) {
        return;
      }

      //skip a workspace if a different version of it is already being installed under the parent workspace
      var info = this.tree.get(`${parentName}#${workspace}`);
      if (info) {
        var workspaceVersion = workspaces[workspace].manifest.version;
        if (
          info.isNohoist &&
          info.originalParentPath.startsWith(`/${WS_ROOT_ALIAS}/${parentName}`) &&
          info.pkg.version === workspaceVersion
        ) {
          //nohoist installations are exceptions
          directDependencies.push(info.key);
        } else {
          ignored.push(workspace);
        }
        return;
      }

      var searchPath = `/${WS_ROOT_ALIAS}/${parentName}`;
      info = this.tree.get(workspace);
      invariant(info, 'missing workspace tree entry ' + workspace);
      if (!info.previousPaths.some(p => p.startsWith(searchPath))) {
        return;
      }
      if (allowDevDeps || !parent.pkg.devDependencies || !(workspace in parent.pkg.devDependencies)) {
        directDependencies.push(workspace);
      }
    });

    var nested = directDependencies.map(d => {
      var dependencyEntry = this.tree.get(d);
      invariant(dependencyEntry, 'missing dependencyEntry ' + d);
      return this._getDependentWorkspaces(dependencyEntry, false, alreadySeen);
    });
    nested = [].concat.apply([], nested); //flatten

    var directDependencyNames = directDependencies.map(d => d.split('#').slice(-1)[0]);

    return directDependencyNames.concat(nested).filter(w => ignored.indexOf(w) === -1);
  }

  _packageDependsOnHoistedPackage(
    p,
    hoisted,
    checkDevDeps,
    checked
  ) {
    if (checkDevDeps === void 0) checkDevDeps = true;
    if (checked === void 0) checked = new Set();
    //don't check the same package more than once, and ignore any package that has its own version of hoisted
    if (checked.has(p) || this.tree.has(`${p}#${hoisted}`)) {
      return false;
    }
    checked.add(p);
    var info = this.tree.get(p);
    if (!info) {
      return false;
    }

    var pkg = info.pkg;
    if (!pkg) {
      return false;
    }

    var deps = [];
    if (pkg.dependencies) {
      deps = deps.concat(Object.keys(pkg.dependencies));
    }
    if (checkDevDeps && pkg.devDependencies) {
      deps = deps.concat(Object.keys(pkg.devDependencies));
    }

    if (deps.indexOf(hoisted) !== -1) {
      return true;
    }
    return deps.some(dep => this._packageDependsOnHoistedPackage(dep, hoisted, false, checked));
  }

  /**
   * Produce a flattened list of module locations and manifests.
   */

  init() {
    var _this2 = this;
    var flatTree = [];

    //
    var _loop2 = function(_ref7) {
      var key = _ref7[0], info = _ref7[1];
      // decompress the location and push it to the flat tree. this path could be made
      // up of modules from different registries so we need to handle this specially
      var parts = [];
      var keyParts = key.split('#');
      var isWorkspaceEntry = _this2.workspaceLayout && keyParts[0] === _this2.workspaceLayout.virtualManifestName;

      // Don't add the virtual manifest (keyParts.length === 1)
      // or ws childs which were not hoisted to the root (keyParts.length === 2).
      // If a ws child was hoisted its key would not contain the virtual manifest name
      if (isWorkspaceEntry && keyParts.length <= 2) {
        return 'continue';
      }

      for (var i = 0; i < keyParts.length; i++) {
        var _key = keyParts.slice(0, i + 1).join('#');
        var hoisted = _this2.tree.get(_key);
        invariant(hoisted, `expected hoisted manifest for "${_key}"`);
        parts.push(_this2.config.getFolder(hoisted.pkg));
        parts.push(keyParts[i]);
      }

      // Check if the destination is pointing to a sub folder of the virtualManifestName
      // e.g. _project_/node_modules/workspace-aggregator-123456/node_modules/workspaceChild/node_modules/dependency
      // This probably happened because the hoister was not able to hoist the workspace child to the root
      // So we have to change the folder to the workspace package location
      if (_this2.workspaceLayout && isWorkspaceEntry) {
        var wspPkg = _this2.workspaceLayout.workspaces[keyParts[1]];
        invariant(wspPkg, `expected workspace package to exist for "${keyParts[1]}"`);
        parts.splice(0, 4, wspPkg.loc);
      } else {
        if (_this2.config.modulesFolder) {
          // remove the first part which will be the folder name and replace it with a
          // hardcoded modules folder
          parts.splice(0, 1, _this2.config.modulesFolder);
        } else {
          // first part will be the registry-specific module folder
          parts.splice(0, 0, _this2.config.lockfileFolder);
        }
      }

      var shallowLocs = [];
      info.shallowPaths.forEach(shallowPath => {
        var shallowCopyParts = parts.slice();
        shallowCopyParts[0] = _this2.config.cwd;
        if (_this2.config.modulesFolder) {
          //add back the module folder name for the shallow installation
          var treeEntry = _this2.tree.get(keyParts[0]);
          invariant(treeEntry, 'expected treeEntry for ' + keyParts[0]);
          var moduleFolderName = _this2.config.getFolder(treeEntry.pkg);
          shallowCopyParts.splice(1, 0, moduleFolderName);
        }

        if (shallowPath) {
          var targetWorkspace = _this2.config.focusedWorkspaceName;
          var _treeEntry = _this2.tree.get(`${targetWorkspace}#${shallowPath}`) || _this2.tree.get(shallowPath);
          invariant(_treeEntry, 'expected treeEntry for ' + shallowPath);
          var _moduleFolderName = _this2.config.getFolder(_treeEntry.pkg);
          shallowCopyParts.splice(1, 0, _moduleFolderName, shallowPath);
        }
        shallowLocs.push(path.join.apply(path, shallowCopyParts));
      });

      var loc = path.join.apply(path, parts);
      flatTree.push([loc, info]);
      shallowLocs.forEach(shallowLoc => {
        var newManifest = (0, _extends2.default)({}, info, {isShallow: true});
        flatTree.push([shallowLoc, newManifest]);
      });
    };
    for (var _ref7 of this.tree.entries()) {
      var _ret2 = _loop2(_ref7);
      if (_ret2 === 'continue') continue;
    }

    // remove ignored modules from the tree
    var visibleFlatTree = [];
    for (var _ref8 of flatTree) {
      var loc = _ref8[0], info = _ref8[1];
      var ref = info.pkg._reference;
      invariant(ref, 'expected reference');
      if (!info.isRequired) {
        info.addHistory('Deleted as this module was ignored');
      } else {
        visibleFlatTree.push([loc, info]);
      }
    }
    return visibleFlatTree;
  }
}
exports.default = PackageHoister;

var WS_ROOT_ALIAS = '_project_';
class NohoistResolver {
  constructor(config, resolver) {
    this._wsRootNohoistList = void 0;
    this._wsRootPackageName = void 0;

    this._resolver = resolver;
    this._config = config;
    if (resolver.workspaceLayout) {
      this._wsRootPackageName = resolver.workspaceLayout.virtualManifestName;
      var _resolver$workspaceLa = resolver.workspaceLayout.getWorkspaceManifest(this._wsRootPackageName), manifest = _resolver$workspaceLa.manifest;
      this._wsRootNohoistList = this._extractNohoistList(manifest, manifest.name);
    }
  }

  /**
   * examine the top level packages to find the root package
   */
  initNohoist(info, parent) {
    var parentNohoistList;
    var originalParentPath = info.originalParentPath;

    if (parent) {
      parentNohoistList = parent.nohoistList;
      originalParentPath = this._originalPath(parent);
    } else {
      invariant(this._isTopPackage(info), `${info.key} doesn't have parent nor a top package`);
      if (info.pkg.name !== this._wsRootPackageName) {
        parentNohoistList = this._wsRootNohoistList;
        originalParentPath = this._wsRootPackageName || '';
      }
    }

    info.originalParentPath = originalParentPath;
    var nohoistList = this._extractNohoistList(info.pkg, this._originalPath(info)) || [];
    if (parentNohoistList) {
      nohoistList = nohoistList.concat(parentNohoistList);
    }
    info.nohoistList = nohoistList.length > 0 ? nohoistList : null;
    info.isNohoist = this._isNohoist(info);
  }

  /**
   * find the highest hoisting point for the given HoistManifest.
   * algorithm: a nohoist package should never be hoisted beyond the top of its branch, i.e.
   * the first element of its parts. Therefore the highest possible hoisting index is 1,
   * unless the package has only 1 part (itself), in such case returns null just like any hoisted package
   *
   */

  highestHoistingPoint(info) {
    return info.isNohoist && info.parts.length > 1 ? 1 : null;
  }

  // private functions
  _isNohoist(info) {
    if (this._isTopPackage(info)) {
      return false;
    }
    if (info.nohoistList && info.nohoistList.length > 0 && mm.any(this._originalPath(info), info.nohoistList)) {
      return true;
    }
    if (this._config.plugnplayEnabled) {
      return true;
    }
    return false;
  }
  _isRootPackage(pkg) {
    return pkg.name === this._wsRootPackageName;
  }
  _originalPath(info) {
    return this._makePath(info.originalParentPath, info.pkg.name);
  }
  _makePath() {
    var args = Array.prototype.slice.call(arguments, 0);
    var parts = args.map(s => (s === this._wsRootPackageName ? WS_ROOT_ALIAS : s));
    var result = parts.join('/');
    return result[0] === '/' ? result : '/' + result;
  }
  _isTopPackage(info) {
    var parentParts = info.parts.slice(0, -1);
    var result =
      !parentParts ||
      parentParts.length <= 0 ||
      (parentParts.length === 1 && parentParts[0] === this._wsRootPackageName);
    return result;
  }
  _isLink(info) {
    return info.pkg._remote != null && LINK_TYPES.has(info.pkg._remote.type);
  }

  // extract nohoist from package.json then prefix them with branch path
  // so we can matched against the branch tree ("originalPath") later
  _extractNohoistList(pkg, pathPrefix) {
    var nohoistList;
    var ws = this._config.getWorkspaces(pkg);

    if (ws && ws.nohoist) {
      nohoistList = ws.nohoist.map(p => this._makePath(pathPrefix, p));
    }
    return nohoistList;
  }
}
exports.NohoistResolver = NohoistResolver;
