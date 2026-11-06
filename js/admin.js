const $ = s => document.querySelector(s);
const LS = 'cms-draft', CF = 'cms-cfg';
const ENUM = { style: ['primary', 'ghost'], logoStyle: ['', 'yes'], badge: ['✓', '★'] };
const pending = {}; // image path -> base64, uploaded on publish
const openItems = new WeakSet();
let data, tpl = {}, cur, dirty = false, timer;

const loc = location.hostname.endsWith('.github.io') ? { owner: location.hostname.split('.')[0], repo: location.pathname.split('/')[1] || '' } : {};
const cfg = Object.assign({ owner: '', repo: '', branch: 'main', token: '' }, loc, JSON.parse(localStorage.getItem(CF) || '{}'));

const el = (t, p = {}, ...k) => { const e = Object.assign(document.createElement(t), p); k.flat().forEach(c => e.append(c)); return e; };
const human = k => k.replace(/([A-Z])/g, ' $1').toLowerCase();
const blank = v => Array.isArray(v) ? [] : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)])) : '';
const label = it => { for (const v of Object.values(it)) if (typeof v === 'string' && v.trim()) return v.replace(/\*\*/g, ''); return 'New item'; };

function status(msg, cls = '') { const s = $('#status'); s.textContent = msg; s.className = cls; }
function touch() {
  dirty = true; status('Unpublished changes (draft saved here)', 'warn');
  clearTimeout(timer); timer = setTimeout(() => localStorage.setItem(LS, JSON.stringify(data)), 300);
}
function learn(v, path) { // remember an empty example for every list (keyed by its place in the data) so "Add" works on empty lists
  if (Array.isArray(v)) { if (v.length && v[0] && typeof v[0] === 'object') tpl[path] = blank(v[0]); v.forEach(x => x && typeof x === 'object' && learn(x, path)); }
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => learn(x, path ? path + '.' + k : k));
}

function textInput(get, set, long) {
  const e = long ? el('textarea') : el('input', { type: 'text' });
  e.value = get(); e.oninput = () => { set(e.value); touch(); }; return e;
}

function field(h, k, base) {
  const path = base ? base + '.' + k : k;
  const v = h[k];
  if (Array.isArray(v)) return list(h, k, path);
  if (v && typeof v === 'object') return el('fieldset', {}, el('legend', { textContent: human(k) }), Object.keys(v).map(x => field(v, x)));
  const wrap = el('div', {}, el('label', { textContent: human(k) }));
  if (ENUM[k]) {
    const s = el('select'); ENUM[k].forEach(o => s.append(el('option', { value: o, textContent: o || '(none)' })));
    if (!ENUM[k].includes(v)) s.append(el('option', { value: v, textContent: v })); s.value = v; s.onchange = () => { h[k] = s.value; touch(); }; wrap.append(s);
  } else if (/^(image|img|photo)$/.test(k)) {
    const im = el('img', { src: pending[h[k]] ? 'data:image/*;base64,' + pending[h[k]] : h[k] });
    const inp = textInput(() => h[k], x => { h[k] = x; im.src = x; }); 
    const up = el('button', { className: 'ib', textContent: 'Upload', onclick: () => pickImage(path => { h[k] = path; inp.value = path; im.src = 'data:image/*;base64,' + pending[path]; touch(); }) });
    wrap.append(el('div', { className: 'img-row' }, im, inp, up));
  } else wrap.append(textInput(() => v, x => { h[k] = x; }, v.length > 80 || /^(intro|text|description)$/.test(k)));
  return wrap;
}

function list(h, k, path) {
  const a = h[k], box = el('fieldset', {}, el('legend', { textContent: human(k) }));
  const objs = a.length ? typeof a[0] === 'object' : !!tpl[path];
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; touch(); show(cur); };
  const del = i => { if (confirm('Remove this entry?')) { a.splice(i, 1); touch(); show(cur); } };
  a.forEach((it, i) => {
    const btns = [el('button', { className: 'ib', textContent: '↑', onclick: e => { e.preventDefault(); move(i, -1); } }), el('button', { className: 'ib', textContent: '↓', onclick: e => { e.preventDefault(); move(i, 1); } })];
    if (objs) {
      const d = el('details', { open: openItems.has(it) }); d.ontoggle = () => d.open ? openItems.add(it) : openItems.delete(it);
      const dup = el('button', { className: 'ib', textContent: 'copy', onclick: e => { e.preventDefault(); a.splice(i + 1, 0, JSON.parse(JSON.stringify(it))); touch(); show(cur); } });
      const x = el('button', { className: 'ib del', textContent: '✕', onclick: e => { e.preventDefault(); del(i); } });
      const t = el('span', { className: 't', textContent: label(it) });
      d.append(el('summary', {}, t, ...btns, dup, x), el('div', { className: 'body' }, Object.keys(it).map(f => field(it, f, path))));
      d.addEventListener('input', () => t.textContent = label(it));
      box.append(d);
    } else {
      const inp = textInput(() => it, x => { a[i] = x; }, String(it).length > 80);
      box.append(el('div', { className: 'row' }, inp, ...btns, el('button', { className: 'ib del', textContent: '✕', onclick: () => del(i) })));
    }
  });
  box.append(el('button', { className: 'ib add', textContent: '+ Add', onclick: () => {
    const n = objs ? JSON.parse(JSON.stringify(tpl[path] || blank(a[0]))) : ''; a.push(n); if (objs) openItems.add(n); touch(); show(cur);
  } }));
  return box;
}

