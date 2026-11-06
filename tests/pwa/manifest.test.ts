import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

import { colors } from '../../src/constants/theme';

const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8'),
);

const pngSize = (file: string) => {
  const buf = fs.readFileSync(file);
  const signature = buf.subarray(0, 8).toString('hex');
  return { signature, width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
};

/** Alpha of pixel (0,0); 255 when the PNG has no alpha channel. */
const cornerAlpha = (file: string) => {
  const buf = fs.readFileSync(file);
  const colourType = buf[25];
  if (colourType === 2) return 255;
  expect(colourType).toBe(6);
  const parts: Buffer[] = [];
  for (let pos = 8; pos < buf.length; ) {
    const len = buf.readUInt32BE(pos);
    if (buf.toString('ascii', pos + 4, pos + 8) === 'IDAT') {
      parts.push(buf.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  // First scanline: every PNG filter leaves pixel 0 unchanged (predictors are 0).
  return zlib.inflateSync(Buffer.concat(parts))[1 + 3];
};

const PNG_SIGNATURE = '89504e470d0a1a0a';

describe('web app manifest', () => {
  it('manifest identity', () => {
    expect(manifest.name).toBe('Planner');
    expect(manifest.short_name).toBe('Planner');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
  });

  it('manifest colours match the theme', () => {
    expect(manifest.background_color).toBe(colors.light.background);
    expect(manifest.theme_color).toBe(colors.light.primary);
  });

  it('every declared icon exists with its declared size', () => {
    for (const icon of manifest.icons) {
      const file = path.join(root, 'public', icon.src.replace(/^\//, ''));
      const [w, h] = icon.sizes.split('x').map(Number);
      const info = pngSize(file);
      expect(info.signature).toBe(PNG_SIGNATURE);
      expect([info.width, info.height]).toEqual([w, h]);
    }
    const extra: [string, number][] = [
      ['public/icons/icon-180.png', 180],
      ['assets/icon.png', 1024],
      ['assets/favicon.png', 48],
    ];
    for (const [rel, size] of extra) {
      const info = pngSize(path.join(root, rel));
      expect(info.signature).toBe(PNG_SIGNATURE);
      expect([info.width, info.height]).toEqual([size, size]);
    }
  });

  it('apple-touch and app icons are opaque (no transparent corners)', () => {
    expect(cornerAlpha(path.join(root, 'public/icons/icon-180.png'))).toBe(255);
    expect(cornerAlpha(path.join(root, 'assets/icon.png'))).toBe(255);
  });

  it('declares scope, orientation and the any and maskable icon set', () => {
    expect(manifest.scope).toBe('/');
    expect(manifest.orientation).toBe('portrait');
    const has = (size: string, purpose: string) =>
      manifest.icons.some(
        (i: { sizes: string; purpose?: string }) =>
          i.sizes === size && (i.purpose ?? 'any') === purpose,
      );
    expect(has('192x192', 'any')).toBe(true);
    expect(has('512x512', 'any')).toBe(true);
    expect(has('512x512', 'maskable')).toBe(true);
  });

  it('includes a maskable icon', () => {
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });
});
