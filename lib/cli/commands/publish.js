'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.hasWrapper = hasWrapper;
exports.run = run;
exports.setFlags = setFlags;
var _asyncToGenerator2 = _interopRequireDefault(require('@babel/runtime/helpers/asyncToGenerator'));

var _npmRegistry = _interopRequireDefault(require('../../registries/npm-registry.js'));
var _errors = require('../../errors.js');
var _version = require('./version.js');
var fs = _interopRequireWildcard(require('../../util/fs.js'));
var _pack = require('./pack.js');
var _login = require('./login.js');
var path = require('path');

var invariant = require('invariant');
var crypto = require('crypto');
var url = require('url');
var fs2 = require('fs');
var ssri = require('ssri');

function setFlags(commander) {
  (0, _version.setFlags)(commander);
  commander.description('Publishes a package to the npm registry.');
  commander.usage('publish [<tarball>|<folder>] [--tag <tag>] [--access <public|restricted>]');
  commander.option('--access [access]', 'access');
  commander.option('--tag [tag]', 'tag');
}

function hasWrapper(commander, args) {
  return true;
}

function publish() {
  return _publish.apply(this, arguments);
}
function _publish() {
  _publish = (0, _asyncToGenerator2.default)(function* (config, pkg, flags, dir) {
    var access = flags.access;

    // if no access level is provided, check package.json for `publishConfig.access`
    // see: https://docs.npmjs.com/files/package.json#publishconfig
    if (!access && pkg && pkg.publishConfig && pkg.publishConfig.access) {
      access = pkg.publishConfig.access;
    }

    // validate access argument
    if (access && access !== 'public' && access !== 'restricted') {
      throw new _errors.MessageError(config.reporter.lang('invalidAccess'));
    }

    // TODO this might modify package.json, do we need to reload it?
    yield config.executeLifecycleScript('prepublish');
    yield config.executeLifecycleScript('prepare');
    yield config.executeLifecycleScript('prepublishOnly');
    yield config.executeLifecycleScript('prepack');

    // get tarball stream
    var stat = yield fs.lstat(dir);
    var stream;
    if (stat.isDirectory()) {
      stream = yield (0, _pack.pack)(config);
    } else if (stat.isFile()) {
      stream = fs2.createReadStream(dir);
    } else {
      throw new Error("Don't know how to handle this file type");
    }
    var buffer = yield new Promise((resolve, reject) => {
      var data = [];
      invariant(stream, 'expected stream');
      stream.on('data', data.push.bind(data)).on('end', () => resolve(Buffer.concat(data))).on('error', reject);
    });

    yield config.executeLifecycleScript('postpack');

    // copy normalized package and remove internal keys as they may be sensitive or yarn specific
    pkg = Object.assign({}, pkg);
    for (var key in pkg) {
      if (key[0] === '_') {
        delete pkg[key];
      }
    }

    var tag = flags.tag || 'latest';
    var tbName = `${pkg.name}-${pkg.version}.tgz`;
    var tbURI = `${pkg.name}/-/${tbName}`;

    // create body
    var root = {
      _id: pkg.name,
      access,
      name: pkg.name,
      description: pkg.description,
      'dist-tags': {
        [tag]: pkg.version,
      },
      versions: {
        [pkg.version]: pkg,
      },
      readme: pkg.readme || '',
      _attachments: {
        [tbName]: {
          content_type: 'application/octet-stream',
          data: buffer.toString('base64'),
          length: buffer.length,
        },
      },
    };

    pkg._id = `${pkg.name}@${pkg.version}`;
    pkg.dist = pkg.dist || {};
    pkg.dist.shasum = crypto.createHash('sha1').update(buffer).digest('hex');
    pkg.dist.integrity = ssri.fromData(buffer).toString();

    var registry = String(config.getOption('registry'));
    pkg.dist.tarball = url.resolve(registry, tbURI).replace(/^https:\/\//, 'http://');

    // publish package
    try {
      yield config.registries.npm.request(_npmRegistry.default.escapeName(pkg.name), {
        registry: pkg && pkg.publishConfig && pkg.publishConfig.registry,
        method: 'PUT',
        body: root,
      });
    } catch (error) {
      throw new _errors.MessageError(config.reporter.lang('publishFail', error.message));
    }

    yield config.executeLifecycleScript('publish');
    yield config.executeLifecycleScript('postpublish');
  });

  return _publish.apply(this, arguments);
}

function run() {
  return _run.apply(this, arguments);
}
function _run() {
  _run = (0, _asyncToGenerator2.default)(function* (config, reporter, flags, args) {
    // validate arguments
    var dir = args[0] ? path.resolve(config.cwd, args[0]) : config.cwd;
    if (args.length > 1) {
      throw new _errors.MessageError(reporter.lang('tooManyArguments', 1));
    }
    if (!(yield fs.exists(dir))) {
      throw new _errors.MessageError(reporter.lang('unknownFolderOrTarball'));
    }

    var stat = yield fs.lstat(dir);
    var publishPath = dir;
    if (stat.isDirectory()) {
      config.cwd = path.resolve(dir);
      publishPath = config.cwd;
    }

    // validate package fields that are required for publishing
    // $FlowFixMe
    var pkg = yield config.readRootManifest();
    if (pkg.private) {
      throw new _errors.MessageError(reporter.lang('publishPrivate'));
    }
    if (!pkg.name) {
      throw new _errors.MessageError(reporter.lang('noName'));
    }

    var registry = '';

    if (pkg && pkg.publishConfig && pkg.publishConfig.registry) {
      registry = pkg.publishConfig.registry;
    }

    reporter.step(1, 4, reporter.lang('bumpingVersion'));
    var commitVersion = yield (0, _version.setVersion)(config, reporter, flags, [], false);

    //
    reporter.step(2, 4, reporter.lang('loggingIn'));
    var revoke = yield (0, _login.getToken)(config, reporter, pkg.name, flags, registry);

    //
    reporter.step(3, 4, reporter.lang('publishing'));
    yield publish(config, pkg, flags, publishPath);
    yield commitVersion();
    reporter.success(reporter.lang('published'));

    //
    reporter.step(4, 4, reporter.lang('revokingToken'));
    yield revoke();
  });

  return _run.apply(this, arguments);
}
