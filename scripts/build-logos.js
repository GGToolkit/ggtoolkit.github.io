/*
 * build-logos.js — fetch the best brand icon/logo for each tool's domain and
 * normalize it to a consistent 256x256 PNG. Tries apple-touch-icon, then the
 * largest <link icon>, then og:image, then Google's favicon service.
 * Output: src/assets/logos/<slug>.png   (committed; deploy doesn't refetch)
 * Run: node scripts/build-logos.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const TOOLS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8')).tools;
const OUT = path.join(ROOT, 'src', 'assets', 'logos');
fs.mkdirSync(OUT, { recursive: true });

async function getHtml(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 GGToolkit-logo-bot' }, redirect: 'follow' });
  return r.ok ? await r.text() : '';
}
function abs(base, href) { try { return new URL(href, base).href; } catch (e) { return null; } }

function candidates(html, pageUrl) {
  const out = [];
  const push = (h) => { const u = abs(pageUrl, h); if (u) out.push(u); };
  // apple-touch-icon (usually the cleanest, ~180px+)
  let m, re = /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/gi;
  while ((m = re.exec(html))) { const h = /href=["']([^"']+)["']/i.exec(m[0]); if (h) push(h[1]); }
  // <link rel="icon"> with sizes (prefer png)
  re = /<link[^>]+rel=["'][^"']*\bicon\b[^"']*["'][^>]*>/gi;
  const icons = [];
  while ((m = re.exec(html))) {
    const h = /href=["']([^"']+)["']/i.exec(m[0]); if (!h) continue;
    const sz = /sizes=["'](\d+)/i.exec(m[0]); icons.push({ href: h[1], size: sz ? +sz[1] : 0, png: /\.png|\.svg/i.test(h[1]) });
  }
  icons.sort((a, b) => (b.png - a.png) || (b.size - a.size)).forEach((i) => push(i.href));
  // og:image (brand-ish, may be wide but usable as fallback)
  m = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (m) push(m[1]);
  return out;
}

async function tryDownload(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 GGToolkit-logo-bot' } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    await sharp(buf).metadata(); // validate decodable (skips .ico)
    return buf;
  } catch (e) { return null; }
}

(async () => {
  for (const t of TOOLS) {
    const origin = new URL(t.url).origin;
    let buf = null, src = '';
    try {
      const html = await getHtml(t.url).catch(() => '');
      for (const c of candidates(html, t.url)) { buf = await tryDownload(c); if (buf) { src = c; break; } }
    } catch (e) {}
    if (!buf) { // guaranteed PNG fallback
      const g = `https://www.google.com/s2/favicons?domain=${new URL(t.url).hostname}&sz=128`;
      buf = await tryDownload(g); src = 'google-favicons';
    }
    if (!buf) { console.log('  ✗ ' + t.slug + ' (no icon found)'); continue; }
    await sharp(buf).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(path.join(OUT, t.slug + '.png'));
    const kb = (fs.statSync(path.join(OUT, t.slug + '.png')).size / 1024).toFixed(0);
    console.log('  ✓ ' + t.slug + '.png (' + kb + ' KB) ← ' + src.replace(origin, ''));
  }
  console.log('Logos done.');
})();
