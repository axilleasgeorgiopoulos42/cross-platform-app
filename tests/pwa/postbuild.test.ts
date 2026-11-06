import fs from 'fs';
import os from 'os';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildPwa } = require('../../scripts/pwa-postbuild');

const HTML = '<!doctype html><html><head><title>x</title></head><body></body></html>';

let dir: string;

function write(rel: string, content: string | Buffer) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function makeFixture() {
  write('index.html', HTML);
  write('_expo/static/js/web/entry-1.js', 'console.log(1);');
  write('assets/sql.wasm', 'wasm');
  write('manifest.webmanifest', '{}');
  write('icons/icon-192.png', 'png');
}

function read(rel: string) {
  return fs.readFileSync(path.join(dir, rel), 'utf8');
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-postbuild-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('buildPwa', () => {
  it('writes sw.js listing every file but not itself', () => {
    makeFixture();
    buildPwa(dir);
    const sw = read('sw.js');
    expect(sw).toContain('/assets/sql.wasm');
    expect(sw).toContain('/index.html');
    expect(sw).not.toContain('"/sw.js"');
  });

  it('injects head tags into index.html', () => {
    makeFixture();
    buildPwa(dir);
    const html = read('index.html');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('theme-color');
  });

  it('second run does not duplicate tags and keeps one manifest link', () => {
    makeFixture();
    buildPwa(dir);
    buildPwa(dir);
    const html = read('index.html');
    expect(html.match(/rel="manifest"/g)).toHaveLength(1);
  });

  it('version is identical across runs on unchanged files', () => {
    makeFixture();
    const a = buildPwa(dir);
    const b = buildPwa(dir);
    expect(a.version).toMatch(/^[0-9a-f]{12}$/);
    expect(b.version).toBe(a.version);
    expect(b.count).toBe(a.count);
  });

  it("version changes when a file's bytes change", () => {
    makeFixture();
    const a = buildPwa(dir);
    write('_expo/static/js/web/entry-1.js', 'console.log(2);');
    const b = buildPwa(dir);
    expect(b.version).not.toBe(a.version);
  });

  it('fails without a wasm file', () => {
    makeFixture();
    fs.rmSync(path.join(dir, 'assets/sql.wasm'));
    expect(() => buildPwa(dir)).toThrow(/wasm/i);
  });

  it('fails when index.html has no <head>', () => {
    makeFixture();
    write('index.html', '<html><body></body></html>');
    expect(() => buildPwa(dir)).toThrow(/head/i);
  });

  it('fails when the manifest is missing', () => {
    makeFixture();
    fs.rmSync(path.join(dir, 'manifest.webmanifest'));
    expect(() => buildPwa(dir)).toThrow(/public\//);
  });

  it('fails above 25 MB', () => {
    makeFixture();
    write('assets/big.bin', Buffer.alloc(26 * 1024 * 1024));
    expect(() => buildPwa(dir)).toThrow(/25 MB/);
  });

  it('ignores .map files for the size cap, count and bytes', () => {
    makeFixture();
    const base = buildPwa(dir);
    write('assets/big.js.map', Buffer.alloc(26 * 1024 * 1024));
    const r = buildPwa(dir);
    expect(r.count).toBe(base.count);
    expect(r.bytes).toBe(base.bytes);
  });

  it('leaves .map files and metadata.json out of sw.js', () => {
    makeFixture();
    write('assets/app.js.map', '{}');
    write('metadata.json', '{}');
    buildPwa(dir);
    const sw = read('sw.js');
    expect(sw).not.toContain('app.js.map');
    expect(sw).not.toContain('metadata.json');
  });
});
