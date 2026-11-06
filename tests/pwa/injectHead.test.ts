// eslint-disable-next-line @typescript-eslint/no-require-imports
const { injectHead } = require('../../scripts/pwa/inject-head');

const colors = { light: '#F0F7F2', dark: '#060D09' };
const html =
  '<!DOCTYPE html><html><head><meta charset="utf-8" /><link rel="icon" href="/favicon.ico"/></head><body></body></html>';

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe('injectHead', () => {
  it('injects exactly one of each PWA tag', () => {
    const out: string = injectHead(html, colors);
    expect(count(out, '<link rel="manifest" href="/manifest.webmanifest">')).toBe(1);
    expect(count(out, '<link rel="apple-touch-icon" href="/icons/icon-180.png">')).toBe(1);
    expect(count(out, '<meta name="apple-mobile-web-app-capable" content="yes">')).toBe(1);
    expect(count(out, '<meta name="apple-mobile-web-app-title" content="Planner">')).toBe(1);
    expect(count(out, '<meta name="apple-mobile-web-app-status-bar-style" content="default">')).toBe(1);
    expect(
      count(out, `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${colors.light}">`),
    ).toBe(1);
    expect(
      count(out, `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${colors.dark}">`),
    ).toBe(1);
    expect(count(out, 'name="theme-color"')).toBe(2);
  });

  it('keeps the original meta charset and favicon link', () => {
    const out: string = injectHead(html, colors);
    expect(out).toContain('<meta charset="utf-8" />');
    expect(out).toContain('<link rel="icon" href="/favicon.ico"/>');
  });

  it('is idempotent', () => {
    const once: string = injectHead(html, colors);
    expect(injectHead(once, colors)).toBe(once);
  });

  it('throws an error mentioning <head> when there is no head tag', () => {
    expect(() => injectHead('<html><body></body></html>', colors)).toThrow(/<head>/);
  });
  describe('viewport-fit=cover (draw under the iPhone home indicator)', () => {
    const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />';
    const withViewport = html.replace('<head>', `<head>${viewport}`);

    it('adds viewport-fit=cover to the existing viewport meta', () => {
      const out: string = injectHead(withViewport, colors);
      expect(count(out, 'name="viewport"')).toBe(1);
      expect(out).toContain('content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"');
    });

    it('replaces a different viewport-fit value instead of adding a second one', () => {
      const contain = withViewport.replace('shrink-to-fit=no', 'viewport-fit=contain');
      const out: string = injectHead(contain, colors);
      expect(count(out, 'viewport-fit')).toBe(1);
      expect(out).toContain('viewport-fit=cover');
    });

    it('adds a viewport meta with viewport-fit=cover when the page has none', () => {
      const out: string = injectHead(html, colors);
      expect(count(out, 'name="viewport"')).toBe(1);
      expect(out).toContain('viewport-fit=cover');
    });

    it('is idempotent and also heals an index.html that already has the install tags', () => {
      const once: string = injectHead(withViewport, colors);
      expect(injectHead(once, colors)).toBe(once);
      const installedWithoutCover = once.replace(', viewport-fit=cover', '');
      expect(injectHead(installedWithoutCover, colors)).toContain('viewport-fit=cover');
    });
  });
});
