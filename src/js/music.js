/* ---------- audio: generative music ----------
   Ambient house. A sixteenth-note scheduler with a little swing; the kick, hats, clap, octave bass, chord stabs
   with a dub delay and an arpeggio come in one by one as a smoothed intensity (built from the state of the sea)
   rises. The pad pumps under every kick. Harmony follows the mood (calm, tense, storm, fog). D minor. */
const MU = {
  on: false, bus: null, padF: null, pumpG: null, dly: null, dlyIn: null, tensG: null, windG: null, pirG: null, pirOsc: null, timer: null, persist: [],
  bpm: 100, beat: 0, nextT: 0, chord: 0, chordLen: 8, mood: 'calm', transpose: 0,
  I: { ships: 0, danger: 0, storm: 0, fog: 0, pirate: 0, lives: 3, night: 1, streak: 0, calm: 0 },
  lvl: 0, lvlLock: null,                   // lvlLock pins the intensity (used by the mixer page)
  on4: false, dropAt: -1, outAt: -1, motif: [], stabPat: 0, crackleG: null,
  leadVoice: 'lead', lastLead: 0,           // 'lead' | 'chords' | 'glide' | 'keys' | 'off'
  mix: { pad: 1, bass: 1, kick: 1, hats: 1, clap: 1, stab: 1, arp: 1, lead: 1, delay: 1, tension: 1, wind: 1, pirate: 1 },
  PROGS: {
    calm:  [[62, 65, 69, 72], [55, 58, 62, 65], [62, 65, 69, 72], [57, 61, 64, 67]],   // Dm7 Gm7 Dm7 A: the one progression of the watch
    tense: [[62, 65, 69, 72], [55, 58, 62, 65], [62, 65, 69, 72], [57, 61, 64, 67]],   // same chords, played harder
    storm: [[62, 65, 69, 72], [63, 67, 70, 75], [62, 65, 69, 72], [57, 61, 64, 67]],   // the second chord becomes Eb
    fog:   [[62, 64, 69, 74], [55, 57, 62, 67], [62, 64, 69, 74], [57, 59, 64, 69]]    // the same chords as sus2 voicings
  },
  BASS: { calm: [38, 43, 38, 45], tense: [38, 43, 38, 45], storm: [38, 39, 38, 45], fog: [38, 43, 38, 45] },
  PENTA: [50, 53, 55, 57, 60, 62, 65, 67, 69, 72],   // D minor pentatonic for the riff
  SCALE: [62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79, 81, 82],
  STABS: [[2], [1, 3], [2], [1, 2, 3]],   // sixteenth slots that may carry a chord stab, per beat of the bar
  ARP8: [[0, 0], [0, 1], [2, 0], [0, 1], [1, 0], [0, 1], [2, 0], [3, 0]],                     // eighth-note arp: root bouncing against its octave
  ARP16: [[0, 0], [0, 1], [2, 0], [0, 1], [1, 0], [0, 1], [2, 0], [1, 1], [0, 0], [0, 1], [2, 0], [3, 0], [1, 0], [0, 1], [2, 0], [0, 1]],   // sixteenth version
  start() {
    if (!AU.ctx || this.on) return;
    const c = AU.ctx, t = c.currentTime;
    this.on = true; this.persist = [];
    this.bus = c.createGain(); this.bus.gain.setValueAtTime(0.0001, t); this.bus.gain.exponentialRampToValueAtTime(0.5, t + 3);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.16;
    this.bus.connect(comp); comp.connect(AU.master);
    // space: a synthesized stereo hall (2.2 s), fed by sends from the melodic layers and the percussion
    this.rev = c.createConvolver(); this.rev.buffer = this.makeIR(2.2);
    this.revG = c.createGain(); this.revG.gain.value = 0.36; this.rev.connect(this.revG); this.revG.connect(this.bus);
    // pad and stabs go through a gain that ducks under every kick, then a light chorus
    this.pumpG = c.createGain(); this.pumpG.gain.value = 1;
    const chD = c.createDelay(0.05); chD.delayTime.value = 0.018; const chL = c.createOscillator(); chL.frequency.value = 0.35; const chLg = c.createGain(); chLg.gain.value = 0.004; chL.connect(chLg); chLg.connect(chD.delayTime); chL.start(); this.persist.push(chL);
    const chM = c.createGain(); chM.gain.value = 0.45; this.pumpG.connect(chD); chD.connect(chM); chM.connect(this.bus); this.pumpG.connect(this.bus);
    this.toRev(this.pumpG, 0.35);
    this.pumpB = c.createGain(); this.pumpB.gain.value = 1; this.pumpB.connect(this.bus);   // bass: pumped, no chorus
    this.padF = c.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.frequency.value = 420; this.padF.Q.value = 0.8;
    const padHp = c.createBiquadFilter(); padHp.type = 'highpass'; padHp.frequency.value = 110; this.padF.connect(padHp); padHp.connect(this.pumpG);
    // dub delay: dotted eighth, filtered feedback
    this.dlyIn = c.createGain(); this.dlyIn.gain.value = 1;
    this.dly = c.createDelay(1.5); this.dly.delayTime.value = 60 / 122 * 0.75;   // a dotted eighth, fixed so echoes never bend
    const fb = c.createGain(); fb.gain.value = 0.38; const fbF = c.createBiquadFilter(); fbF.type = 'lowpass'; fbF.frequency.value = 2400;
    const wet = c.createGain(); wet.gain.value = 0.6 * this.mix.delay; this.wet = wet;
    this.dlyIn.connect(this.dly); this.dly.connect(fbF); fbF.connect(fb); fb.connect(this.dly); this.dly.connect(wet); wet.connect(this.bus);
    // tension: a tremolo string two octaves up
    this.tensG = c.createGain(); this.tensG.gain.value = 0.0001; this.tensG.connect(this.bus);
    const bp = c.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 700; bp.Q.value = 1.5;
    const trem = c.createGain(); trem.gain.value = 0.5;
    const lfo = c.createOscillator(); lfo.frequency.value = 3.2; const lg = c.createGain(); lg.gain.value = 0.3; lfo.connect(lg); lg.connect(trem.gain); lfo.start(); this.persist.push(lfo);
    [0, 7].forEach(det => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(69); o.detune.value = det; o.connect(bp); o.start(); this.persist.push(o); });
    bp.connect(trem); trem.connect(this.tensG);
    // pirate ostinato: a low sawtooth alternating D and Eb, hidden until pirates close in
    this.pirG = c.createGain(); this.pirG.gain.value = 0.0001; this.pirG.connect(this.bus);
    const pf = c.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 320;
    this.pirOsc = c.createOscillator(); this.pirOsc.type = 'sawtooth'; this.pirOsc.frequency.value = mtof(38); this.pirOsc.connect(pf); pf.connect(this.pirG); this.pirOsc.start(); this.persist.push(this.pirOsc);
    // wind for storms
    this.windG = c.createGain(); this.windG.gain.value = 0.0001; this.windG.connect(this.bus);
    const ws = c.createBufferSource(); ws.buffer = AU.noiseBuffer(4, false); ws.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 700; wf.Q.value = 1.8;
    const wl = c.createOscillator(); wl.frequency.value = 0.17; const wlg = c.createGain(); wlg.gain.value = 420; wl.connect(wlg); wlg.connect(wf.frequency); wl.start();
    ws.connect(wf); wf.connect(this.windG); ws.start(); this.persist.push(ws, wl);
    // texture: a quiet vinyl crackle under the calm passages
    const cr = c.createBufferSource(); const clen = c.sampleRate * 2, cbuf = c.createBuffer(1, clen, c.sampleRate), cd = cbuf.getChannelData(0);
    for (let i = 0; i < clen; i++) cd[i] = Math.random() < 0.0015 ? (Math.random() * 2 - 1) * Math.random() : (Math.random() * 2 - 1) * 0.015;
    cr.buffer = cbuf; cr.loop = true; const ch = c.createBiquadFilter(); ch.type = 'highpass'; ch.frequency.value = 1500;
    this.crackleG = c.createGain(); this.crackleG.gain.value = 0.0001; cr.connect(ch); ch.connect(this.crackleG); this.crackleG.connect(this.bus); cr.start(); this.persist.push(cr);
    // the pad breathes: slow sweeps on its filter and tuning
    const fl = c.createOscillator(); fl.frequency.value = 0.07; const flg = c.createGain(); flg.gain.value = 110; fl.connect(flg); flg.connect(this.padF.frequency); fl.start(); this.persist.push(fl);
    this.beat = 0; this.chord = 0; this.chordLen = 8; this.mood = 'calm'; this.lvl = 0; this.bpm = 100; this.nextT = t + 0.2;
    this.on4 = false; this.dropAt = -1; this.outAt = -1; this.motif = this.makeMotif(); this.stabPat = 0;
    this.timer = setInterval(() => this.tick(), 80);
  },
  stop() {
    if (!this.on) return;
    this.on = false; clearInterval(this.timer);
    const c = AU.ctx, t = c.currentTime, bus = this.bus, persist = this.persist;
    bus.gain.setTargetAtTime(0.0001, t, 2.5);
    setTimeout(() => { persist.forEach(nd => { try { nd.stop(); } catch (e) {} }); try { bus.disconnect(); } catch (e) {} }, 10000);
    [50, 57, 62, 65].forEach(m => this.padNote(m, t + 0.1, 5, 0.06));
  },
  note(m) { return mtof(m + this.transpose); },
  makeIR(seconds) {
    const c = AU.ctx, len = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(2, len, c.sampleRate), pre = Math.floor(c.sampleRate * 0.028);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      for (let i = pre; i < len; i++) { const k = (i - pre) / (len - pre); lp = lp * 0.72 + (Math.random() * 2 - 1) * 0.28; d[i] = lp * Math.pow(1 - k, 2.6) * (1 - 0.5 * k); }
    }
    return buf;
  },
  toRev(node, amount) { const g = AU.ctx.createGain(); g.gain.value = amount; node.connect(g); g.connect(this.rev); return g; },
  pan(node, x) { const c = AU.ctx; if (!c.createStereoPanner) { node.connect(this.bus); return node; } const p = c.createStereoPanner(); p.pan.value = x; node.connect(p); p.connect(this.bus); return p; },
  /* the game reports the state of the sea 4 times a second */
  set(I) {
    Object.assign(this.I, I);
    if (!this.on) return;
    const t = AU.ctx.currentTime;
    this.tensG.gain.setTargetAtTime(0.0001 + 0.045 * I.danger * this.mix.tension, t, 1.0);
    this.windG.gain.setTargetAtTime(0.0001 + 0.18 * I.storm * this.mix.wind, t, 1.5);
    this.pirG.gain.setTargetAtTime(0.0001 + 0.14 * I.pirate * this.mix.pirate, t, 0.8);
    if (this.wet) this.wet.gain.setTargetAtTime(0.6 * this.mix.delay, t, 0.2);
    this.transpose = 0;
  },
  target() {
    const I = this.I;
    // the night sets the floor: early nights stay ambient unless something goes wrong, late nights are house all night
    const nk = clamp((I.night - 1) / 8, 0, 1);
    let v = 0.06 + 0.52 * nk + I.ships * 0.03 + I.danger * (0.5 - 0.2 * nk) + I.storm * 0.25 + I.pirate * 0.35 + (I.lives === 1 ? 0.15 : 0);
    if (I.calm) v = Math.max(v * 0.4, 0.35 * nk);
    return clamp(v, 0, 1);
  },
  tick() {
    const c = AU.ctx;
    if (this.nextT < c.currentTime - 0.5) this.nextT = c.currentTime + 0.05; // skip what a hidden tab missed
    while (this.nextT < c.currentTime + 0.35) {
      const tg = this.target(); this.lvl += (tg - this.lvl) * (tg > this.lvl ? 0.06 : 0.02);
      if (this.lvlLock !== null) this.lvl = this.lvlLock;
      this.schedule(this.nextT, this.beat);
      this.bpm = 122;   // one tempo for the whole watch: the stages differ in density, never in grid
      this.nextT += 15 / this.bpm; this.beat += 0.25;
    }
  },
  pickMood() {
    const I = this.I;
    if (I.storm > 0.5) return 'storm';
    if (I.fog > 0.5) return 'fog';
    if (this.lvl > 0.5 || I.pirate > 0.4) return 'tense';
    return 'calm';
  },
  /* a two-bar house hook: one of a few syncopated rhythm templates, a small set of three pitches that mostly repeat
     with one leap, and a second bar that answers the first by changing its tail */
  HOOKS: [[0, 6, 10, 14], [0, 3, 6, 8, 11], [2, 6, 10, 12], [0, 4, 6, 10, 12], [0, 2, 6, 8, 10, 14]],
  makeMotif() {
    const rhythm = this.HOOKS[Math.floor(Math.random() * this.HOOKS.length)];
    const base = 5 + Math.floor(Math.random() * 3);                      // D, F or G in the mid register
    const set = [this.PENTA[base], this.PENTA[base + (Math.random() < 0.5 ? 1 : 2)], this.PENTA[Math.min(this.PENTA.length - 1, base + (Math.random() < 0.5 ? 3 : 4))]];
    const seq = [0, 0, 1, 0, 2, 0, 1, 1];                                  // mostly the home note, one leap
    const bar1 = rhythm.map((at, i) => ({ at, m: set[seq[i % seq.length]], len: i === rhythm.length - 1 ? 3 : 2 }));
    const bar2 = bar1.map((e, i) => ({ at: e.at + 16, m: i >= bar1.length - 2 ? set[(seq[i % seq.length] + 1) % 3] : e.m, len: e.len }));
    return bar1.concat(bar2);
  },
  mutateMotif() {
    const nk = clamp((this.I.night - 1) / 8, 0, 1);   // late nights repeat the hook almost unchanged: hypnotic
    for (const e of this.motif) if (Math.random() < 0.1 * (1 - 0.7 * nk)) { const i = this.PENTA.indexOf(e.m); e.m = this.PENTA[clamp(i + (Math.random() < 0.5 ? -1 : 1), 2, this.PENTA.length - 1)]; }
    if (Math.random() < 0.2 * (1 - 0.7 * nk)) this.motif = this.makeMotif();
  },
  schedule(t0, beat) {
    const I = this.I, lvl = this.lvl, bd = 60 / this.bpm;
    const sub = Math.round((beat % 1) * 4), onBeat = sub === 0, off8 = sub === 2, barBeat = Math.floor(beat % 4), bar = onBeat && barBeat === 0;
    const t = t0 + (sub % 2 === 1 ? bd * 0.055 : 0); // a little swing on the odd sixteenths
    // three stages: calm (lvl < 0.3), dark (0.3 .. 0.5 and the build), house (after the drop)
    const dark = clamp((lvl - 0.3) / 0.2, 0, 1), groove = clamp((lvl - 0.5) / 0.4, 0, 1);
    if (bar) {
      if (!this.on4 && this.dropAt < 0 && lvl > 0.5) { this.dropAt = beat + 8; this.riser(t, bd * 8); this.padF.frequency.setTargetAtTime(1900, t, bd * 4); }
      if (this.dropAt >= 0 && lvl < 0.4) this.dropAt = -1;            // the danger passed before the drop
      if (this.dropAt >= 0 && beat >= this.dropAt) {                   // the drop
        this.dropAt = -1; this.on4 = true; this.barsOn = 0;
        this.hat(t, 0.1, 1.0); this.kick(t, 0.5, 130); this.stab(this.PROGS[this.mood][this.chord], t, 0.11, 0.6);
      } else if (this.on4) this.barsOn = (this.barsOn || 0) + 1;
      if (this.on4 && this.outAt < 0 && lvl < 0.3 && this.dropAt < 0) { this.outAt = beat + 8; this.padF.frequency.setTargetAtTime(400, t, bd * 4); }   // two bars of outro
      if (this.outAt >= 0 && lvl >= 0.4) this.outAt = -1;                                                                         // the danger came back
      if (this.outAt >= 0 && beat >= this.outAt) { this.outAt = -1; this.on4 = false; }
    }
    const building = this.dropAt >= 0, on4 = this.on4, outro = this.outAt >= 0;
    const stage = on4 ? 'house' : lvl < 0.3 && !building ? 'calm' : 'dark';
    if (beat % this.chordLen === 0) {
      if (beat > 0) this.chord = (this.chord + 1) % 4;
      if (this.chord === 0) { this.mood = this.pickMood(); this.chordLen = on4 ? 4 : 8; this.mutateMotif(); this.stabPat = Math.floor(Math.random() * this.STABS.length); }
      const ch = this.PROGS[this.mood][this.chord];
      ch.slice(0, 3).forEach(m => this.padNote(m, t, bd * this.chordLen, 0.05, 4 + 3 * I.storm));
      if (stage === 'dark') this.padNote(46, t, bd * this.chordLen, 0.02 + 0.03 * dark, 2);   // a low Bb under the D minor: dark, not sour
      this.crackleG.gain.setTargetAtTime(0.0001 + (stage === 'calm' ? 0.05 : stage === 'dark' ? 0.02 : 0), t, 1);
      if (this.mood === 'fog' && this.chord % 2 === 0) this.padNote(45, t, bd * this.chordLen * 1.5, 0.08, 2);
    }
    const ch = this.PROGS[this.mood][this.chord], root = this.BASS[this.mood][this.chord];
    const pos = Math.round(beat * 4) % 32;
    if (onBeat) { // the pad's colour and the loudness glide with the intensity every beat, so no stage change is a step
      if (!building) this.padF.frequency.setTargetAtTime(stage === 'calm' ? 650 + 400 * (lvl / 0.3) : stage === 'dark' ? 650 - 350 * dark : 400 + 900 * groove, t, 1.5);
      this.bus.gain.setTargetAtTime(0.32 + 0.34 * lvl, t, 1.5);
    }
    // ---- calm: a sustained sub, now and then a lone piano note from the hook ----
    if (stage === 'calm') {
      if (onBeat && beat % 8 === 0) this.bassNote(this.note(root), t, bd * 7.6, 0.12);
      if (pos === 0 && Math.floor(beat / 32) % 2 === 0 && I.ships >= 1 && !I.calm && Math.random() < 0.7) this.lead(this.note(this.fit(this.motif[0].m, ch)), t, bd * 6, 0.045 + 0.03 * lvl);
    }
    // ---- dark: a muffled pulse, the sub, the hook from under water, then the build ----
    if (stage === 'dark') {
      if (onBeat && barBeat % 2 === 0 && !building) this.kick(t, 0.06 + 0.14 * dark, 70);
      if (onBeat && beat % 8 === 0) this.bassNote(this.note(root), t, bd * 7.6, 0.12 + 0.06 * dark);
      if (!building && !I.calm) { for (const e of this.motif) if (e.at === pos && e.at < 12) this.lead(this.note(this.fit(e.m, ch) - 12), t, bd * 2, 0.03 + 0.04 * dark, 420 + 500 * dark); }
      if (building) {
        if (off8) this.hat(t, 0.03 + 0.04 * dark, 0.07);
        const left = this.dropAt - beat;
        if (left <= 4 && (sub === 0 || sub === 2 || (left <= 2 && sub % 1 === 0) || left <= 1)) this.clap(t, 0.03 + 0.09 * (1 - left / 4));
        if (left <= 2 && onBeat) this.kick(t, 0.2, 90);
      }
    }
    // ---- house ----
    if (stage === 'house') {
      const fillBar = this.barsOn % 8 === 7, fill = fillBar && barBeat >= 2 && !outro;          // every eighth bar the kick steps out for two beats
      if (onBeat && !fill && (!outro || barBeat % 2 === 0)) { this.kick(t, outro ? 0.14 : 0.15 + 0.28 * groove, 95 + 25 * groove); this.pump(t, bd, outro ? 0.25 : 0.3 + 0.7 * groove); }
      if (outro) { if (onBeat) this.bassPluck(this.note(root), t, bd * 0.45, 0.12); if (onBeat) this.pirOsc.frequency.setValueAtTime(this.note(38 + (beat % 2 ? 1 : 0)), t); return; }
      if (fill) { if (sub % 2 === 0 || barBeat === 3) this.clap(t, 0.04 + 0.1 * ((barBeat - 2) * 4 + sub) / 8); }
      if (off8) this.hat(t, 0.02 + 0.05 * groove, 0.07);
      if (sub % 2 === 1 && groove > 0.5) this.hat(t, 0.015 + 0.03 * (groove - 0.5), 0.04);
      if (sub % 2 === 1 && groove > 0.8) this.shaker(t, 0.02 + 0.03 * (groove - 0.8));
      if (off8 && barBeat === 3 && this.barsOn % 2 === 1) this.tom(t, 0.12 + 0.1 * groove);   // a low tom on the and of four, every other bar
      if (off8 && barBeat % 2 === 1 && groove > 0.3) this.hat(t, 0.045, 0.28);   // open hat on the and of 2 and 4
      if (onBeat && barBeat % 2 === 1 && groove > 0.4 && !fill) this.clap(t, 0.035 + 0.08 * (groove - 0.4));
      if (bar && this.barsOn % 8 === 0 && this.barsOn > 0) this.hat(t, 0.09, 0.9);   // back in with a crash
      // bass: root on the beat, octave on the offbeat
      if (onBeat) this.bassPluck(this.note(root), t, bd * 0.45, 0.12 + 0.14 * groove);
      if (off8 && groove > 0.2) this.bassPluck(this.note(root + 12), t, bd * 0.3, 0.06 + 0.1 * groove);
      if (sub === 3 && barBeat % 2 === 1 && groove > 0.7) this.bassPluck(this.note(root + 7), t, bd * 0.2, 0.07);
      // the hook: by default the stab voice as moving chords under the melody; the pattern stabs fill in otherwise
      if (!I.calm && this.leadVoice !== 'off') { for (const e of this.motif) if (e.at === pos) this.hook(e, ch, t, bd, lvl); }
      if (this.leadVoice !== 'chords' && groove > 0.25 && this.STABS[(barBeat + this.stabPat) % 4].includes(sub)) this.stab(ch, t, 0.03 + 0.06 * groove);
      // arp: eighths bouncing the root against its octave, sixteenths once the groove is strong
      if (groove < 0.85) { if (sub === 0 || sub === 2) { const i = Math.round(beat * 2) % 8, [ci, oct] = this.ARP8[i]; this.arpNote(this.note(ch[Math.min(ci, ch.length - 1)] - 12 + 12 * oct), t, bd * 0.42, (0.02 + 0.03 * groove) * (i % 2 ? 0.8 : 1), groove); } }
      else { const i = Math.round(beat * 4) % 16, [ci, oct] = this.ARP16[i]; this.arpNote(this.note(ch[Math.min(ci, ch.length - 1)] - 12 + 12 * oct), t, bd * 0.22, (0.018 + 0.03 * groove) * (i % 4 === 0 ? 1.25 : i % 2 ? 0.75 : 1), groove); }
    }
    if (I.lives === 1 && off8) this.kick(t, 0.14, 80);           // the last lamp: a heartbeat under everything
    // pirate ostinato alternates a minor second every beat
    if (onBeat) this.pirOsc.frequency.setValueAtTime(this.note(38 + (beat % 2 ? 1 : 0)), t);
  },
  /* a pitch is pulled onto the nearest chord tone when it sits a semitone from one, so the riff never grinds against the harmony */
  fit(m, ch) {
    const pcs = ch.map(c => ((c % 12) + 12) % 12), pc = ((m % 12) + 12) % 12;
    if (pcs.includes(pc)) return m;
    if (pcs.includes((pc + 1) % 12)) return m + 1;
    if (pcs.includes((pc + 11) % 12)) return m - 1;
    return m;
  },
  /* one note of the hook in the selected voice; 'chords' plays it as a three-note stab voiced under the melody note */
  hook(e, ch, t, bd, lvl) {
    const v = this.leadVoice, vol = 0.045 + 0.04 * lvl, m = this.fit(e.m, ch);
    if (v === 'chords') {
      const top = m, below = [];
      for (let m = top - 1; m > top - 13 && below.length < 2; m--) if (ch.some(cm => (cm - m) % 12 === 0)) below.push(m);
      this.stab([top, ...below], t, 0.05 + 0.05 * lvl, bd * e.len / 4 * 1.2);
    }
    else if (v === 'keys') this.leadFM(this.note(m), t, bd * e.len / 4 * 1.4, vol * 1.1);
    else if (v === 'glide') this.leadGlide(this.note(m), t, bd * e.len / 4 * 1.5, vol);
    else this.leadNote(this.note(m + 12), t, bd * e.len / 4 * 1.3, vol * 1.5);
  },
  /* a filtered-noise riser over the build */
  riser(t, dur) {
    const c = AU.ctx;
    const s = c.createBufferSource(); s.buffer = AU.noiseBuffer(4, false);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(220, t); f.frequency.exponentialRampToValueAtTime(3800, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t); s.stop(t + dur + 0.1);
  },
  tom(t, vol) {
    const c = AU.ctx; vol *= this.mix.kick; if (vol <= 0) return;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.2);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g); this.pan(g, -0.25); o.start(t); o.stop(t + 0.35);
  },
  shaker(t, vol) {
    const c = AU.ctx; vol *= this.mix.hats; if (vol <= 0) return;
    const s = c.createBufferSource(); s.buffer = this.hatBuf || (this.hatBuf = AU.noiseBuffer(0.4, false));
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 1.5;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    s.connect(f); f.connect(g); this.pan(g, -0.35); s.start(t); s.stop(t + 0.09);
  },
  /* a wreck or a plundering: the pad chokes for a moment and a low cluster groans */
  hit() {
    if (!this.on) return;
    const t = AU.ctx.currentTime, f = this.padF.frequency;
    f.cancelScheduledValues(t); f.setValueAtTime(Math.max(100, f.value), t); f.exponentialRampToValueAtTime(140, t + 0.12); f.exponentialRampToValueAtTime(380 + 1100 * this.lvl, t + 2);
    [37, 38].forEach(m => this.padNote(m, t, 1.4, 0.09, 0));
  },
  /* dawn: a resolving major chord while the market is open */
  dawnCue() {
    if (!this.on) return;
    const t = AU.ctx.currentTime;
    [50, 57, 62, 64].forEach((m, i) => this.padNote(m, t + i * 0.15, 6, 0.05, 2));
  },
  pump(t, bd, lvl) {
    const depth = 0.3 + 0.45 * lvl;
    for (const g of [this.pumpG.gain, this.pumpB.gain]) { g.cancelScheduledValues(t); g.setValueAtTime(1 - depth, t); g.linearRampToValueAtTime(1 - depth * 0.35, t + bd * 0.2); g.linearRampToValueAtTime(1, t + bd * 0.7); }
  },
  padNote(m, t, dur, vol, detune) {
    const c = AU.ctx, det = detune === undefined ? 5 : detune; vol *= this.mix.pad; if (vol <= 0) return;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(2.4, dur * 0.4));
    g.gain.setValueAtTime(vol, t + Math.max(Math.min(2.5, dur * 0.5), dur - 0.5)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 3);
    g.connect(this.padF);
    // unison: three saws spread across the stereo field plus a triangle for body
    [[-det * 1.2, 'sawtooth', 0.32, -0.6], [0, 'sawtooth', 0.26, 0], [det * 1.2, 'sawtooth', 0.32, 0.6], [det * 0.3, 'triangle', 0.55, 0]].forEach(([d, type, k, px]) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = this.note(m); o.detune.value = d;
      const og = c.createGain(); og.gain.value = k; o.connect(og);
      if (c.createStereoPanner && px) { const pn = c.createStereoPanner(); pn.pan.value = px; og.connect(pn); pn.connect(g); } else og.connect(g);
      o.start(t); o.stop(t + dur + 3.2);
    });
  },
  bassNote(f, t, dur, vol) {
    const c = AU.ctx; vol *= this.mix.bass; if (vol <= 0) return;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2;
    const g = c.createGain(), g2 = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.4, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g2.gain.value = 0.18;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.bus); o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  },
  bassPluck(f, t, dur, vol) {
    const c = AU.ctx; vol *= this.mix.bass; if (vol <= 0) return;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f;
    const o3 = c.createOscillator(); o3.type = 'sawtooth'; o3.frequency.value = f; o3.detune.value = 9; const g3 = c.createGain(); g3.gain.value = 0.35 * this.lvl;   // a second, detuned saw thickens the bass as the night darkens
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 3.5; fl.frequency.setValueAtTime(700, t); fl.frequency.exponentialRampToValueAtTime(100, t + dur);
    const g = c.createGain(), g2 = c.createGain(); g2.gain.value = 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); o2.connect(g2); g2.connect(fl); o3.connect(g3); g3.connect(fl); fl.connect(g); g.connect(this.pumpB); o.start(t); o2.start(t); o3.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); o3.stop(t + dur + 0.05);
  },
  stab(ch, t, vol, len) {
    const c = AU.ctx; vol *= this.mix.stab; if (vol <= 0) return; const L = len || 0.3;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.2; fl.frequency.setValueAtTime(950, t); fl.frequency.exponentialRampToValueAtTime(300, t + L * 0.85);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * 1.4, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + L + 0.04);
    const send = c.createGain(); send.gain.value = 0.5;
    ch.slice(0, 3).forEach(m => [['sawtooth', 0.22], ['triangle', 1]].forEach(([type, k]) => { const o = c.createOscillator(); o.type = type; o.frequency.value = this.note(m); o.detune.value = type === 'sawtooth' ? -6 : 0; const og = c.createGain(); og.gain.value = k; o.connect(og); og.connect(fl); o.start(t); o.stop(t + L + 0.06); }));
    fl.connect(g); g.connect(this.pumpG); g.connect(send); send.connect(this.dlyIn);
  },
  /* house arp voice: the stab's recipe (triangle with a detuned saw and a sine below) as single plucked notes, pumped and echoed */
  arpNote(f, t, dur, vol, groove) {
    const c = AU.ctx; vol *= this.mix.arp; if (vol <= 0) return;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.3; fl.frequency.setValueAtTime(600 + 700 * groove, t); fl.frequency.exponentialRampToValueAtTime(300, t + dur + 0.08);
    [[0, 'triangle', 1, 1], [-7, 'sawtooth', 1, 0.3], [0, 'sine', 0.5, 0.3]].forEach(([det, type, mul, k]) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f * mul; o.detune.value = det;
      const og = c.createGain(); og.gain.value = k; o.connect(og); og.connect(fl); o.start(t); o.stop(t + dur + 0.3);
    });
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * 1.3, t + 0.008); g.gain.setValueAtTime(vol * 1.3, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    fl.connect(g); const ap = c.createStereoPanner ? c.createStereoPanner() : null; if (ap) { ap.pan.value = (this.arpSide = -(this.arpSide || 0.25)); g.connect(ap); ap.connect(this.pumpG); } else g.connect(this.pumpG);
    const sg = c.createGain(); sg.gain.value = 0.4; g.connect(sg); sg.connect(this.dlyIn);
  },
  pluck(f, t, vol, send) {
    const c = AU.ctx; vol *= this.mix.arp * (0.75 + Math.random() * 0.35); if (vol <= 0) return;
    t += (Math.random() - 0.5) * 0.014;                      // a little human timing
    const cut = 900 + Math.random() * 700;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 0.5; fl.frequency.setValueAtTime(cut, t); fl.frequency.exponentialRampToValueAtTime(cut * 0.35, t + 0.5);
    [[-5, 'triangle', 1], [5, 'triangle', 0.8], [0, 'sine', 0.5]].forEach(([det, type, k]) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      const og = c.createGain(); og.gain.value = k; o.connect(og); og.connect(fl); o.start(t); o.stop(t + 1.1);
    });
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    fl.connect(g); g.connect(this.bus); 
    const nz = c.createBufferSource(); nz.buffer = this.hatBuf || (this.hatBuf = AU.noiseBuffer(0.4, false));
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = f * 2; nf.Q.value = 2;
    const ng = c.createGain(); ng.gain.setValueAtTime(vol * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    nz.connect(nf); nf.connect(ng); ng.connect(this.bus); nz.start(t); nz.stop(t + 0.04);
    if (send) { const sg = c.createGain(); sg.gain.value = 0.45; g.connect(sg); sg.connect(this.dlyIn); }
  },
  /* the lead: one note of the hook, an octave above the stabs, in their voice but brighter and plucked, with its own mix level */
  leadNote(f, t, dur, vol) {
    const c = AU.ctx; vol *= this.mix.lead * (0.88 + Math.random() * 0.24); if (vol <= 0) return;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.3; fl.frequency.setValueAtTime(1800, t); fl.frequency.exponentialRampToValueAtTime(450, t + dur + 0.15);
    [['sawtooth', 0.3, -6], ['triangle', 1, 0], ['triangle', 0.35, -1200]].forEach(([type, k, det]) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; const og = c.createGain(); og.gain.value = k; o.connect(og); og.connect(fl); o.start(t); o.stop(t + dur + 0.5); });
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.setValueAtTime(vol, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    fl.connect(g); g.connect(this.pumpG);
    const sg = c.createGain(); sg.gain.value = 0.5; g.connect(sg); sg.connect(this.dlyIn);
  },
  /* the lone notes of the calm and dark stages: the stab's own voice, held long with a slow swell */
  lead(f, t, dur, vol, cutoff) {
    const c = AU.ctx; vol *= this.mix.lead * (0.85 + Math.random() * 0.3); if (vol <= 0) return;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.1; fl.frequency.setValueAtTime(Math.min(cutoff || 1100, 1100), t); fl.frequency.exponentialRampToValueAtTime(260, t + dur + 1);
    [['sawtooth', 0.22, -6], ['triangle', 1, 0], ['triangle', 0.4, 1200]].forEach(([type, k, det]) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; const og = c.createGain(); og.gain.value = k; o.connect(og); og.connect(fl); o.start(t); o.stop(t + dur + 1.6); });
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.6, dur * 0.3)); g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.5);
    fl.connect(g); g.connect(this.pumpG);
    const sg = c.createGain(); sg.gain.value = 0.45; g.connect(sg); sg.connect(this.dlyIn);
  },
  leadFM(f, t, dur, vol, cutoff) {
    const c = AU.ctx; vol *= this.mix.lead * (0.85 + Math.random() * 0.3); if (vol <= 0) return;
    const car = c.createOscillator(); car.type = 'sine'; car.frequency.value = f;
    const mod = c.createOscillator(); mod.type = 'sine'; mod.frequency.value = f;
    const mg = c.createGain(); mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.4);
    mod.connect(mg); mg.connect(car.frequency);
    const tine = c.createOscillator(); tine.type = 'sine'; tine.frequency.value = f * 7;
    const tg = c.createGain(); tg.gain.setValueAtTime(0.1, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); tine.connect(tg);
    const trem = c.createGain(); trem.gain.value = 1;
    const lfo = c.createOscillator(); lfo.frequency.value = 2.4; const lg = c.createGain(); lg.gain.value = 0.1; lfo.connect(lg); lg.connect(trem.gain);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff || 3000;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(vol * 0.45, t + Math.min(dur, 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.6);
    car.connect(trem); tg.connect(trem); trem.connect(lp); lp.connect(g); g.connect(this.pumpG);
    const sg = c.createGain(); sg.gain.value = 0.4; g.connect(sg); sg.connect(this.dlyIn);
    [car, mod, tine, lfo].forEach(o => { o.start(t); o.stop(t + dur + 1.7); });
  },
  /* glide lead: two slightly detuned saws sliding from the previous note, a soft lowpass, legato */
  leadGlide(f, t, dur, vol) {
    const c = AU.ctx; vol *= this.mix.lead; if (vol <= 0) return;
    const from = this.lastLead || f; this.lastLead = f;
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 0.9; fl.frequency.setValueAtTime(1400, t); fl.frequency.exponentialRampToValueAtTime(700, t + dur + 0.2);
    [-6, 6].forEach(det => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = det;
      o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
      const og = c.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(fl); o.start(t); o.stop(t + dur + 0.5);
    });
    const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = f / 2; const subg = c.createGain(); subg.gain.value = 0.35; sub.connect(subg); subg.connect(fl); sub.start(t); sub.stop(t + dur + 0.5);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
    fl.connect(g); g.connect(this.pumpG);
    const sg = c.createGain(); sg.gain.value = 0.35; g.connect(sg); sg.connect(this.dlyIn);
  },
  kick(t, vol, f0) {
    const c = AU.ctx; vol *= this.mix.kick; if (vol <= 0) return;
    // body: a pitch drop into a 45 Hz sub tail
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f0 * 1.6, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.09);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.setValueAtTime(vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    const sh = c.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; curve[i] = Math.tanh(x * 1.8) / Math.tanh(1.8); } sh.curve = curve; // gentle saturation for weight
    o.connect(g); g.connect(sh); sh.connect(this.bus); o.start(t); o.stop(t + 0.45);
    const sb = c.createOscillator(); sb.type = 'sine'; sb.frequency.value = 48; const sg = c.createGain(); sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(vol * 0.8, t + 0.012); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.36); sb.connect(sg); sg.connect(this.bus); sb.start(t); sb.stop(t + 0.4);
    // click: a short burst of filtered noise for the attack
    const s = c.createBufferSource(); s.buffer = this.hatBuf || (this.hatBuf = AU.noiseBuffer(0.4, false));
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
    const cg = c.createGain(); cg.gain.setValueAtTime(vol * 0.35, t); cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    s.connect(f); f.connect(cg); cg.connect(this.bus); s.start(t); s.stop(t + 0.03);
  },
  hat(t, vol, decay) {
    const c = AU.ctx; vol *= this.mix.hats * (0.85 + Math.random() * 0.3); if (vol <= 0) return;
    const s = c.createBufferSource(); s.buffer = this.hatBuf || (this.hatBuf = AU.noiseBuffer(0.4, false));
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5600;
    const g = c.createGain(); g.gain.setValueAtTime(vol * 0.85, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    s.connect(f); f.connect(g); this.pan(g, 0.3); this.toRev(g, 0.12); s.start(t); s.stop(t + decay + 0.02);
  },
  clap(t, vol) {
    const c = AU.ctx; vol *= this.mix.clap; if (vol <= 0) return;
    const buf = this.hatBuf || (this.hatBuf = AU.noiseBuffer(0.4, false));
    // two soft flams, then a filtered tail that reads as a small room
    [0, 0.018].forEach((d, i) => {
      const s = c.createBufferSource(); s.buffer = buf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1000; f.Q.value = 0.9;
      const g = c.createGain(); g.gain.setValueAtTime(vol * (i ? 0.8 : 0.5), t + d); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.035);
      s.connect(f); f.connect(g); this.pan(g, i ? 0.2 : -0.2); this.toRev(g, 0.5); s.start(t + d); s.stop(t + d + 0.05);
    });
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t + 0.03); f.frequency.exponentialRampToValueAtTime(500, t + 0.4);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
    const g = c.createGain(); g.gain.setValueAtTime(vol * 0.55, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    s.connect(hp); hp.connect(f); f.connect(g); g.connect(this.bus); s.start(t + 0.03); s.stop(t + 0.45);
  },
  bell(f, t, vol) {
    const c = AU.ctx;
    [[1, 1], [2.76, 0.4], [5.4, 0.15]].forEach(([r, k]) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * k, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5 / r);
      o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 2.6);
    });
  }
};
