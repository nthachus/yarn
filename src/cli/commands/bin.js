import {getBinEntries} from './run.js';

const path = require('path');

export function hasWrapper(commander) {
  return false;
}

export function setFlags(commander) {
  commander.description('Displays the location of the yarn bin folder.');
}

export async function run(config, reporter, flags, args) {
  const binFolder = path.join(config.cwd, config.registryFolders[0], '.bin');
  if (args.length === 0) {
    reporter.log(binFolder, {force: true});
  } else {
    const binEntries = await getBinEntries(config);

    const binName = args[0];
    const binPath = binEntries.get(binName);

    if (binPath) {
      reporter.log(binPath, {force: true});
    } else {
      reporter.error(reporter.lang('packageBinaryNotFound', binName));
    }
  }
}
