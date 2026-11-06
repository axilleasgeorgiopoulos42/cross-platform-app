// Injects the PWA install tags into the exported index.html <head>.
// Idempotent: running it again on its own output changes nothing.

const HEAD_OPEN = /<head[\s>]/i;
const HEAD_CLOSE = /<\/head>/i;

const VIEWPORT_META = /<meta\s+name="viewport"\s+content="([^"]*)"\s*\/?>/i;
const DEFAULT_VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

// viewport-fit=cover lets the page draw under the iPhone home indicator and makes
// env(safe-area-inset-bottom) report the real inset, so the tab bar can sit above it.
function ensureViewportFitCover(html) {
  const match = html.match(VIEWPORT_META);
  if (!match) {
    return html.replace(/(<head[^>]*>)/i, (open) => `${open}
    ${DEFAULT_VIEWPORT}`);
  }
  const content = match[1];
  let next;
  if (/viewport-fit\s*=/i.test(content)) {
    next = content.replace(/viewport-fit\s*=\s*[a-z-]+/i, 'viewport-fit=cover');
  } else {
    next = `${content}, viewport-fit=cover`;
  }
  if (next === content) return html;
  return html.replace(VIEWPORT_META, () => match[0].replace(content, next));
}

function buildTags(colors) {
  return [
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="/icons/icon-180.png">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-title" content="Planner">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${colors.light}">`,
    `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${colors.dark}">`,
  ];
}

function injectHead(html, colors) {
  if (!HEAD_OPEN.test(html) || !HEAD_CLOSE.test(html)) {
    throw new Error('injectHead: HTML has no <head> element to inject into');
  }
  const withViewport = ensureViewportFitCover(html);
  if (withViewport.includes('rel="manifest"')) {
    return withViewport;
  }
  const block = buildTags(colors).map((tag) => `    ${tag}\n`).join('');
  return withViewport.replace(HEAD_CLOSE, `${block}  </head>`);
}

module.exports = { injectHead };
