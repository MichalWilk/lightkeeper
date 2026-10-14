/* ---------- DOM ---------- */
const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const titleEl = document.getElementById('title'), pauseEl = document.getElementById('pause'), overEl = document.getElementById('over'), dawnEl = document.getElementById('dawn'), logEl = document.getElementById('log');
const startBtn = document.getElementById('startBtn'), againBtn = document.getElementById('againBtn'), resumeBtn = document.getElementById('resumeBtn');
const langBtn = document.getElementById('langBtn'), soundBtn = document.getElementById('soundBtn'), fsBtn = document.getElementById('fsBtn');

/* ---------- ship types ---------- */
/* k: size, speed/turn: multipliers, cur: how much the current pushes it, smoke: has an engine */
const TYPES = {
  skiff:   { k: 0.8, speed: 1.2,  turn: 1.4,  cur: 1.1, score: 80,  oil: 1, minNight: 1, w: 3, smoke: false },
  sloop:   { k: 1.0, speed: 1.0,  turn: 1.1,  cur: 1.5, score: 100, oil: 1, minNight: 1, w: 3, smoke: false },
  steamer: { k: 1.5, speed: 0.78, turn: 0.55, cur: 0.7, score: 200, oil: 2, minNight: 2, w: 2, smoke: true },
  ferry:   { k: 1.2, speed: 1.0,  turn: 0.8,  cur: 0.9, score: 150, oil: 2, minNight: 3, w: 2, smoke: true },
  clipper: { k: 1.3, speed: 1.35, turn: 0.7,  cur: 1.3, score: 180, oil: 2, minNight: 4, w: 2, smoke: false },
  tanker:  { k: 2.0, speed: 0.62, turn: 0.38, cur: 0.5, score: 320, oil: 3, minNight: 5, w: 1, smoke: true },
  barge:   { k: 1.8, speed: 0.5,  turn: 0.45, cur: 0.6, score: 240, oil: 4, minNight: 6, w: 1, smoke: true }
};
function pickType(night) {
  const pool = Object.keys(TYPES).filter(k => TYPES[k].minNight <= night);
  let total = 0; for (const k of pool) total += TYPES[k].w;
  let r = Math.random() * total;
  for (const k of pool) { r -= TYPES[k].w; if (r <= 0) return k; }
  return pool[0];
}

/* ---------- upgrades: bought with oil during a watch ---------- */
const UPG = { wide: 3, reach: 3, turn: 3, bright: 2, lamp: 1, keeper: 3, calm: 2, wick: 1, scan: 3, tide: 2, mirror: 1, cranes: 2, watch: 1 };
const COST = { wide: [3, 5, 7], reach: [3, 5, 7], turn: [3, 5, 7], bright: [4, 6], lamp: [5], keeper: [4, 6, 8], calm: [3, 5], wick: [4], scan: [4, 6, 8], tide: [3, 5], mirror: [7], cranes: [4, 6], watch: [5] };
/* ---------- perks: bought with reputation between watches, kept for good ---------- */
const META_DEF = { glass: { cost: 30, max: 1 }, veteran: { cost: 20, max: 2 }, wick: { cost: 40, max: 2 }, charts: { cost: 25, max: 1 }, keeper: { cost: 50, max: 1 }, salvage: { cost: 25, max: 1 }, crews: { cost: 35, max: 1 }, merchant: { cost: 45, max: 1 } };
let meta = { rep: 0, perks: {} };
try { const m = JSON.parse(localStorage.getItem('lightkeeper.meta') || 'null'); if (m && typeof m.rep === 'number') meta = { rep: m.rep, perks: m.perks || {} }; } catch (e) {}
for (const k in META_DEF) meta.perks[k] = meta.perks[k] || 0;
function saveMeta() { try { localStorage.setItem('lightkeeper.meta', JSON.stringify(meta)); } catch (e) {} }
const perk = k => meta.perks[k] || 0;
const up = () => G.up;
const beamHalf = () => 0.23 * (1 + 0.15 * up().wide) * (1 + 0.08 * perk('wick'));
const beamTurn = () => 3.6 * (1 + 0.2 * up().turn);
const reachMul = () => 1 + 0.12 * up().reach;
const maxLives = () => 3 + up().lamp + perk('glass');
const streakStep = () => up().wick ? 2 : 3;
const keeperRange = () => up().keeper ? (150 + 80 * Math.min(1, up().keeper - 1)) * S : 0;
const keeperTurn = () => 2.2 * (1 + 0.6 * Math.min(1, up().keeper - 1));
const keeperCount = () => up().keeper >= 3 ? 2 : up().keeper ? 1 : 0;
const scanHalf = () => 0.11 * (1 + 0.35 * Math.max(0, up().scan - 1));
const scanSpeed = () => 0.7 * (1 + 0.35 * Math.max(0, up().scan - 1));
const costOf = k => COST[k][G.up[k]];
function offerUpgrades() {
  const pool = Object.keys(UPG).filter(k => G.up[k] < UPG[k]);
  const out = [], n = 3 + perk('merchant');
  while (out.length < n && pool.length) { const i = Math.floor(Math.random() * pool.length); out.push(pool.splice(i, 1)[0]); }
  return out;
}
function buildText() {
  const parts = Object.keys(UPG).filter(k => G.up[k] > 0).map(k => T('u_' + k) + ' ' + ROMAN[G.up[k]]);
  return parts.length ? parts.join(' · ') : '';
}
function renderCards() {
  const box = document.getElementById('cards');
  box.innerHTML = '';
  G.offer.forEach((k, i) => {
    const done = G.bought.has(k), lvl = G.up[k] + (done ? 0 : 1), cost = done ? 0 : costOf(k), can = !done && G.oil >= cost;
    const desc = k === 'scan' ? T(lvl === 1 ? 'd_scan' : lvl === 2 ? 'd_scan2' : 'd_scan3') : k === 'keeper' ? T(lvl === 1 ? 'd_keeper' : lvl === 2 ? 'd_keeper2' : 'd_keeper3') : T('d_' + k);
    const b = document.createElement('button');
    b.className = 'card' + (k === 'scan' ? ' scan' : '') + (done ? ' done' : can ? '' : ' off'); b.id = 'card' + i;
    b.innerHTML = '<span class="k"><span>' + (i + 1) + '</span><i>' + (lvl === 1 ? T('newLevel') : T('level') + ' ' + ROMAN[lvl]) + '</i></span><b>' + T('u_' + k) + '</b><p>' + desc + '</p><span class="cost">' + (done ? T('undo') : cost + ' ' + T('oil')) + '</span>';
    b.addEventListener('click', () => buyUpgrade(k));
    box.appendChild(b);
  });
  document.getElementById('oilNow').textContent = G.oil;
  document.getElementById('build').textContent = buildText();
}
let lastBuy = { k: null, t: 0 };
function buyUpgrade(k) {
  if (G.state !== 'dawn') return;
  const now = performance.now();
  if (lastBuy.k === k && now - lastBuy.t < 350) return;
  lastBuy = { k, t: now };
  if (G.bought.has(k)) { // undo this dawn's purchase
    G.up[k]--; G.oil += costOf(k); G.bought.delete(k);
    if (k === 'lamp') G.lives = Math.max(1, Math.min(G.lives - 1, maxLives()));
    renderCards(); return;
  }
  if (G.up[k] >= UPG[k]) return;
  const cost = costOf(k);
  if (G.oil < cost) return;
  G.oil -= cost; G.up[k]++; G.bought.add(k);
  if (k === 'lamp') G.lives = Math.min(maxLives(), G.lives + 1);
  if (k === 'scan' && G.up.scan === 1) G.scan.a = G.beam.a + Math.PI;
  if (k === 'reach' || k === 'wide' || k === 'mirror') G.reachPulse = 1.6;
  AU.upgrade();
  renderCards();
}
function continueNight() {
  if (G.state !== 'dawn') return;
  dawnEl.hidden = true;
  beginNight();
}
function renderMeta() {
  const box = document.getElementById('metaCards');
  if (!box) return;
  box.innerHTML = '';
  Object.keys(META_DEF).forEach(k => {
    const d = META_DEF[k], lvl = perk(k), maxed = lvl >= d.max, can = !maxed && meta.rep >= d.cost;
    const b = document.createElement('button');
    b.className = 'card' + (maxed ? ' done' : can ? '' : ' off');
    b.innerHTML = '<span class="k"><span>' + (lvl ? T('owned') + ' ' + ROMAN[lvl] : '&nbsp;') + '</span><i>' + (d.max > 1 ? ROMAN[Math.min(d.max, lvl + 1)] + '/' + ROMAN[d.max] : '') + '</i></span><b>' + T('m_' + k) + '</b><p>' + T('md_' + k) + '</p><span class="cost">' + (maxed ? T('owned') : d.cost + ' ' + T('rep').toLowerCase()) + '</span>';
    b.addEventListener('click', () => buyPerk(k));
    box.appendChild(b);
  });
  document.getElementById('repNow').textContent = meta.rep;
  document.getElementById('repTitle').textContent = meta.rep;
}
function buyPerk(k) {
  const d = META_DEF[k];
  if (perk(k) >= d.max || meta.rep < d.cost) return;
  meta.rep -= d.cost; meta.perks[k]++; saveMeta(); AU.init(); AU.upgrade(); renderMeta();
}

