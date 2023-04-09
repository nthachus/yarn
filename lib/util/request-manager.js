'use strict';
var _interopRequireWildcard = require('@babel/runtime/helpers/interopRequireWildcard').default;
var _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault').default;
exports.__esModule = true;
exports.default = void 0;

var fs = require('fs');
var http = require('http');
var url = require('url');
var dnscache = require('dnscache');
var invariant = require('invariant');
var RequestCaptureHar = require('request-capture-har');

var _errors = require('../errors.js');
var _blockingQueue = _interopRequireDefault(require('./blocking-queue.js'));
var constants = _interopRequireWildcard(require('../constants.js'));
var network = _interopRequireWildcard(require('./network.js'));
var _map = _interopRequireDefault(require('../util/map.js'));

// Initialize DNS cache so we don't look up the same
// domains like registry.yarnpkg.com over and over again
// for each request.
dnscache({
  enable: true,
  ttl: 300,
  cachesize: 10,
});
var successHosts = (0, _map.default)();
var controlOffline = network.isOffline();

class RequestManager {
  constructor(reporter) {
    this.cert = void 0;
    this.key = void 0;
    this.timeout = void 0;

    this.offlineNoRequests = false;
    this._requestCaptureHar = null;
    this._requestModule = null;
    this.offlineQueue = [];
    this.captureHar = false;
    this.httpsProxy = '';
    this.ca = null;
    this.httpProxy = '';
    this.strictSSL = true;
    this.userAgent = '';
    this.reporter = reporter;
    this.running = 0;
    this.queue = [];
    this.cache = {};
    this.max = constants.NETWORK_CONCURRENCY;
    this.maxRetryAttempts = 5;
  }

  setOptions(opts) {
    if (opts.userAgent != null) {
      this.userAgent = opts.userAgent;
    }

    if (opts.offline != null) {
      this.offlineNoRequests = opts.offline;
    }

    if (opts.captureHar != null) {
      this.captureHar = opts.captureHar;
    }

    if (opts.httpProxy != null) {
      this.httpProxy = opts.httpProxy || '';
    }

    if (opts.httpsProxy === '') {
      this.httpsProxy = opts.httpProxy || '';
    } else if (opts.httpsProxy === false) {
      this.httpsProxy = false;
    } else {
      this.httpsProxy = opts.httpsProxy || '';
    }

    if (opts.strictSSL !== null && typeof opts.strictSSL !== 'undefined') {
      this.strictSSL = opts.strictSSL;
    }

    if (opts.ca != null && opts.ca.length > 0) {
      this.ca = opts.ca;
    }

    if (opts.networkConcurrency != null) {
      this.max = opts.networkConcurrency;
    }

    if (opts.networkTimeout != null) {
      this.timeout = opts.networkTimeout;
    }

    if (opts.maxRetryAttempts != null) {
      this.maxRetryAttempts = opts.maxRetryAttempts;
    }

    if (opts.cafile != null && opts.cafile != '') {
      // The CA bundle file can contain one or more certificates with comments/text between each PEM block.
      // tls.connect wants an array of certificates without any comments/text, so we need to split the string
      // and strip out any text in between the certificates
      try {
        var bundle = fs.readFileSync(opts.cafile).toString();
        var hasPemPrefix = block => block.startsWith('-----BEGIN ');
        // opts.cafile overrides opts.ca, this matches with npm behavior
        this.ca = bundle.split(/(-----BEGIN .*\r?\n[^-]+\r?\n--.*)/).filter(hasPemPrefix);
      } catch (err) {
        this.reporter.error(`Could not open cafile: ${err.message}`);
      }
    }

    if (opts.cert != null) {
      this.cert = opts.cert;
    }

    if (opts.key != null) {
      this.key = opts.key;
    }
  }

  /**
   * Lazy load `request` since it is exceptionally expensive to load and is
   * often not needed at all.
   */

  _getRequestModule() {
    if (!this._requestModule) {
      var request = require('request');
      if (this.captureHar) {
        this._requestCaptureHar = new RequestCaptureHar(request);
        this._requestModule = this._requestCaptureHar.request.bind(this._requestCaptureHar);
      } else {
        this._requestModule = request;
      }
    }
    return this._requestModule;
  }

