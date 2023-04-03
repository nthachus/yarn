import * as child from '../../util/child.js';
import * as fs from '../../util/fs.js';
import {NODE_BIN_PATH, PNP_FILENAME} from '../../constants';

export function setFlags(commander) {
  commander.description(
    'Runs Node with the same version that the one used by Yarn itself, and by default from the project root',
  );
  commander.usage('node [--into PATH] [... args]');
  commander.option('--into <path>', 'Sets the cwd to the specified location');
}

export function hasWrapper(commander, args) {
  return true;
}

export async function run(config, reporter, flags, args) {
  const pnpPath = `${config.lockfileFolder}/${PNP_FILENAME}`;

  let nodeOptions = process.env.NODE_OPTIONS || '';
  if (await fs.exists(pnpPath)) {
    nodeOptions = `--require ${pnpPath} ${nodeOptions}`;
  }

  try {
    await child.spawn(NODE_BIN_PATH, args, {
      stdio: 'inherit',
      cwd: flags.into || config.cwd,
      env: {...process.env, NODE_OPTIONS: nodeOptions},
    });
  } catch (err) {
    throw err;
  }
}