/* ---------- world ---------- */
let W = 0, H = 0, DPR = 1, S = 1, DIAG = 1;
const LH = { x: 0, y: 0, r: 0, pts: [] };          // lighthouse island
const HARBOR = { x: 0, y: 0, w: 0, landY: 0 };   // breakwater gate
const NIGHT_GOAL = 5;                             // ships per night
let glints = [], jetty = [], buildings = [], rain = [], moored = [];
let seaImg = null, vigImg = null, lightCv = null, lctx = null, canvasRect = { left: 0, top: 0 }, prev = { W: 0, H: 0, S: 1 };

const G = {
  state: 'title', score: 0, best: 0, bestNight: 1, lives: 3, night: 1, saved: 0, streak: 0,
  ships: [], rocks: [], debris: [], pirates: [], parts: [], texts: [], ripples: [], pieces: [], smoke: [],
  beam: { a: -Math.PI / 2, target: -Math.PI / 2 }, beamRange: 1, scan: { a: 0 }, hk: [{ a: -Math.PI / 2 }, { a: -Math.PI / 2 }],
  up: {}, offer: [], bought: new Set(), oil: 0, repGain: 0,
  pendingDawn: false, spawnT: 0, pirateT: 0, time: 0, shake: 0, current: { a: 0.3, m: 0, base: 0, gustA: 0, gustT: 0 },
  banner: 0, bannerText: '', bannerSub: '', dieT: 0, hintT: 0, flash: 0, white: 0, welcome: 0, bolt: null, reachPulse: 0, swell: 0,
  weather: 'calm', stormK: 0, fogK: 0, calm: 0, lightning: 0, lightT: 0, musicT: 0
};
for (const k in UPG) G.up[k] = 0;
try { G.best = parseInt(localStorage.getItem('lightkeeper.best') || '0', 10) || 0; } catch (e) {}
try { G.bestNight = parseInt(localStorage.getItem('lightkeeper.bestNight') || '1', 10) || 1; } catch (e) {}

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (w < 2 || h < 2) return; // hidden or not laid out yet: keep the old layout, the frame loop retries
  const q = QUALITY[qLevel];
  DPR = Math.min(window.devicePixelRatio || 1, q.dpr);
  W = w; H = h; DIAG = Math.hypot(W, H);
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  canvasRect = canvas.getBoundingClientRect();
  S = clamp(Math.min(W, H) / 720, 0.62, 1.3);
  buildLayers(q);
  layout();
}
/* static images and the half-resolution light layer; rebuilt only on resize or a quality change */
const layerPool = {};
function buildLayers(q) {
  const make = (name, scale) => { const c = layerPool[name] || (layerPool[name] = document.createElement('canvas')); const w = Math.max(1, Math.round(W * DPR * scale)), h = Math.max(1, Math.round(H * DPR * scale)); if (c.width !== w) c.width = w; if (c.height !== h) c.height = h; const cx = c.getContext('2d'); cx.setTransform(DPR * scale, 0, 0, DPR * scale, 0, 0); cx.clearRect(0, 0, W, H); return [c, cx]; };
  let c;
  [seaImg, c] = make('sea', 1);
  const sea = c.createRadialGradient(LH.x || W / 2, LH.y || H * 0.44, 10, LH.x || W / 2, LH.y || H * 0.44, Math.max(W, H) * 0.9);
  sea.addColorStop(0, '#0c2039'); sea.addColorStop(1, '#040b16');
  c.fillStyle = sea; c.fillRect(0, 0, W, H);
  const moon = c.createRadialGradient(W * 0.82, H * 0.12, 0, W * 0.82, H * 0.12, Math.max(W, H) * 0.55);
  moon.addColorStop(0, 'rgba(150,175,215,0.16)'); moon.addColorStop(0.45, 'rgba(120,150,200,0.05)'); moon.addColorStop(1, 'rgba(120,150,200,0)');
  c.fillStyle = moon; c.fillRect(0, 0, W, H);
  [vigImg, c] = make('vig', 0.5);
  const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  [lightCv, lctx] = make('light', q.light);
}
let resizeQueued = false;
function queueResize() { if (resizeQueued) return; resizeQueued = true; requestAnimationFrame(() => { resizeQueued = false; resize(); }); }
/* frame-time watchdog: drop a quality level when frames stay slow */
let ftAcc = 0, ftN = 0;
function watchFrameTime(raw) {
  if (raw > 0.25 || G.state === 'paused' || G.state === 'dawn') return;
  ftAcc += raw; ftN++;
  if (ftN < 90) return;
  const avg = ftAcc / ftN; ftAcc = 0; ftN = 0;
  if (avg > 1 / 25 && qLevel > 0) { qLevel--; resize(); }
}
function layout() {
  LH.x = W / 2; LH.y = H * 0.44; LH.r = 24 * S;
  LH.pts = []; for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, rr = LH.r * (0.9 + 0.22 * Math.sin(i * 2.7) + 0.08 * Math.cos(i * 5.1)); LH.pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  HARBOR.w = 150 * S; HARBOR.landY = H - 56 * S; HARBOR.x = W / 2; HARBOR.y = HARBOR.landY;
  jetty = [];
  const r = 13 * S, step = 21 * S;
  for (let x = -r; x < W + r; x += step) {
    if (Math.abs(x - HARBOR.x) < HARBOR.w / 2 + r) continue;
    jetty.push({ x, y: HARBOR.landY + 3 * S, r, j: rand(-2, 2) * S });
  }
  buildings = [];
  let bx = -4 * S, tallest = null;
  while (bx < W) {
    const bw = rand(14, 30) * S, bh = rand(10, 26) * S;
    const b = { x: bx, w: bw, h: bh, y: HARBOR.landY + 14 * S, shade: Math.floor(rand(0, 3)), win: [], spire: false };
    const cols = Math.max(1, Math.floor(bw / (6 * S))), rows = Math.max(1, Math.floor(bh / (7 * S)));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (Math.random() < 0.55) b.win.push({ x: bx + 3 * S + i * 6 * S, y: b.y + 3 * S + j * 7 * S, ph: rand(0, TAU), w: rand(0.5, 1) });
    buildings.push(b);
    if (Math.abs(bx - W * 0.3) < 40 * S && !tallest) tallest = b;
    bx += bw + rand(2, 7) * S;
  }
  if (tallest) { tallest.spire = true; tallest.win = tallest.win.slice(0, 2); }
  moored = [];
  for (let i = 0; i < 3; i++) moored.push({ x: HARBOR.x + rand(-50, 50) * S, y: HARBOR.landY + rand(5, 11) * S, a: rand(-0.4, 0.4) });
  glints = [];
  const gn = Math.floor((W * H) / 5200 * QUALITY[qLevel].glints);
  for (let i = 0; i < gn; i++) glints.push({ x: rand(0, W), y: rand(0, HARBOR.landY), ph: rand(0, TAU), len: rand(4, 11) * S, sp: rand(0.6, 1.4) });
  rain = [];
  for (let i = 0; i < 140; i++) rain.push({ x: rand(0, W), y: rand(0, H), len: rand(8, 18) * S, sp: rand(0.7, 1.3) });
  if (prev.W) { // keep the running game's objects where they were, proportionally
    const kx = W / prev.W, ky = H / prev.H, ks = S / prev.S;
    for (const r of G.rocks) { r.x *= kx; r.y *= ky; r.r *= ks; r.pts = r.pts.map(q => [q[0] * ks, q[1] * ks]); }
    for (const d of G.debris) { d.x *= kx; d.y *= ky; d.r *= ks; }
    for (const o of [...G.ships, ...G.pirates]) { o.x *= kx; o.y *= ky; o.wake = []; }
  }
  prev = { W, H, S };
  G.ships.forEach(s => { s.x = clamp(s.x, -30 * S, W + 30 * S); s.y = clamp(s.y, -30 * S, HARBOR.landY - 5 * S); });
  G.debris.forEach(d => { d.x = clamp(d.x, 10, W - 10); d.y = clamp(d.y, 10, HARBOR.landY - 40 * S); });
  if (G.state === 'title') demoFleet();
  if (seaImg && LH.x) { const c = seaImg.getContext('2d'); const sea = c.createRadialGradient(LH.x, LH.y, 10, LH.x, LH.y, Math.max(W, H) * 0.9); sea.addColorStop(0, '#0c2039'); sea.addColorStop(1, '#040b16'); c.fillStyle = sea; c.fillRect(0, 0, W, H); }
}

