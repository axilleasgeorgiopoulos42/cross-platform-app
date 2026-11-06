// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildPrecacheList } = require('../../scripts/pwa/precache');

describe('buildPrecacheList', () => {
  it('excludes sw.js, metadata.json and source maps', () => {
    const out = buildPrecacheList([
      'index.html',
      'sw.js',
      'metadata.json',
      '_expo/static/js/web/entry-x.js',
      '_expo/static/js/web/entry-x.js.map',
    ]);
    expect(out).not.toContain('/sw.js');
    expect(out).not.toContain('/metadata.json');
    expect(out).not.toContain('/_expo/static/js/web/entry-x.js.map');
    expect(out).toContain('/_expo/static/js/web/entry-x.js');
  });

  it('keeps index.html, wasm, ttf, icons, manifest and favicon', () => {
    const out = buildPrecacheList([
      'index.html',
      '_expo/static/wasm/sql-wasm-abc.wasm',
      'fonts/Inter.ttf',
      'icons/icon-192.png',
      'manifest.webmanifest',
      'favicon.ico',
    ]);
    expect(out).toEqual(
      expect.arrayContaining([
        '/index.html',
        '/_expo/static/wasm/sql-wasm-abc.wasm',
        '/fonts/Inter.ttf',
        '/icons/icon-192.png',
        '/manifest.webmanifest',
        '/favicon.ico',
      ]),
    );
  });

  it('prefixes every entry with a leading slash', () => {
    const out = buildPrecacheList(['index.html', 'a/b.js']);
    expect(out.every((p: string) => p.startsWith('/'))).toBe(true);
  });

  it('sorts and de-duplicates the output', () => {
    expect(buildPrecacheList(['b.js', 'a.js', 'a.js'])).toEqual(['/a.js', '/b.js']);
  });
});
