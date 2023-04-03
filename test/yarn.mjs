#!/usr/bin/env -S node --experimental-specifier-resolution=node
'use strict';

import './addRequire';

import 'v8-compile-cache';
import * as cli from '../src/cli';

if (!cli.autoRun) {
  cli.default().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