function obstacles() { return [LH, ...jetty, ...G.rocks, ...G.debris]; }

function makeRock(x, y, r) {
  const n = 7 + Math.floor(Math.random() * 4), pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * rand(0.72, 1.12); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  return { x, y, r, pts, lit: 0, born: G.time };
}
function freeSpot(r, nearShips) {
  for (let t = 0; t < 300; t++) {
    const x = rand(44 * S, W - 44 * S), y = rand(44 * S, HARBOR.landY - 60 * S);
    if (dist(x, y, LH.x, LH.y) < LH.r + 95 * S) continue;
    if (Math.abs(x - HARBOR.x) < HARBOR.w * 0.85 && y > HARBOR.landY - 190 * S) continue; // keep the approach lane open
    if (G.rocks.some(o => dist(x, y, o.x, o.y) < o.r + r + 58 * S)) continue;
    if (G.debris.some(o => dist(x, y, o.x, o.y) < o.r + r + 40 * S)) continue;
    if (G.ships.some(s => dist(x, y, s.x, s.y) < r + nearShips)) continue;
    return { x, y };
  }
  return null;
}
function placeRock() {
  const r = rand(12, 21) * S, p = freeSpot(r, 80 * S);
  if (p) G.rocks.push(makeRock(p.x, p.y, r));
}
function placeDebris() {
  const r = 11 * S, p = freeSpot(r, 120 * S);
  if (!p) return;
  G.debris.push({ x: p.x, y: p.y, r, rot: rand(0, TAU), vr: rand(-0.3, 0.3), lit: 0, born: G.time, ph: rand(0, TAU) });
}

