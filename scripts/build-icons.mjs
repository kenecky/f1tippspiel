// Rendert assets/logo-mark.svg zu den PWA-Icons in public/.
// Nutzung: npm run icons   (benötigt Playwright + Chromium)
//
// Das SVG muss den Hintergrund direkt nach </defs> enthalten und das Motiv
// in <g id="mark">. Für „maskable“ wird nur das Motiv verkleinert (Safe-Zone).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright'));
}

const source = readFileSync('assets/logo-mark.svg', 'utf8');

/** Abgerundete Ecken per Clip */
const rounded = (svg, rx) =>
  svg
    .replace('</defs>', `</defs><clipPath id="round"><rect width="512" height="512" rx="${rx}"/></clipPath><g clip-path="url(#round)">`)
    .replace(/<\/svg>\s*$/, '</g></svg>');

/** Motiv in die Safe-Zone (80 %) skalieren */
const maskable = (svg, scale = 0.78) => {
  const off = (512 * (1 - scale)) / 2;
  return svg.replace('<g id="mark"', `<g transform="translate(${off} ${off}) scale(${scale})"><g id="mark"`).replace(
    /(<g transform="translate[^>]*><g id="mark"[\s\S]*?<\/g>)/,
    '$1</g>',
  );
};

const variants = [
  { file: 'public/icon-192.png', size: 192, svg: rounded(source, 112) },
  { file: 'public/icon-512.png', size: 512, svg: rounded(source, 112) },
  { file: 'public/icon-maskable-512.png', size: 512, svg: maskable(source) },
  { file: 'public/apple-touch-icon.png', size: 180, svg: source },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const v of variants) {
  await page.setViewportSize({ width: v.size, height: v.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${v.svg.replace('<svg ', `<svg width="${v.size}" height="${v.size}" `)}</body></html>`,
  );
  writeFileSync(v.file, await page.screenshot({ omitBackground: true }));
  console.log('✓', v.file);
}
await browser.close();

writeFileSync('public/favicon.svg', rounded(source, 112));
writeFileSync('public/logo-mark.svg', source);
console.log('✓ public/favicon.svg, public/logo-mark.svg');
