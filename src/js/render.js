/* ---------- drawing ---------- */
const TINTS = ['rgba(0,0,0,0)', 'rgba(50,25,90,0.12)', 'rgba(10,70,80,0.12)', 'rgba(70,45,20,0.09)'];
function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.shake > 0) { const k = G.shake * G.shake * 9 * S; ctx.translate(rand(-k, k), rand(-k, k)); }
  drawSea();
  drawLight();
  for (const r of G.ripples) {
    const k = r.t / r.max; ctx.strokeStyle = r.color + (0.5 * (1 - k)) + ')'; ctx.lineWidth = 1.5 * S * (1 - k) + 0.3;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r1 * Math.sqrt(k), 0, TAU); ctx.stroke();
  }
  drawRocks();
  drawDebris();
  for (const s of G.ships) drawWake(s, 1);
  for (const p of G.pirates) drawWake(p, 0.35);
  drawHarbor();
  drawKeeperLamp();
  for (const s of G.ships) drawShip(s);
  for (const p of G.pirates) drawPirate(p);
  for (const p of G.pieces) drawPiece(p);
  drawSmoke();
  drawLighthouse();
  if (G.fogK > 0.01) drawFog();
  for (const p of G.parts) { const k = 1 - p.life / p.max; ctx.globalAlpha = k; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k + 0.3, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (G.stormK > 0.01) drawRain();
  if (G.bolt) drawBolt();
  for (const t of G.texts) {
    const k = t.t / t.max; ctx.globalAlpha = 1 - k * k;
    ctx.font = (t.big ? '500 ' + 22 * S + 'px ' : '500 ' + 13 * S + 'px ') + (t.big ? "'Cormorant Garamond',Georgia,serif" : "'IBM Plex Mono',monospace");
    ctx.fillStyle = t.color; ctx.textAlign = 'center'; ctx.fillText(t.txt, t.x, t.y - k * 26 * S);
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(vigImg, -20, -20, W + 40, H + 40);
  if (G.flash > 0) { ctx.fillStyle = 'rgba(217,90,60,' + G.flash * 0.35 + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
  if (G.white > 0) { ctx.fillStyle = 'rgba(225,235,255,' + G.white * G.white * 0.55 + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.state !== 'title') drawHUD();
}

function drawSea() {
  ctx.drawImage(seaImg, -20, -20, W + 40, H + 40);
  const tint = TINTS[(G.night - 1) % TINTS.length];
  if (G.state !== 'title' && tint !== TINTS[0]) { ctx.fillStyle = tint; ctx.fillRect(-20, -20, W + 40, H + 40); }
  if (G.stormK > 0.01) { ctx.fillStyle = 'rgba(8,30,38,' + 0.4 * G.stormK + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
  // glints, grouped by colour so each group is one stroke
  const storm = 1 + 1.5 * G.stormK, bh = beamHalf(), sh = scanHalf(), scanOn = G.up.scan > 0, scanR = G.beamRange * 0.9;
  const groups = new Map();
  for (const g of glints) {
    const tw = 0.5 + 0.5 * Math.sin(G.time * 1.3 * g.sp * storm + g.ph);
    const a = Math.atan2(g.y - LH.y, g.x - LH.x), d = dist(g.x, g.y, LH.x, LH.y);
    let kind = 0, alpha = 0.03 + 0.07 * tw;
    if (d < G.beamRange && Math.abs(angDiff(a, G.beam.a)) < bh) { kind = 1; alpha = 0.12 + 0.3 * tw; }
    else if (G.up.mirror && d < G.beamRange * 0.7 && Math.abs(angDiff(a, G.beam.a + Math.PI)) < bh * 0.8) { kind = 1; alpha = 0.08 + 0.2 * tw; }
    else if (scanOn && d < scanR && (Math.abs(angDiff(a, G.scan.a)) < sh || (G.up.scan >= 3 && Math.abs(angDiff(a, G.scan.a + Math.PI)) < sh))) { kind = 2; alpha = 0.1 + 0.25 * tw; }
    const key = kind * 100 + Math.round(alpha * 25);
    let list = groups.get(key); if (!list) { list = []; groups.set(key, list); }
    list.push(g);
  }
  ctx.lineWidth = 1 * S; ctx.lineCap = 'butt';
  const colours = ['140,170,210', '255,236,180', '160,205,255'];
  for (const [key, list] of groups) {
    const kind = Math.floor(key / 100), alpha = (key % 100) / 25;
    ctx.strokeStyle = 'rgba(' + colours[kind] + ',' + alpha + ')';
    ctx.beginPath();
    const cx = Math.cos(G.current.a + Math.PI / 2), cy = Math.sin(G.current.a + Math.PI / 2);
    for (const g of list) { ctx.moveTo(g.x - cx * g.len / 2, g.y - cy * g.len / 2); ctx.lineTo(g.x + cx * g.len / 2, g.y + cy * g.len / 2); }
    ctx.stroke();
  }
}

/* everything additive (swells, beams, scanner, harbor lamp) is drawn at reduced resolution and composited once */
function drawLight() {
  const c = lctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, lightCv.width, lightCv.height);
  c.setTransform(lightCv.width / W, 0, 0, lightCv.height / H, 0, 0);
  c.globalCompositeOperation = 'lighter';
  drawSwells(c);
  if (G.up.scan) drawScan(c);
  drawBeam(c);
  drawKeeper(c);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(lightCv, 0, 0, W, H); ctx.restore();
}
/* swells roll with the current: a soft band of light, a wobbling crest line on its leading edge, and whitecaps in a storm */
function drawSwells(c) {
  const n = 7, tide = clamp(G.current.m / (40 * S), 0, 1), amp = 0.03 + 0.03 * tide + 0.04 * G.stormK, L = DIAG, storm = G.stormK;
  c.save(); c.translate(LH.x, LH.y); c.rotate(G.current.a);
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const phase = ((G.swell + i * (L / n)) % L) - L / 2;
    const g = c.createLinearGradient(phase - 46 * S, 0, phase + 30 * S, 0);
    g.addColorStop(0, 'rgba(120,160,210,0)'); g.addColorStop(0.7, 'rgba(120,160,210,' + amp + ')'); g.addColorStop(1, 'rgba(120,160,210,0)');
    c.fillStyle = g; c.fillRect(phase - 46 * S, -L, 76 * S, 2 * L);
    // the crest: a line that wanders with a slow sine, brighter in a storm
    c.strokeStyle = 'rgba(190,215,245,' + (0.05 + 0.1 * storm) + ')'; c.lineWidth = (1.2 + 1.5 * storm) * S;
    c.beginPath();
    const wob = (5 + 6 * tide + 8 * storm) * S, step = 28 * S;
    for (let y = -L; y <= L; y += step) { const x = phase + 20 * S + Math.sin(y * 0.012 + G.time * 0.9 + i) * wob + Math.sin(y * 0.031 - G.time * 0.6) * wob * 0.4; y === -L ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke();
    if (storm > 0.15) { // whitecaps: short bright strokes scattered along the crest
      c.strokeStyle = 'rgba(230,240,255,' + 0.35 * storm + ')'; c.lineWidth = 2 * S; c.beginPath();
      for (let k = 0; k < 9; k++) { const y = -L + ((k * 977 + i * 331 + Math.floor(G.time * 1.5) * 173) % (2 * L)); const x = phase + 20 * S + Math.sin(y * 0.012 + G.time * 0.9 + i) * wob; c.moveTo(x - 6 * S, y); c.lineTo(x + 6 * S, y + 2 * S); }
      c.stroke();
    }
  }
  c.restore();
}

function wedge(c, a, half, R, c0, c1, c2, mid) {
  const g = c.createRadialGradient(LH.x, LH.y, LH.r * 0.4, LH.x, LH.y, R);
  g.addColorStop(0, c0); g.addColorStop(mid || 0.3, c1); g.addColorStop(1, c2);
  c.fillStyle = g; c.beginPath(); c.moveTo(LH.x, LH.y); c.arc(LH.x, LH.y, R, a - half, a + half); c.closePath(); c.fill();
}
function drawBeam(c) {
  const R = Math.max(G.beamRange, 40 * S), a = G.beam.a, half = beamHalf();
  const flicker = 0.93 + 0.07 * Math.sin(G.time * 23) * Math.sin(G.time * 7.3);
  c.globalAlpha = flicker;
  wedge(c, a, half * 1.6, R * 1.05, 'rgba(255,236,180,0.08)', 'rgba(255,236,180,0.04)', 'rgba(255,236,180,0)');
  wedge(c, a, half, R, 'rgba(255,236,180,0.40)', 'rgba(255,236,180,0.16)', 'rgba(255,236,180,0)', 0.35);
  wedge(c, a, half * 0.5, R, 'rgba(255,245,215,0.26)', 'rgba(255,245,215,0.08)', 'rgba(255,245,215,0)', 0.3);
  if (G.up.mirror) { wedge(c, a + Math.PI, half * 0.8, R * 0.7, 'rgba(255,236,180,0.22)', 'rgba(255,236,180,0.09)', 'rgba(255,236,180,0)', 0.35); }
  // the edge of the reach: a faint arc across the cone, brighter for a moment after the reach grows
  const pulse = G.reachPulse;
  c.setLineDash([6 * S, 8 * S]); c.lineWidth = 1.2 * S; c.strokeStyle = 'rgba(255,236,180,' + (0.14 + 0.4 * pulse) + ')';
  c.beginPath(); c.arc(LH.x, LH.y, R - 3 * S, a - half * 1.05, a + half * 1.05); c.stroke(); c.setLineDash([]);
  if (pulse > 0) { // a ring travelling out to the new edge (the pulse starts above 1: that first part is a bright hold)
    const k = clamp(1 - pulse, 0, 1); c.strokeStyle = 'rgba(255,236,180,' + 0.5 * Math.min(1, pulse) + ')'; c.lineWidth = 2 * S;
    c.beginPath(); c.arc(LH.x, LH.y, Math.max(2, R * k), 0, TAU); c.stroke();
  }
  // striations: thin rays drifting inside the cone
  for (let i = 0; i < 5; i++) {
    const off = Math.sin(G.time * 0.37 + i * 1.7) * half * 0.85;
    wedge(c, a + off, half * 0.06, R * 0.95, 'rgba(255,245,215,0.10)', 'rgba(255,245,215,0.04)', 'rgba(255,245,215,0)', 0.4);
  }
  c.globalAlpha = 1;
}
function drawScan(c) {
  const R = Math.max(G.beamRange, 40 * S) * 0.9, half = scanHalf();
  const angles = G.up.scan >= 3 ? [G.scan.a, G.scan.a + Math.PI] : [G.scan.a];
  for (const a of angles) {
    wedge(c, a, half * 1.8, R, 'rgba(140,196,255,0.06)', 'rgba(140,196,255,0.03)', 'rgba(140,196,255,0)');
    wedge(c, a, half, R, 'rgba(140,196,255,0.24)', 'rgba(140,196,255,0.10)', 'rgba(140,196,255,0)', 0.35);
  }
}

/* fog is painted into a low-resolution canvas (it is all soft gradients) and scaled up, which keeps Firefox smooth */
let fogCv = null, fctx = null;
function drawFog() {
  const R = Math.max(G.beamRange, 40 * S), sc = 0.25;
  if (!fogCv) { fogCv = document.createElement('canvas'); fctx = fogCv.getContext('2d'); }
  const fw = Math.max(1, Math.round(W * DPR * sc)), fh = Math.max(1, Math.round(H * DPR * sc));
  if (fogCv.width !== fw) fogCv.width = fw; if (fogCv.height !== fh) fogCv.height = fh;
  const c = fctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fogCv.width, fogCv.height);
  c.setTransform(fogCv.width / W, 0, 0, fogCv.height / H, 0, 0);
  const g = c.createRadialGradient(LH.x, LH.y, R * 0.55, LH.x, LH.y, R * 1.15);
  g.addColorStop(0, 'rgba(150,170,190,0)'); g.addColorStop(0.6, 'rgba(150,170,190,' + 0.42 * G.fogK + ')'); g.addColorStop(1, 'rgba(140,160,180,' + 0.7 * G.fogK + ')');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.globalAlpha = 0.12 * G.fogK;
  for (let i = 0; i < 5; i++) {
    const a = G.time * 0.05 + i * 1.26, rr = R * (0.8 + 0.1 * Math.sin(G.time * 0.3 + i));
    const x = LH.x + Math.cos(a) * rr, y = LH.y + Math.sin(a) * rr;
    const fg = c.createRadialGradient(x, y, 0, x, y, 130 * S);
    fg.addColorStop(0, 'rgba(170,185,200,1)'); fg.addColorStop(1, 'rgba(170,185,200,0)');
    c.fillStyle = fg; c.beginPath(); c.arc(x, y, 130 * S, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
  ctx.drawImage(fogCv, 0, 0, W, H);
}

function drawRain() {
  ctx.strokeStyle = 'rgba(190,210,235,' + 0.28 * G.stormK + ')'; ctx.lineWidth = 1;
  const wx = Math.cos(G.current.a) * 0.3, wy = 1;
  ctx.beginPath();
  for (const r of rain) { ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + wx * r.len, r.y + wy * r.len); }
  ctx.stroke();
}
function drawBolt() {
  const b = G.bolt, k = 1 - b.t / 0.35;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  [[10 * S, 0.12], [3 * S, 0.5], [1.2 * S, 1]].forEach(([w, a]) => {
    ctx.strokeStyle = 'rgba(230,240,255,' + a * k + ')'; ctx.lineWidth = w;
    ctx.beginPath(); b.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  });
  ctx.restore();
}

function drawRocks() {
  for (const r of G.rocks) {
    const grow = Math.min(1, (G.time - r.born) / 0.6);
    const sh = ctx.createRadialGradient(r.x, r.y, r.r, r.x, r.y, r.r * 2.4);
    sh.addColorStop(0, 'rgba(70,140,150,' + (0.16 + 0.1 * r.lit) + ')'); sh.addColorStop(1, 'rgba(70,140,150,0)');
    ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 2.4, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(r.x, r.y); ctx.scale(grow, grow);
    ctx.strokeStyle = 'rgba(200,220,240,' + (0.1 + 0.25 * r.lit + 0.15 * G.stormK) + ')'; ctx.lineWidth = 1.5 * S;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + G.time * 0.4, rr = r.r * 1.35 + Math.sin(G.time * 2 + i) * 2 * S; ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); ctx.arc(0, 0, rr, a, a + 0.6); }
    ctx.stroke();
    const path = () => { ctx.beginPath(); r.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
    const base = [30 + 36 * r.lit, 38 + 40 * r.lit, 50 + 44 * r.lit];
    path(); ctx.fillStyle = 'rgb(' + base.map(Math.round).join(',') + ')'; ctx.fill();
    const toL = Math.atan2(LH.y - r.y, LH.x - r.x);
    ctx.save(); ctx.translate(Math.cos(toL) * r.r * 0.18, Math.sin(toL) * r.r * 0.18); ctx.scale(0.62, 0.62);
    path(); ctx.fillStyle = 'rgba(255,236,180,' + (0.06 + 0.3 * r.lit) + ')'; ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,236,180,' + (0.08 + 0.6 * r.lit) + ')'; ctx.lineWidth = 1.4 * S;
    ctx.beginPath(); ctx.arc(0, 0, r.r * 0.95, toL - 0.9, toL + 0.9); ctx.stroke();
    ctx.restore();
  }
}

