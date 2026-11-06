import * as THREE from '../vendor/three.module.min.js';

const FX = window.FX, P = FX.pointer, canvas = document.getElementById('gl');
const small = innerWidth < 760 || !FX.fine;
const RANGE = 32, CYAN = new THREE.Color(0x52d1c8), AMBER = new THREE.Color(0xf2a65a);

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true }); }
catch (e) { canvas.remove(); throw e; }
let dpr = Math.min(devicePixelRatio, small ? 1.5 : 1.75);
renderer.setPixelRatio(dpr);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
camera.position.set(0, 0, 14);

// Shared uniforms: the same cursor field bends both nodes and links
const U = {
  uTime: { value: 0 }, uPR: { value: dpr }, uPush: { value: 1 }, uAccent: { value: 0 },
  uMouse: { value: new THREE.Vector3(999, 999, 999) }, uBurstPos: { value: new THREE.Vector3() }, uBurst: { value: 1 }
};
const COMMON = `
uniform float uTime, uPR, uPush, uBurst, uAccent; uniform vec3 uMouse, uBurstPos;
float glow(vec3 p){ return smoothstep(6.5, 0.0, distance(p, uMouse)); }
vec3 displace(vec3 p){
  float g = glow(p);
  p += normalize(p - uMouse + vec3(0.0001)) * g * g * 2.6 * uPush;
  p += vec3(sin(uTime*.55 + p.y*.45), cos(uTime*.47 + p.x*.4), sin(uTime*.38 + p.z*.5)) * .35;
  float w = exp(-pow((distance(p, uBurstPos) - uBurst*30.)*.28, 2.));
  p += normalize(p - uBurstPos + vec3(0.0001)) * w * 3.0 * (1. - uBurst);
  return p;
}
float fade(float z){ return clamp(1. - (z - 8.)/48., .1, 1.) * smoothstep(1.5, 7., z); }`;

// Node field
const world = new THREE.Group(); scene.add(world);
const N = small ? 260 : 700, pts = [];
for (let i = 0; i < N; i++) {
  const r = 7 + Math.random() * 22, a = Math.random() * 6.2832;
  pts.push(new THREE.Vector3(Math.cos(a) * r, -46 + Math.random() * 58, Math.sin(a) * r - 6));
}
const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), siz = new Float32Array(N);
pts.forEach((p, i) => { pos.set([p.x, p.y, p.z], i * 3); const c = Math.random() > 0.18 ? CYAN : AMBER; col.set([c.r, c.g, c.b], i * 3); siz[i] = 0.16 + Math.random() * 0.28; });
const pg = new THREE.BufferGeometry();
pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); pg.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
world.add(new THREE.Points(pg, new THREE.ShaderMaterial({
  uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: COMMON + `attribute vec3 aColor; attribute float aSize; varying vec3 vC; varying float vG, vF;
    void main(){ vG = glow(position); vec4 mv = modelViewMatrix * vec4(displace(position), 1.); gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPR * (260. / -mv.z) * (1. + vG * 1.8); vC = aColor; vF = fade(-mv.z); }`,
  fragmentShader: `varying vec3 vC; varying float vG, vF;
    void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; float a = pow(1. - d*2., 1.6);
      gl_FragColor = vec4(mix(vC, vec3(1.), vG*.5) * (.8 + vG), a * vF * (.7 + vG*.3)); }`
})));
const seg = [], TH = small ? 8.5 : 6.2;
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (pts[i].distanceTo(pts[j]) < TH) seg.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
world.add(new THREE.LineSegments(lg, new THREE.ShaderMaterial({
  uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: COMMON + `varying float vG, vF; void main(){ vG = glow(position); vec4 mv = modelViewMatrix * vec4(displace(position), 1.); gl_Position = projectionMatrix * mv; vF = fade(-mv.z); }`,
  fragmentShader: `uniform float uAccent; varying float vG, vF;
    void main(){ vec3 c = mix(vec3(.32,.82,.78), vec3(.95,.65,.35), uAccent*.6 + vG*.3); gl_FragColor = vec4(c, (.10 + vG*.6) * vF); }`
})));

