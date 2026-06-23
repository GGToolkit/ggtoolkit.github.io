/* Generate a full favicon set from the GGToolkit "GG" brand mark. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const _p2i = require('png-to-ico');
const pngToIco = _p2i.default || _p2i;
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'assets', 'icons');
fs.mkdirSync(OUT, { recursive: true });
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6c5cff"/><stop offset="1" stop-color="#22d3a6"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="43" font-family="Arial,sans-serif" font-size="30" font-weight="900" fill="#fff" text-anchor="middle">GG</text></svg>`;
async function png(size, file){ await sharp(Buffer.from(SVG)).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).flatten({background:{r:14,g:16,b:24,alpha:1}}).png().toFile(path.join(OUT,file)); }
(async()=>{
  fs.writeFileSync(path.join(OUT,'favicon.svg'),SVG);
  await png(16,'favicon-16.png'); await png(32,'favicon-32.png');
  await png(180,'apple-touch-icon.png'); await png(192,'icon-192.png'); await png(512,'icon-512.png');
  const ico = await pngToIco([path.join(OUT,'favicon-16.png'),path.join(OUT,'favicon-32.png')]);
  fs.writeFileSync(path.join(OUT,'favicon.ico'),ico);
  console.log('Favicons:', fs.readdirSync(OUT).join(', '));
})();