function drawDebris() {
  for (const d of G.debris) {
    const grow = Math.min(1, (G.time - d.born) / 0.8);
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.scale(grow, grow);
    const u = S, k = 0.35 + 0.65 * d.lit;
    ctx.fillStyle = 'rgba(70,60,52,' + k + ')';
    ctx.beginPath(); ctx.moveTo(10 * u, -2 * u); ctx.lineTo(2 * u, -6 * u); ctx.lineTo(-9 * u, -4 * u); ctx.lineTo(-11 * u, 1 * u); ctx.lineTo(-4 * u, 6 * u); ctx.lineTo(6 * u, 4 * u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(236,230,212,' + (0.08 + 0.4 * d.lit) + ')'; ctx.lineWidth = 1 * u; ctx.stroke();
    ctx.strokeStyle = 'rgba(236,230,212,' + 0.3 * k + ')'; ctx.beginPath(); ctx.moveTo(-6 * u, -1 * u); ctx.lineTo(4 * u, 1 * u); ctx.stroke();
    ctx.restore();
  }
}

function drawHarbor() {
  const gl = HARBOR.x - HARBOR.w / 2, gr = HARBOR.x + HARBOR.w / 2, gy = HARBOR.landY - 2 * S;
  ctx.fillStyle = '#0a1420'; ctx.fillRect(-20, HARBOR.landY, W + 40, H - HARBOR.landY + 20);
  // basin inside the gate with light reflections
  ctx.fillStyle = '#0b1a2b'; ctx.fillRect(gl - 20 * S, HARBOR.landY, HARBOR.w + 40 * S, 14 * S);
  for (const [x, c] of [[gl, 'rgba(230,80,60,'], [gr, 'rgba(90,210,140,']]) {
    const g = ctx.createLinearGradient(0, HARBOR.landY, 0, HARBOR.landY + 14 * S); g.addColorStop(0, c + '0.35)'); g.addColorStop(1, c + '0)');
    ctx.fillStyle = g; ctx.fillRect(x - 2 * S + Math.sin(G.time * 2) * S, HARBOR.landY, 4 * S, 14 * S);
  }
  for (const m of moored) { ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a); ctx.fillStyle = 'rgba(236,230,212,0.35)'; ctx.beginPath(); ctx.moveTo(5 * S, 0); ctx.lineTo(2 * S, -2 * S); ctx.lineTo(-4 * S, -2 * S); ctx.lineTo(-5 * S, 0); ctx.lineTo(-4 * S, 2 * S); ctx.lineTo(2 * S, 2 * S); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(236,230,212,0.6)'; ctx.beginPath(); ctx.arc(0, 0, 0.8 * S, 0, TAU); ctx.fill(); ctx.restore(); }
  // quay with bollards, then the town
  ctx.fillStyle = '#121f2d'; ctx.fillRect(-20, HARBOR.landY + 12 * S, W + 40, 3 * S);
  ctx.fillStyle = '#2a3745'; for (let x = 6 * S; x < W; x += 24 * S) ctx.fillRect(x, HARBOR.landY + 12.5 * S, 2 * S, 2 * S);
  const shades = ['#0e1a26', '#122030', '#0c1722'], roofs = ['#152436', '#182a3d', '#12202e'];
  const wel = G.welcome;
  for (const b of buildings) {
    ctx.fillStyle = shades[b.shade]; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = roofs[b.shade]; ctx.fillRect(b.x, b.y, b.w, b.h * 0.45);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(b.x, b.y + b.h * 0.45, b.w, 1 * S);
    if (b.spire) {
      ctx.fillStyle = '#1a2b3f'; ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h * 0.45, b.w * 0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(236,230,212,0.6)'; ctx.lineWidth = 1 * S; ctx.beginPath(); ctx.moveTo(b.x + b.w / 2 - 2.5 * S, b.y + b.h * 0.45); ctx.lineTo(b.x + b.w / 2 + 2.5 * S, b.y + b.h * 0.45); ctx.moveTo(b.x + b.w / 2, b.y + b.h * 0.45 - 2.5 * S); ctx.lineTo(b.x + b.w / 2, b.y + b.h * 0.45 + 2.5 * S); ctx.stroke();
    }
    for (const w of b.win) {
      const f = 0.55 + 0.45 * Math.sin(G.time * 0.8 * w.w + w.ph);
      ctx.fillStyle = 'rgba(255,200,120,' + Math.min(1, 0.3 + 0.45 * f + 0.5 * wel) + ')';
      ctx.fillRect(w.x, w.y, 2.4 * S, 3 * S);
    }
  }
  // breakwater: stone wall with a rounded cap, then individual stones
  ctx.lineCap = 'round'; ctx.lineWidth = 24 * S; ctx.strokeStyle = '#19232f';
  ctx.beginPath(); ctx.moveTo(-10, HARBOR.landY + 3 * S); ctx.lineTo(gl - 10 * S, HARBOR.landY + 3 * S); ctx.moveTo(gr + 10 * S, HARBOR.landY + 3 * S); ctx.lineTo(W + 10, HARBOR.landY + 3 * S); ctx.stroke();
  ctx.lineWidth = 16 * S; ctx.strokeStyle = '#222e3b'; ctx.beginPath(); ctx.moveTo(-10, HARBOR.landY + 1 * S); ctx.lineTo(gl - 10 * S, HARBOR.landY + 1 * S); ctx.moveTo(gr + 10 * S, HARBOR.landY + 1 * S); ctx.lineTo(W + 10, HARBOR.landY + 1 * S); ctx.stroke();
  for (const j of jetty) {
    ctx.fillStyle = 'rgba(16,24,33,0.7)'; ctx.beginPath(); ctx.arc(j.x, j.y + j.j - 1 * S, j.r * 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(48,60,74,0.8)'; ctx.beginPath(); ctx.arc(j.x - j.r * 0.2, j.y + j.j - j.r * 0.35, j.r * 0.4, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(200,220,240,' + (0.14 + 0.2 * G.stormK) + ')'; ctx.lineWidth = 1 * S; ctx.beginPath();
  for (let x = 0; x < W; x += 6) { if (x > gl - 10 * S && x < gr + 10 * S) continue; const y = HARBOR.landY - 10 * S + Math.sin(x * 0.05 + G.time * 2) * (2 + 3 * G.stormK) * S; (x === 0 || (x - 6 <= gr + 10 * S && x > gr + 10 * S)) ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  // mole heads: small beacon towers, red to port and green to starboard for a ship entering (IALA region A)
  const beacon = (x, c) => {
    const g = ctx.createRadialGradient(x, gy, 0, x, gy, 26 * S); g.addColorStop(0, c + '0.5)'); g.addColorStop(1, c + '0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, gy, 26 * S, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a3745'; ctx.beginPath(); ctx.arc(x, gy + 2 * S, 7 * S, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a4857'; ctx.beginPath(); ctx.arc(x, gy + 2 * S, 5 * S, 0, TAU); ctx.fill();
    ctx.fillStyle = c + '1)'; ctx.beginPath(); ctx.arc(x, gy + 2 * S, 2.6 * S, 0, TAU); ctx.fill();
  };
  const blink = (Math.sin(G.time * 3) > 0.3) ? 1 : 0.55;
  ctx.globalAlpha = blink; beacon(gl, 'rgba(230,80,60,'); ctx.globalAlpha = 1 - (blink - 0.55); beacon(gr, 'rgba(90,210,140,'); ctx.globalAlpha = 1;
}
function drawKeeper(c) {
  const R = keeperRange(); if (!R) return;
  hkOrigins().forEach((o, i) => {
    const a = G.hk[i].a;
    const w = (half, c0, c1) => { const g = c.createRadialGradient(o.x, o.y, 4 * S, o.x, o.y, R); g.addColorStop(0, c0); g.addColorStop(0.4, c1); g.addColorStop(1, 'rgba(255,236,180,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(o.x, o.y); c.arc(o.x, o.y, R, a - half, a + half); c.closePath(); c.fill(); };
    w(0.32, 'rgba(255,236,180,0.08)', 'rgba(255,236,180,0.03)');
    w(0.2, 'rgba(255,236,180,0.34)', 'rgba(255,236,180,0.12)');
  });
}
function drawKeeperLamp() {
  if (!keeperRange()) return;
  hkOrigins().forEach((o, i) => {
    // a small hut on the wall with a lit window, and the lamp on its roof turned with the beam
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(o.x - 5 * S + 1.5 * S, o.y - 1 * S + 1.5 * S, 10 * S, 8 * S);
    ctx.fillStyle = '#5c4d3c'; ctx.fillRect(o.x - 5 * S, o.y - 1 * S, 10 * S, 8 * S);
    ctx.fillStyle = '#7a6650'; ctx.fillRect(o.x - 5 * S, o.y - 1 * S, 10 * S, 3 * S);
    ctx.fillStyle = 'rgba(255,200,120,0.9)'; ctx.fillRect(o.x - 1 * S, o.y + 3.5 * S, 2 * S, 2 * S);
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(G.hk[i].a);
    ctx.fillStyle = '#ece6d4'; ctx.beginPath(); ctx.arc(0, 0, 3.2 * S, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,245,215,1)'; ctx.beginPath(); ctx.moveTo(1 * S, -2.2 * S); ctx.lineTo(5 * S, -1 * S); ctx.lineTo(5 * S, 1 * S); ctx.lineTo(1 * S, 2.2 * S); ctx.closePath(); ctx.fill();
    ctx.restore();
  });
}

/* ---------- ship models (ship frame: bow at +x, starboard at +y) ---------- */
function hullPath(type, u) {
  ctx.beginPath();
  if (type === 'skiff') { ctx.moveTo(9 * u, 0); ctx.quadraticCurveTo(5 * u, -4.5 * u, -5 * u, -4 * u); ctx.quadraticCurveTo(-9 * u, -3 * u, -9 * u, 0); ctx.quadraticCurveTo(-9 * u, 3 * u, -5 * u, 4 * u); ctx.quadraticCurveTo(5 * u, 4.5 * u, 9 * u, 0); }
  else if (type === 'sloop' || type === 'pirate') { ctx.moveTo(11 * u, 0); ctx.quadraticCurveTo(6 * u, -4 * u, -7 * u, -3.5 * u); ctx.lineTo(-10 * u, -1.5 * u); ctx.lineTo(-10 * u, 1.5 * u); ctx.lineTo(-7 * u, 3.5 * u); ctx.quadraticCurveTo(6 * u, 4 * u, 11 * u, 0); }
  else if (type === 'steamer') { ctx.moveTo(13 * u, 0); ctx.lineTo(8 * u, -4 * u); ctx.lineTo(-10 * u, -4 * u); ctx.lineTo(-12 * u, -2 * u); ctx.lineTo(-12 * u, 2 * u); ctx.lineTo(-10 * u, 4 * u); ctx.lineTo(8 * u, 4 * u); }
  else if (type === 'ferry') { ctx.moveTo(12 * u, 0); ctx.quadraticCurveTo(10 * u, -5 * u, 2 * u, -5 * u); ctx.lineTo(-11 * u, -5 * u); ctx.quadraticCurveTo(-13 * u, 0, -11 * u, 5 * u); ctx.lineTo(2 * u, 5 * u); ctx.quadraticCurveTo(10 * u, 5 * u, 12 * u, 0); }
  else if (type === 'clipper') { ctx.moveTo(15 * u, 0); ctx.quadraticCurveTo(8 * u, -3.4 * u, -9 * u, -3 * u); ctx.lineTo(-13 * u, -1 * u); ctx.lineTo(-13 * u, 1 * u); ctx.lineTo(-9 * u, 3 * u); ctx.quadraticCurveTo(8 * u, 3.4 * u, 15 * u, 0); }
  else if (type === 'barge') { ctx.moveTo(13 * u, -3 * u); ctx.lineTo(13 * u, 3 * u); ctx.lineTo(-13 * u, 4.5 * u); ctx.lineTo(-13 * u, -4.5 * u); }
  else { ctx.moveTo(14 * u, 0); ctx.lineTo(10 * u, -4 * u); ctx.lineTo(-12 * u, -4 * u); ctx.lineTo(-14 * u, -1.5 * u); ctx.lineTo(-14 * u, 1.5 * u); ctx.lineTo(-12 * u, 4 * u); ctx.lineTo(10 * u, 4 * u); }
  ctx.closePath();
}
function drawWake(s, alpha) {
  if (s.wake.length < 2) return;
  const dock = s.docking >= 0 ? 1 - s.docking / (0.9 + 0.3 * s.k) : 1;
  const u = S * s.k;
  ctx.lineWidth = 1.4 * S; ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let i = 0; i < s.wake.length; i++) {
      const w = s.wake[i], off = (3.5 + i * 0.9) * u * side, nx = -Math.sin(w.h) * off, ny = Math.cos(w.h) * off;
      i ? ctx.lineTo(w.x + nx, w.y + ny) : ctx.moveTo(w.x + nx, w.y + ny);
    }
    const g = ctx.createLinearGradient(s.wake[0].x, s.wake[0].y, s.wake[s.wake.length - 1].x, s.wake[s.wake.length - 1].y);
    g.addColorStop(0, 'rgba(200,225,250,' + 0.3 * dock * alpha + ')'); g.addColorStop(1, 'rgba(200,225,250,0)');
    ctx.strokeStyle = g; ctx.stroke();
  }
}
function drawShip(s) {
  const dock = s.docking >= 0 ? 1 - s.docking / (0.9 + 0.3 * s.k) : 1;
  const u = S * s.k, lit = s.lit;
  ctx.save(); ctx.translate(s.x, s.y); ctx.globalAlpha = dock;
  if (lit || s.flash > 0) {
    const k = (lit ? 1 : s.flash) * (0.85 + 0.15 * Math.sin(G.time * 4 + s.bob));
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30 * u);
    g.addColorStop(0, 'rgba(255,236,180,' + 0.35 * k + ')'); g.addColorStop(1, 'rgba(255,236,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30 * u, 0, TAU); ctx.fill();
  }
  ctx.rotate(s.h + Math.sin(G.time * 1.7 + s.bob) * (0.035 + 0.06 * G.stormK) / s.k);
  const k = lit ? 1 : 0.32 + 0.1 * Math.sin(G.time * 2 + s.bob);
  ctx.strokeStyle = 'rgba(220,235,250,' + 0.35 * k + ')'; ctx.lineWidth = 1 * S;
  const bow = { skiff: 9, sloop: 11, steamer: 13, ferry: 12, clipper: 15, tanker: 14, barge: 13 }[s.type] || 12;
  ctx.beginPath(); ctx.moveTo(bow * u, -1 * u); ctx.lineTo((bow - 7) * u, -6 * u); ctx.moveTo(bow * u, 1 * u); ctx.lineTo((bow - 7) * u, 6 * u); ctx.stroke();
  ctx.save(); ctx.translate(1.5 * u, 1.5 * u); hullPath(s.type, u); ctx.fillStyle = 'rgba(0,0,0,' + 0.35 * k + ')'; ctx.fill(); ctx.restore();
  hullPath(s.type, u); ctx.fillStyle = 'rgba(236,230,212,' + k + ')'; ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,20,' + 0.5 * k + ')'; ctx.lineWidth = 0.8 * S; ctx.stroke();
  if (s.type === 'skiff') {
    ctx.fillStyle = 'rgba(90,70,50,' + k + ')'; ctx.fillRect(-4 * u, -2.4 * u, 4.5 * u, 4.8 * u);
    ctx.fillStyle = 'rgba(236,230,212,' + k + ')'; ctx.fillRect(-3.4 * u, -1.7 * u, 1.4 * u, 3.4 * u);
    ctx.fillStyle = 'rgba(60,45,30,' + k + ')'; ctx.beginPath(); ctx.arc(3 * u, 0, 0.9 * u, 0, TAU); ctx.fill();
  } else if (s.type === 'sloop') {
    ctx.strokeStyle = 'rgba(40,30,20,' + 0.5 * k + ')'; ctx.lineWidth = 0.6 * S; ctx.beginPath(); ctx.moveTo(8 * u, 0); ctx.lineTo(-8 * u, 0); ctx.stroke();
    const rel = angDiff(G.current.a, s.h), side = rel > 0 ? 1 : -1, sa = clamp(Math.abs(rel) * 0.45, 0.25, 1.1) * side;
    ctx.save(); ctx.translate(2 * u, 0); ctx.rotate(sa);
    ctx.fillStyle = 'rgba(245,240,225,' + (0.5 + 0.5 * k) + ')'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9 * u, 0); ctx.quadraticCurveTo(-5 * u, side * 2.5 * u, 0, 0); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(60,45,30,' + k + ')'; ctx.beginPath(); ctx.arc(2 * u, 0, 0.9 * u, 0, TAU); ctx.fill();
  } else if (s.type === 'steamer') {
    ctx.fillStyle = 'rgba(200,190,165,' + k + ')'; ctx.fillRect(-7 * u, -2.6 * u, 10 * u, 5.2 * u);
    ctx.fillStyle = 'rgba(120,100,80,' + k + ')'; ctx.fillRect(-7 * u, -2.6 * u, 10 * u, 0.9 * u);
    ctx.fillStyle = 'rgba(40,35,35,' + k + ')'; ctx.beginPath(); ctx.arc(-1 * u, 0, 1.7 * u, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(192,57,43,' + k + ')'; ctx.lineWidth = 0.7 * u; ctx.beginPath(); ctx.arc(-1 * u, 0, 1.3 * u, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(60,45,30,' + k + ')'; ctx.beginPath(); ctx.arc(8 * u, 0, 0.8 * u, 0, TAU); ctx.fill();
  } else if (s.type === 'ferry') {
    ctx.fillStyle = 'rgba(200,190,165,' + k + ')'; ctx.fillRect(-9 * u, -3.4 * u, 16 * u, 6.8 * u);
    ctx.fillStyle = 'rgba(120,100,80,' + k + ')'; ctx.fillRect(-9 * u, -0.5 * u, 16 * u, 1 * u);
    for (let i = 0; i < 5; i++) for (const sd of [-2.2, 2.2]) { ctx.fillStyle = 'rgba(255,200,120,' + (0.5 + 0.5 * k) + ')'; ctx.fillRect((-7 + i * 3) * u, (sd - 0.5) * u, 1.6 * u, 1 * u); }
    ctx.fillStyle = 'rgba(40,35,35,' + k + ')'; ctx.beginPath(); ctx.arc(-4 * u, 0, 1.3 * u, 0, TAU); ctx.fill();
  } else if (s.type === 'clipper') {
    ctx.strokeStyle = 'rgba(40,30,20,' + 0.5 * k + ')'; ctx.lineWidth = 0.6 * S; ctx.beginPath(); ctx.moveTo(12 * u, 0); ctx.lineTo(-11 * u, 0); ctx.stroke();
    const rel = angDiff(G.current.a, s.h), side = rel > 0 ? 1 : -1, sa = clamp(Math.abs(rel) * 0.45, 0.25, 1.1) * side;
    for (const mx of [7, 1, -5]) { ctx.save(); ctx.translate(mx * u, 0); ctx.rotate(sa); ctx.fillStyle = 'rgba(245,240,225,' + (0.5 + 0.5 * k) + ')'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-5.5 * u, 0); ctx.quadraticCurveTo(-3 * u, side * 3 * u, 0, 0); ctx.fill(); ctx.restore(); ctx.fillStyle = 'rgba(60,45,30,' + k + ')'; ctx.beginPath(); ctx.arc(mx * u, 0, 0.8 * u, 0, TAU); ctx.fill(); }
  } else if (s.type === 'barge') {
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? 'rgba(120,100,80,' + k + ')' : 'rgba(150,120,70,' + k + ')'; ctx.fillRect((8 - i * 5.5) * u, -3 * u, 4.5 * u, 6 * u); ctx.strokeStyle = 'rgba(40,30,20,' + 0.6 * k + ')'; ctx.lineWidth = 0.6 * S; ctx.strokeRect((8 - i * 5.5) * u, -3 * u, 4.5 * u, 6 * u); }
    ctx.fillStyle = 'rgba(200,190,165,' + k + ')'; ctx.fillRect(-13 * u, -3 * u, 3.5 * u, 6 * u);
    ctx.fillStyle = 'rgba(40,35,35,' + k + ')'; ctx.beginPath(); ctx.arc(-11.5 * u, 0, 1 * u, 0, TAU); ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(120,100,80,' + k + ')'; ctx.lineWidth = 0.8 * u; ctx.beginPath(); ctx.moveTo(8 * u, 0); ctx.lineTo(-6 * u, 0); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(160,150,130,' + k + ')'; ctx.fillRect((5 - i * 3.5) * u, -2.6 * u, 2 * u, 5.2 * u); }
    ctx.fillStyle = 'rgba(200,190,165,' + k + ')'; ctx.fillRect(-12 * u, -3 * u, 5 * u, 6 * u);
    ctx.fillStyle = 'rgba(40,35,35,' + k + ')'; ctx.beginPath(); ctx.arc(-9 * u, 0, 1.4 * u, 0, TAU); ctx.fill();
  }
  const nx = bow - 4;
  ctx.fillStyle = 'rgba(230,80,60,' + k + ')'; ctx.beginPath(); ctx.arc(nx * u, -3.6 * u, 0.9 * u, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(90,210,140,' + k + ')'; ctx.beginPath(); ctx.arc(nx * u, 3.6 * u, 0.9 * u, 0, TAU); ctx.fill();
  const lf = 0.6 + 0.4 * Math.sin(G.time * 7 + s.bob), lx = -(bow - 3) * u;
  ctx.fillStyle = lit ? 'rgba(255,200,110,1)' : 'rgba(255,200,110,' + (0.5 + 0.5 * lf) + ')';
  ctx.beginPath(); ctx.arc(lx, 0, 1.6 * u, 0, TAU); ctx.fill();
  if (!lit) { const g = ctx.createRadialGradient(lx, 0, 0, lx, 0, 9 * u); g.addColorStop(0, 'rgba(255,200,110,' + 0.35 * lf + ')'); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, 0, 9 * u, 0, TAU); ctx.fill(); }
  ctx.restore();
  if (s.label > 0) drawLabel(T('s_' + s.type), s.x, s.y + 9 * u, s.label, '#ece6d4');
}
function drawLabel(txt, x, y, a, color) {
  ctx.globalAlpha = Math.min(1, a); ctx.font = "400 10px 'IBM Plex Mono',monospace"; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(txt.toUpperCase(), clamp(x, 50, W - 50), clamp(y, 10, H - 20), 100); ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}
function drawPirate(p) {
  if (p.vis < 0.02) return;
  const u = S * p.k, k = p.vis;
  ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = k;
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26 * u);
  g.addColorStop(0, 'rgba(255,90,60,0.25)'); g.addColorStop(1, 'rgba(255,90,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 26 * u, 0, TAU); ctx.fill();
  ctx.rotate(p.h + Math.sin(G.time * 1.9 + p.bob) * 0.04);
  ctx.save(); ctx.translate(1.5 * u, 1.5 * u); hullPath('pirate', u); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill(); ctx.restore();
  hullPath('pirate', u); ctx.fillStyle = '#2a2524'; ctx.fill(); ctx.strokeStyle = 'rgba(255,120,80,0.6)'; ctx.lineWidth = 0.8 * S; ctx.stroke();
  const rel = angDiff(G.current.a, p.h), side = rel > 0 ? 1 : -1, sa = clamp(Math.abs(rel) * 0.45, 0.25, 1.1) * side;
  ctx.save(); ctx.translate(2 * u, 0); ctx.rotate(sa);
  ctx.fillStyle = '#141212'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10 * u, 0); ctx.quadraticCurveTo(-5 * u, side * 3 * u, 0, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(236,230,212,0.5)'; ctx.lineWidth = 0.6 * S; ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,70,50,1)'; ctx.beginPath(); ctx.arc(-8 * u, 0, 1.6 * u, 0, TAU); ctx.fill();
  ctx.restore();
  if (p.label > 0) drawLabel(T('s_pirate'), p.x, p.y + 9 * u, p.label * k, '#ff7a5c');
}
function drawPiece(p) {
  const k = 1 - p.t / p.max, u = S * p.k * (0.6 + 0.4 * k);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.h + p.rot); ctx.globalAlpha = k;
  ctx.beginPath();
  if (p.side < 0) ctx.rect(0, -4.5 * u, 11 * u, 9 * u); else ctx.rect(-12 * u, -4.5 * u, 11 * u, 9 * u);
  ctx.clip();
  hullPath(p.type, u); ctx.fillStyle = 'rgba(236,230,212,0.9)'; ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,20,0.6)'; ctx.lineWidth = 0.8 * S; ctx.stroke();
  ctx.restore();
}
function drawSmoke() {
  for (const p of G.smoke) {
    const k = p.t / p.max;
    ctx.fillStyle = 'rgba(150,150,160,' + 0.22 * (1 - k) + ')';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + k * 10 * S, 0, TAU); ctx.fill();
  }
}