function edgeSpawn(m) {
  const side = Math.random();
  if (side < 0.45) return { x: rand(m, W - m), y: -m };
  if (side < 0.725) return { x: -m, y: rand(m, H * 0.55) };
  return { x: W + m, y: rand(m, H * 0.55) };
}
function makeShip(type, x, y, h) {
  const t = TYPES[type];
  return { type, t, k: t.k, x, y, h, lit: false, flash: 0, dark: 0, unlit: 0, age: 0, wake: [], wakeT: 0, bob: rand(0, TAU), docking: -1, label: 0, smokeT: 0, demo: false };
}
function spawnShip() {
  const p = edgeSpawn(30 * S);
  const h = Math.atan2(LH.y - p.y, LH.x - p.x) + rand(-0.7, 0.7);
  G.ships.push(makeShip(pickType(G.night), p.x, p.y, h));
}
function spawnPirate() {
  const p = edgeSpawn(30 * S);
  G.pirates.push({ x: p.x, y: p.y, h: Math.atan2(LH.y - p.y, LH.x - p.x), k: 1.1, vis: 0, litT: 0, scare: 0, lure: 0, lureA: 0, state: 'hunt', age: 0, wake: [], wakeT: 0, bob: rand(0, TAU), named: false, label: 0 });
}
function demoFleet() {
  G.ships = [];
  const keys = Object.keys(TYPES);
  keys.forEach((k, i) => {
    const y = H * (0.1 + 0.07 * i), dir = i % 2 ? -1 : 1;
    const s = makeShip(k, rand(0, W), y, dir > 0 ? 0 : Math.PI);
    s.demo = true; s.dir = dir; G.ships.push(s);
  });
}

function maxShips() { return Math.min(1 + G.night, 7); }
function spawnInterval() { return Math.max(2.6, 6.8 - 0.5 * (G.night - 1)); }
function maxPirates() { return G.night < 4 ? 0 : Math.min(3, 1 + Math.floor((G.night - 4) / 3)); }
function multiplier() { return 1 + Math.min(3, Math.floor(G.streak / streakStep())); }

/* the watch is saved at every dawn and when it is abandoned, so it can be resumed from the start of its night */
function saveRun(night) { try { localStorage.setItem('lightkeeper.save', JSON.stringify({ night: night || G.night, score: G.score, oil: G.oil, lives: G.lives, up: G.up, streak: G.streak, saved: G.saved })); } catch (e) {} }
function clearRun() { try { localStorage.removeItem('lightkeeper.save'); } catch (e) {} }
function loadRun() { try { const r = JSON.parse(localStorage.getItem('lightkeeper.save') || 'null'); return r && (r.night > 1 || r.score > 0 || r.oil > 0) ? r : null; } catch (e) { return null; } }
function startGame(resume) {
  G.state = 'play'; G.score = 0; G.night = 1; G.saved = 0; G.streak = 0;
  for (const k in UPG) G.up[k] = 0;
  G.up.keeper = perk('keeper'); G.lives = maxLives(); G.oil = 4 * perk('veteran'); G.bought = new Set(); G.repGain = 0;
  G.hk = [{ a: -Math.PI / 2 }, { a: -Math.PI / 2 }]; G.pendingDawn = false;
  G.ships = []; G.rocks = []; G.debris = []; G.pirates = []; G.parts = []; G.texts = []; G.ripples = []; G.pieces = []; G.smoke = [];
  G.spawnT = 1.2; G.pirateT = 0; G.time = 0; G.shake = 0; G.flash = 0; G.white = 0; G.hintT = 7; G.calm = 0; G.welcome = 0; G.bolt = null;
  G.weather = 'calm'; G.stormK = 0; G.fogK = 0; G.lightning = 0; G.lightT = 0;
  G.current = { a: rand(0, TAU), m: 10 * S, base: 10 * S, gustA: 0, gustT: 0 };
  G.beam.a = -Math.PI / 2; G.beam.target = -Math.PI / 2; G.scan.a = Math.PI / 2;
  G.beamRange = DIAG * 0.52 * reachMul();   // valid before the first update, even if the page starts hidden and paused
  for (let i = 0; i < 3 - perk('charts'); i++) placeRock();
  titleEl.hidden = true; overEl.hidden = true; pauseEl.hidden = true; dawnEl.hidden = true; logEl.hidden = true;
  AU.init(); AU.resume(); AU.weather(0); MU.start();
  if (resume) { // pick the saved watch up at the start of its night
    G.score = resume.score || 0; G.oil = resume.oil || 0; G.saved = resume.saved || 0; G.streak = resume.streak || 0;
    for (const k in UPG) G.up[k] = Math.min(UPG[k], (resume.up && resume.up[k]) || 0);
    if (resume.night > 1) {
      G.night = resume.night - 1;
      for (let i = 0; i < resume.night - 2 && G.rocks.length < 10; i++) placeRock();
      beginNight();
    } else { AU.horn(); banner(T('night') + ' 1', T('w_calm') + '. ' + T('fc_first')); }
    G.lives = clamp(resume.lives || 3, 1, maxLives());
    return;
  }
  AU.horn();
  banner(T('night') + ' 1', T('w_calm') + '. ' + T('fc_first'));
}
function banner(txt, sub) { G.banner = 3.2; G.bannerText = txt; G.bannerSub = sub || ''; }

function dawn() {
  G.state = 'dawn';
  G.oil += 2; G.bought = new Set();
  G.offer = offerUpgrades();
  if (!G.offer.length) { beginNight(); return; }
  renderCards();
  dawnEl.hidden = false;
  document.getElementById('contBtn').focus();
  MU.dawnCue();
}
function beginNight() {
  G.state = 'play';
  if (G.bought.has('reach') || G.bought.has('wide') || G.bought.has('mirror')) G.reachPulse = 1.6;
  G.night++;
  if (G.rocks.length < 11) placeRock();
  G.current.base = (10 + 4 * (G.night - 1)) * S;
  let w = 'calm';
  if (G.night === 3) w = 'storm';
  else if (G.night === 4) w = 'fog';
  else if (G.night >= 5) { const r = Math.random(); w = r < 0.4 ? 'storm' : r < 0.7 ? 'fog' : 'calm'; }
  G.weather = w;
  let line = T('fc_' + w);
  if (G.night >= 5) {
    const want = Math.min(3, 1 + Math.floor((G.night - 5) / 2));
    while (G.debris.length < want) { const before = G.debris.length; placeDebris(); if (G.debris.length === before) break; }
    if (G.night === 5) line = T('fc_debris');
  }
  if (G.night === 4) line = T('fc_pirates');
  if (G.night % 3 === 1 && G.lives < maxLives()) { G.lives++; addText(LH.x, LH.y - 50 * S, T('relit'), '#f0b24a', true); AU.relit(); }
  G.calm = 3; G.lightT = rand(3, 6); G.pirateT = rand(6, 12);
  banner(T('night') + ' ' + G.night, T('w_' + w) + '. ' + line);
  AU.horn();
  saveRun();
  last = performance.now();
}