const BUILTIN = ['hero', 'about', 'skills', 'credentials', 'community', 'ventures', 'projects', 'writing', 'contact', 'footer'];
const target = id => BUILTIN.includes(id) ? data[id] : data.custom.find(c => c.id === id);
function ensure() {
  data.custom = data.custom || [];
  if (!data.layout) data.layout = BUILTIN.filter(k => data[k] && k !== 'footer').map(k => ({ id: k, label: k[0].toUpperCase() + k.slice(1), show: true, menu: !['hero', 'credentials'].includes(k) }));
  tpl['custom.cards'] = tpl['custom.cards'] || { image: '', kicker: '', title: '', text: '', buttonLabel: '', buttonLink: '' };
}
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'section';
const uniq = base => { let id = base, n = 2; while (data.layout.some(e => e.id === id) || BUILTIN.includes(id)) id = base + '-' + n++; return id; };
const insertAt = () => { const i = data.layout.findIndex(e => e.id === 'contact'); return i < 0 ? data.layout.length : i; };

function show(k) {
  const y = scrollY; cur = k;
  document.querySelectorAll('aside button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
  const obj = k === '__sections' ? null : target(k);
  const m = $('#main');
  if (!obj) { manager(); return; }
  const base = BUILTIN.includes(k) ? k : 'custom';
  m.replaceChildren(el('h2', { textContent: (data.layout.find(e => e.id === k) || {}).label || k }), ...Object.keys(obj).filter(f => f !== 'id').map(f => field(obj, f, base)));
  scrollTo(0, y);
}

function manager() {
  cur = '__sections';
  document.querySelectorAll('aside button').forEach(b => b.classList.toggle('on', b.dataset.k === cur));
  const L = data.layout, m = $('#main'), go = () => { touch(); nav(); manager(); };
  const rows = L.map((e, i) => {
    const mv = d => { const j = i + d; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; go(); };
    const chk = (txt, key) => { const c = el('input', { type: 'checkbox', checked: e[key] !== false }); c.style.width = 'auto'; c.onchange = () => { e[key] = c.checked; touch(); nav(); }; return el('label', { style: 'display:flex;gap:6px;align-items:center;margin:0;white-space:nowrap' }, c, txt); };
    const name = el('input', { type: 'text', value: e.label }); name.oninput = () => { e.label = name.value; touch(); nav(); };
    const kind = e.type === 'link' ? 'link' : BUILTIN.includes(e.id) ? 'built in' : 'custom';
    const row = el('div', { className: 'row', style: 'align-items:center;flex-wrap:wrap' }, name, chk('On page', 'show'), chk('In menu', 'menu'),
      e.type === 'link' ? '' : el('button', { className: 'ib', textContent: 'Edit', onclick: () => show(e.id) }),
      el('button', { className: 'ib', textContent: '↑', onclick: () => mv(-1) }), el('button', { className: 'ib', textContent: '↓', onclick: () => mv(1) }),
      kind === 'built in' ? '' : el('button', { className: 'ib del', textContent: '✕', onclick: () => {
        if (!confirm('Delete "' + e.label + '"? This cannot be undone after you publish.')) return;
        L.splice(i, 1); if (kind === 'custom') data.custom = data.custom.filter(c => c.id !== e.id); go(); } }));
    const wrap = el('div', {}, row, el('span', { style: 'font:11px var(--mono);color:var(--muted-2)', textContent: kind }));
    if (e.type === 'link') { const u = el('input', { type: 'text', value: e.link, placeholder: 'https://...' }); u.oninput = () => { e.link = u.value; touch(); }; wrap.append(u); }
    return el('fieldset', {}, wrap);
  });
  m.replaceChildren(el('h2', { textContent: 'Sections & menu' }),
    el('p', { style: 'color:var(--muted);font-size:14px;margin-bottom:12px', textContent: 'Reorder, rename, hide or remove sections. "In menu" controls the top navigation. Built in sections can be hidden but not deleted.' }),
    ...rows,
    el('div', { className: 'row' }, el('button', { className: 'btn btn-primary', textContent: '+ New section', onclick: () => {
      const name = (prompt('Name of the new section (for example Testimonials, Services, Gallery)?') || '').trim(); if (!name) return;
      const id = uniq(slug(name));
      data.custom.push({ id, eyebrow: name, heading: name, intro: '', body: [], cards: [] });
      L.splice(insertAt(), 0, { id, label: name, show: true, menu: true }); touch(); nav(); show(id);
    } }), el('button', { className: 'btn btn-ghost', textContent: '+ Menu link', onclick: () => {
      const label = (prompt('Link text?') || '').trim(); if (!label) return;
      const link = (prompt('Link address (https://...)?') || '').trim(); if (!link) return;
      L.splice(insertAt(), 0, { id: 'link-' + Date.now().toString(36), type: 'link', label, link, show: true, menu: true }); go();
    } })));
}
function nav() {
  const items = [['Sections & menu', '__sections'], ...data.layout.filter(e => e.type !== 'link').map(e => [e.label + (e.show === false ? ' (hidden)' : ''), e.id]), ['Footer', 'footer']];
  $('#nav').replaceChildren(...items.map(([t, k]) => { const b = el('button', { textContent: t, onclick: () => show(k) }); b.dataset.k = k; if (k === cur) b.className = 'on'; return b; }));
}

function pickImage(done) {
  const f = $('#fImg'); f.value = '';
  f.onchange = async () => {
    const file = f.files[0]; if (!file) return;
    const png = file.type === 'image/png', keep = /svg|gif|webp/.test(file.type);
    const ext = keep ? file.name.split('.').pop().toLowerCase() : png ? 'png' : 'jpg';
    const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'image';
    const path = `assets/${base}-${Date.now().toString(36)}.${ext}`;
    if (keep) pending[path] = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())));
    else { // shrink big photos so the repo and site stay light
      const bmp = await createImageBitmap(file), sc = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
      const c = el('canvas', { width: Math.round(bmp.width * sc), height: Math.round(bmp.height * sc) }); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      pending[path] = c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85).split(',')[1];
    }
    done(path);
  };
  f.click();
}