function drawLighthouse() {
  const pulse = 0.5 + 0.5 * Math.sin(G.time * 1.7), r = LH.r;
  // surf around the island
  ctx.strokeStyle = 'rgba(200,220,240,' + (0.18 + 0.2 * G.stormK) + ')'; ctx.lineWidth = 2 * S;
  ctx.beginPath(); ctx.arc(LH.x, LH.y, r * 1.3 + pulse * (1.5 + 2 * G.stormK) * S, 0, TAU); ctx.stroke();
  const island = (scale) => { ctx.beginPath(); LH.pts.forEach((p, i) => i ? ctx.lineTo(LH.x + p[0] * scale, LH.y + p[1] * scale) : ctx.moveTo(LH.x + p[0] * scale, LH.y + p[1] * scale)); ctx.closePath(); };
  island(1.12); ctx.fillStyle = '#4a4636'; ctx.fill();          // sand
  island(1.0); ctx.fillStyle = '#1e2a35'; ctx.fill();           // rock
  island(0.72); ctx.fillStyle = '#243a30'; ctx.fill();          // grass
  // keeper's cottage with a lit window, and the path to the tower
  const cx = LH.x - r * 0.5, cy = LH.y + r * 0.35;
  ctx.strokeStyle = 'rgba(200,190,165,0.35)'; ctx.lineWidth = 1.5 * S; ctx.beginPath(); ctx.moveTo(cx + 4 * S, cy); ctx.quadraticCurveTo(LH.x - 4 * S, LH.y + 8 * S, LH.x, LH.y); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(cx - 4 * S + 1.5 * S, cy - 3 * S + 1.5 * S, 8 * S, 6 * S);
  ctx.fillStyle = '#6b5a48'; ctx.fillRect(cx - 4 * S, cy - 3 * S, 8 * S, 6 * S);
  ctx.fillStyle = '#8a7560'; ctx.fillRect(cx - 4 * S, cy - 3 * S, 8 * S, 2.6 * S);
  ctx.fillStyle = 'rgba(255,200,120,' + (0.7 + 0.3 * pulse) + ')'; ctx.fillRect(cx + 0.5 * S, cy + 0.5 * S, 1.6 * S, 1.6 * S);
  // tower from above: shadow, white gallery with rail, red lantern room, lens aligned with the beam
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.arc(LH.x + 3 * S, LH.y + 3 * S, 11 * S, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ece6d4'; ctx.beginPath(); ctx.arc(LH.x, LH.y, 11 * S, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(40,30,20,0.6)'; ctx.lineWidth = 0.8 * S; ctx.beginPath(); ctx.arc(LH.x, LH.y, 11 * S, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#2b2b2b'; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ctx.beginPath(); ctx.arc(LH.x + Math.cos(a) * 10 * S, LH.y + Math.sin(a) * 10 * S, 0.9 * S, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2.4 * S; ctx.beginPath(); ctx.arc(LH.x, LH.y, 7.4 * S, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#1d1d1d'; ctx.beginPath(); ctx.arc(LH.x, LH.y, 5.4 * S, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(LH.x, LH.y); ctx.rotate(G.beam.a);
  ctx.strokeStyle = 'rgba(255,245,215,0.9)'; ctx.lineWidth = 1.6 * S; ctx.beginPath(); ctx.moveTo(-4 * S, -2.2 * S); ctx.lineTo(4.5 * S, -1.2 * S); ctx.moveTo(-4 * S, 2.2 * S); ctx.lineTo(4.5 * S, 1.2 * S); ctx.moveTo(-4.5 * S, 0); ctx.lineTo(5 * S, 0); ctx.stroke();
  ctx.restore();
  const g = ctx.createRadialGradient(LH.x, LH.y, 0, LH.x, LH.y, 46 * S);
  g.addColorStop(0, 'rgba(255,245,210,1)'); g.addColorStop(0.1, 'rgba(255,236,180,' + (0.5 + 0.1 * pulse) + ')'); g.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(LH.x, LH.y, 46 * S, 0, TAU); ctx.fill();
}

function drawHUD() {
  const pad = 16, small = Math.min(S, 1);
  ctx.textBaseline = 'top';
  ctx.font = '500 ' + Math.round(20 * small) + "px 'IBM Plex Mono',monospace";
  ctx.fillStyle = '#ece6d4'; ctx.textAlign = 'left'; ctx.fillText(String(G.score), pad, pad);
  const mult = multiplier();
  if (mult > 1) { const w = ctx.measureText(String(G.score)).width; ctx.fillStyle = '#f0b24a'; ctx.font = '500 ' + Math.round(14 * small) + "px 'IBM Plex Mono',monospace"; ctx.fillText('×' + mult, pad + w + 8, pad + 4); }
  ctx.font = "400 11px 'IBM Plex Mono',monospace"; ctx.fillStyle = '#8d9ab0';
  ctx.fillText(T('score').toUpperCase() + (G.streak > 0 ? '  ·  ' + T('streak').toUpperCase() + ' ' + G.streak : ''), pad, pad + 26);
  ctx.fillStyle = '#f0b24a'; ctx.fillText(T('oil').toUpperCase() + ' ' + G.oil, pad, pad + 42);
  ctx.textAlign = 'center'; ctx.font = "500 15px 'Cormorant Garamond',Georgia,serif"; ctx.fillStyle = '#8d9ab0';
  ctx.fillText(T('night') + ' ' + G.night + (G.weather !== 'calm' ? '  ·  ' + T('w_' + G.weather) : ''), W / 2, pad + 2);
  const done = G.saved % NIGHT_GOAL, segW = 14, gap = 4, x0 = W / 2 - (NIGHT_GOAL * segW + (NIGHT_GOAL - 1) * gap) / 2;
  for (let i = 0; i < NIGHT_GOAL; i++) { ctx.fillStyle = i < done ? '#f0b24a' : 'rgba(141,154,176,0.3)'; ctx.fillRect(x0 + i * (segW + gap), pad + 24, segW, 2); }
  const ml = maxLives();
  for (let i = 0; i < ml; i++) {
    const x = W - pad - 8 - i * 22, y = pad + 10, on = i < G.lives;
    if (on) { const g = ctx.createRadialGradient(x, y, 0, x, y, 12); g.addColorStop(0, 'rgba(255,200,110,0.5)'); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU);
    if (on) { ctx.fillStyle = '#f0b24a'; ctx.fill(); } else { ctx.strokeStyle = 'rgba(141,154,176,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
  }
  const cx = pad + 16, cy = H - pad - 16;
  ctx.strokeStyle = 'rgba(141,154,176,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, TAU); ctx.stroke();
  const L = 4 + Math.min(9, G.current.m / (3 * S)), ax = Math.cos(G.current.a), ay = Math.sin(G.current.a);
  ctx.strokeStyle = '#8d9ab0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - ax * L, cy - ay * L); ctx.lineTo(cx + ax * L, cy + ay * L); ctx.stroke();
  ctx.fillStyle = '#ece6d4'; ctx.beginPath(); ctx.arc(cx + ax * L, cy + ay * L, 2, 0, TAU); ctx.fill();
  ctx.font = "400 10px 'IBM Plex Mono',monospace"; ctx.fillStyle = '#8d9ab0'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(T('drift').toUpperCase(), cx + 20, cy);
  ctx.textAlign = 'right';
  const pir = G.pirates.filter(p => p.state !== 'leave').length;
  let rx = W - pad;
  if (pir) { const txt = pir + ' ' + T('pirates').toUpperCase(); ctx.fillStyle = '#ff7a5c'; ctx.fillText(txt, rx, cy); rx -= ctx.measureText(txt).width + 14; ctx.fillStyle = '#8d9ab0'; }
  ctx.fillText(G.ships.length + ' ' + T('ships').toUpperCase(), rx, cy);
  const bt = buildText();
  if (bt) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(141,154,176,0.7)'; ctx.font = "400 9px 'IBM Plex Mono',monospace"; ctx.fillText(bt.toUpperCase(), W / 2, cy, W - 260); }
  if (G.hintT > 0 && G.state === 'play') {
    ctx.globalAlpha = Math.min(1, G.hintT); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'italic 500 ' + Math.round(17 * Math.min(S, 1.1)) + "px 'Cormorant Garamond',Georgia,serif"; ctx.fillStyle = '#ece6d4';
    ctx.fillText(T('hint'), W / 2, HARBOR.landY - 26 * S); ctx.globalAlpha = 1;
  }
  if (G.banner > 0) {
    const k = G.banner > 2.6 ? (3.2 - G.banner) / 0.6 : Math.min(1, G.banner / 0.9);
    const ease = 1 - Math.pow(1 - k, 3);
    ctx.globalAlpha = ease; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '500 ' + Math.round(46 * Math.min(S, 1.1)) + "px 'Cormorant Garamond',Georgia,serif"; ctx.fillStyle = '#ece6d4';
    ctx.fillText(G.bannerText, W / 2, H * 0.22 - (1 - ease) * 10);
    ctx.fillStyle = 'rgba(240,178,74,0.7)'; ctx.fillRect(W / 2 - 24 * ease, H * 0.22 + 22 * Math.min(S, 1.1), 48 * ease, 1);
    if (G.bannerSub) {
      ctx.font = 'italic 500 ' + Math.round(16 * Math.min(S, 1.1)) + "px 'Cormorant Garamond',Georgia,serif"; ctx.fillStyle = '#8d9ab0';
      wrapText(G.bannerSub, W / 2, H * 0.22 + 38 * Math.min(S, 1.1), Math.min(W - 40, 420), 20);
    }
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = 'alphabetic';
}
function wrapText(text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}
