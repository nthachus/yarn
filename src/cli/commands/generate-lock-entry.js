import {MessageError} from '../../errors.js';
import {implodeEntry, stringify} from '../../lockfile';

export function hasWrapper(commander, args) {
  return false;
}

export async function run(config, reporter, flags, args) {
  let manifest;
  if (flags.useManifest) {
    manifest = await config.readJson(flags.useManifest);
  } else {
    manifest = await config.readRootManifest();
  }
  if (!manifest.name) {
    throw new MessageError(reporter.lang('noName'));
  }
  if (!manifest.version) {
    throw new MessageError(reporter.lang('noVersion'));
  }

  const entry = {
    name: manifest.name,
    version: manifest.version,
    resolved: flags.resolved,
    registry: flags.registry || manifest._registry,
    optionalDependencies: manifest.optionalDependencies,
    dependencies: manifest.dependencies,
  };
  const pattern = flags.pattern || `${entry.name}@${entry.version}`;
  reporter.log(
    stringify({
      [pattern]: implodeEntry(pattern, entry),
    }),
  );
}

export function setFlags(commander) {
  commander.description('Generates a lock file entry.');
  commander.option('--use-manifest <location>', 'description');
  commander.option('--resolved <resolved>', 'description');
  commander.option('--registry <registry>', 'description');
}

export const examples = [
  'generate-lock-entry',
  'generate-lock-entry --use-manifest ./package.json',
  'generate-lock-entry --resolved local-file.tgz#hash',
];
