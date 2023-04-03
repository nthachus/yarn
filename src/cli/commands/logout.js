export function setFlags(commander) {
  commander.description('Clears registry username and email.');
}

export function hasWrapper(commander, args) {
  return true;
}

export async function run(config, reporter, flags, args) {
  await config.registries.yarn.saveHomeConfig({
    username: undefined,
    email: undefined,
  });

  reporter.success(reporter.lang('clearedCredentials'));
}
