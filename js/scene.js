import * as THREE from '../vendor/three.module.min.js';

const canvas = document.getElementById('gl');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 700;
const CYAN = 0x52d1c8, AMBER = 0xf2a65a;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'low-power' });
} catch (e) { canvas.remove(); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0c1220, 0.035);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
camera.position.set(0, 0, 14);

// Network of nodes with static links between near neighbours
const world = new THREE.Group();
scene.add(world);
const N = small ? 90 : 190;
const pts = [];
for (let i = 0; i < N; i++) {
  const r = 8 + Math.random() * 22;
  const a = Math.random() * Math.PI * 2;
  pts.push(new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 70, Math.sin(a) * r - 10));
}
const posArr = new Float32Array(N * 3), colArr = new Float32Array(N * 3);
pts.forEach((p, i) => {
  posArr.set([p.x, p.y, p.z], i * 3);
  const c = new THREE.Color(Math.random() > 0.2 ? CYAN : AMBER);
  colArr.set([c.r, c.g, c.b], i * 3);
});
const pg = new THREE.BufferGeometry();
pg.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
pg.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
world.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.28, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true })));

const lines = [];
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
  if (pts[i].distanceTo(pts[j]) < 7.5) lines.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
}
const lg = new THREE.BufferGeometry();
lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
world.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.14 })));

// Wireframe core that follows the camera down the page
const core = new THREE.Group();
const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), new THREE.MeshBasicMaterial({ color: CYAN, wireframe: true, transparent: true, opacity: 0.35 }));
const inner = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), new THREE.MeshBasicMaterial({ color: AMBER, wireframe: true, transparent: true, opacity: 0.7 }));
const glow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), new THREE.MeshBasicMaterial({ color: CYAN }));
core.add(shell, inner, glow);
scene.add(core);

// Orbiting rings
const rings = [1, 2].map(k => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(3.6 + k * 0.7, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: k === 1 ? AMBER : CYAN, transparent: true, opacity: 0.4 }));
  core.add(m); return m;
});

// Input state, smoothed each frame
let mx = 0, my = 0, tx = 0, ty = 0, prog = 0, progT = 0, last = 0, burst = 0;
addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - 0.5); ty = (e.clientY / innerHeight - 0.5); }, { passive: true });
addEventListener('pointerdown', () => { burst = 1; }, { passive: true });
const onScroll = () => {
  const h = document.documentElement.scrollHeight - innerHeight;
  progT = h > 0 ? scrollY / h : 0;
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let running = true;
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(frame); });

function frame(t) {
  if (!running) return;
  const dt = Math.min((t - last) / 1000 || 0.016, 0.05); last = t;
  mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
  prog += (progT - prog) * 0.06;
  burst *= 0.92;

  // Camera glides down through the node field as you scroll
  camera.position.y = -prog * 32;
  camera.position.x = mx * 2.2;
  camera.position.z = 14 - prog * 6 + Math.sin(prog * Math.PI) * 2;
  camera.lookAt(mx * 1.2, camera.position.y - my * 1.5, 0);
  world.rotation.y = prog * Math.PI * 1.5 + t * 0.00004;

  // Core drifts side to side so it never sits behind body text
  core.position.set(Math.sin(prog * Math.PI * 4) * (small ? 1.2 : 4.5) + (small ? 0 : 3.5), camera.position.y, 0);
  const s = 1 + burst * 0.35;
  core.scale.setScalar(s);
  shell.rotation.x += dt * 0.15; shell.rotation.y += dt * 0.22;
  inner.rotation.x -= dt * 0.4; inner.rotation.y += dt * 0.3;
  rings[0].rotation.x = Math.PI / 2.4 + t * 0.0003; rings[1].rotation.y = t * 0.0004; rings[1].rotation.x = 1;
  glow.scale.setScalar(1 + Math.sin(t * 0.003) * 0.15 + burst * 0.8);

  renderer.render(scene, camera);
  if (!reduce) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (reduce) addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });

// 3D tilt on cards (mouse only)
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
  const sel = '.project-card, .venture-card, .community-card, .cred-card, .skill-panel, .book-card, .writing-item, .contact-panel';
  document.querySelectorAll(sel).forEach(el => {
    el.classList.add('tilt');
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      el.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      el.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(0) + '%');
      el.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(0) + '%');
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
}
