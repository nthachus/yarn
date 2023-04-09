'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.buildTree = buildTree;
exports.getParent = getParent;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var invariant = require('invariant');

function getParent(key, treesByKey) {
  var parentKey = key.slice(0, key.lastIndexOf('#'));
  return treesByKey[parentKey];
}

function buildTree() {
  return _buildTree.apply(this, arguments);
}
function _buildTree() {
  _buildTree = (0, _asyncToGenerator2.default)(function* (
    resolver,
    linker,
    patterns,
    ignoreHoisted
  ) {
    var treesByKey = {};
    var trees = [];
    var flatTree = yield linker.getFlatHoistedTree(patterns);

    // If using workspaces, filter out the virtual manifest
    var workspaceLayout = resolver.workspaceLayout;
    var hoisted =
      workspaceLayout && workspaceLayout.virtualManifestName
        ? flatTree.filter(_ref => {
            var key = _ref[0];
            return key.indexOf(workspaceLayout.virtualManifestName) === -1;
          })
        : flatTree;

    var hoistedByKey = {};
    for (var _ref2 of hoisted) {
      var key = _ref2[0], info = _ref2[1];
      hoistedByKey[key] = info;
    }

    // build initial trees
    for (var _ref3 of hoisted) {
      var _info = _ref3[1];
      var ref = _info.pkg._reference;
      // const parent = getParent(info.key, treesByKey);
      var children = [];
      // let depth = 0;
      invariant(ref, 'expected reference');

      // check parent to obtain next depth
      // if (parent && parent.depth > 0) {
      //   depth = parent.depth + 1;
      // } else {
      //   depth = 0;
      // }

      treesByKey[_info.key] = {
        name: _info.pkg.name,
        version: _info.pkg.version,
        children,
        manifest: _info,
      };
    }

    // add children
    for (var _ref4 of hoisted) {
      var _info2 = _ref4[1];
      var tree = treesByKey[_info2.key];
      var parent = getParent(_info2.key, treesByKey);
      if (!tree) {
        continue;
      }

      if (_info2.key.split('#').length === 1) {
        trees.push(tree);
        continue;
      }

      if (parent) {
        parent.children.push(tree);
      }
    }

    return trees;
  });

  return _buildTree.apply(this, arguments);
}