// Core that watches the cursor
const core = new THREE.Group(), track = new THREE.Group(); core.add(track); scene.add(core);
const wire = (g, c, o) => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: o }));
const shell = wire(new THREE.IcosahedronGeometry(2.6, 1), CYAN, 0.35), inner = wire(new THREE.OctahedronGeometry(1.25, 0), AMBER, 0.75);
const glowM = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), new THREE.MeshBasicMaterial({ color: CYAN }));
track.add(shell, inner, glowM);

// One dashed gate per page section; the one you are in lights up
const gates = new THREE.Group(); scene.add(gates);
let gateList = [], activeIdx = -1;
function dashed() {
  const v = [], n = 96, R = 5.2;
  for (let i = 0; i < n; i++) if (i % 4 < 3) { const a = i / n * 6.2832, b = (i + 1) / n * 6.2832; v.push(Math.cos(a) * R, 0, Math.sin(a) * R, Math.cos(b) * R, 0, Math.sin(b) * R); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.2 }));
}
function measure() {
  gates.children.slice().forEach(c => { gates.remove(c); c.geometry.dispose(); c.material.dispose(); });
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  gateList = [...document.querySelectorAll('main > section')].map(s => {
    const p = Math.min(1, Math.max(0, (s.offsetTop + s.offsetHeight / 2 - innerHeight / 2) / max));
    const m = dashed(); m.position.y = -p * RANGE; m.rotation.x = 0.35; gates.add(m); return { p, m };
  });
}

