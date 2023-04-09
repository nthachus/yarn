'use strict';
exports.__esModule = true;
exports.explodeHashedUrl = explodeHashedUrl;

function explodeHashedUrl(url) {
  var parts = url.split('#');

  return {
    hash: parts[1] || '',
    url: parts[0],
  };
}