// GitHub publish
const gh = (p, o = {}) => fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${p}${o.q || ''}`, { ...o, headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json' } });
async function put(path, b64, msg) {
  let sha; const r = await gh(path, { q: '?ref=' + cfg.branch });
  if (r.ok) sha = (await r.json()).sha; else if (r.status !== 404) throw new Error(r.status === 401 ? 'Token rejected (401)' : 'GitHub error ' + r.status);
  const w = await gh(path, { method: 'PUT', body: JSON.stringify({ message: msg, content: b64, branch: cfg.branch, sha }) });
  if (!w.ok) throw new Error(w.status === 403 || w.status === 404 ? 'No write access. Check token scope and repo name.' : 'GitHub error ' + w.status);
}
const b64 = s => { let b = ''; new TextEncoder().encode(s).forEach(x => b += String.fromCharCode(x)); return btoa(b); };

async function publish() {
  if (!cfg.token || !cfg.owner || !cfg.repo) return $('#dlg').showModal();
  try {
    const used = Object.keys(pending).filter(p => JSON.stringify(data).includes(p));
    for (const [i, p] of used.entries()) { status(`Uploading image ${i + 1} of ${used.length}...`); await put(p, pending[p], 'CMS: add image'); delete pending[p]; }
    status('Publishing content...'); await put('content.json', b64(JSON.stringify(data, null, 2) + '\n'), 'CMS: update content');
    dirty = false; status('Published. The live site updates in about a minute.', 'ok');
  } catch (e) { status(e.message, 'err'); }
}

async function loadLive() { data = await (await fetch('content.json?v=' + Date.now())).json(); }
function ready() { tpl = {}; ensure(); learn(data, ''); ensure(); cur = cur && (cur === '__sections' || target(cur)) ? cur : '__sections'; nav(); show(cur); }

$('#bPub').onclick = publish;
$('#bPrev').onclick = () => { localStorage.setItem(LS, JSON.stringify(data)); open('index.html?preview=1', '_blank'); };
$('#bDl').onclick = () => { const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), download: 'content.json' }); a.click(); };
$('#bImp').onclick = () => $('#fImp').click();
$('#fImp').onchange = async e => { try { data = JSON.parse(await e.target.files[0].text()); ready(); touch(); } catch { status('That file is not valid JSON', 'err'); } };
$('#bReset').onclick = async () => { if (!confirm('Discard your draft and reload the live content?')) return; localStorage.removeItem(LS); await loadLive(); ready(); dirty = false; status('Loaded live content', 'ok'); };
$('#bSet').onclick = () => { $('#cOwner').value = cfg.owner; $('#cRepo').value = cfg.repo; $('#cBranch').value = cfg.branch; $('#cToken').value = cfg.token; $('#dlg').showModal(); };
$('#cCancel').onclick = () => $('#dlg').close();
$('#cSave').onclick = () => { Object.assign(cfg, { owner: $('#cOwner').value.trim(), repo: $('#cRepo').value.trim(), branch: $('#cBranch').value.trim() || 'main', token: $('#cToken').value.trim() }); localStorage.setItem(CF, JSON.stringify(cfg)); $('#dlg').close(); status('Settings saved', 'ok'); };
addEventListener('beforeunload', e => { if (dirty && Object.keys(pending).length) e.preventDefault(); });

try {
  const d = localStorage.getItem(LS);
  if (d) { data = JSON.parse(d); status('Draft restored (not yet published)', 'warn'); dirty = true; } else { await loadLive(); status('Loaded live content', 'ok'); }
  ready();
} catch (e) { status('Could not load content.json. Open this page over http.', 'err'); }