function addText(x, y, txt, color, big) { G.texts.push({ x, y, txt, color, t: 0, max: big ? 1.8 : 1.2, big: !!big }); }
function burst(x, y, n, color, speed, life, up) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), v = rand(0.2, 1) * speed;
    G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (up || 0), life: 0, max: rand(0.5, 1) * life, color, r: rand(1.2, 3) * S });
  }
}
function ripple(x, y, r1, color, max) { G.ripples.push({ x, y, t: 0, max: max || 1.4, r1, color }); }

function saveShip(s) {
  const base = s.t.score + 25 * (G.night - 1);
  const clean = s.dark < 3;
  G.streak++;
  const mult = multiplier();
  G.score += (base + (clean ? 50 : 0)) * mult;
  G.saved++;
  addText(s.x, s.y - 14 * S, '+' + base + (mult > 1 ? ' ×' + mult : ''), '#ece6d4');
  if (clean) { addText(s.x, s.y - 34 * S, T('clean') + ' +50', '#63c993'); AU.clean(); }
  burst(s.x, s.y, 14, '#ffe9a8', 60 * S, 0.8);
  ripple(s.x, s.y, 40 * S * s.k, 'rgba(255,233,168,', 1.2);
  const oil = s.t.oil + (clean ? 1 : 0) + G.up.cranes;
  G.oil += oil; addText(s.x + 30 * S, s.y - 4 * S, '+' + oil + ' ' + T('oil'), '#f0b24a');
  G.welcome = 1;
  AU.bell(s.k);
  s.docking = 0; s.lit = true;
  if (G.saved % NIGHT_GOAL === 0) G.pendingDawn = true;
}
function loseShip(s, label, byPirate) {
  G.lives--; G.streak = 0;
  G.shake = reduceMotion ? 0 : 0.4 + 0.2 * s.k; G.flash = 0.35;
  burst(s.x, s.y, 20 + 10 * s.k, byPirate ? '#f0b24a' : '#ece6d4', 110 * S, 0.9);
  burst(s.x, s.y, 10, '#d95a3c', 50 * S, 0.7);
  burst(s.x, s.y, 10 + 6 * s.k, 'rgba(200,225,250,0.7)', 12 * S, 2.2, 8 * S); // bubbles
  ripple(s.x, s.y, 70 * S * s.k, 'rgba(200,225,250,', 1.6); ripple(s.x, s.y, 40 * S * s.k, 'rgba(200,225,250,', 1.0);
  for (const side of [-1, 1]) G.pieces.push({ x: s.x, y: s.y, h: s.h, side, k: s.k, type: s.type, vx: Math.cos(s.h + side * 1.6) * 22 * S, vy: Math.sin(s.h + side * 1.6) * 22 * S, vr: side * rand(0.8, 1.6), rot: 0, t: 0, max: 1.6 + 0.4 * s.k });
  addText(s.x, s.y - 16 * S, label, '#d95a3c', true);
  if (perk('salvage')) { G.oil += 1; addText(s.x + 30 * S, s.y + 10 * S, '+1 ' + T('oil'), '#f0b24a'); }
  if (byPirate) AU.plunder(); else AU.wreck(s.k);
  MU.hit();
  if (G.lives <= 0) { G.state = 'dying'; G.dieT = 1.6; }
}
function wreck(s) { loseShip(s, T('wreck'), false); }

function inMainBeam(x, y, rad) {
  const d = dist(x, y, LH.x, LH.y), a = Math.atan2(y - LH.y, x - LH.x);
  if (d <= LH.r) return false;
  if (d < G.beamRange && Math.abs(angDiff(a, G.beam.a)) < beamHalf() + Math.atan2(rad, d)) return true;
  return G.up.mirror > 0 && d < G.beamRange * 0.7 && Math.abs(angDiff(a, G.beam.a + Math.PI)) < beamHalf() * 0.8 + Math.atan2(rad, d);
}
function inScanBeam(x, y, rad) {
  if (!G.up.scan) return false;
  const d = dist(x, y, LH.x, LH.y), a = Math.atan2(y - LH.y, x - LH.x), tol = scanHalf() + Math.atan2(rad, d);
  if (d <= LH.r || d > G.beamRange * 0.9) return false;
  if (Math.abs(angDiff(a, G.scan.a)) < tol) return true;
  return G.up.scan >= 3 && Math.abs(angDiff(a, G.scan.a + Math.PI)) < tol;
}
/* the keepers' huts stand on the breakwater a little outside each beacon: the first by the green light, the second by the red */
const hkOrigins = () => [{ x: HARBOR.x + HARBOR.w / 2 + 30 * S, y: HARBOR.landY - 4 * S }, { x: HARBOR.x - HARBOR.w / 2 - 30 * S, y: HARBOR.landY - 4 * S }].slice(0, keeperCount());
function inKeeperBeam(x, y, rad) {
  const R = keeperRange(); if (!R) return false;
  return hkOrigins().some((o, i) => { const d = dist(x, y, o.x, o.y); return d > 8 * S && d < R && Math.abs(angDiff(Math.atan2(y - o.y, x - o.x), G.hk[i].a)) < 0.2 + Math.atan2(rad, d); });
}
function updateKeeper(dt) {
  const R = keeperRange(); if (!R) return;
  const taken = new Set();
  hkOrigins().forEach((o, i) => {
    let best = null, bd = R;
    for (const s of G.ships) { if (s.docking >= 0 || taken.has(s)) continue; const d = dist(s.x, s.y, o.x, o.y); if (d < bd) { bd = d; best = s; } }
    if (best) taken.add(best);
    const want = best ? Math.atan2(best.y - o.y, best.x - o.x) : -Math.PI / 2 + Math.sin(G.time * 0.5 + i * 2) * 0.7;
    const step = keeperTurn() * dt;
    G.hk[i].a += clamp(angDiff(want, G.hk[i].a), -step, step);
  });
}
function steerAvoid(s, sx, sy, k) {
  const px = s.x + Math.cos(s.h) * (14 + 10 * k) * S, py = s.y + Math.sin(s.h) * (14 + 10 * k) * S; // probe ahead of the bow
  for (const o of obstacles()) {
    const ox = s.x - o.x, oy = s.y - o.y, od = Math.hypot(ox, oy) || 1, R = o.r + (35 + 25 * k) * S;
    const pd = Math.min(od, Math.hypot(px - o.x, py - o.y));
    if (pd < R) { const kk = 1 - pd / R, w = kk * 3 + kk * kk * 4; sx += ox / od * w; sy += oy / od * w; }
  }
  return Math.atan2(sy, sx);
}

