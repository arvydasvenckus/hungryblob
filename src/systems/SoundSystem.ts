import Phaser from "phaser";
import type { StageIndex } from "../config/constants";

/**
 * Sound effects — file-based for burp/eat/jump (stage-specific recordings),
 * procedural Web Audio for grow/stress/level events.
 *
 * Stage → sound key mappings:
 *
 * Burps (6 recordings → 7 reachable stages; stage 0 never burps):
 *   0          → (none — unreachable)
 *   1          → burp_tiny
 *   2          → burp_small
 *   3          → burp_mid
 *   4, 5       → burp_medlarge
 *   6          → burp_big
 *   7          → burp_huge
 *
 * Bounces (4 recordings → 8 stages):
 *   0, 1       → bounce_tiny
 *   2, 3       → bounce_small
 *   4, 5, 6    → bounce_big
 *   7          → bounce_huge
 */

const BURP_KEY: Record<number, string> = {
  // stage 0 omitted — Bob can never burp at stage 0 (can't shrink below 0)
  1: "burp_tiny",
  2: "burp_small",
  3: "burp_mid",
  4: "burp_medlarge", 5: "burp_medlarge",
  6: "burp_big",
  7: "burp_huge",
};

const BOUNCE_KEY: Record<number, string> = {
  0: "bounce_tiny",   1: "bounce_tiny",
  2: "bounce_small",  3: "bounce_small",
  4: "bounce_big",    5: "bounce_big",    6: "bounce_big",
  7: "bounce_huge",
};

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private get audio(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  /** Munch sound — same recording for all food, all stages */
  eat() {
    this.scene.sound.play("munch", { volume: 0.6 });
  }

  /** Stage-specific burp from real recordings */
  burp(stage: StageIndex) {
    this.scene.sound.play(BURP_KEY[stage] ?? "burp_small", { volume: 0.75 });
  }

  /** Stage-specific jump sound from real recordings */
  jump(stage: StageIndex) {
    this.scene.sound.play(BOUNCE_KEY[stage] ?? "bounce_small", { volume: 0.55 });
  }

  /** Bubble pop when a new size stage is reached (procedural) */
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
