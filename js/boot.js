import { render } from './render.js';
let data;
try {
  const draft = location.search.includes('preview') && localStorage.getItem('cms-draft');
  data = draft ? JSON.parse(draft) : await (await fetch('content.json?v=' + Date.now())).json();
} catch (e) {
  document.getElementById('top').innerHTML = '<p style="padding:160px 28px;text-align:center;color:#8b96a8">Could not load content.json. Serve this folder over http (GitHub Pages or python -m http.server).</p>';
  throw e;
}
window.SITE = data;
render(data);
if (location.search.includes('preview')) document.title = '[PREVIEW] ' + document.title;

// Collapse the menu into the hamburger whenever the links do not fit
const hdr = document.querySelector('.site-nav'), inner = hdr.querySelector('.nav-inner');
const fit = () => { hdr.classList.remove('compact'); if (inner.scrollWidth > inner.clientWidth + 1) hdr.classList.add('compact'); };
fit(); addEventListener('resize', fit); document.fonts && document.fonts.ready.then(fit);

await import('./ui.js');
await import('./fx.js');
await import('./scene.js').catch(() => {});
