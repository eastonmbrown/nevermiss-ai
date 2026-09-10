// Generates apple-touch-icon.png (180x180) and og-image.png (1200x630) from
// favicon.svg and _dev/og-template.html using headless Chromium.
// Run from the repo root:  NODE_PATH=/opt/node22/lib/node_modules node _dev/render-assets.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // honors NODE_PATH
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const browser = await chromium.launch();

// Apple touch icon: render the SVG on a solid tile (iOS ignores transparency).
const icon = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
const svg = readFileSync(resolve(root, 'favicon.svg'), 'utf8');
await icon.setContent(`<html><body style="margin:0;background:#0e1322">${svg.replace('<svg ', '<svg width="180" height="180" ')}</body></html>`);
await icon.screenshot({ path: resolve(root, 'apple-touch-icon.png'), type: 'png' });

// Open Graph image.
const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.goto('file://' + resolve(root, '_dev/og-template.html'));
await og.waitForTimeout(1500); // let web fonts settle
await og.screenshot({ path: resolve(root, 'og-image.png'), type: 'png' });

await browser.close();
console.log('wrote apple-touch-icon.png and og-image.png');
