import {version as yarnVersion} from '../../util/yarn-version.js';

export function setFlags(commander) {
  commander.description('Displays version information of currently installed Yarn, Node.js, and its dependencies.');
}

export function hasWrapper(commander, args) {
  return true;
}

export async function run(config, reporter, flags, args) {
  const versions = {yarn: yarnVersion};

  const pkg = await config.maybeReadManifest(config.cwd);
  if (pkg && pkg.name && pkg.version) {
    versions[pkg.name] = pkg.version;
  }

  Object.assign(versions, process.versions);

  reporter.inspect(versions);
}
