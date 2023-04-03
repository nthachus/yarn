import {promisify} from '../../util/promise.js';
import {buildTree as hoistedTreeBuilder} from '../../hoisted-tree-builder';
import {getTransitiveDevDependencies} from '../../util/get-transitive-dev-dependencies';
import {Install} from './install.js';
import Lockfile from '../../lockfile';
import {OWNED_DEPENDENCY_TYPES, YARN_REGISTRY} from '../../constants';

const zlib = require('zlib');
const gzip = promisify(zlib.gzip);

export function setFlags(commander) {
  commander.description('Checks for known security issues with the installed packages.');
  commander.option('--summary', 'Only print the summary.');
  commander.option(
    '--groups <group_name> [<group_name> ...]',
    `Only audit dependencies from listed groups. Default: ${OWNED_DEPENDENCY_TYPES.join(', ')}`,
    groups => groups.split(' '),
    OWNED_DEPENDENCY_TYPES,
  );
  commander.option(
    '--level <severity>',
    `Only print advisories with severity greater than or equal to one of the following: \
    info|low|moderate|high|critical. Default: info`,
    'info',
  );
}

export function hasWrapper(commander, args) {
  return true;
}

export async function run(config, reporter, flags, args) {
  const DEFAULT_LOG_LEVEL = 'info';
  const audit = new Audit(config, reporter, {
    groups: flags.groups || OWNED_DEPENDENCY_TYPES,
    level: flags.level || DEFAULT_LOG_LEVEL,
  });
  const lockfile = await Lockfile.fromDirectory(config.lockfileFolder, reporter);
  const install = new Install({}, config, reporter, lockfile);
  const {manifest, requests, patterns, workspaceLayout} = await install.fetchRequestFromCwd();
  await install.resolver.init(requests, {
    workspaceLayout,
  });

  const vulnerabilities = await audit.performAudit(manifest, lockfile, install.resolver, install.linker, patterns);

  const EXIT_INFO = 1;
  const EXIT_LOW = 2;
  const EXIT_MODERATE = 4;
  const EXIT_HIGH = 8;
  const EXIT_CRITICAL = 16;

  const exitCode =
    (vulnerabilities.info ? EXIT_INFO : 0) +
    (vulnerabilities.low ? EXIT_LOW : 0) +
    (vulnerabilities.moderate ? EXIT_MODERATE : 0) +
    (vulnerabilities.high ? EXIT_HIGH : 0) +
    (vulnerabilities.critical ? EXIT_CRITICAL : 0);

  if (flags.summary) {
    audit.summary();
  } else {
    audit.report();
  }

  return exitCode;
}

export default class Audit {
  severityLevels = ['info', 'low', 'moderate', 'high', 'critical'];

  constructor(config, reporter, options) {
    this.config = config;
    this.reporter = reporter;
    this.options = options;
  }

  auditData;

  _mapHoistedNodes(auditNode, hoistedNodes, transitiveDevDeps) {
    for (const node of hoistedNodes) {
      const pkg = node.manifest.pkg;
      const requires = Object.assign({}, pkg.dependencies || {}, pkg.optionalDependencies || {});
      for (const name of Object.keys(requires)) {
        if (!requires[name]) {
          requires[name] = '*';
        }
      }
      auditNode.dependencies[node.name] = {
        version: node.version,
        integrity: pkg._remote ? pkg._remote.integrity || '' : '',
        requires,
        dependencies: {},
        dev: transitiveDevDeps.has(`${node.name}@${node.version}`),
      };
      if (node.children) {
        this._mapHoistedNodes(auditNode.dependencies[node.name], node.children, transitiveDevDeps);
      }
    }
  }

  _mapHoistedTreesToAuditTree(manifest, hoistedTrees, transitiveDevDeps) {
    const requiresGroups = this.options.groups.map(function(group) {
      return manifest[group] || {};
    });

    const auditTree = {
      name: manifest.name || undefined,
      version: manifest.version || undefined,
      install: [],
      remove: [],
      metadata: {
        //TODO: What do we send here? npm sends npm version, node version, etc.
      },
      requires: Object.assign({}, ...requiresGroups),
      integrity: undefined,
      dependencies: {},
      dev: false,
    };

    this._mapHoistedNodes(auditTree, hoistedTrees, transitiveDevDeps);
    return auditTree;
  }

