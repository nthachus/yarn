import {MessageError} from '../../errors.js';
import buildSubCommands from './_build-sub-commands.js';
import {isValidPackageName} from '../../util/normalize-manifest/validate.js';
import {getName} from './tag.js';
import {getToken} from './login.js';
import NpmRegistry from '../../registries/npm-registry.js';

export async function mutate(
  args,
  config,
  reporter,
  buildMessages,
  mutator,
) {
  if (args.length !== 2 && args.length !== 1) {
    return false;
  }

  const username = args.shift();
  const name = await getName(args, config);
  if (!isValidPackageName(name)) {
    throw new MessageError(reporter.lang('invalidPackageName'));
  }

  const msgs = buildMessages(username, name);
  reporter.step(1, 3, reporter.lang('loggingIn'));
  const revoke = await getToken(config, reporter, name);

  reporter.step(2, 3, msgs.info);
  const user = await config.registries.npm.request(`-/user/org.couchdb.user:${username}`);
  let error = false;
  if (user) {
    // get package
    const pkg = await config.registries.npm.request(NpmRegistry.escapeName(name));
    if (pkg) {
      pkg.maintainers = pkg.maintainers || [];
      error = mutator({name: user.name, email: user.email}, pkg);
    } else {
      error = true;
      reporter.error(reporter.lang('unknownPackage', name));
    }

    // update package
    if (pkg && !error) {
      const res = await config.registries.npm.request(`${NpmRegistry.escapeName(name)}/-rev/${pkg._rev}`, {
        method: 'PUT',
        body: {
          _id: pkg._id,
          _rev: pkg._rev,
          maintainers: pkg.maintainers,
        },
      });

      if (res != null && res.success) {
        reporter.success(msgs.success);
      } else {
        error = true;
        reporter.error(msgs.error);
      }
    }
  } else {
    error = true;
    reporter.error(reporter.lang('unknownUser', username));
  }

  reporter.step(3, 3, reporter.lang('revokingToken'));
  await revoke();

  if (error) {
    throw new Error();
  } else {
    return true;
  }
}

async function list(config, reporter, flags, args) {
  if (args.length > 1) {
    return false;
  }
  const name = await getName(args, config);
  reporter.step(1, 1, reporter.lang('ownerGetting', name));
  const pkg = await config.registries.npm.request(name, {unfiltered: true});
  if (pkg) {
    const owners = pkg.maintainers;
    if (!owners || !owners.length) {
      reporter.warn(reporter.lang('ownerNone'));
    } else {
      for (const owner of owners) {
        reporter.info(`${owner.name} <${owner.email}>`);
      }
    }
  } else {
    reporter.error(reporter.lang('ownerGettingFailed'));
  }

  if (pkg) {
    return true;
  } else {
    throw new Error();
  }
}

function remove(config, reporter, flags, args) {
  return mutate(
    args,
    config,
    reporter,
    (username, name) => ({
      info: reporter.lang('ownerRemoving', username, name),
      success: reporter.lang('ownerRemoved'),
      error: reporter.lang('ownerRemoveError'),
    }),
    (user, pkg) => {
      let found = false;

      pkg.maintainers = pkg.maintainers.filter((o) => {
        const match = o.name === user.name;
        found = found || match;
        return !match;
      });

      if (!found) {
        reporter.error(reporter.lang('userNotAnOwner', user.name));
      }

      return found;
    },
  );
}

export function setFlags(commander) {
  commander.description('Manages package owners.');
}

export const {run, hasWrapper, examples} = buildSubCommands(
  'owner',
  {
    add(config, reporter, flags, args) {
      return mutate(
        args,
        config,
        reporter,
        (username, name) => ({
          info: reporter.lang('ownerAdding', username, name),
          success: reporter.lang('ownerAdded'),
          error: reporter.lang('ownerAddingFailed'),
        }),
        (user, pkg) => {
          for (const owner of pkg.maintainers) {
            if (owner.name === user) {
              reporter.error(reporter.lang('ownerAlready'));
              return true;
            }
          }

          pkg.maintainers.push(user);

          return false;
        },
      );
    },

    rm(config, reporter, flags, args) {
      reporter.warn(`\`yarn owner rm\` is deprecated. Please use \`yarn owner remove\`.`);
      return remove(config, reporter, flags, args);
    },

    remove(config, reporter, flags, args) {
      return remove(config, reporter, flags, args);
    },

    ls(config, reporter, flags, args) {
      reporter.warn(`\`yarn owner ls\` is deprecated. Please use \`yarn owner list\`.`);
      return list(config, reporter, flags, args);
    },

    list(config, reporter, flags, args) {
      return list(config, reporter, flags, args);
    },
  },
  ['add <user> [[<@scope>/]<pkg>]', 'remove <user> [[<@scope>/]<pkg>]', 'list [<@scope>/]<pkg>'],
);
