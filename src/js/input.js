/* ---------- input ---------- */
const keys = { left: false, right: false };
function aimAt(cx, cy) {
  const x = cx - canvasRect.left, y = cy - canvasRect.top;
  if (dist(x, y, LH.x, LH.y) < 6) return;
  G.beam.target = Math.atan2(y - LH.y, x - LH.x);
}
let pointerDown = false;
canvas.addEventListener('pointerdown', e => { pointerDown = true; if (G.state === 'play') aimAt(e.clientX, e.clientY); AU.resume(); });
canvas.addEventListener('pointermove', e => { if (G.state !== 'play') return; if (e.pointerType === 'mouse' || pointerDown) aimAt(e.clientX, e.clientY); });
window.addEventListener('pointerup', () => { pointerDown = false; });
window.addEventListener('pointercancel', () => { pointerDown = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; e.preventDefault(); }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; e.preventDefault(); }
  if (e.repeat) return; // one-shot actions below ignore key auto-repeat
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (G.state === 'play') pause(); else if (G.state === 'paused') unpause(); }
  if (G.state === 'dawn' && e.key >= '1' && e.key <= '4') { const k = G.offer[+e.key - 1]; if (k) buyUpgrade(k); }
  if (G.state === 'dawn' && (e.key === 'Enter' || e.key === ' ') && !(e.target && e.target.classList && e.target.classList.contains('card'))) { e.preventDefault(); continueNight(); }
  if (e.key === 'Escape' && !logEl.hidden) closeLog();
  if (e.key === 'Escape' && !fleetEl.hidden) closeFleet();
  if ((e.key === 'Enter' || e.key === ' ') && (G.state === 'title' || G.state === 'over') && logEl.hidden && fleetEl.hidden && !(e.target && e.target.tagName === 'BUTTON')) { e.preventDefault(); startGame(); }
});
window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});
function quitToTitle() {
  if ((G.state === 'play' || G.state === 'paused' || G.state === 'dawn') && G.lives > 0) saveRun(G.state === 'dawn' ? G.night + 1 : G.night);
  G.state = 'title';
  pauseEl.hidden = true; overEl.hidden = true; dawnEl.hidden = true; logEl.hidden = true; titleEl.hidden = false;
  G.rocks = []; G.debris = []; G.pirates = []; G.parts = []; G.texts = []; G.ripples = []; G.pieces = []; G.smoke = [];
  for (const k in UPG) G.up[k] = 0;
  G.weather = 'calm'; G.stormK = 0; G.fogK = 0; G.bolt = null; G.white = 0; G.flash = 0; G.banner = 0; G.shake = 0; G.beamRange = DIAG * 0.52;
  keys.left = keys.right = false;
  demoFleet(); MU.stop(); AU.resume();
  document.getElementById('bestTitle').textContent = G.best;
  document.getElementById('bestNight').textContent = G.bestNight;
  renderMeta(); refreshResume(); startBtn.focus();
}
function pause() { if (G.state !== 'play') return; G.state = 'paused'; pauseEl.hidden = false; resumeBtn.focus(); AU.suspend(); }
function unpause() { if (G.state !== 'paused') return; G.state = 'play'; pauseEl.hidden = true; keys.left = keys.right = false; last = performance.now(); AU.resume(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); AU.suspend(); } else if (G.state !== 'paused') AU.resume(); });
window.addEventListener('blur', () => { keys.left = keys.right = false; });

