'use strict';
exports.__esModule = true;
exports.getFormattedOutput = getFormattedOutput;
exports.recurseTree = recurseTree;
exports.sortTrees = sortTrees;
// types

// public
function sortTrees(trees) {
  return trees.sort(function(tree1, tree2) {
    return tree1.name.localeCompare(tree2.name);
  });
}

function recurseTree(tree, prefix, recurseFunc) {
  var treeLen = tree.length;
  var treeEnd = treeLen - 1;
  for (var i = 0; i < treeLen; i++) {
    var atEnd = i === treeEnd;
    recurseFunc(tree[i], prefix + getLastIndentChar(atEnd), prefix + getNextIndentChar(atEnd));
  }
}

function getFormattedOutput(fmt) {
  var item = formatColor(fmt.color, fmt.name, fmt.formatter);
  var suffix = getSuffix(fmt.hint, fmt.formatter);
  return `${fmt.prefix}─ ${item}${suffix}\n`;
}

function getNextIndentChar(end) {
  return end ? '   ' : '│  ';
}

function getLastIndentChar(end) {
  return end ? '└' : '├';
}

function getSuffix(hint, formatter) {
  return hint ? ` (${formatter.grey(hint)})` : '';
}

function formatColor(color, strToFormat, formatter) {
  return color ? formatter[color](strToFormat) : strToFormat;
}
