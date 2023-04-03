const npmLogicalTree = require('npm-logical-tree');

export class LogicalDependencyTree {
  constructor(packageJson, packageLock) {
    this.tree = npmLogicalTree(JSON.parse(packageJson), JSON.parse(packageLock));
  }

  _findNode(name, parentNames) {
    const parentTree = parentNames
      ? parentNames.reduce((node, ancestor) => {
          const ancestorNode = node.dependencies.get(ancestor);
          return ancestorNode;
        }, this.tree)
      : this.tree;
    const node = parentTree.dependencies.get(name);
    return node;
  }
  getFixedVersionPattern(name, parentNames) {
    const node = this._findNode(name, parentNames);
    const version = node.version;
    return `${node.name}@${version}`;
  }
}
