import {MessageError} from '../../errors.js';
import * as child from '../../util/child.js';
import {makeEnv} from '../../util/execute-lifecycle-script.js';

export function setFlags(commander) {}

export function hasWrapper(commander, args) {
  return true;
}

export async function run(config, reporter, flags, args) {
  const env = await makeEnv(`exec`, config.cwd, config);

  if (args.length < 1) {
    throw new MessageError(reporter.lang('execMissingCommand'));
  }

  const [execName, ...rest] = args;
  await child.spawn(execName, rest, {stdio: 'inherit', env});
}
