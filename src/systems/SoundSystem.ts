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

  /** Homer-Simpson-style belch */
  burp() {
    const ctx = this.audio;
    const t = ctx.currentTime;

    // LFO for wobble
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 14;
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.65);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain); gain.connect(ctx.destination);

    lfo.start(t); osc.start(t);
    lfo.stop(t + 0.7); osc.stop(t + 0.7);
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
