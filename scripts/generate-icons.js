/* global __dirname */
// Generates the Planner PWA icons. Run by hand: node scripts/generate-icons.js
// Requires the devDependency @resvg/resvg-js. All artwork is drawn with
// shapes and paths so rendering never depends on installed fonts.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const GREEN = '#2DB368';
const DARK_GREEN = '#1E8A4C';
const MINT = '#CDEBD9';
const GOLD = '#FFC83D';
const GOLD_DARK = '#D9961A';

// Glyph drawn in a 512x512 coordinate space.
const glyph = `
  <rect x="84" y="92" width="296" height="280" rx="34" fill="#FFFFFF"/>
  <path d="M84 126a34 34 0 0 1 34-34h228a34 34 0 0 1 34 34v52H84z" fill="${DARK_GREEN}"/>
  <rect x="140" y="64" width="26" height="62" rx="13" fill="#FFFFFF"/>
  <rect x="298" y="64" width="26" height="62" rx="13" fill="#FFFFFF"/>
  <g fill="${MINT}">
    <circle cx="140" cy="226" r="17"/><circle cx="232" cy="226" r="17"/><circle cx="324" cy="226" r="17"/>
    <circle cx="140" cy="294" r="17"/><circle cx="232" cy="294" r="17"/>
  </g>
  <circle cx="326" cy="338" r="94" fill="${GREEN}"/>
  <circle cx="326" cy="338" r="80" fill="${GOLD}"/>
  <circle cx="326" cy="338" r="60" fill="none" stroke="${GOLD_DARK}" stroke-width="8"/>
  <path d="M348 316c0-14-42-14-42 4 0 22 44 14 44 38 0 18-46 18-46 2" fill="none" stroke="${GOLD_DARK}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M327 300v76" fill="none" stroke="${GOLD_DARK}" stroke-width="10" stroke-linecap="round"/>
`;

const svg = ({ maskable }) => {
  // Maskable: full-bleed square, glyph scaled about the centre to sit well
  // inside the central safe zone (circle of radius 40% of the canvas).
  const s = 0.86;
  const body = maskable
    ? `<rect width="512" height="512" fill="${GREEN}"/>
       <g transform="translate(256 256) scale(${s}) translate(-252 -248)">${glyph}</g>`
    : `<rect width="512" height="512" rx="112" fill="${GREEN}"/>
       <g transform="translate(4 8)">${glyph}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${body}</svg>`;
};

const render = (markup, size, file) => {
  const png = new Resvg(markup, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${size}x${size})`);
};

const root = path.resolve(__dirname, '..');
const any = svg({ maskable: false });
render(any, 180, path.join(root, 'public/icons/icon-180.png'));
render(any, 192, path.join(root, 'public/icons/icon-192.png'));
render(any, 512, path.join(root, 'public/icons/icon-512.png'));
render(svg({ maskable: true }), 512, path.join(root, 'public/icons/icon-maskable-512.png'));
render(any, 1024, path.join(root, 'assets/icon.png'));
render(any, 48, path.join(root, 'assets/favicon.png'));
