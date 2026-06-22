/* Generate 1200x630 OG PNGs per language for GGToolkit. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const OUT = path.join(ROOT, 'src', 'assets', 'og');
fs.mkdirSync(OUT, { recursive: true });
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function svg(tagline){
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6c5cff"/><stop offset="1" stop-color="#22d3a6"/></linearGradient></defs>
<rect width="1200" height="630" fill="#0e1018"/>
<rect x="0" y="0" width="1200" height="10" fill="url(#g)"/>
<g transform="translate(90,150)"><rect width="120" height="120" rx="26" fill="url(#g)"/><text x="60" y="80" font-family="Arial,sans-serif" font-size="58" font-weight="900" fill="#fff" text-anchor="middle">GG</text></g>
<text x="230" y="205" font-family="Arial,sans-serif" font-size="76" font-weight="900" fill="#ffffff">GGToolkit</text>
<text x="92" y="360" font-family="Arial,sans-serif" font-size="40" font-weight="700" fill="#9aa3c7">${esc(tagline)}</text>
<g font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#cfd6ff">
<rect x="92" y="420" width="240" height="56" rx="14" fill="#1b1f30" stroke="#2c3245"/><text x="212" y="456" text-anchor="middle">🧮 Calculators</text>
<rect x="350" y="420" width="200" height="56" rx="14" fill="#1b1f30" stroke="#2c3245"/><text x="450" y="456" text-anchor="middle">🎟️ Codes</text>
<rect x="568" y="420" width="220" height="56" rx="14" fill="#1b1f30" stroke="#2c3245"/><text x="678" y="456" text-anchor="middle">📊 Rankings</text>
</g></svg>`;
}
(async () => {
  for (const l of cfg.languages) {
    const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'i18n', l + '.json'), 'utf8'));
    await sharp(Buffer.from(svg(t.home.h1))).png().toFile(path.join(OUT, 'og-' + l + '.png'));
    console.log('  og-' + l + '.png');
  }
  console.log('OG done.');
})();