function updateShip(s, dt) {
  s.age += dt;
  const u = S * s.k;
  if (s.docking >= 0) {
    s.docking += dt;
    s.h += clamp(angDiff(Math.PI / 2, s.h), -3 * dt, 3 * dt);
    s.x += Math.cos(s.h) * 40 * S * dt; s.y += Math.sin(s.h) * 40 * S * dt;
    pushWake(s, dt);
    return s.docking < 0.9 + 0.3 * s.k;
  }
  const wasLit = s.lit;
  const inBeam = inMainBeam(s.x, s.y, 8 * u);
  const keeperLit = inKeeperBeam(s.x, s.y, 8 * u);
  s.lit = inBeam || keeperLit || G.lightning > 0;
  if (s.lit && !wasLit) { s.flash = 1; if (inBeam) AU.lit(); G.hintT = 0; if (!s.named) { s.named = true; s.label = 2; } }
  s.flash = Math.max(0, s.flash - dt * 2.5);
  s.label = Math.max(0, s.label - dt);
  const speed = (s.lit ? SHIP_SPEED_LIT : SHIP_SPEED_DARK) * S * s.t.speed * (1 + 0.05 * Math.min(12, G.night - 1)) * (1 - 0.15 * G.fogK);
  if (s.lit) {
    s.unlit = 0;
    let sx = HARBOR.x - s.x, sy = HARBOR.y + 12 * S - s.y;
    const dl = Math.hypot(sx, sy) || 1; sx /= dl; sy /= dl;
    const want = steerAvoid(s, sx, sy, s.k), tr = 3 * s.t.turn * (1 + 0.2 * G.up.bright);
    s.h += clamp(angDiff(want, s.h), -tr * dt, tr * dt);
  } else {
    s.dark += dt; s.unlit += dt;
    const wander = 2.8 * (1 + 0.7 * G.stormK) * Math.sqrt(s.t.turn) * (1 - 0.25 * G.up.calm) * (1 - 0.15 * perk('crews'));
    s.h += (Math.random() - 0.5) * wander * dt + Math.sin(G.time * 0.6 + s.bob) * 0.5 * dt;
    // sailors hear the surf: in the dark they still shy away from the breakwater
    if (s.y > HARBOR.landY - 70 * S && Math.abs(s.x - HARBOR.x) > HARBOR.w / 2) s.h += clamp(angDiff(-Math.PI / 2, s.h), -1.2 * s.t.turn * dt, 1.2 * s.t.turn * dt);
  }
  const cm = G.current.m * s.t.cur * (s.lit ? 0.45 : 1);
  s.x += Math.cos(s.h) * speed * dt + Math.cos(G.current.a) * cm * dt;
  s.y += Math.sin(s.h) * speed * dt + Math.sin(G.current.a) * cm * dt;
  if (s.age > 1.5) {
    const m = 12 * S;
    if (s.x < m && Math.cos(s.h) < 0) s.h = Math.PI - s.h;
    if (s.x > W - m && Math.cos(s.h) > 0) s.h = Math.PI - s.h;
    if (s.y < m && Math.sin(s.h) < 0) s.h = -s.h;
    s.x = clamp(s.x, 2, W - 2); s.y = Math.max(s.y, 2);
  }
  pushWake(s, dt);
  if (s.t.smoke) { s.smokeT += dt; if (s.smokeT > 0.22) { s.smokeT = 0; const fo = { tanker: -9, barge: -11.5, ferry: -4 }[s.type] ?? -1, fx = s.x + Math.cos(s.h) * fo * u, fy = s.y + Math.sin(s.h) * fo * u; G.smoke.push({ x: fx, y: fy, t: 0, max: rand(1.8, 2.6), r: 2 * u }); } }
  if (s.y > HARBOR.landY - 2 * S && Math.abs(s.x - HARBOR.x) < HARBOR.w / 2) { saveShip(s); return true; }
  const rad = 4.5 * u;
  for (const off of [-7 * u, 0, 7 * u]) {
    const hx = s.x + Math.cos(s.h) * off, hy = s.y + Math.sin(s.h) * off;
    for (const o of obstacles()) if (dist(hx, hy, o.x, o.y) < o.r + rad) { wreck(s); return false; }
  }
  return true;
}
function pushWake(s, dt) {
  s.wakeT += dt;
  if (s.wakeT > 0.1) { s.wakeT = 0; s.wake.unshift({ x: s.x, y: s.y, h: s.h }); if (s.wake.length > 14) s.wake.pop(); }
}
function updateDemo(s, dt) {
  const u = S * s.k;
  s.age += dt;
  s.x += s.dir * 26 * S * s.t.speed * dt;
  s.h = (s.dir > 0 ? 0 : Math.PI) + Math.sin(G.time * 0.5 + s.bob) * 0.12;
  if (s.x > W + 40 * u) s.x = -40 * u; if (s.x < -40 * u) s.x = W + 40 * u;
  const wasLit = s.lit;
  s.lit = inMainBeam(s.x, s.y, 8 * u);
  if (s.lit && !wasLit) s.flash = 1;
  s.flash = Math.max(0, s.flash - dt * 2.5);
  pushWake(s, dt);
  if (s.t.smoke) { s.smokeT += dt; if (s.smokeT > 0.3) { s.smokeT = 0; G.smoke.push({ x: s.x - Math.cos(s.h) * u, y: s.y, t: 0, max: 2.2, r: 2 * u }); } }
}