// Trail that follows the pointer through the scene
const TR = 26, tp = new Float32Array(TR * 3), tc = new Float32Array(TR * 3);
for (let i = 0; i < TR; i++) { const f = Math.pow(1 - i / TR, 1.6); tc.set([CYAN.r * f, CYAN.g * f, CYAN.b * f], i * 3); }
const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
const spr = document.createElement('canvas'); spr.width = spr.height = 64;
{ const c = spr.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
const trail = new THREE.Points(tg, new THREE.PointsMaterial({ size: 0.5, map: new THREE.CanvasTexture(spr), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
trail.frustumCulled = false; scene.add(trail);

// State
let sx = 0, sy = 0, prog = 0, progT = 0, last = 0, running = false, frames = 0, winAcc = 0, level = 0, burstE = 0;
const v = new THREE.Vector3(), mouseScene = new THREE.Vector3();
const onScroll = () => { const h = document.documentElement.scrollHeight - innerHeight; progT = h > 0 ? scrollY / h : 0; };
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const pulse = at => { U.uBurst.value = 0; U.uBurstPos.value.copy(at || U.uMouse.value); burstE = 1; };
FX.pulse = () => pulse();

function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
let mt; const remeasure = () => { clearTimeout(mt); mt = setTimeout(measure, 150); };
addEventListener('resize', () => { resize(); remeasure(); });
new ResizeObserver(remeasure).observe(document.getElementById('top'));
document.fonts && document.fonts.ready.then(remeasure);
resize(); measure();

function frame(t) {
  if (!FX.on) { running = false; return; }
  const dt = Math.min((t - last) / 1000 || 0.016, 0.05); last = t;
  sx += (P.x - sx) * 0.07; sy += (P.y - sy) * 0.07; prog += (progT - prog) * 0.07;
  U.uTime.value = t * 0.001;
  U.uBurst.value = Math.min(1, U.uBurst.value + dt / 1.4); burstE *= 0.93;
  U.uAccent.value += (FX.accent - U.uAccent.value) * 0.08;
  U.uPush.value = 1 + burstE * 0.6;

  // Camera glides down the page; the cursor leans it around the scene
  const y = -prog * RANGE;
  camera.position.set(sx * (small ? 1.2 : 2.8), y - sy * 1.2, 14 - prog * 5 + Math.sin(prog * Math.PI) * 1.5);
  camera.lookAt(core.position.x * 0.35 + sx * 1.3, y - sy * 1.0, 0); camera.rotateZ(sx * 0.03);
  world.rotation.y = prog * Math.PI * 1.5 + t * 0.00004; world.updateMatrixWorld();

  // Cursor position in the node field's own space
  v.set(sx, -sy, 0.5).unproject(camera).sub(camera.position).normalize();
  mouseScene.copy(camera.position).addScaledVector(v, 14);
  U.uMouse.value.copy(world.worldToLocal(mouseScene.clone()));

  // Core sits right on wide screens so text stays clear, and looks at the cursor
  const cx = small ? 0 : 5.4 + Math.sin(prog * Math.PI * 6) * 1.6;
  core.position.set(cx, y, 0); core.scale.setScalar((small ? 0.7 : 1) * (1 + burstE * 0.3));
  track.rotation.y += (sx * 0.9 - track.rotation.y) * 0.06; track.rotation.x += (sy * 0.6 - track.rotation.x) * 0.06;
  shell.rotation.y += dt * 0.2; shell.rotation.x += dt * 0.12; inner.rotation.x -= dt * 0.4; inner.rotation.y += dt * 0.3;
  inner.position.x += (sx * 0.4 - inner.position.x) * 0.08; inner.position.y += (-sy * 0.4 - inner.position.y) * 0.08;
  const k = U.uAccent.value; shell.material.color.lerpColors(CYAN, AMBER, k * 0.7); glowM.material.color.lerpColors(CYAN, AMBER, k);
  glowM.scale.setScalar(1 + Math.sin(t * 0.003) * 0.15 + burstE * 0.9);

  // Gates
  gates.position.x = cx; let best = 0, bd = 9;
  gateList.forEach((g, i) => {
    const d = Math.abs(prog - g.p); if (d < bd) { bd = d; best = i; }
    const a = Math.exp(-d * d / (2 * 0.04 * 0.04));
    g.m.material.opacity = 0.16 + a * 0.7; g.m.material.color.lerpColors(CYAN, AMBER, a);
    g.m.scale.setScalar((small ? 0.75 : 1) * (1 + a * 0.18)); g.m.rotation.y += dt * (0.25 + a * 1.8);
  });
  if (gateList.length && best !== activeIdx) { if (activeIdx >= 0) pulse(world.worldToLocal(core.position.clone())); activeIdx = best; }

  // Trail
  trail.visible = level < 1;
  tp.copyWithin(3, 0, (TR - 1) * 3);
  tp[0] = mouseScene.x; tp[1] = mouseScene.y; tp[2] = mouseScene.z;
  for (let i = 1; i < TR; i++) for (let a = 0; a < 3; a++) tp[i * 3 + a] += (tp[(i - 1) * 3 + a] - tp[i * 3 + a]) * 0.25;
  tg.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);

  // Back off automatically on slow devices: first drop quality, then switch the effects off
  if (frames < 200) {
    winAcc += dt; frames++;
    if (frames % 100 === 0) {
      const slow = winAcc / 100 > 0.04; winAcc = 0;
      if (slow && ++level === 1) { renderer.setPixelRatio(1); U.uPR.value = 1; resize(); }
      else if (slow) {
        FX.on = false; running = false; document.documentElement.classList.add('fx-off');
        const b = document.querySelector('.fx-toggle'); if (b) { b.setAttribute('aria-pressed', 'false'); b.textContent = '3D effects: off (slow device)'; }
        return;
      }
    }
  }
  requestAnimationFrame(frame);
}
function start() { if (!running && FX.on) { running = true; requestAnimationFrame(frame); } }
addEventListener('fxchange', start);
document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; else start(); });
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); running = false; });
start();
