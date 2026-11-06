// Turns content.json into the page markup. Text is escaped; **word** becomes bold.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const url = u => { u = String(u || '').trim(); return /^(https?:|mailto:|tel:|#|\/|\.\/|assets\/)/i.test(u) || /^[\w.-]+(\/|$)/.test(u) ? esc(u) : '#'; };
const arr = a => Array.isArray(a) ? a : [];
const ext = 'target="_blank" rel="noopener"';
const head = d => `<div class="sec-head reveal"><div class="eyebrow">${esc(d.eyebrow)}</div><h2>${rich(d.heading)}</h2>${d.intro ? `<p>${rich(d.intro)}</p>` : ''}</div>`;
const div = '<div class="sec-divider"><span class="ping"></span></div>';

const sections = {
  hero: d => `<section class="hero wrap" style="border-top:none; position:relative;">
    <div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div>
    <div class="hero-copy" style="position:relative; z-index:1;">
      <div class="eyebrow">${esc(d.eyebrow)}</div><h1 class="name">${esc(d.name)}</h1>
      <div class="role-line"><span class="role-rotator" id="roleRotator">${esc(arr(d.roles)[0])}</span></div>
      <p class="lede">${rich(d.intro)}</p>
      <div class="hero-ctas">${arr(d.buttons).map(b => `<a href="${url(b.link)}" class="btn ${b.style === 'ghost' ? 'btn-ghost' : 'btn-primary'}">${esc(b.label)}</a>`).join('')}</div>
      <p class="fx-hint" id="fxHint"></p>
    </div>
    <div class="console-wrap"><div class="console reveal"><div class="console-bar"><span></span><span></span><span></span><span class="path">~/whoami.sh</span></div>
      <div class="console-body">${arr(d.console).map((c, i, a) => `<div class="line"><span class="prompt">$</span> ${esc(c.command)}</div><div class="line">${i === a.length - 1 ? `<span class="status">${esc(c.output)}<span class="caret"></span></span>` : `<span class="val">${esc(c.output)}</span>`}</div>`).join('')}</div>
    </div></div></section>`,
  about: d => `<section id="about"><div class="wrap">${head({ eyebrow: d.eyebrow, heading: d.heading })}
    <div class="about-grid"><div class="reveal">${arr(d.paragraphs).map(p => `<p>${rich(p)}</p>`).join('')}</div>
    <div class="reveal"><div class="fact-card">${arr(d.facts).map(f => `<div class="fact"><span class="k">${esc(f.label)}</span><span class="v">${rich(f.value)}</span></div>`).join('')}</div>
    ${d.book && d.book.title ? `<a class="book-card" href="${url(d.book.link)}" ${ext}><img src="${url(d.book.image)}" alt="${esc(d.book.alt)}" width="64" height="96" loading="lazy"><div class="book-info"><div class="venture-kicker">${esc(d.book.kicker)}</div><h4>${esc(d.book.title)}</h4><p>${esc(d.book.text)}</p></div></a>` : ''}
    </div></div></div></section>`,
  skills: d => `<section id="skills"><div class="wrap">${head(d)}<div class="skill-cols">${arr(d.panels).map((p, i) => `<div class="skill-panel ${['', 'technical', 'professional'][i % 3]} reveal"><span class="tag">${esc(p.tag)}</span><h3>${rich(p.title)}</h3><ul>${arr(p.items).map(x => `<li>${rich(x)}</li>`).join('')}</ul></div>`).join('')}</div></div></section>`,
  credentials: d => `<section id="credentials"><div class="wrap">${head(d)}
    <div class="logo-strip reveal">${arr(d.logos).map(l => `<div class="logo-chip"><img src="${url(l.image)}" alt="${esc(l.alt)}"></div>`).join('')}</div>
    <div class="cred-grid">${arr(d.groups).map(g => `<div class="cred-card ${g.badge === '★' ? 'honors' : ''} reveal"><h3><span class="ico">${esc(g.icon)}</span> ${esc(g.title)}</h3>${arr(g.items).map(x => `<div class="item"><span class="chip">${esc(g.badge)}</span><span class="v">${rich(x)}</span></div>`).join('')}</div>`).join('')}</div></div></section>`,
  community: d => `<section id="community"><div class="wrap">${head(d)}<div class="community-grid">${arr(d.cards).map(c => `<div class="community-card reveal"><img src="${url(c.image)}" alt="${esc(c.alt)}" loading="lazy"><div class="community-body"><div class="venture-kicker">${esc(c.kicker)}</div><h3>${rich(c.title)}</h3><p>${rich(c.text)}</p>${c.impact ? `<div class="impact-tag">${esc(c.impact)}</div>` : ''}</div></div>`).join('')}</div></div></section>`,
  ventures: d => `<section id="ventures"><div class="wrap">${head(d)}${arr(d.cards).map(c => `<div class="venture-card reveal"><div><div class="venture-kicker">${esc(c.kicker)}</div><h3>${rich(c.title)}</h3><p>${rich(c.text)}</p><div class="venture-badges">${arr(c.badges).map(b => `<span>${esc(b)}</span>`).join('')}</div>${c.buttonLink ? `<a href="${url(c.buttonLink)}" ${ext} class="btn btn-primary">${esc(c.buttonLabel)}</a>` : ''}</div><div class="venture-panel">${arr(c.details).map(r => `<div class="row"><span>${esc(r.label)}</span><span class="v">${esc(r.value)}</span></div>`).join('')}</div></div>`).join('')}</div></section>`,
  projects: d => `<section id="projects"><div class="wrap">${head(d)}<div class="project-grid">${arr(d.cards).map(c => `<div class="project-card reveal"><img class="project-thumb ${c.logoStyle ? 'logo-thumb' : ''}" src="${url(c.image)}" alt="${esc(c.alt)}" loading="lazy"><div class="project-card-body"><h3>${rich(c.title)}</h3><p>${rich(c.text)}</p><div class="project-tags">${arr(c.tags).map(t => `<span>${esc(t)}</span>`).join('')}</div>${c.codeLink ? `<a href="${url(c.codeLink)}" ${ext} class="code-link"><img class="gh-icon" src="assets/github-icon.png" alt="">View code →</a>` : ''}</div></div>`).join('')}</div></div></section>`,
  writing: d => `<section id="writing"><div class="wrap">${head(d)}<div class="writing-list">${arr(d.items).map(w => `<div class="writing-item reveal"><time>${esc(w.source)}</time><div><div class="meta"><span class="cat">${esc(w.category)}</span></div><h3>${rich(w.title)}</h3><p>${rich(w.text)}</p></div><a href="${url(w.link)}" ${ext} class="go">Read more →</a></div>`).join('')}</div>${d.viewAllLink ? `<div class="view-all reveal"><a href="${url(d.viewAllLink)}" ${ext} class="btn btn-ghost">${esc(d.viewAllLabel)}</a></div>` : ''}</div></section>`,
  custom: d => `<section id="${esc(d.id)}"><div class="wrap">${head(d)}${arr(d.body).length ? `<div class="prose reveal">${arr(d.body).map(p => `<p>${rich(p)}</p>`).join('')}</div>` : ''}${arr(d.cards).length ? `<div class="community-grid">${arr(d.cards).map(c => `<div class="community-card reveal">${c.image ? `<img src="${url(c.image)}" alt="${esc(c.title)}" loading="lazy">` : ''}<div class="community-body">${c.kicker ? `<div class="venture-kicker">${esc(c.kicker)}</div>` : ''}<h3>${rich(c.title)}</h3><p>${rich(c.text)}</p>${c.buttonLink ? `<a href="${url(c.buttonLink)}" ${ext} class="btn btn-ghost">${esc(c.buttonLabel || 'Open')}</a>` : ''}</div></div>`).join('')}</div>` : ''}</div></section>`,
  contact: d => `<section id="contact"><div class="wrap"><div class="contact-panel reveal"><h2>${rich(d.heading)}</h2><p>${rich(d.text)}</p><div class="contact-ctas"><a href="mailto:${esc(d.email)}" class="btn btn-primary">Email me →</a><a href="tel:${esc(d.phoneLink)}" class="btn btn-ghost">Call / WhatsApp</a>${d.linktree ? `<a href="${url(d.linktree)}" ${ext} class="btn btn-ghost">All links (Linktree)</a>` : ''}</div><div class="contact-details"><span>${esc(d.email)}</span><span class="dash">—</span><span>${esc(d.phone)}</span></div></div></div></section>`
};

