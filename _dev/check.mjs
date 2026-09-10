// Smoke-checks the static site: console errors, broken anchors, a11y basics,
// redirect stubs, and screenshots at desktop + mobile widths.
// Usage: python3 -m http.server 8080 &  then
//        NODE_PATH=/opt/node22/lib/node_modules node _dev/check.mjs [outDir]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // honors NODE_PATH
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.env.BASE || 'http://localhost:8080';
const out = resolve(process.argv[2] || '_dev/shots');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const pages = ['/', '/privacy-policy/', '/terms-of-service/', '/404.html'];
let problems = 0;
const report = (msg) => { problems++; console.log('  ✗ ' + msg); };

for (const path of pages) {
  console.log('\n' + path);
  for (const [label, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 400, height: 800 }]]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const src = (m.location() && m.location().url) || '';
      if (/leadconnectorhq|fonts\.g|googleapis/.test(src)) return; // third-party hosts may be blocked in the sandbox
      errors.push(m.text() + (src ? ' @ ' + src : ''));
    });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => {
      const u = r.url();
      if (/leadconnectorhq|fonts\.g|googleapis/.test(u)) return; // may be blocked in the sandbox
      errors.push('requestfailed: ' + u);
    });
    await page.goto(base + path, { waitUntil: 'networkidle' }).catch((e) => errors.push('goto: ' + e.message));
    await page.waitForTimeout(600);

    const audit = await page.evaluate(() => {
      const out = [];
      const h1s = document.querySelectorAll('h1').length;
      if (h1s !== 1) out.push(`expected 1 h1, found ${h1s}`);
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        const id = a.getAttribute('href').slice(1);
        if (id && !document.getElementById(id)) out.push(`broken anchor #${id}`);
      });
      document.querySelectorAll('img').forEach((img) => { if (!img.hasAttribute('alt')) out.push('img without alt: ' + img.src); });
      document.querySelectorAll('iframe').forEach((f) => { if (!f.title) out.push('iframe without title'); });
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.push(`horizontal overflow: ${document.documentElement.scrollWidth} > ${document.documentElement.clientWidth}`);
      return out;
    });

    errors.forEach(report);
    audit.forEach(report);
    const name = (path === '/' ? 'home' : path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')) + '-' + label + '.png';
    // Reveal everything before the screenshot so the full page is visible.
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')));
    await page.waitForTimeout(800);
    await page.screenshot({ path: resolve(out, name), fullPage: true });
    console.log('  ' + label + ' ok → ' + name + (errors.length + audit.length ? '' : ' (clean)'));

    if (path === '/' && label === 'mobile') {
      await page.click('#menuToggle');
      await page.waitForTimeout(400);
      await page.screenshot({ path: resolve(out, 'home-mobile-menu.png') });
      const expanded = await page.getAttribute('#menuToggle', 'aria-expanded');
      if (expanded !== 'true') report('menu toggle did not set aria-expanded');
    }
    await ctx.close();
  }
}

// Redirect stubs
console.log('\nredirect stubs');
const stubs = { '/privacy/': '/privacy-policy/', '/terms/': '/terms-of-service/', '/tos/': '/terms-of-service/', '/privacy.html': '/privacy-policy/', '/terms.html': '/terms-of-service/' };
for (const [from, to] of Object.entries(stubs)) {
  const page = await browser.newPage();
  await page.goto(base + from, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const finalPath = new URL(page.url()).pathname;
  if (finalPath === to) console.log('  ' + from + ' → ' + to + ' ok'); else report(`${from} ended at ${finalPath}, expected ${to}`);
  await page.close();
}

await browser.close();
console.log(problems ? `\n${problems} problem(s) found` : '\nall checks passed');
process.exit(problems ? 1 : 0);
