import {MessageError} from '../../errors.js';
import {camelCase, hyphenate} from '../../util/misc.js';

export default function(rootCommandName, subCommands, usage = []) {
  const subCommandNames = Object.keys(subCommands).map(hyphenate);

  function setFlags(commander) {
    commander.usage(`${rootCommandName} [${subCommandNames.join('|')}] [flags]`);
  }

  async function run(config, reporter, flags, args) {
    const subName = camelCase(args.shift() || '');
    if (subName && subCommands[subName]) {
      const command = subCommands[subName];
      const res = await command(config, reporter, flags, args);
      if (res !== false) {
        return Promise.resolve();
      }
    }

    if (usage && usage.length) {
      reporter.error(`${reporter.lang('usage')}:`);
      for (const msg of usage) {
        reporter.error(`yarn ${rootCommandName} ${msg}`);
      }
    }
    return Promise.reject(new MessageError(reporter.lang('invalidCommand', subCommandNames.join(', '))));
  }

  function hasWrapper(commander, args) {
    return true;
  }

  const examples = usage.map((cmd) => {
    return `${rootCommandName} ${cmd}`;
  });

  return {run, setFlags, hasWrapper, examples};
}
