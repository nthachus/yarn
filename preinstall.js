if (process.env.npm_config_global) {
  var cp = require("child_process"), fs = require("fs"), path = require("path");
  try {
    var targetPath = cp.execFileSync(process.execPath, [ process.env.npm_execpath, "bin", "-g" ], {
      encoding: "utf8",
      stdio: [ "ignore", void 0, "ignore" ]
    }).replace(/\n/g, ""), manifest = require("./package.json"), binNames = "string" == typeof manifest.bin ? [ manifest.name.replace(/^@[^\/]+\//, "") ] : "object" == typeof manifest.bin && null !== manifest.bin ? Object.keys(manifest.bin) : [];
    binNames.forEach((function(binName) {
      var binTarget, binPath = path.join(targetPath, binName);
      try {
        binTarget = fs.readlinkSync(binPath);
      } catch (err) {
        return;
      }
      if (binTarget.startsWith("../lib/node_modules/corepack/")) try {
        fs.unlinkSync(binPath);
      } catch (err) {
        return;
      }
    }));
  } catch (err) {}
}