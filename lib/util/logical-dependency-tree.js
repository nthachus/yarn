'use strict';
exports.__esModule = true;
exports.LogicalDependencyTree = void 0;

var npmLogicalTree = require('npm-logical-tree');

class LogicalDependencyTree {
  constructor(packageJson, packageLock) {
    this.tree = npmLogicalTree(JSON.parse(packageJson), JSON.parse(packageLock));
  }

  _findNode(name, parentNames) {
    var parentTree = parentNames
      ? parentNames.reduce((node, ancestor) => {
          var ancestorNode = node.dependencies.get(ancestor);
          return ancestorNode;
        }, this.tree)
      : this.tree;
    var node = parentTree.dependencies.get(name);
    return node;
  }
  getFixedVersionPattern(name, parentNames) {
    var node = this._findNode(name, parentNames);
    var version = node.version;
    return `${node.name}@${version}`;
  }
}
exports.LogicalDependencyTree = LogicalDependencyTree;
