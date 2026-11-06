// Page-level interaction. Works with or without WebGL. Shared state lives on window.FX.
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const saved = localStorage.getItem('fx');
const FX = window.FX = { on: saved ? saved === '1' : !reduce, reduce, fine, accent: 0, pulse() {}, pointer: { x: 0, y: 0, px: innerWidth / 2, py: innerHeight / 3, idle: true } };
const P = FX.pointer;
root.classList.toggle('fx-off', !FX.on);

const hero = document.querySelector('.hero');
const hint = document.getElementById('fxHint');
if (hint) hint.textContent = fine ? 'Move your cursor to disturb the network. Click to send a pulse.' : 'Drag across the screen to disturb the network. Tap to send a pulse.';

// Cursor halo (extra to the real cursor, never replaces it)
const halo = document.createElement('div');
halo.className = 'halo'; halo.setAttribute('aria-hidden', 'true');
if (fine) document.body.append(halo);

let last = 0, sx = 0, sy = 0, hx = P.px, hy = P.py, running = false;
addEventListener('pointermove', e => {
  last = performance.now(); P.idle = false;
  P.px = e.clientX; P.py = e.clientY;
  P.x = e.clientX / innerWidth * 2 - 1; P.y = e.clientY / innerHeight * 2 - 1;
  if (e.pointerType === 'mouse') halo.classList.add('on');
}, { passive: true });
addEventListener('pointerdown', e => { if (!FX.on) return; FX.pulse(); halo.classList.add('down'); }, { passive: true });
addEventListener('pointerup', () => halo.classList.remove('down'), { passive: true });
root.addEventListener('mouseleave', () => halo.classList.remove('on'));
document.addEventListener('pointerover', e => {
  const t = e.target.closest ? e.target.closest('a,button,.tilt,input,textarea,select') : null;
  halo.classList.toggle('big', !!t);
  FX.accent = e.target.closest && e.target.closest('.tilt') ? 1 : 0;
}, { passive: true });

function loop(t) {
  if (!FX.on) { running = false; return; }
  if (t - last > 3500) { // nobody is touching anything: drift gently so the page still feels alive
    P.idle = true; P.x = Math.sin(t * 0.00035) * 0.55; P.y = Math.cos(t * 0.00028) * 0.4;
    P.px = innerWidth * (P.x + 1) / 2; P.py = innerHeight * (P.y + 1) / 2;
  }
  sx += (P.x - sx) * 0.07; sy += (P.y - sy) * 0.07;
  hx += (P.px - hx) * 0.2; hy += (P.py - hy) * 0.2;
  halo.style.transform = `translate3d(${hx.toFixed(1)}px,${hy.toFixed(1)}px,0)`;
  if (hero && scrollY < innerHeight * 1.2) { hero.style.setProperty('--mx', sx.toFixed(3)); hero.style.setProperty('--my', sy.toFixed(3)); }
  root.style.setProperty('--cx', hx.toFixed(0) + 'px'); root.style.setProperty('--cy', hy.toFixed(0) + 'px');
  requestAnimationFrame(loop);
}
function start() { if (!running && FX.on) { running = true; requestAnimationFrame(loop); } }
start();

// Card tilt with a light that follows the cursor (mouse only)
if (fine) {
  document.querySelectorAll('.project-card, .venture-card, .community-card, .cred-card, .skill-panel, .book-card, .writing-item, .contact-panel').forEach(el => {
    el.classList.add('tilt');
    el.addEventListener('pointermove', e => {
      if (!FX.on) return;
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg'); el.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      el.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(0) + '%'); el.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(0) + '%');
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
  // Magnetic buttons
  document.querySelectorAll('.btn').forEach(b => {
    b.addEventListener('pointermove', e => {
      if (!FX.on) return;
      const r = b.getBoundingClientRect();
      b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1)}px`;
    });
    b.addEventListener('pointerleave', () => { b.style.translate = ''; });
  });
}

// On/off switch, remembered between visits
const tg = document.createElement('button');
tg.className = 'fx-toggle'; tg.type = 'button';
const paint = () => { tg.setAttribute('aria-pressed', FX.on); tg.textContent = '3D effects: ' + (FX.on ? 'on' : 'off'); root.classList.toggle('fx-off', !FX.on); };
tg.onclick = () => { FX.on = !FX.on; localStorage.setItem('fx', FX.on ? '1' : '0'); paint(); dispatchEvent(new Event('fxchange')); start(); };
paint(); document.body.append(tg);
