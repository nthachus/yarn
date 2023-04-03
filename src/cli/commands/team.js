import buildSubCommands from './_build-sub-commands.js';
import {getToken} from './login.js';

function explodeScopeTeam(arg, requireTeam, reporter) {
  const [scope, team, ...parts] = arg.split(':');

  if (parts.length) {
    return false;
  }

  if (requireTeam && !team) {
    return false;
  }

  return {
    scope: scope || '',
    team: team || '',
    user: '',
  };
}

function warnDeprecation(reporter, deprecationWarning) {
  const command = 'yarn team';
  reporter.warn(
    reporter.lang(
      'deprecatedCommand',
      `${command} ${deprecationWarning.deprecatedCommand}`,
      `${command} ${deprecationWarning.currentCommand}`,
    ),
  );
}

function wrapRequired(
  callback,
  requireTeam,
  deprecationInfo,
) {
  return async function(config, reporter, flags, args) {
    if (deprecationInfo) {
      warnDeprecation(reporter, deprecationInfo);
    }

    if (!args.length) {
      return false;
    }

    const parts = explodeScopeTeam(args[0], requireTeam, reporter);
    if (!parts) {
      return false;
    }

    reporter.step(1, 3, reporter.lang('loggingIn'));
    const revoke = await getToken(config, reporter);

    const res = await callback(parts, config, reporter, flags, args);
    if (!res) {
      return res;
    }

    reporter.step(3, 3, reporter.lang('revokingToken'));
    await revoke();
    return true;
  };
}

function wrapRequiredTeam(
  callback,
  requireTeam = true,
  subCommandDeprecated,
) {
  return wrapRequired(
    function(
      parts,
      config,
      reporter,
      flags,
      args,
    ) {
      if (args.length === 1) {
        return callback(parts, config, reporter, flags, args);
      } else {
        return false;
      }
    },
    requireTeam,
    subCommandDeprecated,
  );
}

function wrapRequiredUser(callback, subCommandDeprecated) {
  return wrapRequired(
    function(
      parts,
      config,
      reporter,
      flags,
      args,
    ) {
      if (args.length === 2) {
        return callback(
          {
            user: args[1],
            ...parts,
          },
          config,
          reporter,
          flags,
          args,
        );
      } else {
        return false;
      }
    },
    true,
    subCommandDeprecated,
  );
}

async function removeTeamUser(parts, config, reporter) {
  reporter.step(2, 3, reporter.lang('teamRemovingUser'));
  reporter.inspect(
    await config.registries.npm.request(`team/${parts.scope}/${parts.team}/user`, {
      method: 'DELETE',
      body: {
        user: parts.user,
      },
    }),
  );
  return true;
}

async function list(parts, config, reporter) {
  reporter.step(2, 3, reporter.lang('teamListing'));
  const uriParams = '?format=cli';
  if (parts.team) {
    reporter.inspect(await config.registries.npm.request(`team/${parts.scope}/${parts.team}/user${uriParams}`));
  } else {
    reporter.inspect(await config.registries.npm.request(`org/${parts.scope}/team${uriParams}`));
  }
  return true;
}

export function setFlags(commander) {
  commander.description('Maintain team memberships');
}

export const {run, hasWrapper, examples} = buildSubCommands(
  'team',
  {
    create: wrapRequiredTeam(async function(
      parts,
      config,
      reporter,
      flags,
      args,
    ) {
      reporter.step(2, 3, reporter.lang('teamCreating'));
      reporter.inspect(
        await config.registries.npm.request(`team/${parts.scope}`, {
          method: 'PUT',
          body: {
            team: parts.team,
          },
        }),
      );
      return true;
    }),

    destroy: wrapRequiredTeam(async function(
      parts,
      config,
      reporter,
      flags,
      args,
    ) {
      reporter.step(2, 3, reporter.lang('teamRemoving'));
      reporter.inspect(
        await config.registries.npm.request(`team/${parts.scope}/${parts.team}`, {
          method: 'DELETE',
        }),
      );
      return true;
    }),

    add: wrapRequiredUser(async function(
      parts,
      config,
      reporter,
      flags,
      args,
    ) {
      reporter.step(2, 3, reporter.lang('teamAddingUser'));
      reporter.inspect(
        await config.registries.npm.request(`team/${parts.scope}/${parts.team}/user`, {
          method: 'PUT',
          body: {
            user: parts.user,
          },
        }),
      );
      return true;
    }),

    rm: wrapRequiredUser(
      function(parts, config, reporter, flags, args) {
        removeTeamUser(parts, config, reporter);
      },
      {
        deprecatedCommand: 'rm',
        currentCommand: 'remove',
      },
    ),

    remove: wrapRequiredUser(function(
      parts,
      config,
      reporter,
      flags,
      args,
    ) {
      removeTeamUser(parts, config, reporter);
    }),

    ls: wrapRequiredTeam(
      function(parts, config, reporter, flags, args) {
        list(parts, config, reporter);
      },
      false,
      {
        deprecatedCommand: 'ls',
        currentCommand: 'list',
      },
    ),

    list: wrapRequiredTeam(function(
      parts,
      config,
      reporter,
      flags,
      args,
    ) {
      list(parts, config, reporter);
    }, false),
  },
  [
    'create <scope:team>',
    'destroy <scope:team>',
    'add <scope:team> <user>',
    'remove <scope:team> <user>',
    'list <scope>|<scope:team>',
  ],
);
