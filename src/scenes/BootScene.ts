import Phaser from "phaser";
import { SIZE_STAGES } from "../config/constants";

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: "BootScene" }); }

  preload() {
    this.load.image("vinted-logo", "images/vinted-logo.png");
    this.load.audio("bgmusic",   "music/the-show-must-be-go.mp3");
    this.load.audio("menumusic", "music/fluffing-a-duck.mp3");
    // Burps — stage-specific recordings (6 files cover 8 stages)
    this.load.audio("burp_tiny",     "sounds/burp_tiny.mp3");
    this.load.audio("burp_small",    "sounds/burp_small.wav");
    this.load.audio("burp_mid",      "sounds/burp_mid.wav");
    this.load.audio("burp_medlarge", "sounds/burp_medlarge.wav");
    this.load.audio("burp_big",      "sounds/burp_big.wav");
    this.load.audio("burp_huge",     "sounds/burp_huge.wav");
    // Eat
    this.load.audio("munch",         "sounds/munch.wav");
    // Jump/bounce — stage-specific recordings (4 files cover 8 stages)
    this.load.audio("bounce_tiny",   "sounds/bounce_tiny.wav");
    this.load.audio("bounce_small",  "sounds/bounce_small.wav");
    this.load.audio("bounce_big",    "sounds/bounce_big.wav");
    this.load.audio("bounce_huge",   "sounds/bounce_huge.wav");
  }

  create() {
    this.generateBlobTextures();
    this.generateFoodTextures();
    this.generateUITextures();
    this.createAnimations();
    this.scene.start("MenuScene");
  }

  // ─── Blob sprite sheets ────────────────────────────────────────────────────
  // Frame layout per stage (32 total):
  // idle(4) walk(6) jump(3) fall(2) eat(4) burp(5) stress(4) sad(4)

  private generateBlobTextures() {
    const PALETTE = [
      0x6fdc8c, // stage 0 – fresh green
      0xa4de6c, // stage 1 – lime
      0xf4d03f, // stage 2 – yellow
      0xf39c12, // stage 3 – orange
      0xe67e22, // stage 4 – dark orange
      0xe74c3c, // stage 5 – red
      0xc0392b, // stage 6 – dark red
      0x922b21, // stage 7 – deep red (danger)
    ];

    const ANIM_FRAMES = [
      { name: "idle",   count: 4 },
      { name: "walk",   count: 6 },
      { name: "jump",   count: 3 },
      { name: "fall",   count: 2 },
      { name: "eat",    count: 4 },
      { name: "burp",   count: 5 },
      { name: "stress", count: 4 },
      { name: "sad",    count: 4 },
    ];

    const totalFrames = ANIM_FRAMES.reduce((a, f) => a + f.count, 0);
    const CELL = SIZE_STAGES[SIZE_STAGES.length - 1].width; // 80px cell

    SIZE_STAGES.forEach((stage, si) => {
      const color = PALETTE[si];
      const w = stage.width;
      const h = stage.height;
      // Radius grows gently with stage; capped at 38% of size so Bob never becomes a circle.
      // At 38% of width, corners are clearly visible (a full circle would need 50%).
      const r = Math.min(w, h) * Math.min(0.22 + si * 0.025, 0.38);
      const key = `blob_stage${si}`;

      const gfx = this.make.graphics({ x: 0, y: 0 }, false);
      let cellX = 0;

      ANIM_FRAMES.forEach(({ name, count }) => {
        for (let f = 0; f < count; f++) {
          this.drawBlobFrame(gfx, name, f, count, cellX, CELL, w, h, r, color);
          cellX += CELL;
        }
      });

      gfx.generateTexture(key, CELL * totalFrames, CELL);
      gfx.destroy();

      const tex = this.textures.get(key);
      for (let i = 0; i < totalFrames; i++) {
        tex.add(i, 0, i * CELL, 0, CELL, CELL);
      }
    });
  }

  private drawBlobFrame(
    g: Phaser.GameObjects.Graphics,
    anim: string,
    f: number,
    count: number,
    cellX: number,
    CELL: number,
    w: number,
    h: number,
    r: number,
    color: number
  ) {
    let sx = 1, sy = 1;
    let eyeOffY = 0;
    let mouthMode: "normal" | "huge" | "burp_open" | "frown" | "stressed" = "normal";
    let stressed = false;
    let sad = false;
    let sweatDrops = false;
    let burpRipple = -1; // 0/1/2 = which ripple phase; -1 = not a burp frame

    if (anim === "idle") {
      const breathe = Math.sin(f * 1.6) * 0.022;
      sx = 1 + breathe; sy = 1 - breathe;
    } else if (anim === "walk") {
      const bob = Math.sin(f * 1.05) * 0.06;
      sx = 1 + bob; sy = 1 - bob;
    } else if (anim === "jump") {
      if (f === 0) { sx = 1.2; sy = 0.78; }
      else if (f === 1) { sx = 0.88; sy = 1.12; }
      else { sx = 1; sy = 1; }
    } else if (anim === "fall") {
      sx = 1.1; sy = 0.88;
    } else if (anim === "eat") {
      if (f === 0) { sx = 1; sy = 1; }
      else if (f === 1) { sx = 1.08; sy = 0.92; mouthMode = "huge"; }
      else if (f === 2) { sx = 1.15; sy = 0.85; mouthMode = "huge"; }
      else { sx = 1.04; sy = 0.96; mouthMode = "normal"; }
    } else if (anim === "burp") {
      // F0: mild squash anticipation
      // F1: puff up — first burst
      // F2: wide burst — biggest mouth
      // F3: ripple continuation
      // F4: settle
      if      (f === 0) { sx = 1.28; sy = 0.72; eyeOffY = -2; }
      else if (f === 1) { sx = 0.80; sy = 1.35; mouthMode = "burp_open"; burpRipple = 0; eyeOffY = 2; }
      else if (f === 2) { sx = 1.14; sy = 1.20; mouthMode = "burp_open"; burpRipple = 1; eyeOffY = 1; }
      else if (f === 3) { sx = 0.90; sy = 1.12; mouthMode = "burp_open"; burpRipple = 2; }
      else              { sx = 1.03; sy = 1.03; mouthMode = "burp_open"; burpRipple = 0; }
    } else if (anim === "stress") {
      const shake = Math.sin(f * 2.8) * 0.04;
      sx = 1 + shake; sy = 1 - shake;
      stressed = true; sweatDrops = true;
      eyeOffY = -2;
      mouthMode = "stressed";
    } else if (anim === "sad") {
      sy = 1 - f * 0.01;
      sad = true;
      eyeOffY = f * 1.5;
    }

    const bw = w * sx;
    const bh = h * sy;
    const bx = cellX + (CELL - bw) / 2;
    const by = (CELL - bh) / 2;
    const cx = cellX + CELL / 2;

    // Body
    g.fillStyle(color, 1);
    g.fillRoundedRect(bx, by, bw, bh, r * Math.max(sx, 0.5));

    // Puffed burp frames: equatorial bulge — widens the body shape itself, no separate shapes
    if (anim === "burp" && f >= 1) {
      g.fillStyle(color, 1);
      g.fillEllipse(cx, by + bh * 0.5, bw * 1.28, bh * 0.44);
      // Soft rosy blush — fully inside body, just a tint
      g.fillStyle(0xff9f9f, 0.18);
      g.fillEllipse(bx + bw * 0.18, by + bh * 0.5, bw * 0.28, bh * 0.22);
      g.fillEllipse(bx + bw * 0.82, by + bh * 0.5, bw * 0.28, bh * 0.22);
      g.fillStyle(color, 1);
    }

    // Highlight shine
    g.fillStyle(0xffffff, 0.2);
    g.fillEllipse(bx + bw * 0.28, by + bh * 0.2, bw * 0.32, bh * 0.18);

    // Bottom shadow
    g.fillStyle(0x000000, 0.07);
    g.fillRoundedRect(bx, by + bh * 0.62, bw, bh * 0.38,
      { tl: 0, tr: 0, bl: r * Math.max(sx, 0.5), br: r * Math.max(sx, 0.5) });

    const eyeY  = by + bh * 0.34 + eyeOffY;
    const eyeR  = Math.max(3.5, w * 0.105);
    const sepX  = bw * 0.21;

    if (sad) {
      // X eyes for sad
      for (const ex of [cx - sepX, cx + sepX]) {
        g.lineStyle(2.5, 0x1a1a2e, 1);
        g.beginPath(); g.moveTo(ex - eyeR * 0.7, eyeY - eyeR * 0.7);
        g.lineTo(ex + eyeR * 0.7, eyeY + eyeR * 0.7); g.strokePath();
        g.beginPath(); g.moveTo(ex + eyeR * 0.7, eyeY - eyeR * 0.7);
        g.lineTo(ex - eyeR * 0.7, eyeY + eyeR * 0.7); g.strokePath();
      }
    } else {
      // Normal eyes
      for (const [ex, pupilOx] of [[cx - sepX, 1], [cx + sepX, 1]] as [number, number][]) {
        g.fillStyle(0xffffff, 1); g.fillCircle(ex, eyeY, eyeR);
        g.fillStyle(0x1a1a2e, 1); g.fillCircle(ex + pupilOx, eyeY + 1, eyeR * 0.48);
        // Shine
        g.fillStyle(0xffffff, 0.7); g.fillCircle(ex + pupilOx - 1, eyeY - 1, eyeR * 0.2);
      }
    }

    // Stressed brows — worried Ω shape: outer corners low, inner corners raised
    if (stressed) {
      g.lineStyle(2.5, 0x1a1a2e, 1);
      g.beginPath();
      g.moveTo(cx - sepX - eyeR * 0.8, eyeY - eyeR * 0.9);   // outer: lower
      g.lineTo(cx - sepX + eyeR * 0.3, eyeY - eyeR * 1.6);   // inner: higher
      g.strokePath();
      g.beginPath();
      g.moveTo(cx + sepX + eyeR * 0.8, eyeY - eyeR * 0.9);   // outer: lower
      g.lineTo(cx + sepX - eyeR * 0.3, eyeY - eyeR * 1.6);   // inner: higher
      g.strokePath();
    }

    // Sweat drops — on the cheeks, clearly below the eyes (ox can go outside blob bounds)
    if (sweatDrops) {
      const drops = [
        { ox:  1.04, oy: 0.50, phase: 0 }, // right cheek — slightly outside blob
        { ox: -0.06, oy: 0.56, phase: 2 }, // left cheek  — slightly outside blob
        { ox:  0.85, oy: 0.67, phase: 1 }, // lower right cheek
      ];
      g.fillStyle(0x74b9ff, 0.88);
      for (const drop of drops) {
        const dripPx = ((f + drop.phase) % 4) * bh * 0.038;
        const dropX  = bx + bw * drop.ox;
        const dropY  = by + bh * drop.oy + dripPx;
        const sz     = Math.max(2, bw * 0.032);
        g.fillCircle(dropX, dropY + sz, sz);
        g.fillTriangle(dropX - sz, dropY + sz, dropX + sz, dropY + sz, dropX, dropY - sz * 0.6);
      }
    }

    // Mouth
    const mouthCY = by + bh * 0.64;
    if (mouthMode === "huge") {
      // Comically giant open mouth — takes up ~40% of face height
      const mw = bw * 0.55;
      const mh = bh * 0.38;
      g.fillStyle(0x1a1a2e, 1);
      g.fillEllipse(cx, mouthCY + bh * 0.04, mw, mh);
      // Tongue
      g.fillStyle(0xe74c3c, 1);
      g.fillEllipse(cx, mouthCY + bh * 0.12, mw * 0.55, mh * 0.45);
      // Teeth (white)
      g.fillStyle(0xffffff, 1);
      for (let i = 0; i < 3; i++) {
        g.fillRect(cx - mw * 0.4 + i * mw * 0.28, mouthCY - bh * 0.01, mw * 0.22, bh * 0.1);
      }
    } else if (mouthMode === "burp_open") {
      // Mouth size varies by ripple phase — widest on the main burst (phase 1)
      const mwMul = burpRipple === 1 ? 0.78 : burpRipple === 0 ? 0.68 : 0.6;
      const mhMul = burpRipple === 1 ? 0.46 : burpRipple === 0 ? 0.5  : 0.38;
      const mw = bw * mwMul;
      const mh = bh * mhMul;
      g.fillStyle(0x1a1a2e, 1);
      g.fillEllipse(cx, mouthCY + bh * 0.04, mw, mh);
      g.fillStyle(0xe74c3c, 1);
      g.fillEllipse(cx, mouthCY + bh * 0.1, mw * 0.58, mh * 0.52);
      // Sinusoidal gas waves — amplitude and phase shift per ripple stage
      const waveCount = burpRipple === 1 ? 3 : 2;
      const amplitude = bh * (burpRipple === 1 ? 0.06 : burpRipple === 0 ? 0.045 : 0.032);
      const phaseShift = burpRipple === 2 ? Math.PI * 0.6 : 0;
      const x0 = cx - mw * 0.44;
      const x1 = cx + mw * 0.44;
      const steps = 10;
      for (let wl = 0; wl < waveCount; wl++) {
        const baseY = mouthCY - bh * (0.09 + wl * 0.07);
        const alpha = 0.85 - wl * 0.22;
        g.lineStyle(Math.max(1.5, bw * 0.025), 0x82e0aa, alpha);
        g.beginPath();
        g.moveTo(x0, baseY);
        for (let s = 1; s <= steps; s++) {
          const wx = x0 + (s / steps) * (x1 - x0);
          const wy = baseY + Math.sin((s / steps) * Math.PI * 2.5 + phaseShift) * amplitude;
          g.lineTo(wx, wy);
        }
        g.strokePath();
      }
    } else if (sad) {
      // Frown
      g.lineStyle(2.5, 0x1a1a2e, 0.9);
      g.beginPath();
      g.arc(cx, mouthCY + bh * 0.04, bw * 0.12, Math.PI + 0.3, -0.3);
      g.strokePath();
    } else if (mouthMode === "stressed") {
      // Grimace: same structure as eat animation — dark oval + 3 white teeth rects.
      // Wide and flat ratio gives the tight grimace shape vs the tall eating oval.
      const mw = bw * 0.32;
      const mh = Math.max(4, bh * 0.07);
      // Dark mouth area (wide and flat = grimace)
      g.fillStyle(0x1a1a2e, 1);
      g.fillEllipse(cx, mouthCY + mh * 0.5, mw, mh);
      // Three white teeth at the top — same pattern as eat animation
      g.fillStyle(0xffffff, 0.95);
      for (let i = 0; i < 3; i++) {
        g.fillRect(
          cx - mw * 0.38 + i * mw * 0.30,
          mouthCY,
          mw * 0.22,
          Math.max(2, mh * 0.45),
        );
      }
    } else {
      // Happy/neutral slight smile
      g.lineStyle(2.5, 0x1a1a2e, 0.85);
      g.beginPath();
      g.arc(cx, mouthCY - bh * 0.04, bw * 0.1, 0.15, Math.PI - 0.15);
      g.strokePath();
    }
  }

  // ─── Food textures ─────────────────────────────────────────────────────────

  private generateFoodTextures() {
    const SIZE = 44;

    const foods: Array<{
      key: string;
      healthy: boolean;
      draw: (g: Phaser.GameObjects.Graphics) => void;
    }> = [
      // ── HEALTHY — flat, matte, cool fresh colors, dark outline, no glow ────
      {
        key: "apple", healthy: true,
        draw: (g) => {
          g.fillStyle(0xe74c3c, 1); g.fillCircle(22, 25, 16);
          g.fillStyle(0xc0392b, 0.25); g.fillCircle(22, 32, 8);
          g.fillStyle(0x6b3f00, 1); g.fillRect(21, 8, 3, 8);
          g.fillStyle(0x27ae60, 1); g.fillEllipse(28, 11, 12, 7);
          g.lineStyle(1, 0x1e8449, 0.8); g.beginPath(); g.moveTo(26, 8); g.lineTo(32, 14); g.strokePath();
          g.fillStyle(0xffffff, 0.28); g.fillEllipse(14, 18, 6, 9);
          g.lineStyle(2, 0x1a2e1a, 0.9); g.strokeCircle(22, 25, 16);
        },
      },
      {
        key: "banana", healthy: true,
        draw: (g) => {
          // Proper horizontal crescent shape — wide arc from left tip to right tip
          g.fillStyle(0xf4d03f, 1);
          g.fillPoints([
            { x: 5, y: 33 }, { x: 8, y: 21 }, { x: 14, y: 12 }, { x: 22, y: 9 },
            { x: 30, y: 12 }, { x: 37, y: 22 }, { x: 38, y: 28 },
            { x: 30, y: 27 }, { x: 22, y: 26 }, { x: 14, y: 25 }, { x: 8, y: 30 },
          ], true);
          // Shadow stripe along the concave inner edge
          g.fillStyle(0xcba800, 0.4);
          g.fillPoints([
            { x: 8, y: 27 }, { x: 14, y: 23 }, { x: 22, y: 22 }, { x: 30, y: 23 }, { x: 37, y: 26 },
            { x: 37, y: 28 }, { x: 30, y: 27 }, { x: 22, y: 26 }, { x: 14, y: 25 }, { x: 8, y: 30 },
          ], true);
          // Blunt tips
          g.fillStyle(0x7a5200, 1); g.fillCircle(5, 33, 4); g.fillCircle(38, 27, 3);
          // Outline
          g.lineStyle(2, 0x1a2e1a, 0.9);
          g.beginPath();
          g.moveTo(5, 33); g.lineTo(8, 21); g.lineTo(14, 12); g.lineTo(22, 9);
          g.lineTo(30, 12); g.lineTo(37, 22); g.lineTo(38, 28);
          g.lineTo(30, 27); g.lineTo(22, 26); g.lineTo(14, 25); g.lineTo(8, 30);
          g.closePath(); g.strokePath();
        },
      },
      {
        key: "broccoli", healthy: true,
        draw: (g) => {
          g.fillStyle(0x4a7c33, 1); g.fillRoundedRect(18, 30, 8, 12, 2);
          g.fillStyle(0x5d9e40, 0.5); g.fillRect(19, 30, 3, 12);
          g.fillStyle(0x27ae60, 1);
          g.fillCircle(15, 22, 10); g.fillCircle(29, 22, 10); g.fillCircle(22, 15, 9);
          g.fillStyle(0x58d68d, 0.5);
          g.fillCircle(12, 18, 4); g.fillCircle(26, 18, 4); g.fillCircle(19, 12, 3);
          g.lineStyle(2, 0x1a2e1a, 0.85);
          g.strokeCircle(15, 22, 10); g.strokeCircle(29, 22, 10); g.strokeCircle(22, 15, 9);
          g.strokeRoundedRect(18, 30, 8, 12, 2);
        },
      },
      {
        key: "carrot", healthy: true,
        draw: (g) => {
          // Tapered body (trapezoid, not pure triangle)
          g.fillStyle(0xe67e22, 1);
          g.fillPoints([{ x: 11, y: 12 }, { x: 33, y: 12 }, { x: 28, y: 42 }, { x: 16, y: 42 }], true);
          // Highlight stripe
          g.fillStyle(0xf39c12, 0.45);
          g.fillPoints([{ x: 16, y: 12 }, { x: 24, y: 12 }, { x: 22, y: 42 }, { x: 18, y: 42 }], true);
          // Horizontal texture rings
          g.lineStyle(1.5, 0xd35400, 0.45);
          for (let i = 1; i <= 4; i++) {
            const t = i / 5;
            const x1 = 11 + t * (16 - 11); const x2 = 33 + t * (28 - 33);
            const y = 12 + t * 30;
            g.beginPath(); g.moveTo(x1 + 1, y); g.lineTo(x2 - 1, y); g.strokePath();
          }
          // Green leafy top (3 elongated ellipses)
          g.fillStyle(0x27ae60, 1);
          g.fillEllipse(14, 9, 9, 13); g.fillEllipse(22, 6, 7, 11); g.fillEllipse(30, 9, 9, 13);
          // Body outline
          g.lineStyle(2, 0x1a2e1a, 0.9);
          g.beginPath();
          g.moveTo(11, 12); g.lineTo(33, 12); g.lineTo(28, 42); g.lineTo(16, 42);
          g.closePath(); g.strokePath();
        },
      },
      {
        key: "watermelon", healthy: true,
        draw: (g) => {
          g.fillStyle(0x1e8449, 1); g.fillCircle(22, 22, 19);
          g.fillStyle(0xf5f5f5, 1); g.fillCircle(22, 22, 17);
          g.fillStyle(0xe74c3c, 1); g.fillCircle(22, 22, 15);
          // Seeds (elongated, more natural)
          g.fillStyle(0x1a1a2e, 1);
          g.fillEllipse(16, 19, 4, 6); g.fillEllipse(26, 17, 4, 6);
          g.fillEllipse(14, 27, 4, 6); g.fillEllipse(28, 26, 4, 6);
          g.lineStyle(2, 0x1a2e1a, 0.9); g.strokeCircle(22, 22, 19);
        },
      },
      {
        key: "grapes", healthy: true,
        draw: (g) => {
          const gpos: [number, number][] = [
            [22, 9],
            [16, 16], [28, 16],
            [10, 23], [22, 23], [34, 23],
            [16, 30], [28, 30],
            [22, 37],
          ];
          g.fillStyle(0x7d3c98, 1);
          gpos.forEach(([gx, gy]) => g.fillCircle(gx, gy, 6));
          g.fillStyle(0xa569bd, 0.5);
          gpos.forEach(([gx, gy]) => g.fillCircle(gx - 2, gy - 2, 2));
          g.fillStyle(0x6b3f00, 1); g.fillRect(20, 2, 4, 8);
          g.fillStyle(0x27ae60, 1); g.fillEllipse(28, 6, 10, 6);
          g.lineStyle(1.5, 0x1a2e1a, 0.75);
          gpos.forEach(([gx, gy]) => g.strokeCircle(gx, gy, 6));
        },
      },
      {
        key: "orange", healthy: true,
        draw: (g) => {
          g.fillStyle(0xe67e22, 1); g.fillCircle(22, 24, 17);
          g.lineStyle(1.5, 0xd35400, 0.35);
          for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            g.beginPath(); g.moveTo(22, 24);
            g.lineTo(22 + Math.cos(a) * 16, 24 + Math.sin(a) * 16);
            g.strokePath();
          }
          g.fillStyle(0x27ae60, 1); g.fillEllipse(22, 8, 10, 7);
          g.lineStyle(1, 0x1e8449, 0.7); g.beginPath(); g.moveTo(22, 5); g.lineTo(22, 11); g.strokePath();
          g.fillStyle(0xffffff, 0.25); g.fillEllipse(14, 17, 6, 8);
          g.lineStyle(2, 0x1a2e1a, 0.9); g.strokeCircle(22, 24, 17);
        },
      },
      {
        key: "strawberry", healthy: true,
        draw: (g) => {
          g.fillStyle(0xe74c3c, 1);
          g.fillPoints([
            { x: 22, y: 40 }, { x: 12, y: 32 }, { x: 7, y: 22 }, { x: 8, y: 14 },
            { x: 14, y: 10 }, { x: 22, y: 12 },
            { x: 30, y: 10 }, { x: 36, y: 14 },
            { x: 37, y: 22 }, { x: 32, y: 32 },
          ], true);
          g.fillStyle(0xf1948a, 0.35); g.fillEllipse(15, 21, 7, 12);
          g.fillStyle(0xffffff, 0.9);
          for (const [sx, sy] of [[18, 22], [26, 20], [22, 30], [15, 28], [29, 27], [21, 37]]) {
            g.fillCircle(sx, sy, 1.5);
          }
          g.fillStyle(0x27ae60, 1);
          g.fillEllipse(16, 11, 10, 7); g.fillEllipse(22, 8, 8, 6); g.fillEllipse(28, 11, 10, 7);
          g.lineStyle(2, 0x1a2e1a, 0.9);
          g.beginPath();
          g.moveTo(22, 40); g.lineTo(12, 32); g.lineTo(7, 22); g.lineTo(8, 14);
          g.lineTo(14, 10); g.lineTo(22, 12); g.lineTo(30, 10); g.lineTo(36, 14);
          g.lineTo(37, 22); g.lineTo(32, 32);
          g.closePath(); g.strokePath();
        },
      },
      // ── UNHEALTHY — warm rich colors, golden glow, dark warm outline ────────
      {
        key: "burger", healthy: false,
        draw: (g) => {
          // Top bun
          g.fillStyle(0xd4a35a, 1); g.fillRoundedRect(5, 3, 34, 12, 6);
          // Sesame seeds
          g.fillStyle(0xfaf0d7, 1);
          g.fillEllipse(13, 7, 5, 3); g.fillEllipse(22, 5, 5, 3); g.fillEllipse(31, 7, 5, 3);
          // Bun highlight
          g.fillStyle(0xe8bf77, 0.3); g.fillEllipse(22, 6, 26, 5);
          // Lettuce
          g.fillStyle(0x27ae60, 1); g.fillRect(5, 14, 34, 4);
          g.fillStyle(0x58d68d, 0.5); g.fillRect(7, 14, 10, 2); g.fillRect(24, 14, 10, 2);
          // Tomato
          g.fillStyle(0xe74c3c, 1); g.fillRect(5, 18, 34, 3);
          // Cheese
          g.fillStyle(0xf39c12, 1); g.fillRect(5, 21, 34, 3);
          // Patty
          g.fillStyle(0x7d4f25, 1); g.fillRoundedRect(6, 24, 32, 5, 2);
          // Bottom bun
          g.fillStyle(0xd4a35a, 1); g.fillRoundedRect(5, 29, 34, 12, 5);
          // Outlines
          g.lineStyle(2, 0x3d1a00, 0.9);
          g.strokeRoundedRect(5, 3, 34, 12, 6);
          g.strokeRoundedRect(5, 29, 34, 12, 5);
        },
      },
      {
        key: "pizza", healthy: false,
        draw: (g) => {
          // Crust
          g.fillStyle(0xd4a35a, 1); g.fillTriangle(22, 3, 2, 42, 42, 42);
          // Sauce
          g.fillStyle(0xc0392b, 1); g.fillTriangle(22, 9, 6, 39, 38, 39);
          // Cheese
          g.fillStyle(0xf39c12, 0.85); g.fillTriangle(22, 13, 10, 36, 34, 36);
          // Pepperoni
          g.fillStyle(0x922b21, 1);
          g.fillCircle(22, 26, 5); g.fillCircle(15, 33, 4); g.fillCircle(29, 33, 4);
          g.fillStyle(0xc0392b, 0.5);
          g.fillCircle(21, 25, 2); g.fillCircle(14, 32, 1.5); g.fillCircle(28, 32, 1.5);
          // Outline
          g.lineStyle(2, 0x3d1a00, 0.9);
          g.beginPath(); g.moveTo(22, 3); g.lineTo(2, 42); g.lineTo(42, 42); g.closePath(); g.strokePath();
        },
      },
      {
        key: "donut", healthy: false,
        draw: (g) => {
          // Dough ring
          g.fillStyle(0xc47c3e, 1); g.fillCircle(22, 22, 18);
          // Pink icing (shifted slightly up for a glaze effect)
          g.fillStyle(0xf4a7b9, 1); g.fillCircle(22, 19, 15);
          // Hole
          g.fillStyle(0x2a1005, 1); g.fillCircle(22, 22, 8);
          // Sprinkles
          g.fillStyle(0xff4499, 1); g.fillRect(14, 15, 6, 2);
          g.fillStyle(0x4499ff, 1); g.fillRect(26, 12, 2, 6);
          g.fillStyle(0xffcc00, 1); g.fillRect(29, 19, 6, 2);
          g.fillStyle(0x44cc44, 1); g.fillRect(16, 26, 2, 6);
          g.fillStyle(0xff6600, 1); g.fillRect(10, 20, 2, 6);
          g.lineStyle(2, 0x3d1a00, 0.9); g.strokeCircle(22, 22, 18);
        },
      },
      {
        key: "cake", healthy: false,
        draw: (g) => {
          // Bottom layer
          g.fillStyle(0xf4a7b9, 1); g.fillRoundedRect(5, 27, 34, 13, 3);
          // Cream stripe between layers
          g.fillStyle(0xfdf6e3, 1); g.fillRect(5, 25, 34, 3);
          // Top layer
          g.fillStyle(0xf4a7b9, 1); g.fillRoundedRect(7, 16, 30, 10, 3);
          // Top icing
          g.fillStyle(0xfdf6e3, 1); g.fillRect(7, 14, 30, 3);
          // Frosting blobs
          g.fillStyle(0xff6b9d, 1);
          for (let i = 0; i < 4; i++) g.fillCircle(11 + i * 8, 14, 3);
          // Candles
          g.fillStyle(0xf1c40f, 1); g.fillRect(12, 6, 3, 9); g.fillRect(21, 6, 3, 9); g.fillRect(30, 6, 3, 9);
          // Flames
          g.fillStyle(0xff6600, 1); g.fillCircle(13, 5, 3); g.fillCircle(22, 5, 3); g.fillCircle(31, 5, 3);
          g.fillStyle(0xffff00, 0.7); g.fillCircle(13, 5, 1.5); g.fillCircle(22, 5, 1.5); g.fillCircle(31, 5, 1.5);
          g.lineStyle(2, 0x3d1a00, 0.9);
          g.strokeRoundedRect(5, 27, 34, 13, 3);
          g.strokeRoundedRect(7, 16, 30, 10, 3);
        },
      },
      {
        key: "hotdog", healthy: false,
        draw: (g) => {
          // Bun
          g.fillStyle(0xd4a35a, 1); g.fillRoundedRect(3, 12, 38, 20, 10);
          // Sausage
          g.fillStyle(0xc0392b, 1); g.fillRoundedRect(4, 15, 36, 14, 7);
          // Dark sausage ends
          g.fillStyle(0x922b21, 1); g.fillCircle(7, 22, 6); g.fillCircle(37, 22, 6);
          // Mustard zigzag
          g.lineStyle(3, 0xf1c40f, 1);
          g.beginPath(); g.moveTo(8, 22);
          g.lineTo(13, 18); g.lineTo(18, 26); g.lineTo(23, 18);
          g.lineTo(28, 26); g.lineTo(33, 18); g.lineTo(38, 22);
          g.strokePath();
          // Bun highlight
          g.fillStyle(0xe8bf77, 0.35); g.fillEllipse(22, 15, 30, 5);
          g.lineStyle(2, 0x3d1a00, 0.9); g.strokeRoundedRect(3, 12, 38, 20, 10);
        },
      },
      {
        key: "icecream", healthy: false,
        draw: (g) => {
          // Waffle cone
          g.fillStyle(0xd4a35a, 1); g.fillTriangle(22, 44, 10, 24, 34, 24);
          // Cone grid lines (horizontal, tapering to tip)
          g.lineStyle(1.5, 0xb8834e, 0.6);
          for (let i = 0; i < 4; i++) {
            const y1 = 24 + i * 5;
            const halfW = 12 * (1 - (y1 - 24) / 20);
            g.beginPath(); g.moveTo(22 - halfW, y1); g.lineTo(22 + halfW, y1); g.strokePath();
          }
          // Main cream scoop
          g.fillStyle(0xf8e4c0, 1); g.fillCircle(22, 20, 13);
          // Second smaller scoop
          g.fillStyle(0xfce8d0, 1); g.fillCircle(22, 10, 9);
          // Chocolate drip on scoop
          g.fillStyle(0x5d2e0c, 0.7);
          g.fillPoints([{ x: 28, y: 19 }, { x: 30, y: 26 }, { x: 28, y: 26 }, { x: 26, y: 19 }], true);
          // Cherry
          g.fillStyle(0xe74c3c, 1); g.fillCircle(22, 4, 4);
          g.lineStyle(2, 0x6b3f00, 1); g.beginPath(); g.moveTo(22, 7); g.lineTo(22, 12); g.strokePath();
          // Scoop highlight
          g.fillStyle(0xffffff, 0.3); g.fillEllipse(16, 17, 5, 8);
          // Outline cone and main scoop
          g.lineStyle(2, 0x3d1a00, 0.9);
          g.beginPath(); g.moveTo(22, 44); g.lineTo(10, 24); g.lineTo(34, 24); g.closePath(); g.strokePath();
          g.strokeCircle(22, 20, 13);
        },
      },
      {
        key: "fries", healthy: false,
        draw: (g) => {
          // 4 golden fries (drawn before the box so box overlaps their bases)
          g.fillStyle(0xf1c40f, 1);
          g.fillRoundedRect(10, 6, 5, 22, 2);
          g.fillRoundedRect(17, 4, 5, 24, 2);
          g.fillRoundedRect(24, 6, 5, 22, 2);
          g.fillRoundedRect(31, 8, 5, 20, 2);
          // Fry shadow (right edge)
          g.fillStyle(0xe0a800, 0.5);
          g.fillRect(13, 6, 2, 22); g.fillRect(20, 4, 2, 24);
          g.fillRect(27, 6, 2, 22); g.fillRect(34, 8, 2, 20);
          // Salt dots
          g.fillStyle(0xffffff, 0.85);
          g.fillCircle(13, 9, 1.5); g.fillCircle(20, 7, 1.5); g.fillCircle(27, 10, 1.5);
          // Red box
          g.fillStyle(0xc0392b, 1); g.fillRoundedRect(7, 26, 30, 16, 3);
          // White stripe on box
          g.fillStyle(0xffffff, 0.75); g.fillRect(9, 28, 26, 2);
          g.lineStyle(2, 0x3d1a00, 0.9); g.strokeRoundedRect(7, 26, 30, 16, 3);
        },
      },
      {
        key: "candy", healthy: false,
        draw: (g) => {
          // Stick
          g.fillStyle(0x7d5a00, 1); g.fillRoundedRect(20, 7, 4, 26, 2);
          // Candy body
          g.fillStyle(0xe74c3c, 1); g.fillCircle(22, 31, 12);
          // White swirl wedges (4 alternating sectors)
          g.fillStyle(0xffffff, 0.9);
          for (let i = 0; i < 4; i++) {
            const a1 = i * (Math.PI / 2);
            const a2 = a1 + Math.PI / 4;
            const mid = (a1 + a2) / 2;
            g.fillPoints([
              { x: 22, y: 31 },
              { x: 22 + Math.cos(a1) * 12, y: 31 + Math.sin(a1) * 12 },
              { x: 22 + Math.cos(mid) * 12, y: 31 + Math.sin(mid) * 12 },
              { x: 22 + Math.cos(a2) * 12, y: 31 + Math.sin(a2) * 12 },
            ], true);
          }
          // Center dot
          g.fillStyle(0xc0392b, 1); g.fillCircle(22, 31, 4);
          g.lineStyle(2, 0x3d1a00, 0.9); g.strokeCircle(22, 31, 12);
        },
      },
    ];

    // Warm golden glow for unhealthy foods (drawn before the food shape)
    const addGlow = (g: Phaser.GameObjects.Graphics) => {
      g.fillStyle(0xf39c12, 0.08); g.fillCircle(22, 22, 22);
      g.fillStyle(0xf1c40f, 0.16); g.fillCircle(22, 22, 18);
      g.fillStyle(0xffcc44, 0.25); g.fillCircle(22, 22, 13);
    };

    foods.forEach(({ key, healthy, draw }) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      if (!healthy) addGlow(g);
      draw(g);
      g.generateTexture(key, SIZE, SIZE);
      g.destroy();
    });
  }

  // ─── UI textures ───────────────────────────────────────────────────────────

  private generateUITextures() {
    const makeGraphic = (key: string, size: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      draw(g);
      g.generateTexture(key, size, size);
      g.destroy();
    };

    makeGraphic("ui_dot_on", 16, (g) => {
      g.fillStyle(0x6fdc8c, 1); g.fillCircle(8, 8, 7);
    });
    makeGraphic("ui_dot_off", 16, (g) => {
      g.lineStyle(2, 0x4a5568, 1); g.strokeCircle(8, 8, 7);
    });
    makeGraphic("ui_cooldown_ring", 40, (g) => {
      g.lineStyle(4, 0x718096, 1); g.strokeCircle(20, 20, 16);
    });
  }

  // ─── Animations ────────────────────────────────────────────────────────────

  private createAnimations() {
    const ANIM_DEFS = [
      { name: "idle",   count: 4, frameRate: 6,  repeat: -1 },
      { name: "walk",   count: 6, frameRate: 10, repeat: -1 },
      { name: "jump",   count: 3, frameRate: 8,  repeat: 0  },
      { name: "fall",   count: 2, frameRate: 6,  repeat: -1 },
      { name: "eat",    count: 4, frameRate: 12, repeat: 0  },
      { name: "burp",   count: 5, frameRate: 13, repeat: 0  },
      { name: "stress", count: 4, frameRate: 7,  repeat: -1 },
      { name: "sad",    count: 4, frameRate: 5,  repeat: -1 },
    ];

    SIZE_STAGES.forEach((_, si) => {
      const key = `blob_stage${si}`;
      let frameStart = 0;
      ANIM_DEFS.forEach(({ name, count, frameRate, repeat }) => {
        const frames = Array.from({ length: count }, (_, i) => ({ key, frame: frameStart + i }));
        this.anims.create({ key: `blob_${name}_${si}`, frames, frameRate, repeat });
        frameStart += count;
      });
    });
  }
}
