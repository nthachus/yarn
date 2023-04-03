export function explodeHashedUrl(url) {
  const parts = url.split('#');

  return {
    hash: parts[1] || '',
    url: parts[0],
  };
}