  async _fetchAudit(auditTree) {
    let responseJson;
    const registry = YARN_REGISTRY;
    this.reporter.verbose(`Audit Request: ${JSON.stringify(auditTree, null, 2)}`);
    const requestBody = await gzip(JSON.stringify(auditTree));
    const response = await this.config.requestManager.request({
      url: `${registry}/-/npm/v1/security/audits`,
      method: 'POST',
      body: requestBody,
      headers: {
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    try {
      responseJson = JSON.parse(response);
    } catch (ex) {
      throw new Error(`Unexpected audit response (Invalid JSON): ${response}`);
    }
    if (!responseJson.metadata) {
      throw new Error(`Unexpected audit response (Missing Metadata): ${JSON.stringify(responseJson, null, 2)}`);
    }
    this.reporter.verbose(`Audit Response: ${JSON.stringify(responseJson, null, 2)}`);
    return responseJson;
  }

  _insertWorkspacePackagesIntoManifest(manifest, resolver) {
    if (resolver.workspaceLayout) {
      const workspaceAggregatorName = resolver.workspaceLayout.virtualManifestName;
      const workspaceManifest = resolver.workspaceLayout.workspaces[workspaceAggregatorName].manifest;

      manifest.dependencies = Object.assign(manifest.dependencies || {}, workspaceManifest.dependencies);
      manifest.devDependencies = Object.assign(manifest.devDependencies || {}, workspaceManifest.devDependencies);
      manifest.optionalDependencies = Object.assign(
        manifest.optionalDependencies || {},
        workspaceManifest.optionalDependencies,
      );
    }
  }

  async performAudit(
    manifest,
    lockfile,
    resolver,
    linker,
    patterns,
  ) {
    this._insertWorkspacePackagesIntoManifest(manifest, resolver);
    const transitiveDevDeps = getTransitiveDevDependencies(manifest, resolver.workspaceLayout, lockfile);
    const hoistedTrees = await hoistedTreeBuilder(resolver, linker, patterns);
    const auditTree = this._mapHoistedTreesToAuditTree(manifest, hoistedTrees, transitiveDevDeps);
    this.auditData = await this._fetchAudit(auditTree);
    return this.auditData.metadata.vulnerabilities;
  }

  summary() {
    if (!this.auditData) {
      return;
    }
    this.reporter.auditSummary(this.auditData.metadata);
  }

  report() {
    if (!this.auditData) {
      return;
    }

    const startLoggingAt = Math.max(0, this.severityLevels.indexOf(this.options.level));

    const reportAdvisory = (resolution) => {
      const advisory = this.auditData.advisories[resolution.id.toString()];

      if (this.severityLevels.indexOf(advisory.severity) >= startLoggingAt) {
        this.reporter.auditAdvisory(resolution, advisory);
      }
    };

    if (Object.keys(this.auditData.advisories).length !== 0) {
      // let printedManualReviewHeader = false;

      this.auditData.actions.forEach(action => {
        action.resolves.forEach(reportAdvisory);

        /* The following block has been temporarily removed
         * because the actions returned by npm are not valid for yarn.
         * Removing this action reporting until we can come up with a way
         * to correctly resolve issues.
         */
        // if (action.action === 'update' || action.action === 'install') {
        //   // these advisories can be resolved automatically by running a yarn command
        //   const recommendation: AuditActionRecommendation = {
        //     cmd: `yarn upgrade ${action.module}@${action.target}`,
        //     isBreaking: action.isMajor,
        //     action,
        //   };
        //   this.reporter.auditAction(recommendation);
        //   action.resolves.forEach(reportAdvisory);
        // }

        // if (action.action === 'review') {
        //   // these advisories cannot be resolved automatically and require manual review
        //   if (!printedManualReviewHeader) {
        //     this.reporter.auditManualReview();
        //   }
        //   printedManualReviewHeader = true;
        //   action.resolves.forEach(reportAdvisory);
        // }
      });
    }

    this.summary();
  }
}
