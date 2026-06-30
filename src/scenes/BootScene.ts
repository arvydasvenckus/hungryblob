import Phaser from "phaser";
import { SIZE_STAGES } from "../config/constants";

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: "BootScene" }); }

  preload() {
    this.load.audio("bgmusic", "music/the-show-must-be-go.mp3");
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
    let mouthMode: "normal" | "huge" | "burp_open" | "frown" = "normal";
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

    // Stressed brows (angled inward \/ shape)
    if (stressed) {
      g.lineStyle(2.5, 0x1a1a2e, 1);
      g.beginPath();
      g.moveTo(cx - sepX - eyeR * 0.8, eyeY - eyeR * 1.5);
      g.lineTo(cx - sepX + eyeR * 0.3, eyeY - eyeR * 0.9);
      g.strokePath();
      g.beginPath();
      g.moveTo(cx + sepX + eyeR * 0.8, eyeY - eyeR * 1.5);
      g.lineTo(cx + sepX - eyeR * 0.3, eyeY - eyeR * 0.9);
      g.strokePath();
    }

    // Sweat drops
    if (sweatDrops) {
      const dropX = bx + bw * 0.88;
      const dropY = by + bh * 0.28;
      g.fillStyle(0x74b9ff, 0.9);
      // Teardrop: small circle + triangle
      g.fillCircle(dropX, dropY + 4, 3);
      g.fillTriangle(dropX - 3, dropY + 4, dropX + 3, dropY + 4, dropX, dropY - 2);
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
    const SIZE = 48;

    const foods: Array<{
      key: string;
      healthy: boolean;
      draw: (g: Phaser.GameObjects.Graphics) => void;
    }> = [
      // ── HEALTHY ────────────────────────────────────────────────────────────
      {
        key: "apple", healthy: true,
        draw: (g) => {
          g.fillStyle(0xe74c3c, 1); g.fillCircle(24, 26, 18);
          g.fillStyle(0x4a2f00, 1); g.fillRect(22, 6, 3, 8);
          g.fillStyle(0x27ae60, 1); g.fillEllipse(30, 9, 14, 8);
          g.fillStyle(0xffffff, 0.3); g.fillEllipse(17, 18, 7, 10);
        },
      },
      {
        key: "banana", healthy: true,
        draw: (g) => {
          // Banana shape as filled polygon approximating a crescent
          g.fillStyle(0xf1c40f, 1);
          const pts = [
            { x: 10, y: 40 }, { x: 14, y: 34 }, { x: 18, y: 26 },
            { x: 24, y: 16 }, { x: 32, y: 10 }, { x: 40, y: 10 },
            { x: 40, y: 15 }, { x: 34, y: 16 }, { x: 28, y: 20 },
            { x: 22, y: 28 }, { x: 17, y: 36 }, { x: 14, y: 42 },
          ];
          g.fillPoints(pts, true);
          g.fillStyle(0x4a3000, 1); g.fillCircle(10, 40, 3); g.fillCircle(40, 11, 3);
          g.fillStyle(0xe2b80c, 0.5);
          const stripe = [{ x:14,y:36 },{ x:20,y:24 },{ x:30,y:14 },{ x:36,y:11 },{ x:38,y:13 },{ x:32,y:18 },{ x:22,y:28 },{ x:16,y:40 }];
          g.fillPoints(stripe, true);
        },
      },
      {
        key: "broccoli", healthy: true,
        draw: (g) => {
          g.fillStyle(0x5d8a3c, 1); g.fillRect(20, 28, 8, 16);
          g.fillStyle(0x27ae60, 1); g.fillCircle(18, 22, 12); g.fillCircle(30, 22, 12);
          g.fillCircle(24, 15, 10);
          g.fillStyle(0x2ecc71, 0.4); g.fillCircle(16, 18, 5); g.fillCircle(28, 18, 5);
        },
      },
      {
        key: "carrot", healthy: true,
        draw: (g) => {
          g.fillStyle(0xe67e22, 1); g.fillTriangle(12, 14, 36, 14, 24, 44);
          g.fillStyle(0xf39c12, 0.6);
          g.lineStyle(2, 0xd35400, 0.5);
          for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(14+i*7, 18+i*4); g.lineTo(34-i*7, 18+i*4); g.strokePath(); }
          g.fillStyle(0x27ae60, 1); g.fillEllipse(18, 11, 10, 7); g.fillEllipse(24, 8, 8, 6); g.fillEllipse(30, 11, 10, 7);
        },
      },
      {
        key: "watermelon", healthy: true,
        draw: (g) => {
          g.fillStyle(0x27ae60, 1); g.fillCircle(24, 24, 20);
          g.fillStyle(0xe74c3c, 1); g.fillCircle(24, 26, 16);
          g.fillStyle(0x1a1a2e, 1);
          for (const [sx, sy] of [[20,22],[28,18],[16,28],[30,28],[24,24]]) g.fillCircle(sx, sy, 2);
          g.lineStyle(3, 0x27ae60, 0.7);
          g.beginPath(); g.moveTo(4, 24); g.lineTo(44, 24); g.strokePath();
        },
      },
      {
        key: "grapes", healthy: true,
        draw: (g) => {
          g.fillStyle(0x8e44ad, 1);
          const gpos = [[24,14],[16,20],[32,20],[12,28],[24,28],[36,28],[18,36],[30,36],[24,44]];
          gpos.forEach(([gx,gy]) => { g.fillCircle(gx, gy, 7); });
          g.fillStyle(0xa569bd, 0.5); gpos.forEach(([gx,gy]) => { g.fillCircle(gx-2, gy-2, 2.5); });
          g.fillStyle(0x4a2f00, 1); g.fillRect(22, 4, 4, 8);
          g.fillStyle(0x27ae60, 1); g.fillEllipse(30, 7, 12, 7);
        },
      },
      {
        key: "orange", healthy: true,
        draw: (g) => {
          g.fillStyle(0xe67e22, 1); g.fillCircle(24, 24, 19);
          g.fillStyle(0xf39c12, 0.5);
          for (let i = 0; i < 6; i++) { g.lineStyle(1.5, 0xd35400, 0.3); g.beginPath(); g.moveTo(24,24); const a=i*Math.PI/3; g.lineTo(24+Math.cos(a)*18, 24+Math.sin(a)*18); g.strokePath(); }
          g.fillStyle(0x27ae60, 1); g.fillEllipse(24, 7, 8, 6);
          g.fillStyle(0xffffff, 0.25); g.fillEllipse(16, 16, 7, 9);
        },
      },
      {
        key: "strawberry", healthy: true,
        draw: (g) => {
          g.fillStyle(0xe74c3c, 1);
          g.fillTriangle(24, 40, 8, 16, 40, 16);
          g.fillStyle(0xe74c3c, 1); g.fillCircle(16, 18, 9); g.fillCircle(32, 18, 9); g.fillCircle(24, 14, 8);
          g.fillStyle(0xffffff, 1);
          for (const [sx,sy] of [[18,24],[28,20],[22,32],[30,28]]) g.fillCircle(sx,sy,2.5);
          g.fillStyle(0x27ae60, 1); g.fillEllipse(18, 11, 10, 7); g.fillEllipse(24, 8, 8, 5); g.fillEllipse(30, 11, 10, 7);
        },
      },
      // ── UNHEALTHY ──────────────────────────────────────────────────────────
      {
        key: "burger", healthy: false,
        draw: (g) => {
          g.fillStyle(0xd4a35a, 1); g.fillRoundedRect(6, 5, 36, 13, 6);
          g.fillStyle(0x27ae60, 1); g.fillRect(8, 17, 32, 4);
          g.fillStyle(0xe74c3c, 1); g.fillRect(8, 21, 32, 4);
          g.fillStyle(0xf39c12, 1); g.fillRect(8, 25, 32, 4);
          g.fillStyle(0xd4a35a, 1); g.fillRoundedRect(6, 28, 36, 13, 5);
          g.fillStyle(0xf1c40f, 0.6); g.fillRect(10, 27, 6, 2); g.fillRect(20, 27, 6, 2); g.fillRect(30, 27, 6, 2);
        },
      },
      {
        key: "pizza", healthy: false,
        draw: (g) => {
          g.fillStyle(0xf39c12, 1); g.fillTriangle(24, 4, 4, 44, 44, 44);
          g.fillStyle(0xe74c3c, 1); g.fillTriangle(24, 10, 8, 40, 40, 40);
          g.fillStyle(0xf1c40f, 1); g.fillCircle(17, 28, 5); g.fillCircle(30, 32, 4); g.fillCircle(23, 22, 4);
          g.fillStyle(0xd35400, 0.4); g.lineStyle(2, 0xd35400, 0.4);
          g.beginPath(); g.moveTo(24,10); g.lineTo(24,40); g.strokePath();
        },
      },
      {
        key: "donut", healthy: false,
        draw: (g) => {
          g.fillStyle(0xf4a7b9, 1); g.fillCircle(24, 24, 20);
          g.fillStyle(0x1a1a2e, 0); g.fillStyle(0xfdf6e3, 1); g.fillCircle(24, 24, 9);
          g.fillStyle(0xff6b9d, 1);
          for (let i = 0; i < 7; i++) { g.fillRect(11 + i * 2.8, 16, 2.2, 3); g.fillRect(11 + i * 2.8, 28, 2.2, 3); }
        },
      },
      {
        key: "cake", healthy: false,
        draw: (g) => {
          g.fillStyle(0xf4a7b9, 1); g.fillRoundedRect(6, 20, 36, 22, 4);
          g.fillStyle(0xfdf6e3, 1); g.fillRect(6, 20, 36, 5);
          g.fillStyle(0xff6b9d, 1); for (let i=0;i<3;i++) g.fillRect(10+i*11,14,5,9);
          g.fillStyle(0xf1c40f, 1); g.fillCircle(12,12,4); g.fillCircle(24,10,4); g.fillCircle(36,12,4);
          g.fillStyle(0xffffff, 0.3); g.fillRect(8, 22, 32, 2);
        },
      },
      {
        key: "hotdog", healthy: false,
        draw: (g) => {
          g.fillStyle(0xd4a35a, 1); g.fillRoundedRect(4, 14, 40, 20, 10);
          g.fillStyle(0xe74c3c, 1); g.fillRoundedRect(8, 16, 32, 16, 8);
          g.fillStyle(0xf1c40f, 1);
          g.lineStyle(2, 0xf1c40f, 1); g.beginPath(); g.moveTo(10,20); g.lineTo(38,20); g.strokePath();
          g.beginPath(); g.moveTo(10,28); g.lineTo(38,28); g.strokePath();
        },
      },
      {
        key: "icecream", healthy: false,
        draw: (g) => {
          g.fillStyle(0xd4a35a, 1); g.fillTriangle(24, 44, 10, 24, 38, 24);
          g.fillStyle(0xf8c9d4, 1); g.fillCircle(24, 20, 14);
          g.fillStyle(0xff6b9d, 1); g.fillCircle(24, 10, 8);
          g.fillStyle(0xff2255, 1); g.fillCircle(24, 4, 4);
          g.fillStyle(0xffffff, 0.3); g.fillEllipse(18, 16, 5, 8);
        },
      },
      {
        key: "fries", healthy: false,
        draw: (g) => {
          g.fillStyle(0xe74c3c, 1); g.fillRoundedRect(8, 22, 32, 22, 4);
          g.fillStyle(0xfdf6e3, 1); g.fillRect(10, 23, 30, 3);
          g.fillStyle(0xf1c40f, 1);
          for (let i = 0; i < 5; i++) g.fillRoundedRect(10 + i * 6, 6, 4, 18, 2);
          g.fillStyle(0xf39c12, 0.6);
          for (let i = 0; i < 5; i++) g.fillRect(12 + i * 6, 6, 1, 18);
        },
      },
      {
        key: "candy", healthy: false,
        draw: (g) => {
          g.fillStyle(0x4a2f00, 1); g.fillRect(22, 8, 4, 20);
          g.fillStyle(0xe74c3c, 1); g.fillCircle(24, 32, 14);
          g.fillStyle(0xffffff, 1);
          for (let i = 0; i < 4; i++) {
            const a = i * (Math.PI / 2) + Math.PI / 4;
            g.fillRect(24 + Math.cos(a) * 4 - 2, 32 + Math.sin(a) * 4 - 7, 4, 8);
          }
          g.fillStyle(0xe74c3c, 0.6); g.fillCircle(24, 32, 5);
        },
      },
    ];

    foods.forEach(({ key, healthy, draw }) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      draw(g);

      // Border: green for healthy, orange-red for unhealthy
      if (healthy) {
        g.lineStyle(3, 0x27ae60, 0.85);
      } else {
        g.lineStyle(3, 0xe67e22, 0.9);
      }
      g.strokeCircle(24, 24, 22);

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