export function defaultLayout(data) {
  const ids = ['hero', 'about', 'skills', 'credentials', 'community', 'ventures', 'projects', 'writing', 'contact'];
  return ids.filter(k => data[k]).map(k => ({ id: k, label: k[0].toUpperCase() + k.slice(1), show: true, menu: !['hero', 'credentials'].includes(k) }));
}
export function render(data) {
  const L = arr(data.layout).length ? data.layout : defaultLayout(data);
  const get = e => e.type === 'link' ? null : data[e.id] && sections[e.id] ? [sections[e.id], data[e.id]] : (c => c ? [sections.custom, c] : null)(arr(data.custom).find(x => x.id === e.id));
  document.getElementById('top').innerHTML = L.filter(e => e.show !== false).map(e => { const g = get(e); return g ? g[0](g[1]) : ''; }).filter(Boolean).join(div + '\n');
  const links = L.filter(e => e.show !== false && e.menu !== false && e.id !== 'hero' && (e.type === 'link' ? e.link : get(e)))
    .map(e => e.type === 'link' ? `<a href="${url(e.link)}" ${ext}>${esc(e.label)}</a>` : `<a href="#${esc(e.id)}">${esc(e.label)}</a>`).join('');
  document.getElementById('desktopLinks').innerHTML = links;
  document.getElementById('mobileMenu').innerHTML = links;
  document.getElementById('footText').textContent = '© ' + new Date().getFullYear() + ' ' + (data.footer?.text || '');
}
