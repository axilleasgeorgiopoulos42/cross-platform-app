// Injects the PWA install tags into the exported index.html <head>.
// Idempotent: if the manifest link is already present, the HTML is returned unchanged.

const HEAD_OPEN = /<head[\s>]/i;
const HEAD_CLOSE = /<\/head>/i;

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
  if (html.includes('rel="manifest"')) {
    return html;
  }
  const block = buildTags(colors).map((tag) => `    ${tag}\n`).join('');
  return html.replace(HEAD_CLOSE, `${block}  </head>`);
}

module.exports = { injectHead };
