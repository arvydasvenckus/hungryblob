/**
 * Procedural Web Audio sound effects — no external files needed.
 * AudioContext is created lazily on first use (requires a user gesture first).
 */
export class SoundSystem {
  private ctx: AudioContext | null = null;

  private get audio(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  /** Short bright chirp for healthy food */
  eatHealthy() {
    const ctx = this.audio;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.07);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.12);
  }

  /** Deeper satisfying crunch for unhealthy food */
  eatUnhealthy() {
    const ctx = this.audio;
    const t = ctx.currentTime;

    // Low crunch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.22);

    // High overtone pop
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(880, t);
    osc2.frequency.exponentialRampToValueAtTime(440, t + 0.08);
    gain2.gain.setValueAtTime(0.1, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc2.start(t); osc2.stop(t + 0.09);
  }

  /** Bubble pop when a new size stage is reached */
  grow() {
    const ctx = this.audio;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.18);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.2);
  }

  /** Cute high-pitched Homer-style belch — voiced body + trill + glottal onset */
  burp() {
    const ctx = this.audio;
    const t   = ctx.currentTime;
    const dur = 0.72;
    const P   = 1.5; // pitch multiplier — shifts everything up for a cute character burp

    // ── Voiced body: sawtooth sweep (rich harmonics like a real throat) ─────
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220 * P, t);
    osc.frequency.exponentialRampToValueAtTime(75 * P, t + dur);

    // ── Formant bandpass: shapes the "mouth cavity" resonance ────────────────
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.setValueAtTime(360 * P, t);
    bpf.frequency.exponentialRampToValueAtTime(160 * P, t + dur);
    bpf.Q.value = 2.2;

    // ── Amplitude envelope ───────────────────────────────────────────────────
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.58, t + 0.022); // hard fast attack
    env.gain.setValueAtTime(0.58, t + dur * 0.52);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);

    // ── Tremolo LFO: amplitude flutter — this IS the "trill" of a real burp ─
    // Starts fast, slows toward end (natural pressure release)
    const tremOsc = ctx.createOscillator();
    tremOsc.type  = "sine";
    tremOsc.frequency.setValueAtTime(17, t);
    tremOsc.frequency.linearRampToValueAtTime(9, t + dur);
    const tremAmt = ctx.createGain();
    tremAmt.gain.value = 0.3;           // ±0.3 on a base-1 gain → 0.7–1.3 × signal
    const tremMix = ctx.createGain();
    tremMix.gain.value = 1;
    tremOsc.connect(tremAmt);
    tremAmt.connect(tremMix.gain);      // AudioParam add — base stays 1, LFO adds ripple

    // ── Glottal noise burst: the "B-" onset grunt ────────────────────────────
    const nLen = Math.floor(ctx.sampleRate * 0.055);
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd   = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
    const nSrc  = ctx.createBufferSource();
    nSrc.buffer = nBuf;
    const nFilt = ctx.createBiquadFilter();
    nFilt.type  = "bandpass";
    nFilt.frequency.value = 290 * P;
    nFilt.Q.value         = 1.6;
    const nEnv = ctx.createGain();
    nEnv.gain.setValueAtTime(0.42, t);
    nEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

    // ── Signal chain ─────────────────────────────────────────────────────────
    osc.connect(bpf);
    bpf.connect(env);
    env.connect(tremMix);
    tremMix.connect(ctx.destination);

    nSrc.connect(nFilt);
    nFilt.connect(nEnv);
    nEnv.connect(ctx.destination);

    // ── Start / stop ─────────────────────────────────────────────────────────
    osc.start(t);     osc.stop(t + dur);
    tremOsc.start(t); tremOsc.stop(t + dur);
    nSrc.start(t);    nSrc.stop(t + 0.065);
  }

  /** Tense double-thump played once when stress kicks in */
  stressHeartbeat() {
    const ctx = this.audio;
    [0, 0.18].forEach((delay) => {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 55;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.14);
    });
  }

  /** Cheerful ascending arpeggio on level complete */
  levelComplete() {
    const ctx = this.audio;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.22);
    });
  }

  /** Descending sad-trombone on level fail */
  levelFail() {
    const ctx = this.audio;
    const notes = [392, 349, 311, 261]; // G4 F4 Eb4 C4
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.32);
    });
  }

  destroy() {
    this.ctx?.close();
    this.ctx = null;
  }
}
