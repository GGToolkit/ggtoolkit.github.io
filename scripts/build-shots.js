/*
 * build-shots.js — capture a clean hero screenshot of each tool's real site.
 * Uses Playwright (headless chromium), dismisses cookie banners, crops to the
 * top hero area, and optimizes with sharp. Output: src/assets/shots/<slug>.jpg
 * Run: node scripts/build-shots.js   (heavy; run on demand, output is committed)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const TOOLS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8')).tools;
const OUT = path.join(ROOT, 'src', 'assets', 'shots');
fs.mkdirSync(OUT, { recursive: true });

// override capture URL where the canonical url is a redirect/picker
const SHOT_URL = { 'champions-damage': 'https://championsdamage.github.io/es/' };

const ACCEPT = /^(accept|accept all|aceptar|aceptar todo|aceptar todas|aceitar|aceito|tout accepter|j'accepte|accetta|accetta tutto|ok|got it|entendido|i agree|agree|allow all|allow|consent)$/i;

async function dismissBanners(page) {
  try {
    // click any obvious accept button
    const buttons = await page.$$('button, a, [role="button"]');
    for (const b of buttons) {
      const txt = ((await b.innerText().catch(() => '')) || '').trim();
      if (ACCEPT.test(txt)) { await b.click({ timeout: 800 }).catch(() => {}); break; }
    }
  } catch (e) {}
  // hide leftover fixed overlays / cookie bars
  await page.evaluate(() => {
    const kill = [];
    document.querySelectorAll('body *').forEach((el) => {
      const s = getComputedStyle(el);
      if ((s.position === 'fixed' || s.position === 'sticky')) {
        const r = el.getBoundingClientRect();
        const txt = (el.innerText || '').toLowerCase();
        const cookieish = /cookie|consent|gdpr|privacy|rgpd/.test(txt) || /cookie|consent/.test(el.className || '');
        if (cookieish || (r.top > window.innerHeight * 0.55 && r.height < window.innerHeight * 0.5)) kill.push(el);
      }
    });
    kill.forEach((el) => { el.style.display = 'none'; });
  }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const t of TOOLS) {
    try {
      const shotUrl = SHOT_URL[t.slug] || t.url;
      await page.goto(shotUrl, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => page.goto(shotUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }));
      await page.waitForTimeout(2200);
      await dismissBanners(page);
      await page.waitForTimeout(500);
      const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 760 } });
      await sharp(buf).resize(1000).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, t.slug + '.jpg'));
      const kb = (fs.statSync(path.join(OUT, t.slug + '.jpg')).size / 1024).toFixed(0);
      console.log('  ✓ ' + t.slug + '.jpg (' + kb + ' KB)');
    } catch (e) {
      console.log('  ✗ ' + t.slug + ' — ' + e.message.split('\n')[0]);
    }
  }
  await browser.close();
  console.log('Shots done.');
})();