  /**
   * Queue up a request.
   */

  request(params) {
    if (this.offlineNoRequests) {
      return Promise.reject(new _errors.MessageError(this.reporter.lang('cantRequestOffline', params.url)));
    }

    var cached = this.cache[params.url];
    if (cached) {
      return cached;
    }

    params.method = params.method || 'GET';
    params.forever = true;
    params.retryAttempts = 0;
    params.strictSSL = this.strictSSL;
    params.headers = Object.assign(
      {
        'User-Agent': this.userAgent,
      },
      params.headers
    );

    var promise = new Promise((resolve, reject) => {
      this.queue.push({params, reject, resolve});
      this.shiftQueue();
    });

    // we can't cache a request with a processor
    if (!params.process) {
      this.cache[params.url] = promise;
    }

    return promise;
  }

  /**
   * Clear the request cache. This is important as we cache all HTTP requests so you'll
   * want to do this as soon as you can.
   */

  clearCache() {
    this.cache = {};
    if (this._requestCaptureHar != null) {
      this._requestCaptureHar.clear();
    }
  }

  /**
   * Check if an error is possibly due to lost or poor network connectivity.
   */

  isPossibleOfflineError(err) {
    var code = err.code, hostname = err.hostname;
    if (!code) {
      return false;
    }

    // network was previously online but now we're offline
    var possibleOfflineChange = !controlOffline && !network.isOffline();
    if (code === 'ENOTFOUND' && possibleOfflineChange) {
      // can't resolve a domain
      return true;
    }

    // used to be able to resolve this domain! something is wrong
    if (code === 'ENOTFOUND' && hostname && successHosts[hostname]) {
      // can't resolve this domain but we've successfully resolved it before
      return true;
    }

    // network was previously offline and we can't resolve the domain
    if (code === 'ENOTFOUND' && controlOffline) {
      return true;
    }

    // connection was reset or dropped
    if (code === 'ECONNRESET') {
      return true;
    }

    // TCP timeout
    if (code === 'ESOCKETTIMEDOUT' || code === 'ETIMEDOUT') {
      return true;
    }

    return false;
  }

  /**
   * Queue up request arguments to be retried. Start a network connectivity timer if there
   * isn't already one.
   */

  queueForRetry(opts) {
    if (opts.retryReason) {
      var containsReason = false;

      for (var queuedOpts of this.offlineQueue) {
        if (queuedOpts.retryReason === opts.retryReason) {
          containsReason = true;
          break;
        }
      }

      if (!containsReason) {
        this.reporter.info(opts.retryReason);
      }
    }

    if (!this.offlineQueue.length) {
      this.initOfflineRetry();
    }

    this.offlineQueue.push(opts);
  }

  /**
   * Begin timers to retry failed requests when we possibly establish network connectivity
   * again.
   */

  initOfflineRetry() {
    setTimeout(() => {
      var queue = this.offlineQueue;
      this.offlineQueue = [];
      for (var opts of queue) {
        this.execute(opts);
      }
    }, 3000);
  }

  /**
   * Execute a request.
   */

