// Post-build step for the Expo web export: injects PWA head tags into dist/index.html
// and writes dist/sw.js with a content-derived version and the precache list.
// Usage: node scripts/pwa-postbuild.js (run after `expo export --platform web`).

/* global __dirname */
const { Buffer } = require('buffer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const colors = require('./pwa/colors');
const { buildPrecacheList } = require('./pwa/precache');
const { injectHead } = require('./pwa/inject-head');
const { buildServiceWorker } = require('./pwa/service-worker');

const MAX_BYTES = 25 * 1024 * 1024;

function listFiles(root, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(root, relPath));
    else out.push(relPath);
  }
  return out;
}

function buildPwa(distDir) {
  const files = listFiles(distDir)
    .filter((f) => f !== 'sw.js')
    .sort();

  if (!files.includes('index.html')) {
    throw new Error(`PWA: index.html not found in ${distDir}`);
  }
  const injectedHtml = Buffer.from(
    injectHead(fs.readFileSync(path.join(distDir, 'index.html'), 'utf8'), colors),
    'utf8',
  );

  const urls = buildPrecacheList(files);
  if (!urls.some((u) => u.endsWith('.wasm'))) {
    throw new Error('PWA: no .wasm file found in the export (sql.js needs it offline)');
  }
  if (!urls.includes('/manifest.webmanifest')) {
    throw new Error('PWA: manifest.webmanifest missing from the export; add it under public/');
  }

  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for (const rel of files) {
    const data = rel === 'index.html' ? injectedHtml : fs.readFileSync(path.join(distDir, rel));
    bytes += data.length;
    hash.update(rel);
    hash.update('\0');
    hash.update(data);
  }
  if (bytes > MAX_BYTES) {
    throw new Error(
      `PWA: export is ${(bytes / 1024 / 1024).toFixed(1)} MB, above the 25 MB precache limit`,
    );
  }
  const version = hash.digest('hex').slice(0, 12);

  fs.writeFileSync(path.join(distDir, 'index.html'), injectedHtml);
  fs.writeFileSync(path.join(distDir, 'sw.js'), buildServiceWorker(version, urls));

  return { version, count: files.length, bytes };
}

module.exports = { buildPwa };

if (require.main === module) {
  try {
    const { version, count, bytes } = buildPwa(path.join(__dirname, '..', 'dist'));
    console.log(`PWA: ${count} files, ${(bytes / 1024 / 1024).toFixed(2)} MB, version ${version}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
