'use strict';

const fs = require('fs');
const path = require('path');

const CODE_BLOCK_RE = /^\/\* (\d+) \*\/[\r\n]+\/\*{3}\/ .*([\s\S]*?)\/\*{3}\/.*/gm;
const ENTRY_POINT_RE = /^\/\*{6}\/[ \t]+return __webpack_require__\((__webpack_require__\.\w+ = )?(\d+)\)/m;

const EMPTY_CODE_RE = /^(['"]use strict['"];?[\r\n]*)?()$/;
const SIMPLE_IMPORT_RE =
  /^(['"]use strict['"];?[\r\n]*)?module\.exports = (require\(".*?"\)|__webpack_require__\(\d+\));?$/;

const W_REQUIRE_RE = /\b__webpack_require__\((\d+)\)/g;

const debundle = (content, outFile, idMap = {}, replacer) => {
  if (typeof idMap === 'function') {
    replacer = idMap;
    idMap = {};
  }
  if (!content) content = fs.readFileSync(outFile, 'utf8');

  let m = ENTRY_POINT_RE.exec(content);
  if (!m) return content;
  // Entry point ID
  const entryId = m[2];

  // Extract code blocks
  const blocks = new Map();
  while ((m = CODE_BLOCK_RE.exec(content))) blocks.set(m[1], m[2].trim());
  if (!blocks.size) return content;

  // Replace simple imports
  let re;
  blocks.forEach((val, key) => {
    if (!(m = SIMPLE_IMPORT_RE.exec(val)) && !(m = EMPTY_CODE_RE.exec(val))) return;

    blocks.forEach((v, k) => {
      if (k === key) return;

      re = new RegExp(W_REQUIRE_RE.source.replace('(\\d+)', key), 'g');
      blocks.set(k, v.replace(re, m[2]));
    });

    blocks.delete(key);
  });

  // Expanding ...
  const outDir = path.dirname(outFile);

  blocks.forEach((v, k) => {
    v = v.replace(W_REQUIRE_RE, (_m, m1) => `require("./${idMap[m1] || m1}")`);
    if (typeof replacer === 'function') v = replacer(v, k);

    blocks.set(k, v);
    fs.writeFileSync(k === entryId ? outFile : path.join(outDir, `${idMap[k] || k}.js`), v);
  });

  return blocks.get(entryId);
};

// Is CLI?
if (process && process.argv && !module.parent) {
  const args = process.argv.slice(2);

  if (!args.length) {
    console.log(`Usage: ${path.basename(__filename)} [<bundled-file>] [comma-separated-ids-map]`);
  } else {
    const file = path.resolve(args[0]);

    const idMap = {};
    if (args[1]) {
      args[1].split(',').forEach(x => {
        const p = x.split(':', 2);
        idMap[p[0].trim()] = p[1].trim();
      });
    }

    debundle(null, file, idMap);
  }
} else {
  module.exports = debundle;
}