function updatePirate(p, dt) {
  p.age += dt;
  const u = S * p.k;
  const inMain = inMainBeam(p.x, p.y, 8 * u), inScan = inScanBeam(p.x, p.y, 8 * u);
  const seen = inMain || inScan || G.lightning > 0;
  const wasVis = p.vis > 0.5;
  p.vis += ((seen ? 1 : 0) - p.vis) * Math.min(1, dt * 5);
  if (p.vis > 0.5 && !wasVis) { if (!p.named) { p.named = true; p.label = 2; } AU.reveal(); }
  p.label = Math.max(0, p.label - dt);
  if (inMain) { p.scare = 1.5; p.litT += dt; } else p.scare = Math.max(0, p.scare - dt);
  if (p.litT > PIRATE_LIT_LIMIT / (1 + G.up.watch)) p.state = 'leave';
  const away = Math.atan2(p.y - LH.y, p.x - LH.x);
  let want, speed = PIRATE_SPEED * S;
  if (p.state === 'leave') { want = away; speed = PIRATE_FLEE * S; }
  else if (p.scare > 0) { want = away; speed = PIRATE_FLEE * S; }
  else if (inScan) { // lured outward along the scanner beam
    const a1 = G.scan.a, a2 = G.scan.a + Math.PI;
    const me = Math.atan2(p.y - LH.y, p.x - LH.x);
    p.lureA = Math.abs(angDiff(me, a1)) < Math.abs(angDiff(me, a2)) ? a1 : a2; p.lure = 2.5; want = p.lureA; speed = PIRATE_LURE * S;
  }
  else if (p.lure > 0) { p.lure -= dt; want = p.lureA; speed = PIRATE_LURE * S; }
  else {
    let best = null, bd = 1e9;
    for (const s of G.ships) { if (s.docking >= 0) continue; const d = dist(s.x, s.y, p.x, p.y); if (d < bd) { bd = d; best = s; } }
    if (best) {
      want = Math.atan2(best.y - p.y, best.x - p.x);
      if (bd < 9 * u + 6 * best.k * S) { loseShip(best, T('plundered'), true); G.ships = G.ships.filter(s => s !== best); p.state = 'leave'; }
    } else want = p.h + Math.sin(G.time * 0.4 + p.bob) * 0.8;
  }
  const sx = Math.cos(want), sy = Math.sin(want);
  want = steerAvoid(p, sx, sy, p.k);
  p.h += clamp(angDiff(want, p.h), -2.2 * dt, 2.2 * dt);
  p.x += Math.cos(p.h) * speed * dt + Math.cos(G.current.a) * G.current.m * 0.3 * dt;
  p.y += Math.sin(p.h) * speed * dt + Math.sin(G.current.a) * G.current.m * 0.3 * dt;
  if (p.y > HARBOR.landY - 60 * S) p.h += clamp(angDiff(-Math.PI / 2, p.h), -2 * dt, 2 * dt);
  pushWake(p, dt);
  const m = 40 * S;
  if (p.state === 'leave' && (p.x < -m || p.x > W + m || p.y < -m)) { G.pirateT = rand(10, 18); return false; }
  if (p.state !== 'leave' && p.age > 2) {
    const mm = 8 * S;
    if (p.x < mm && Math.cos(p.h) < 0) p.h = Math.PI - p.h;
    if (p.x > W - mm && Math.cos(p.h) > 0) p.h = Math.PI - p.h;
    if (p.y < mm && Math.sin(p.h) < 0) p.h = -p.h;
  }
  return true;
}

function updateWeather(dt) {
  const ts = G.weather === 'storm' ? 1 : 0, tf = G.weather === 'fog' ? 1 : 0;
  G.stormK += (ts - G.stormK) * Math.min(1, dt * 0.5);
  G.fogK += (tf - G.fogK) * Math.min(1, dt * 0.5);
  const baseR = DIAG * 0.52, fogR = Math.max(DIAG * 0.36, (HARBOR.landY - LH.y) + 50 * S);
  G.beamRange = lerp(baseR, fogR, G.fogK) * reachMul();
  G.current.gustT -= dt;
  if (G.current.gustT <= 0) { G.current.gustT = rand(2, 4.5); G.current.gustA = rand(-1.2, 1.2); }
  G.current.a += ((Math.sin(G.time * 0.13) * 0.25 + 0.08) + G.current.gustA * G.stormK) * dt;
  G.current.m = G.current.base * (1 + 1.3 * G.stormK) * (1 - 0.3 * G.fogK) * (1 - 0.25 * G.up.tide);
  G.swell += (10 * S + G.current.m * 1.4) * dt;   // the swells travel with the tide
  if (G.stormK > 0.4 && G.state === 'play') {
    G.lightT -= dt;
    if (G.lightT <= 0) {
      G.lightT = rand(6, 12); G.lightning = 0.8; G.white = reduceMotion ? 0.3 : 1; AU.thunder(rand(0.3, 1.1));
      const pts = []; let x = rand(W * 0.1, W * 0.9), y = -10;
      const yEnd = rand(H * 0.3, H * 0.65);
      while (y < yEnd) { pts.push([x, y]); y += rand(12, 30) * S; x += rand(-26, 26) * S; }
      G.bolt = { pts, t: 0 };
    }
  }
  G.lightning = Math.max(0, G.lightning - dt);
  G.white = Math.max(0, G.white - dt * 3.5);
  if (G.bolt) { G.bolt.t += dt; if (G.bolt.t > 0.35) G.bolt = null; }
  if (G.stormK > 0.01) {
    const wx = Math.cos(G.current.a) * 160 * S, wy = 520 * S;
    for (const r of rain) { r.x += wx * r.sp * dt; r.y += wy * r.sp * dt; if (r.y > H) { r.y -= H + 20; r.x = rand(0, W); } if (r.x < -20) r.x += W + 40; if (r.x > W + 20) r.x -= W + 40; }
  }
  for (const d of G.debris) {
    d.rot += d.vr * dt;
    const sp = G.current.m * 0.8 + 6 * S;
    d.x += Math.cos(G.current.a) * sp * dt + Math.sin(G.time * 0.4 + d.ph) * 4 * S * dt;
    d.y += Math.sin(G.current.a) * sp * dt;
    if (d.x < 10) { d.x = 10; G.current.gustA = Math.abs(G.current.gustA); }
    if (d.x > W - 10) { d.x = W - 10; G.current.gustA = -Math.abs(G.current.gustA); }
    if (d.y < 10) d.y = 10;
    if (d.y > HARBOR.landY - 40 * S) d.y = HARBOR.landY - 40 * S;
    d.lit += ((inMainBeam(d.x, d.y, d.r) || G.lightning > 0 ? 1 : 0) - d.lit) * Math.min(1, dt * 6);
  }
}

