'use strict';
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _promise = require('../../util/promise.js');
var _hoistedTreeBuilder = require('../../hoisted-tree-builder');
var _getTransitiveDevDependencies = require('../../util/get-transitive-dev-dependencies');
var _install = require('./install.js');
var _lockfile = _interopRequireDefault(require('../../lockfile'));
var _constants = require('../../constants');

var zlib = require('zlib');
var gzip = (0, _promise.promisify)(zlib.gzip);

function setFlags(commander) {
  commander.description('Checks for known security issues with the installed packages.');
  commander.option('--summary', 'Only print the summary.');
  commander.option(
    '--groups <group_name> [<group_name> ...]',
    `Only audit dependencies from listed groups. Default: ${_constants.OWNED_DEPENDENCY_TYPES.join(', ')}`,
    groups => groups.split(' '),
    _constants.OWNED_DEPENDENCY_TYPES
  );
  commander.option(
    '--level <severity>',
    `Only print advisories with severity greater than or equal to one of the following: \
    info|low|moderate|high|critical. Default: info`,
    'info'
  );
}

function hasWrapper(commander, args) {
  return true;
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    var DEFAULT_LOG_LEVEL = 'info';
    var audit = new Audit(config, reporter, {
      groups: flags.groups || _constants.OWNED_DEPENDENCY_TYPES,
      level: flags.level || DEFAULT_LOG_LEVEL,
    });
    var lockfile = yield _lockfile.default.fromDirectory(config.lockfileFolder, reporter);
    var install = new _install.Install({}, config, reporter, lockfile);
    var _yield$install$fetchR = yield install.fetchRequestFromCwd(), manifest = _yield$install$fetchR.manifest, requests = _yield$install$fetchR.requests, patterns = _yield$install$fetchR.patterns, workspaceLayout = _yield$install$fetchR.workspaceLayout;
    yield install.resolver.init(requests, {
      workspaceLayout,
    });

    var vulnerabilities = yield audit.performAudit(manifest, lockfile, install.resolver, install.linker, patterns);

    var EXIT_INFO = 1;
    var EXIT_LOW = 2;
    var EXIT_MODERATE = 4;
    var EXIT_HIGH = 8;
    var EXIT_CRITICAL = 16;

    var exitCode =
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
  });

  return _run.apply(this, arguments);
}

class Audit {
  constructor(config, reporter, options) {
    this.severityLevels = ['info', 'low', 'moderate', 'high', 'critical'];
    this.auditData = void 0;

    this.config = config;
    this.reporter = reporter;
    this.options = options;
  }

  _mapHoistedNodes(auditNode, hoistedNodes, transitiveDevDeps) {
    for (var node of hoistedNodes) {
      var pkg = node.manifest.pkg;
      var requires = Object.assign({}, pkg.dependencies || {}, pkg.optionalDependencies || {});
      for (var name of Object.keys(requires)) {
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
    var requiresGroups = this.options.groups.map(function(group) {
      return manifest[group] || {};
    });

    var auditTree = {
      name: manifest.name || undefined,
      version: manifest.version || undefined,
      install: [],
      remove: [],
      metadata: {
        //TODO: What do we send here? npm sends npm version, node version, etc.
      },
      requires: Object.assign.apply(Object, [{}].concat(requiresGroups)),
      integrity: undefined,
      dependencies: {},
      dev: false,
    };

    this._mapHoistedNodes(auditTree, hoistedTrees, transitiveDevDeps);
    return auditTree;
  }

  _fetchAudit(auditTree) {
    var _this = this;
    return (0, _asyncToGenerator2.default)(function* () {
      var responseJson;
      var registry = _constants.YARN_REGISTRY;
      _this.reporter.verbose(`Audit Request: ${JSON.stringify(auditTree, null, 2)}`);
      var requestBody = yield gzip(JSON.stringify(auditTree));
      var response = yield _this.config.requestManager.request({
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
      _this.reporter.verbose(`Audit Response: ${JSON.stringify(responseJson, null, 2)}`);
      return responseJson;
    })();
  }

  _insertWorkspacePackagesIntoManifest(manifest, resolver) {
    if (resolver.workspaceLayout) {
      var workspaceAggregatorName = resolver.workspaceLayout.virtualManifestName;
      var workspaceManifest = resolver.workspaceLayout.workspaces[workspaceAggregatorName].manifest;

      manifest.dependencies = Object.assign(manifest.dependencies || {}, workspaceManifest.dependencies);
      manifest.devDependencies = Object.assign(manifest.devDependencies || {}, workspaceManifest.devDependencies);
      manifest.optionalDependencies = Object.assign(
        manifest.optionalDependencies || {},
        workspaceManifest.optionalDependencies
      );
    }
  }

  performAudit(
    manifest,
    lockfile,
    resolver,
    linker,
    patterns
  ) {
    var _this2 = this;
    return (0, _asyncToGenerator2.default)(function* () {
      _this2._insertWorkspacePackagesIntoManifest(manifest, resolver);
      var transitiveDevDeps = (0, _getTransitiveDevDependencies.getTransitiveDevDependencies)(manifest, resolver.workspaceLayout, lockfile);
      var hoistedTrees = yield (0, _hoistedTreeBuilder.buildTree)(resolver, linker, patterns);
      var auditTree = _this2._mapHoistedTreesToAuditTree(manifest, hoistedTrees, transitiveDevDeps);
      _this2.auditData = yield _this2._fetchAudit(auditTree);
      return _this2.auditData.metadata.vulnerabilities;
    })();
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

    var startLoggingAt = Math.max(0, this.severityLevels.indexOf(this.options.level));

    var reportAdvisory = (resolution) => {
      var advisory = this.auditData.advisories[resolution.id.toString()];

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
exports.default = Audit;
