// Rendert assets/logo-mark.svg zu den PWA-Icons in public/.
// Nutzung: npm run icons   (benötigt playwright + chromium)
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright')); }

const svg = readFileSync('assets/logo-mark.svg', 'utf8');
const BG = '#15151e';

const variants = [
  { file: 'public/icon-192.png', size: 192, pad: 0.04, radius: 0.22 },
  { file: 'public/icon-512.png', size: 512, pad: 0.04, radius: 0.22 },
  { file: 'public/icon-maskable-512.png', size: 512, pad: 0.16, radius: 0 },
  { file: 'public/apple-touch-icon.png', size: 180, pad: 0.06, radius: 0 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const v of variants) {
  const inner = Math.round(v.size * (1 - 2 * v.pad));
  await page.setViewportSize({ width: v.size, height: v.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">
    <div style="width:${v.size}px;height:${v.size}px;background:${BG};border-radius:${v.radius * 100}%;
      display:flex;align-items:center;justify-content:center">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    </div></body></html>`);
  writeFileSync(v.file, await page.screenshot({ omitBackground: true }));
  console.log('✓', v.file);
}
await browser.close();

// Favicon / In-App-Logo = SVG mit Hintergrund
const favicon = svg.replace(/(<svg[^>]*>)/, `$1<rect width="512" height="512" rx="110" fill="${BG}"/>`);
writeFileSync('public/favicon.svg', favicon);
copyFileSync('assets/logo-mark.svg', 'public/logo-mark.svg');
console.log('✓ public/favicon.svg, public/logo-mark.svg');
