// Builds the list of URL paths the service worker precaches from the Expo web export.
// Input: file paths relative to dist/, forward slashes (e.g. 'index.html', '_expo/static/js/web/entry-abc.js').
// Output: sorted, de-duplicated URL paths with a leading '/'.

const EXCLUDED_PATHS = new Set(['sw.js', 'metadata.json']);

function isPrecacheable(path) {
  if (EXCLUDED_PATHS.has(path)) return false;
  if (path.endsWith('.map')) return false;
  return true;
}

function buildPrecacheList(files) {
  const urls = new Set(files.filter(isPrecacheable).map((path) => '/' + path));
  return [...urls].sort();
}

module.exports = { buildPrecacheList };
