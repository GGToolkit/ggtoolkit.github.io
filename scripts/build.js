/*
 * GGToolkit static site generator (bilingual ES/EN gaming tools hub).
 * Outputs /dist: home, topic pillars, rich tool pages (what/uses/how/FAQ),
 * guides (with author byline + Article schema), tools directory, about,
 * methodology, plus sitemap/robots/manifest/OG, full schema and consent.
 * No runtime dependencies.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const SITE = cfg.url.replace(/\/$/, '');
const T = {};
cfg.languages.forEach((l) => { T[l] = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', l + '.json'), 'utf8')); });
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tools.json'), 'utf8'));
const GUIDES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'guides.json'), 'utf8'));
const PILLARS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'pillars.json'), 'utf8'));
const TOOLS = DATA.tools, CATS = DATA.categories;
const toolBySlug = Object.fromEntries(TOOLS.map((t) => [t.slug, t]));

function rmrf(p){ if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function write(p, c){ fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); }
function cp(a, b){ fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function strip(s){ return String(s).replace(/<[^>]+>/g, ''); }

// --- path helpers ---
const aboutSlug = (l) => (l === 'es' ? 'sobre-nosotros' : 'about');
const methodSlug = (l) => (l === 'es' ? 'metodologia' : 'methodology');
const topicsSeg = (l) => (l === 'es' ? 'temas' : 'topics');
const pHome = (l) => `/${l}/`;
const pTools = (l) => `/${l}/${T[l].toolsPath}/`;
const pTool = (l, slug) => `/${l}/${T[l].toolsPath}/${slug}/`;
const pGuides = (l) => `/${l}/${T[l].guidesPath}/`;
const pGuide = (l, g) => `/${l}/${T[l].guidesPath}/${l === 'es' ? g.slug : g.slugEn}/`;
const pAbout = (l) => `/${l}/${aboutSlug(l)}/`;
const pMethod = (l) => `/${l}/${methodSlug(l)}/`;
const pPillar = (l, p) => `/${l}/${topicsSeg(l)}/${l === 'es' ? p.slug : p.slugEn}/`;

function tracking(){
  let o = `\n<script>window.GA4_ID=${JSON.stringify(cfg.ga4Id || '')}</script>`;
  if (cfg.gscVerification) o += `\n<meta name="google-site-verification" content="${esc(cfg.gscVerification)}">`;
  if (cfg.ga4Id) o += `
<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(cfg.ga4Id)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
gtag('js',new Date());gtag('config','${esc(cfg.ga4Id)}')</script>`;
  return o;
}

// --- head / chrome ---
function head(lang, title, desc, canonical, alts, lds, ogImage) {
  const hl = Object.keys(alts).map((l) =>
    `<link rel="alternate" hreflang="${T[l].hreflang}" href="${SITE}${alts[l]}">`).join('\n');
  const ldBlock = (lds || []).map((ld) => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`).join('');
  const og = ogImage || `/assets/og/og-${lang}.png`;
  return `<!doctype html><html lang="${T[lang].hreflang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonical}">
${hl}
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:site_name" content="GGToolkit">
<meta property="og:locale" content="${T[lang].locale}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonical}"><meta property="og:image" content="${SITE}${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0e1018">
<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/assets/css/styles.css">
${ldBlock}${tracking()}
</head><body>`;
}
function breadcrumbLd(lang, items){
  return { "@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":
    items.map((it,i)=>({ "@type":"ListItem","position":i+1,"name":it.name,"item":SITE+it.path })) };
}
function crumb(lang, items){
  return `<nav class="crumb">${items.map((it,i)=> i<items.length-1 ? `<a href="${it.path}">${esc(it.name)}</a> › ` : esc(it.name)).join('')}</nav>`;
}
function header(lang, current) {
  const t = T[lang];
  const langMenu = cfg.languages.map((l) =>
    `<a href="${pHome(l)}"${l===lang?' aria-current="true"':''}>${T[l].name}</a>`).join('');
  const a = (href, label, key) => `<a href="${href}"${current===key?' aria-current="true"':''}>${esc(label)}</a>`;
  return `<header class="site-header"><div class="wrap">
<a class="brand" href="${pHome(lang)}"><span class="logo">GG</span><span>GG<b>Toolkit</b></span></a>
<nav class="nav">
${a(pTools(lang), t.ui.tools, 'tools')}
${a(pGuides(lang), t.ui.guides, 'guides')}
${a(pAbout(lang), t.ui.about, 'about')}
<button class="lang-sw" id="langBtn" aria-label="${esc(t.footer.langLabel)}">🌐 ${t.name} ▾</button>
</nav>
</div><nav class="lang-menu" id="langMenu">${langMenu}</nav></header>`;
}
function footer(lang) {
  const t = T[lang];
  const toolLinks = TOOLS.map((tool) => `<a href="${pTool(lang, tool.slug)}">${esc(tool.name)}</a>`).join('');
  const siteLinks = `<a href="${pTools(lang)}">${esc(t.ui.tools)}</a><a href="${pGuides(lang)}">${esc(t.ui.guides)}</a><a href="${pAbout(lang)}">${esc(t.ui.about)}</a><a href="${pMethod(lang)}">${esc(t.ui.methodology)}</a>`;
  return `<footer class="site-footer"><div class="wrap">
<div class="footer-cols">
<div><div class="foot-brand"><span class="logo" style="width:24px;height:24px;border-radius:7px;display:inline-grid;place-items:center;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;font-weight:900;font-size:.7rem">GG</span> GGToolkit</div>
<p class="muted">${esc(t.footer.tagline)}</p></div>
<div><h4>${esc(t.footer.toolsTitle)}</h4>${toolLinks}</div>
<div><h4>${esc(t.footer.siteTitle)}</h4>${siteLinks}</div>
</div>
<p class="muted">${esc(t.footer.disclaimer)} · <a href="#" id="cookieSettings">${esc(t.consent.manage)}</a></p>
</div>
<div class="consent" id="consent" hidden><span>${esc(t.consent.text)} <a href="${pMethod(lang)}">${esc(t.consent.more)}</a></span><span class="consent-actions"><button class="btn" id="consentReject">${esc(t.consent.reject)}</button><button class="btn primary" id="consentAccept">${esc(t.consent.accept)}</button></span></div>
<script>(function(){var b=document.getElementById('langBtn'),m=document.getElementById('langMenu');if(b)b.addEventListener('click',function(e){e.stopPropagation();m.classList.toggle('open')});document.addEventListener('click',function(){m&&m.classList.remove('open')})})();</script>
<script src="/assets/js/consent.js" defer></script>
</footer></body></html>`;
}
function catName(lang, key){ return CATS[key] ? CATS[key][lang] : key; }
function hasLogo(slug){ return fs.existsSync(path.join(SRC, 'assets/logos', slug + '.png')); }
function logoMark(tool, cls){
  return hasLogo(tool.slug)
    ? `<img class="${cls}" src="/assets/logos/${tool.slug}.png" alt="${esc(tool.name)}" loading="lazy" width="256" height="256">`
    : `<span class="${cls} emoji">${tool.icon}</span>`;
}
function toolCard(lang, tool) {
  return `<a class="tool-card" href="${pTool(lang, tool.slug)}">
<span class="tc-head">${logoMark(tool, 'logo-img')}<h3>${esc(tool.name)}</h3></span>
<p>${esc(tool.tagline[lang])}</p>
<span class="cat">${CATS[tool.category].icon} ${esc(catName(lang, tool.category))}</span></a>`;
}
function guideCard(lang, g) {
  return `<a class="guide-card" href="${pGuide(lang, g)}"><span class="ic">${g.icon}</span> <h3>${esc(g.title[lang])}</h3><p>${esc(g.description[lang])}</p></a>`;
}
function pillarCard(lang, p) {
  return `<a class="pillar-card" href="${pPillar(lang, p)}"><span class="ic">${p.icon}</span><h3>${esc(p.title[lang])}</h3><p>${esc(p.description[lang])}</p></a>`;
}
const orgLd = { "@context":"https://schema.org","@type":"Organization","name":"GGToolkit","url":SITE+"/","logo":SITE+"/assets/favicon.svg" };

// --- pages ---
function homeHTML(lang) {
  const t = T[lang];
  const alts = {}; cfg.languages.forEach((l) => alts[l] = pHome(l));
  const websiteLd = { "@context":"https://schema.org","@type":"WebSite","name":"GGToolkit","url":SITE+pHome(lang),"inLanguage":t.hreflang,
    "potentialAction":{ "@type":"SearchAction","target":SITE+pTools(lang)+"?q={q}","query-input":"required name=q" } };
  return head(lang, t.meta.homeTitle, t.meta.homeDescription, pHome(lang), alts, [websiteLd, orgLd])
    + header(lang, 'home')
    + `<main class="wrap">
<section class="hero"><h1>${esc(t.home.h1)}</h1><p>${t.home.intro}</p></section>
<section class="section"><h2>🧭 ${esc(t.home.pillars)}</h2><div class="grid">${PILLARS.map((p)=>pillarCard(lang,p)).join('')}</div></section>
<section class="section"><h2>🚀 ${esc(t.home.featured)}</h2><div class="grid">${TOOLS.map((x)=>toolCard(lang,x)).join('')}</div></section>
<section class="section"><h2>📖 ${esc(t.home.latestGuides)}</h2>${GUIDES.slice(0,4).map((g)=>guideCard(lang,g)).join('')}<p style="margin-top:10px"><a href="${pGuides(lang)}">${esc(t.ui.allGuides)} →</a></p></section>
</main>` + footer(lang);
}
function toolsIndexHTML(lang) {
  const t = T[lang];
  const alts = {}; cfg.languages.forEach((l) => alts[l] = pTools(l));
  const itemList = { "@context":"https://schema.org","@type":"ItemList","name":t.meta.toolsTitle,
    "itemListElement": TOOLS.map((x,i)=>({ "@type":"ListItem","position":i+1,"url":SITE+pTool(lang,x.slug),"name":x.name })) };
  const bc = breadcrumbLd(lang,[{name:t.ui.home,path:pHome(lang)},{name:t.ui.tools,path:pTools(lang)}]);
  const byCat = Object.keys(CATS).map((k) => {
    const list = TOOLS.filter((x) => x.category === k);
    if (!list.length) return '';
    return `<section class="section" id="${k}"><h2>${CATS[k].icon} ${esc(catName(lang, k))}</h2><div class="grid">${list.map((x)=>toolCard(lang,x)).join('')}</div></section>`;
  }).join('');
  return head(lang, t.meta.toolsTitle, t.meta.toolsDescription, pTools(lang), alts, [itemList, bc])
    + header(lang, 'tools')
    + `<main class="wrap">${crumb(lang,[{name:t.ui.home,path:pHome(lang)},{name:t.ui.tools,path:pTools(lang)}])}
<section class="hero" style="padding:18px 0 0;text-align:left"><h1>${esc(t.ui.tools)}</h1></section>${byCat}</main>` + footer(lang);
}
function toolPageHTML(lang, tool) {
  const t = T[lang];
  const alts = {}; cfg.languages.forEach((l) => alts[l] = pTool(l, tool.slug));
  const related = TOOLS.filter((x) => x.slug !== tool.slug && x.category === tool.category)
    .concat(TOOLS.filter((x) => x.slug !== tool.slug && x.category !== tool.category)).slice(0, 3);
  const appLd = { "@context":"https://schema.org","@type":"SoftwareApplication","name":tool.name,"url":tool.url,
    "applicationCategory":"GameApplication","operatingSystem":"Web","inLanguage":t.hreflang,
    "description":tool.tagline[lang],"isAccessibleForFree":true,"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"} };
  const faqLd = tool.faq && tool.faq.length ? { "@context":"https://schema.org","@type":"FAQPage",
    "mainEntity": tool.faq.map((f)=>({ "@type":"Question","name":f.q[lang],"acceptedAnswer":{"@type":"Answer","text":strip(f.a[lang])} })) } : null;
  const bc = breadcrumbLd(lang,[{name:t.ui.home,path:pHome(lang)},{name:t.ui.tools,path:pTools(lang)},{name:tool.name,path:pTool(lang,tool.slug)}]);
  const lds = [appLd, bc]; if (faqLd) lds.push(faqLd);
  const tags = tool.games.map((g) => `<span class="tag">${esc(g)}</span>`).join('');
  const uses = `<ul class="ticks">${tool.useCases[lang].map((u)=>`<li>${esc(u)}</li>`).join('')}</ul>`;
  const steps = `<ol class="steps">${tool.howTo[lang].map((s)=>`<li>${esc(s)}</li>`).join('')}</ol>`;
  const faqHtml = (tool.faq||[]).map((f)=>`<dt>${esc(f.q[lang])}</dt><dd>${f.a[lang]}</dd>`).join('');
  const toolOg = fs.existsSync(path.join(SRC, 'assets/og', 'tool-' + tool.slug + '.png')) ? `/assets/og/tool-${tool.slug}.png` : null;
  return head(lang, `${tool.name} — ${tool.tagline[lang]} | GGToolkit`, tool.intro[lang].replace(/<[^>]+>/g,'').slice(0,155), pTool(lang, tool.slug), alts, lds, toolOg)
    + header(lang, 'tools')
    + `<main class="wrap">${crumb(lang,[{name:t.ui.home,path:pHome(lang)},{name:t.ui.tools,path:pTools(lang)},{name:tool.name,path:pTool(lang,tool.slug)}])}
<div class="tool-hero"><span class="tool-logo">${logoMark(tool, 'logo-img-lg')}</span><div>
<h1>${esc(tool.name)}</h1><p class="muted">${esc(tool.tagline[lang])}</p>
<div class="tags">${tags}</div>
<div class="btn-row"><a class="btn primary" href="${tool.url}" target="_blank" rel="noopener">${esc(t.ui.openTool)} ↗</a></div></div></div>
<article class="article">
<h2>${esc(t.ui.whatIsIt)}</h2><p>${tool.intro[lang]}</p>
<h2>${esc(t.ui.useCases)}</h2>${uses}
<h2>${esc(t.ui.howToUse)}</h2>${steps}
${(tool.sections&&tool.sections.length)?`<h2>${esc(t.ui.sectionsTitle)}</h2><div class="sections">${tool.sections.map((s)=>`<a class="sec-chip" href="${s.url}" target="_blank" rel="noopener">${esc(s.label[lang])} <span>↗</span></a>`).join('')}</div>`:''}
${(tool.faq&&tool.faq.length)?`<h2>${esc(t.ui.faq)}</h2><dl class="faq">${faqHtml}</dl>`:''}
<p style="margin-top:18px"><a class="btn primary" href="${tool.url}" target="_blank" rel="noopener">${esc(t.ui.openTool)}: ${esc(tool.name)} ↗</a></p>
</article>
<section class="section"><h2>${esc(t.ui.relatedTools)}</h2><div class="grid">${related.map((x)=>toolCard(lang,x)).join('')}</div></section>
</main>` + footer(lang);
}
function pillarPageHTML(lang, p) {
  const t = T[lang];
  const alts = {}; cfg.languages.forEach((l) => alts[l] = pPillar(l, p));
  const bc = breadcrumbLd(lang,[{name:t.ui.home,path:pHome(lang)},{name:p.title[lang],path:pPillar(lang,p)}]);
  const tools = p.tools.map((s)=>toolBySlug[s]).filter(Boolean);
  const guides = (p.guides||[]).map((gs)=>GUIDES.find((g)=>g.slug===gs)).filter(Boolean);
  return head(lang, `${p.title[lang]} — ${t.meta.pillarSuffix} | GGToolkit`, p.description[lang], pPillar(lang,p), alts, [bc])
    + header(lang, 'tools')
    + `<main class="wrap">${crumb(lang,[{name:t.ui.home,path:pHome(lang)},{name:p.title[lang],path:pPillar(lang,p)}])}
<section class="hero" style="padding:18px 0 6px;text-align:left"><h1>${p.icon} ${esc(p.title[lang])}</h1></section>
<article class="article">${p.body[lang]}</article>
<section class="section"><h2>${esc(t.ui.inThisSection)}</h2><div class="grid">${tools.map((x)=>toolCard(lang,x)).join('')}</div></section>
${guides.length?`<section class="section"><h2>${esc(t.ui.guidesInSection)}</h2>${guides.map((g)=>guideCard(lang,g)).join('')}</section>`:''}
</main>` + footer(lang);
}
function guidesIndexHTML(lang) {
  const t = T[lang];
  const alts = {}; cfg.languages.forEach((l) => alts[l] = pGuides(l));
  const bc = breadcrumbLd(lang,[{name:t.ui.home,path:pHome(lang)},{name:t.ui.guides,path:pGuides(lang)}]);
  return head(lang, t.meta.guidesTitle, t.meta.guidesDescription, pGuides(lang), alts, [bc])
    + header(lang, 'guides')
    + `<main class="wrap">${crumb(lang,[{name:t.ui.home,path:pHome(lang)},{name:t.ui.guides,path:pGuides(lang)}])}
<section class="hero" style="padding:18px 0 14px;text-align:left"><h1>${esc(t.ui.guides)}</h1></section>
${GUIDES.map((g)=>guideCard(lang,g)).join('')}</main>` + footer(lang);
}
function guidePageHTML(lang, g) {
  const t = T[lang];
  const alts = {}; cfg.languages.forEach((l) => alts[l] = pGuide(l, g));
  const articleLd = { "@context":"https://schema.org","@type":"Article","headline":g.title[lang],"inLanguage":t.hreflang,
    "datePublished":g.date,"dateModified":cfg.lastUpdated,"description":g.description[lang],"image":SITE+`/assets/og/og-${lang}.png`,
    "author":{"@type":"Organization","name":g.author||"GGToolkit"},"publisher":orgLd };
  const bc = breadcrumbLd(lang,[{name:t.ui.home,path:pHome(lang)},{name:t.ui.guides,path:pGuides(lang)},{name:g.title[lang],path:pGuide(lang,g)}]);
  const pillar = g.pillar ? PILLARS.find((p)=>p.slug===g.pillar) : null;
  const relatedTools = pillar ? pillar.tools.map((s)=>toolBySlug[s]).filter(Boolean).slice(0,3) : [];
  return head(lang, `${g.title[lang]} | GGToolkit`, g.description[lang], pGuide(lang, g), alts, [articleLd, bc])
    + header(lang, 'guides')
    + `<main class="wrap">${crumb(lang,[{name:t.ui.home,path:pHome(lang)},{name:t.ui.guides,path:pGuides(lang)},{name:g.title[lang],path:pGuide(lang,g)}])}
<article class="article"><h1>${esc(g.title[lang])}</h1>
<p class="byline">${esc(t.ui.by)} <strong>${esc(g.author||'GGToolkit')}</strong> · ${esc(t.ui.updated)} ${esc(g.date)}</p>
${g.body[lang]}
<p style="margin-top:24px"><a class="btn" href="${pTools(lang)}">${esc(t.ui.allTools)} →</a></p></article>
${relatedTools.length?`<section class="section"><h2>${esc(t.ui.relatedTools)}</h2><div class="grid">${relatedTools.map((x)=>toolCard(lang,x)).join('')}</div></section>`:''}
</main>` + footer(lang);
}
function simplePage(lang, kind) {
  const t = T[lang];
  const isAbout = kind === 'about';
  const slugPath = isAbout ? pAbout(lang) : pMethod(lang);
  const alts = {}; cfg.languages.forEach((l) => alts[l] = isAbout ? pAbout(l) : pMethod(l));
  const title = isAbout ? (t.meta.aboutTitle+' | GGToolkit') : (t.meta.methodologyTitle+' | GGToolkit');
  const desc = isAbout ? t.meta.aboutDescription : t.meta.methodologyDescription;
  const block = isAbout ? t.about : t.methodology;
  const bc = breadcrumbLd(lang,[{name:t.ui.home,path:pHome(lang)},{name:strip(block.h1),path:slugPath}]);
  const extra = isAbout ? `<p><a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a></p><p style="margin-top:16px"><a class="btn primary" href="${pTools(lang)}">${esc(t.ui.allTools)} →</a></p>` : `<p style="margin-top:16px"><a class="btn" href="${pAbout(lang)}">${esc(t.ui.about)} →</a></p>`;
  return head(lang, title, desc, slugPath, alts, [bc])
    + header(lang, isAbout ? 'about' : null)
    + `<main class="wrap">${crumb(lang,[{name:t.ui.home,path:pHome(lang)},{name:strip(block.h1),path:slugPath}])}
<article class="article" style="padding-top:8px"><h1>${esc(block.h1)}</h1>${block.body}${extra}</article></main>` + footer(lang);
}
function rootHTML() {
  const map = {}; cfg.languages.forEach((l) => map[T[l].hreflang.split('-')[0]] = pHome(l));
  const hl = cfg.languages.map((l) => `<link rel="alternate" hreflang="${T[l].hreflang}" href="${SITE}${pHome(l)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${SITE}/">`;
  const links = cfg.languages.map((l) => `<a class="btn" href="${pHome(l)}">${T[l].name}</a>`).join(' ');
  return `<!doctype html><html lang="${cfg.defaultLang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GGToolkit — Free tools for gamers</title>
<meta name="description" content="${esc(T[cfg.defaultLang].meta.homeDescription)}">
<link rel="canonical" href="${SITE}/">
${hl}
<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png"><link rel="stylesheet" href="/assets/css/styles.css">
<script>(function(){var m=${JSON.stringify(map)};var L=(navigator.languages||[navigator.language||'']);for(var i=0;i<L.length;i++){var c=(L[i]||'').slice(0,2).toLowerCase();if(m[c]){location.replace(m[c]);return}}location.replace(${JSON.stringify(pHome(cfg.defaultLang))});})();</script>
</head><body><main class="wrap" style="padding:50px 16px;text-align:center"><h1>GGToolkit</h1><p class="muted">Choose your language · Elige tu idioma</p><p>${links}</p></main></body></html>`;
}

function sitemap() {
  const U = [];
  const add = (loc, alts, pr, cf) => {
    const a = Object.keys(alts).map((l) => `    <xhtml:link rel="alternate" hreflang="${T[l].hreflang}" href="${SITE}${alts[l]}"/>`).join('\n');
    U.push(`  <url>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${cfg.lastUpdated}</lastmod>\n${a}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`);
  };
  U.push(`  <url>\n    <loc>${SITE}/</loc>\n    <lastmod>${cfg.lastUpdated}</lastmod>\n    <priority>0.8</priority>\n  </url>`);
  const each = (fn, pr, cf) => cfg.languages.forEach((l) => { const al={}; cfg.languages.forEach((x)=>al[x]=fn(x)); add(fn(l), al, pr, cf); });
  each(pHome, '1.0', 'weekly');
  each(pTools, '0.9', 'weekly');
  PILLARS.forEach((p) => cfg.languages.forEach((l)=>{ const al={}; cfg.languages.forEach((x)=>al[x]=pPillar(x,p)); add(pPillar(l,p), al, '0.8', 'weekly'); }));
  TOOLS.forEach((tool) => cfg.languages.forEach((l)=>{ const al={}; cfg.languages.forEach((x)=>al[x]=pTool(x,tool.slug)); add(pTool(l,tool.slug), al, '0.8', 'monthly'); }));
  each(pGuides, '0.7', 'weekly');
  GUIDES.forEach((g) => cfg.languages.forEach((l)=>{ const al={}; cfg.languages.forEach((x)=>al[x]=pGuide(x,g)); add(pGuide(l,g), al, '0.6', 'monthly'); }));
  each(pAbout, '0.3', 'yearly');
  each(pMethod, '0.3', 'yearly');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${U.join('\n')}\n</urlset>\n`;
}
const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
const manifest = () => JSON.stringify({ name:'GGToolkit', short_name:'GGToolkit', start_url:'/', display:'standalone', background_color:'#0e1018', theme_color:'#0e1018', icons:[{src:'/assets/icons/favicon.svg',sizes:'any',type:'image/svg+xml'},{src:'/assets/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any maskable'},{src:'/assets/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}] });
const favicon = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6c5cff"/><text x="32" y="42" font-family="Arial,sans-serif" font-size="30" font-weight="900" fill="#fff" text-anchor="middle">GG</text></svg>`;

// --- build ---
console.log('Building GGToolkit -> dist/');
rmrf(DIST);
cfg.languages.forEach((l) => {
  write(path.join(DIST, l, 'index.html'), homeHTML(l));
  write(path.join(DIST, l, T[l].toolsPath, 'index.html'), toolsIndexHTML(l));
  TOOLS.forEach((tool) => write(path.join(DIST, l, T[l].toolsPath, tool.slug, 'index.html'), toolPageHTML(l, tool)));
  PILLARS.forEach((p) => write(path.join(DIST, l, topicsSeg(l), (l==='es'?p.slug:p.slugEn), 'index.html'), pillarPageHTML(l, p)));
  write(path.join(DIST, l, T[l].guidesPath, 'index.html'), guidesIndexHTML(l));
  GUIDES.forEach((g) => write(path.join(DIST, l, T[l].guidesPath, (l==='es'?g.slug:g.slugEn), 'index.html'), guidePageHTML(l, g)));
  write(path.join(DIST, l, aboutSlug(l), 'index.html'), simplePage(l, 'about'));
  write(path.join(DIST, l, methodSlug(l), 'index.html'), simplePage(l, 'method'));
  console.log('  /' + l + '/  (home, '+TOOLS.length+' tools, '+PILLARS.length+' pillars, '+GUIDES.length+' guides, about, methodology)');
});
write(path.join(DIST, 'index.html'), rootHTML());
cp(path.join(SRC, 'assets/css/styles.css'), path.join(DIST, 'assets/css/styles.css'));
cp(path.join(SRC, 'assets/js/consent.js'), path.join(DIST, 'assets/js/consent.js'));
const ICONDIR = path.join(SRC, 'assets/icons');
if (fs.existsSync(ICONDIR)) {
  fs.readdirSync(ICONDIR).forEach((f) => cp(path.join(ICONDIR, f), path.join(DIST, 'assets/icons', f)));
  cp(path.join(ICONDIR, 'favicon.ico'), path.join(DIST, 'favicon.ico'));
} else { write(path.join(DIST, 'assets/icons/favicon.svg'), favicon()); }
const OGDIR = path.join(SRC, 'assets/og');
if (fs.existsSync(OGDIR)) fs.readdirSync(OGDIR).forEach((f) => cp(path.join(OGDIR, f), path.join(DIST, 'assets/og', f)));
const LOGODIR = path.join(SRC, 'assets/logos');
if (fs.existsSync(LOGODIR)) fs.readdirSync(LOGODIR).forEach((f) => cp(path.join(LOGODIR, f), path.join(DIST, 'assets/logos', f)));
write(path.join(DIST, 'sitemap.xml'), sitemap());
write(path.join(DIST, 'robots.txt'), robots());
write(path.join(DIST, 'manifest.webmanifest'), manifest());
write(path.join(DIST, '.nojekyll'), '');
console.log('Done.');