function update(dt) {
  G.time += dt;
  const playing = G.state === 'play' || G.state === 'dying';
  if (G.state === 'title') { G.beam.target += 0.35 * dt; G.beam.a = G.beam.target; G.beamRange = DIAG * 0.52; }
  else if (playing) {
    const bt = beamTurn();
    if (keys.left) G.beam.target -= bt * dt;
    if (keys.right) G.beam.target += bt * dt;
    const d = angDiff(G.beam.target, G.beam.a), step = bt * dt;
    G.beam.a += clamp(d, -step, step);
    if (G.up.scan) G.scan.a -= scanSpeed() * dt;
  }
  if (!playing) { G.current.a += (Math.sin(G.time * 0.13) * 0.25 + 0.08) * dt; G.current.m = 10 * S; G.swell += (10 * S + G.current.m * 1.4) * dt; }
  const gx = Math.cos(G.current.a) * 6 * S * dt * (1 + 2 * G.stormK), gy = Math.sin(G.current.a) * 6 * S * dt * (1 + 2 * G.stormK);
  for (const g of glints) { g.x += gx * g.sp; g.y += gy * g.sp; if (g.x < 0) g.x += W; if (g.x > W) g.x -= W; if (g.y < 0) g.y += HARBOR.landY; if (g.y > HARBOR.landY) g.y -= HARBOR.landY; }
  for (const p of G.smoke) { p.t += dt; p.x += Math.cos(G.current.a) * 12 * S * dt; p.y += Math.sin(G.current.a) * 12 * S * dt; }
  G.smoke = G.smoke.filter(p => p.t < p.max);
  if (G.state === 'title') { for (const s of G.ships) updateDemo(s, dt); return; }
  if (!playing) return;

  updateWeather(dt);
  updateKeeper(dt);
  if (G.state === 'play') {
    if (G.calm > 0) G.calm -= dt;
    else {
      G.spawnT -= dt; if (G.spawnT <= 0 && G.ships.length < maxShips()) { spawnShip(); G.spawnT = spawnInterval(); }
      G.pirateT -= dt; if (G.pirateT <= 0 && G.pirates.length < maxPirates()) { spawnPirate(); G.pirateT = rand(14, 24); }
    }
    if (G.hintT > 0) G.hintT -= dt;
  }
  G.ships = G.ships.filter(s => updateShip(s, dt));
  if (G.state === 'play' || G.state === 'dying') G.pirates = G.pirates.filter(p => updatePirate(p, dt));
  for (const r of G.rocks) r.lit += ((inMainBeam(r.x, r.y, r.r) || G.lightning > 0 ? 1 : 0) - r.lit) * Math.min(1, dt * 6);
  const k = Math.pow(0.2, dt);
  for (const p of G.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= k; p.vy *= k; }
  G.parts = G.parts.filter(p => p.life < p.max);
  for (const p of G.pieces) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vx *= k; p.vy *= k; }
  G.pieces = G.pieces.filter(p => p.t < p.max);
  for (const t of G.texts) t.t += dt;
  G.texts = G.texts.filter(t => t.t < t.max);
  for (const r of G.ripples) r.t += dt;
  G.ripples = G.ripples.filter(r => r.t < r.max);
  G.shake = Math.max(0, G.shake - dt * 1.3);
  G.flash = Math.max(0, G.flash - dt);
  G.welcome = Math.max(0, G.welcome - dt * 0.6);
  G.reachPulse = Math.max(0, G.reachPulse - dt * 0.7);
  G.banner = Math.max(0, G.banner - dt);
  G.musicT -= dt;
  if (G.musicT <= 0) {
    G.musicT = 0.25;
    let danger = G.lives === 1 ? 0.35 : 0;
    for (const s of G.ships) {
      if (s.docking >= 0) continue;
      danger = Math.max(danger, clamp((s.unlit - 1.5) / 3, 0, 1));
      for (const o of obstacles()) { const od = dist(s.x, s.y, o.x, o.y) - o.r; if (od < 70 * S) danger = Math.max(danger, 1 - od / (70 * S)); }
      for (const p of G.pirates) { const od = dist(s.x, s.y, p.x, p.y); if (p.state === 'hunt' && od < 160 * S) danger = Math.max(danger, 1 - od / (160 * S)); }
    }
    let pirate = 0;
    for (const p of G.pirates) {
      if (p.state === 'leave') continue;
      pirate = Math.max(pirate, 0.3);
      for (const s of G.ships) { const od = dist(s.x, s.y, p.x, p.y); if (od < 220 * S) pirate = Math.max(pirate, 1 - od / (220 * S)); }
    }
    MU.set({ ships: G.ships.length, danger: clamp(danger, 0, 1), storm: G.stormK, fog: G.fogK, pirate, lives: G.lives, night: G.night, streak: G.streak, calm: G.calm > 0 ? 1 : 0 });
    AU.weather(G.stormK);
  }
  if (G.state === 'dying') { G.dieT -= dt; if (G.dieT <= 0) gameOver(); }
  if (G.pendingDawn) { G.pendingDawn = false; if (G.state === 'play') dawn(); }
}

function gameOver() {
  G.state = 'over';
  const isBest = G.score > G.best;
  if (isBest) { G.best = G.score; try { localStorage.setItem('lightkeeper.best', String(G.best)); } catch (e) {} }
  if (G.night > G.bestNight) { G.bestNight = G.night; try { localStorage.setItem('lightkeeper.bestNight', String(G.bestNight)); } catch (e) {} }
  document.getElementById('finalScore').textContent = G.score;
  document.getElementById('finalSaved').textContent = G.saved;
  document.getElementById('finalNight').textContent = G.night;
  document.getElementById('finalBuild').textContent = buildText();
  G.repGain = Math.floor(G.score / 100) + 3 * (G.night - 1);
  meta.rep += G.repGain; saveMeta(); renderMeta();
  document.getElementById('finalRep').textContent = '+' + G.repGain;
  const note = document.getElementById('overNote');
  note.textContent = isBest && G.score > 0 ? T('newBest') : (G.night <= 1 ? T('note1') : G.night + ' ' + T('noteN'));
  dawnEl.hidden = true; overEl.hidden = false; againBtn.focus();
  clearRun(); MU.stop();
}