  execute(opts) {
    var params = opts.params;
    var reporter = this.reporter;

    var buildNext = fn => data => {
      fn(data);
      this.running--;
      this.shiftQueue();
    };

    var resolve = buildNext(opts.resolve);

    var rejectNext = buildNext(opts.reject);
    var reject = function(err) {
      err.message = `${params.url}: ${err.message}`;
      rejectNext(err);
    };

    var rejectWithoutUrl = function(err) {
      err.message = err.message;
      rejectNext(err);
    };

    var queueForRetry = reason => {
      var attempts = params.retryAttempts || 0;
      if (attempts >= this.maxRetryAttempts - 1) {
        return false;
      }
      if (opts.params.method && opts.params.method.toUpperCase() !== 'GET') {
        return false;
      }
      params.retryAttempts = attempts + 1;
      if (typeof params.cleanup === 'function') {
        params.cleanup();
      }
      opts.retryReason = reason;
      this.queueForRetry(opts);
      return true;
    };

    var calledOnError = false;
    var onError = err => {
      if (calledOnError) {
        return;
      }
      calledOnError = true;

      if (this.isPossibleOfflineError(err)) {
        if (!queueForRetry(this.reporter.lang('offlineRetrying'))) {
          reject(err);
        }
      } else {
        reject(err);
      }
    };

    if (!params.process) {
      var parts = url.parse(params.url);

      params.callback = (err, res, body) => {
        if (err) {
          onError(err);
          return;
        }

        successHosts[parts.hostname] = true;

        this.reporter.verbose(this.reporter.lang('verboseRequestFinish', params.url, res.statusCode));

        if (res.statusCode === 408 || res.statusCode >= 500) {
          var description = `${res.statusCode} ${http.STATUS_CODES[res.statusCode]}`;
          if (!queueForRetry(this.reporter.lang('internalServerErrorRetrying', description))) {
            throw new _errors.ResponseError(this.reporter.lang('requestFailed', description), res.statusCode);
          } else {
            return;
          }
        }

        if (res.statusCode === 401 && res.caseless && res.caseless.get('server') === 'GitHub.com') {
          var message = `${res.body.message}. If using GITHUB_TOKEN in your env, check that it is valid.`;
          rejectWithoutUrl(new Error(this.reporter.lang('unauthorizedResponse', res.caseless.get('server'), message)));
        }

        if (res.statusCode === 401 && res.headers['www-authenticate']) {
          var authMethods = res.headers['www-authenticate'].split(/,\s*/).map(s => s.toLowerCase());
          if (authMethods.indexOf('otp') !== -1) {
            reject(new _errors.OneTimePasswordError(res.headers['npm-notice']));
            return;
          }
        }

        if (body && typeof body.error === 'string') {
          reject(new Error(body.error));
          return;
        }

        if ([400, 401, 404].concat(params.rejectStatusCode || []).indexOf(res.statusCode) !== -1) {
          // So this is actually a rejection ... the hosted git resolver uses this to know whether http is supported
          resolve(false);
        } else if (res.statusCode >= 400) {
          var errMsg = (body && body.message) || reporter.lang('requestError', params.url, res.statusCode);
          reject(new Error(errMsg));
        } else {
          resolve(body);
        }
      };
    }

    if (params.buffer) {
      params.encoding = null;
    }

    var proxy = this.httpProxy;
    if (params.url.startsWith('https:')) {
      proxy = this.httpsProxy;
    }

    if (proxy) {
      // if no proxy is set, do not pass a proxy down to request.
      // the request library will internally check the HTTP_PROXY and HTTPS_PROXY env vars.
      params.proxy = String(proxy);
    } else if (proxy === false) {
      // passing empty string prevents the underlying library from falling back to the env vars.
      // an explicit false in the yarn config should override the env var. See #4546.
      params.proxy = '';
    }

    if (this.ca != null) {
      params.ca = this.ca;
    }

    if (this.cert != null) {
      params.cert = this.cert;
    }

    if (this.key != null) {
      params.key = this.key;
    }

    if (this.timeout != null) {
      params.timeout = this.timeout;
    }

    var request = this._getRequestModule();
    var req = request(params);
    this.reporter.verbose(this.reporter.lang('verboseRequestStart', params.method, params.url));

    req.on('error', onError);

    var queue = params.queue;
    if (queue) {
      req.on('data', queue.stillActive.bind(queue));
    }

    var process = params.process;
    if (process) {
      req.on('response', res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return;
        }

        var description = `${res.statusCode} ${http.STATUS_CODES[res.statusCode]}`;
        reject(new _errors.ResponseError(this.reporter.lang('requestFailed', description), res.statusCode));

        req.abort();
      });
      process(req, resolve, reject);
    }
  }

  /**
   * Remove an item from the queue. Create it's request options and execute it.
   */

  shiftQueue() {
    if (this.running >= this.max || !this.queue.length) {
      return;
    }

    var opts = this.queue.shift();

    this.running++;
    this.execute(opts);
  }

  saveHar(filename) {
    if (!this.captureHar) {
      throw new Error(this.reporter.lang('requestManagerNotSetupHAR'));
    }
    // No request may have occurred at all.
    this._getRequestModule();
    invariant(this._requestCaptureHar != null, 'request-capture-har not setup');
    this._requestCaptureHar.saveHar(filename);
  }
}
exports.default = RequestManager;
