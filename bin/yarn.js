#!/usr/bin/env node
"use strict";

var ver = process.versions.node, majorVer = parseInt(ver.split(".")[0], 10);

if (majorVer < 4) console.error("Node version " + ver + " is not supported, please use Node.js 4.0 or higher."), 
process.exit(1); else {
  try {
    require("../lib/v8-compile-cache.js");
  } catch (err) {}
  var cli = require("../lib/cli");
  cli.autoRun || cli.default().catch((function(error) {
    console.error(error.stack || error.message || error), process.exitCode = 1;
  }));
}