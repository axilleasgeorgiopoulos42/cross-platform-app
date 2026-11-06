import fs from 'fs';
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

  it('includes a maskable icon', () => {
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });
});
