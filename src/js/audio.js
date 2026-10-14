/* ---------- audio: effects (all synthesized, no assets) ---------- */
const AU = {
  ctx: null, master: null, muted: false, seaG: null, seaF: null,
  init() {
    if (this.ctx) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      const sat = this.ctx.createWaveShaper(); const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 1.25) / Math.tanh(1.25); }
      sat.curve = curve; sat.oversample = '2x';
      const lim = this.ctx.createDynamicsCompressor(); lim.threshold.value = -5; lim.knee.value = 2; lim.ratio.value = 16; lim.attack.value = 0.002; lim.release.value = 0.12;
      this.master.connect(lim); lim.connect(sat); sat.connect(this.ctx.destination);
      this.sea();
      [[2.5, true], [0.5, false], [4, false], [0.4, false]].forEach(([sec, br]) => this.noiseBuffer(sec, br));   // warm the cache now, not mid-storm
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.6; try { localStorage.setItem('lightkeeper.mute', m ? '1' : '0'); } catch (e) {} },
  noiseBuffer(seconds, brown) {
    const key = seconds + (brown ? 'b' : 'w'); this.noiseCache = this.noiseCache || {};
    if (this.noiseCache[key]) return this.noiseCache[key];
    const c = this.ctx, len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    this.noiseCache[key] = buf; return buf;
  },
  sea() {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuffer(3, true); src.loop = true;
    this.seaF = c.createBiquadFilter(); this.seaF.type = 'lowpass'; this.seaF.frequency.value = 420;
    this.seaG = c.createGain(); this.seaG.gain.value = 0.22;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.11;
    const lg = c.createGain(); lg.gain.value = 0.1;
    lfo.connect(lg); lg.connect(this.seaG.gain); lfo.start();
    src.connect(this.seaF); this.seaF.connect(this.seaG); this.seaG.connect(this.master); src.start();
  },
  tone(freq, dur, type, vol, delay, slideTo) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  },
  bell(k) { const f = 880 / Math.sqrt(k || 1); this.tone(f, 0.9, 'sine', 0.25); this.tone(f * 1.5, 1.2, 'sine', 0.18, 0.12); this.tone(f * 2, 0.6, 'triangle', 0.05, 0.12); },
  clean() { this.tone(1046, 0.5, 'sine', 0.12, 0.35); this.tone(1568, 0.8, 'sine', 0.12, 0.45); },
  relit() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 1.0, 'sine', 0.14, i * 0.12)); },
  upgrade() { [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.8, 'triangle', 0.1, i * 0.08)); },
  lit() { this.tone(1400, 0.08, 'triangle', 0.035); },
  reveal() { this.tone(220, 0.25, 'sawtooth', 0.06, 0, 160); this.tone(330, 0.3, 'square', 0.02, 0.05, 250); },
  plunder() { this.tone(160, 0.35, 'sawtooth', 0.2, 0, 90); this.tone(120, 0.5, 'sawtooth', 0.2, 0.25, 60); },
  wreck(k) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime, big = k || 1;
    const s = c.createBufferSource(); s.buffer = this.noiseBuffer(0.5 * big, false);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(1800, t0); f.frequency.exponentialRampToValueAtTime(120, t0 + 0.5 * big);
    const g = c.createGain(); g.gain.setValueAtTime(0.5, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5 * big);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t0);
    this.tone(70 / Math.sqrt(big), 0.6 * big, 'sine', 0.5, 0, 35 / Math.sqrt(big));
  },
  thunder(delay) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuffer(2.5, true);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t0); f.frequency.exponentialRampToValueAtTime(90, t0 + 2.2);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t0); s.stop(t0 + 2.5);
  },
  horn() {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 320;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.25);
    g.gain.setValueAtTime(0.35, t0 + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
    [98, 196.5, 147].forEach(fr => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(t0); o.stop(t0 + 1.7); });
    f.connect(g); g.connect(this.master);
  },
  weather(storm) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.seaG.gain.setTargetAtTime(0.22 + 0.13 * storm, t, 1.5);
    this.seaF.frequency.setTargetAtTime(420 + 500 * storm, t, 1.5);
  }
};
try { AU.muted = localStorage.getItem('lightkeeper.mute') === '1'; } catch (e) {}