startBtn.addEventListener('click', () => startGame());
const resumeRunBtn = document.getElementById('resumeRunBtn');
function refreshResume() { const r = loadRun(); resumeRunBtn.hidden = !r; if (r) resumeRunBtn.textContent = T('resumeRun') + ' ' + r.night; }
resumeRunBtn.addEventListener('click', () => { const r = loadRun(); if (r) startGame(r); });
document.getElementById('contBtn').addEventListener('click', continueNight);
const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.addEventListener('click', () => pause());
document.getElementById('quitBtn').addEventListener('click', quitToTitle);
document.getElementById('menuBtn').addEventListener('click', quitToTitle);
/* the fleet tab: each ship is drawn once on the main canvas and copied onto its card */
let fleetFrom = null;
function renderFleet() {
  const box = document.getElementById('fleetCards'); box.innerHTML = '';
  const entries = Object.keys(TYPES).map(k => ({ k, name: T('s_' + k), trait: T('f_' + k), meta: TYPES[k].score + ' ' + T('pts') + ' \u00b7 ' + TYPES[k].oil + ' ' + T('oil') + (TYPES[k].minNight > 1 ? ' \u00b7 ' + T('fromNight') + ' ' + TYPES[k].minNight : '') }))
    .concat([{ k: 'pirate', name: T('s_pirate'), trait: T('f_pirate'), meta: T('fromNight') + ' 4' }]);
  const cw = 120, ch = 64, cx = Math.min(W, 200), cy = Math.min(H, 200);
  for (const e of entries) {
    const card = document.createElement('div'); card.className = 'card';
    const cv = document.createElement('canvas'); cv.width = cw * DPR; cv.height = ch * DPR;
    // paint the model into a corner of the game canvas, copy it out, then let the next frame repaint the game
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#0c2039'; ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
    const saveS = S; S = 1.2;
    if (e.k === 'pirate') drawPirate({ x: cx, y: cy, h: -0.35, k: 1.1, vis: 1, bob: 0, label: 0, wake: [] });
    else { const s = makeShip(e.k, cx, cy, -0.35); s.lit = true; drawShip(s); }
    S = saveS; ctx.restore();
    cv.getContext('2d').drawImage(canvas, (cx - cw / 2) * DPR, (cy - ch / 2) * DPR, cw * DPR, ch * DPR, 0, 0, cw * DPR, ch * DPR);
    card.appendChild(cv);
    card.insertAdjacentHTML('beforeend', '<b>' + e.name + '</b><p>' + e.trait + '</p><span class="meta">' + e.meta + '</span>');
    box.appendChild(card);
  }
}
const fleetEl = document.getElementById('fleet');
function openFleet() { renderFleet(); fleetFrom = [titleEl, overEl].find(el => !el.hidden) || null; if (fleetFrom) fleetFrom.hidden = true; fleetEl.hidden = false; document.getElementById('fleetClose').focus(); }
function closeFleet() { fleetEl.hidden = true; if (fleetFrom) { fleetFrom.hidden = false; fleetFrom = null; } }
document.getElementById('fleetBtn').addEventListener('click', openFleet);
document.getElementById('fleetClose').addEventListener('click', closeFleet);
let logFrom = null;
function openLog() { renderMeta(); logFrom = [titleEl, overEl].find(el => !el.hidden) || null; if (logFrom) logFrom.hidden = true; logEl.hidden = false; document.getElementById('logClose').focus(); }
function closeLog() { logEl.hidden = true; if (logFrom) { logFrom.hidden = false; logFrom = null; } }
document.getElementById('logClose').addEventListener('click', closeLog);
for (const id of ['logBtn', 'logBtn2']) document.getElementById(id).addEventListener('click', openLog);
againBtn.addEventListener('click', () => startGame());
resumeBtn.addEventListener('click', unpause);
langBtn.addEventListener('click', () => { lang = lang === 'pl' ? 'en' : 'pl'; try { localStorage.setItem('lightkeeper.lang', lang); } catch (e) {} applyLang(); });
soundBtn.addEventListener('click', () => { AU.setMuted(!AU.muted); soundBtn.setAttribute('aria-pressed', AU.muted ? 'false' : 'true'); applyLang(); AU.init(); AU.resume(); });
soundBtn.setAttribute('aria-pressed', AU.muted ? 'false' : 'true');
if (document.fullscreenEnabled && stage.requestFullscreen) {
  fsBtn.hidden = false;
  fsBtn.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else stage.requestFullscreen().catch(() => {}); });
}

/* ---------- loop ---------- */
let last = performance.now();
let lastErr = '';
function reportError(e) {
  const msg = String((e && e.message) || e), where = ((e && e.stack) || '').split('\n').slice(0, 2).join(' ');
  if (msg === lastErr) return; lastErr = msg;
  try { localStorage.setItem('lightkeeper.lastError', msg + ' | ' + where); } catch (x) {}
  const el = document.getElementById('errNote'); if (el) { el.textContent = 'Error: ' + msg + ' ' + where; el.hidden = false; }
}
window.addEventListener('error', ev => reportError(ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => reportError(ev.reason));
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
  if (!seaImg) { resize(); if (!seaImg) { requestAnimationFrame(frame); return; } } // nothing to draw into yet
  try {
    if (G.state !== 'paused' && G.state !== 'dawn') update(dt);
    draw();
  } catch (e) { reportError(e); }
  const showPause = G.state === 'play';
  if (pauseBtn.hidden === showPause) pauseBtn.hidden = !showPause;
  watchFrameTime(raw);
  requestAnimationFrame(frame);
}
window.addEventListener('resize', queueResize);
document.getElementById('bestTitle').textContent = G.best;
document.getElementById('bestNight').textContent = G.bestNight;
applyLang();
renderMeta();
refreshResume();
resize();
requestAnimationFrame(frame);
