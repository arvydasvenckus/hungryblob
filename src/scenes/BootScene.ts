import Phaser from "phaser";
import { SIZE_STAGES } from "../config/constants";

/**
 * All assets are generated programmatically via canvas in this scene so the
 * game works without external image files. Real art assets can replace the
 * generated textures by loading PNGs in preload() before the canvas code runs.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // When real PNG assets are ready, load them here, e.g.:
    // this.load.image('blob_sheet', 'assets/sprites/blob.png');
  }

  create() {
    this.generateBlobTextures();
    this.generateFoodTextures();
    this.generateTileTextures();
    this.generateUITextures();
    this.createAnimations();

    this.scene.start("MenuScene");
  }

  // ─── Blob ──────────────────────────────────────────────────────────────────

  private generateBlobTextures() {
    const PALETTE = [
      0x6fdc8c, // stage 0 – fresh green
      0xa4de6c, // stage 1 – lime
      0xf4d03f, // stage 2 – yellow
      0xf39c12, // stage 3 – orange
      0xe74c3c, // stage 4 – red (danger)
    ];

    // Frames: idle(4), walk(6), jump(3), fall(2), eat(4), burp(5) = 24 total
    const ANIM_FRAMES: Array<{ name: string; count: number }> = [
      { name: "idle", count: 4 },
      { name: "walk", count: 6 },
      { name: "jump", count: 3 },
      { name: "fall", count: 2 },
      { name: "eat",  count: 4 },
      { name: "burp", count: 5 },
    ];
    const totalFrames = ANIM_FRAMES.reduce((a, f) => a + f.count, 0);

    SIZE_STAGES.forEach((stage, stageIdx) => {
      const color = PALETTE[stageIdx];
      const w = stage.width;
      const h = stage.height;
      const r = Math.min(w, h) * (0.3 + stageIdx * 0.04);

      // Use the largest stage size as the cell size so all frames are the same width/height
      const CELL = SIZE_STAGES[SIZE_STAGES.length - 1].width; // 80
      const sheetW = CELL * totalFrames;
      const sheetH = CELL;

      const key = `blob_stage${stageIdx}`;
      const gfx = this.make.graphics({ x: 0, y: 0 }, false);

      let cellX = 0;
      let frameIndex = 0;

      ANIM_FRAMES.forEach(({ name: animName, count }) => {
        for (let f = 0; f < count; f++) {
          let scaleX = 1;
          let scaleY = 1;
          let eyeOffsetY = 0;
          let mouthOpen = false;

          if (animName === "idle") {
            scaleX = 1 + Math.sin(f * 1.5) * 0.02;
            scaleY = 1 - Math.sin(f * 1.5) * 0.02;
          } else if (animName === "walk") {
            scaleX = 1 + Math.sin(f * 1.1) * 0.06;
            scaleY = 1 - Math.sin(f * 1.1) * 0.06;
          } else if (animName === "jump") {
            scaleY = f === 0 ? 0.8 : f === 1 ? 1.1 : 1.0;
            scaleX = f === 0 ? 1.2 : f === 1 ? 0.9 : 1.0;
          } else if (animName === "fall") {
            scaleX = 1.1;
            scaleY = 0.9;
          } else if (animName === "eat") {
            mouthOpen = f === 1 || f === 2;
            scaleX = 1 + (f === 1 ? 0.12 : 0);
            scaleY = 1 - (f === 1 ? 0.08 : 0);
          } else if (animName === "burp") {
            const progress = f / 4;
            scaleX = 1.0 + (1 - progress) * 0.2;
            scaleY = 1.0 - (1 - progress) * 0.15;
            eyeOffsetY = (1 - progress) * 4;
          }

          const bw = w * scaleX;
          const bh = h * scaleY;
          // Center the blob within the cell
          const bx = cellX + (CELL - bw) / 2;
          const by = (CELL - bh) / 2;

          // Body
          gfx.fillStyle(color, 1);
          gfx.fillRoundedRect(bx, by, bw, bh, r * scaleX);

          // Shine highlight
          gfx.fillStyle(0xffffff, 0.22);
          gfx.fillEllipse(bx + bw * 0.3, by + bh * 0.22, bw * 0.35, bh * 0.2);

          // Shadow
          gfx.fillStyle(0x000000, 0.08);
          gfx.fillRoundedRect(bx, by + bh * 0.6, bw, bh * 0.4, { tl: 0, tr: 0, bl: r * scaleX, br: r * scaleX });

          // Eyes
          const eyeY  = by + bh * 0.35 + eyeOffsetY;
          const eyeR  = Math.max(3, w * 0.1);
          const eyeSepX = bw * 0.22;
          const cx    = cellX + CELL / 2;

          gfx.fillStyle(0xffffff, 1);
          gfx.fillCircle(cx - eyeSepX, eyeY, eyeR);
          gfx.fillStyle(0x1a1a2e, 1);
          gfx.fillCircle(cx - eyeSepX + 1, eyeY + 1, eyeR * 0.5);

          gfx.fillStyle(0xffffff, 1);
          gfx.fillCircle(cx + eyeSepX, eyeY, eyeR);
          gfx.fillStyle(0x1a1a2e, 1);
          gfx.fillCircle(cx + eyeSepX + 1, eyeY + 1, eyeR * 0.5);

          // Mouth
          if (mouthOpen) {
            gfx.fillStyle(0x1a1a2e, 1);
            gfx.fillEllipse(cx, by + bh * 0.62, bw * 0.22, bh * 0.12);
          } else {
            gfx.lineStyle(2, 0x1a1a2e, 0.8);
            gfx.beginPath();
            gfx.arc(cx, by + bh * 0.58, bw * 0.1, 0.1, Math.PI - 0.1);
            gfx.strokePath();
          }

          cellX += CELL;
          frameIndex++;
        }
      });

      gfx.generateTexture(key, sheetW, sheetH);
      gfx.destroy();

      // Register each frame in the texture so animation frames resolve correctly
      const texture = this.textures.get(key);
      for (let i = 0; i < totalFrames; i++) {
        texture.add(i, 0, i * CELL, 0, CELL, CELL);
      }
    });
  }

  // ─── Food ──────────────────────────────────────────────────────────────────

  private generateFoodTextures() {
    const foods: Array<{ key: string; draw: (g: Phaser.GameObjects.Graphics) => void }> = [
      {
        key: "donut",
        draw: (g) => {
          g.fillStyle(0xf4a7b9, 1);
          g.fillCircle(24, 24, 20);
          g.fillStyle(0xfdf6e3, 1);
          g.fillCircle(24, 24, 9);
          g.fillStyle(0xff6b9d, 1);
          for (let i = 0; i < 6; i++) {
            g.fillRect(12 + i * 2.5, 16, 2, 3);
          }
        },
      },
      {
        key: "pizza",
        draw: (g) => {
          g.fillStyle(0xf39c12, 1);
          g.fillTriangle(24, 4, 4, 44, 44, 44);
          g.fillStyle(0xe74c3c, 1);
          g.fillTriangle(24, 10, 8, 40, 40, 40);
          g.fillStyle(0xf1c40f, 1);
          g.fillCircle(18, 28, 4);
          g.fillCircle(30, 32, 3);
          g.fillCircle(24, 22, 3);
        },
      },
      {
        key: "burger",
        draw: (g) => {
          g.fillStyle(0xd4a35a, 1);
          g.fillRoundedRect(6, 6, 36, 14, 7);
          g.fillStyle(0x27ae60, 1);
          g.fillRect(8, 18, 32, 5);
          g.fillStyle(0xe74c3c, 1);
          g.fillRect(8, 22, 32, 4);
          g.fillStyle(0xf39c12, 1);
          g.fillRect(8, 26, 32, 5);
          g.fillStyle(0xd4a35a, 1);
          g.fillRoundedRect(6, 29, 36, 13, 5);
        },
      },
      {
        key: "taco",
        draw: (g) => {
          g.fillStyle(0xf39c12, 1);
          g.fillEllipse(24, 30, 42, 28);
          g.fillStyle(0x1a1a2e, 0);
          g.fillStyle(0x27ae60, 1);
          g.fillRect(10, 16, 28, 6);
          g.fillStyle(0xe74c3c, 1);
          g.fillRect(10, 20, 28, 4);
          g.fillStyle(0xf1c40f, 1);
          g.fillRect(12, 22, 24, 3);
        },
      },
      {
        key: "cookie",
        draw: (g) => {
          g.fillStyle(0xd4a35a, 1);
          g.fillCircle(24, 24, 20);
          g.fillStyle(0x7d4f2b, 1);
          for (const [cx, cy] of [[16, 16], [28, 12], [12, 28], [28, 28], [20, 22]]) {
            g.fillCircle(cx, cy, 3);
          }
        },
      },
      {
        key: "hotdog",
        draw: (g) => {
          g.fillStyle(0xd4a35a, 1);
          g.fillRoundedRect(4, 14, 40, 20, 10);
          g.fillStyle(0xe74c3c, 1);
          g.fillRoundedRect(8, 16, 32, 16, 8);
          g.fillStyle(0xf1c40f, 1);
          g.lineStyle(2, 0xf1c40f, 1);
          g.beginPath();
          g.moveTo(10, 20);
          g.lineTo(38, 20);
          g.strokePath();
          g.beginPath();
          g.moveTo(10, 28);
          g.lineTo(38, 28);
          g.strokePath();
        },
      },
      {
        key: "icecream",
        draw: (g) => {
          g.fillStyle(0xd4a35a, 1);
          g.fillTriangle(24, 44, 10, 24, 38, 24);
          g.fillStyle(0xf8c9d4, 1);
          g.fillCircle(24, 20, 14);
          g.fillStyle(0xff6b9d, 1);
          g.fillCircle(24, 10, 8);
          g.fillStyle(0xff2255, 1);
          g.fillCircle(24, 5, 3);
        },
      },
      {
        key: "cake",
        draw: (g) => {
          g.fillStyle(0xf4a7b9, 1);
          g.fillRoundedRect(6, 20, 36, 22, 4);
          g.fillStyle(0xfdf6e3, 1);
          g.fillRect(6, 20, 36, 5);
          g.fillStyle(0xff6b9d, 1);
          for (let i = 0; i < 3; i++) {
            g.fillRect(10 + i * 11, 15, 4, 8);
          }
          g.fillStyle(0xf1c40f, 1);
          g.fillCircle(12, 13, 3);
          g.fillCircle(24, 11, 3);
          g.fillCircle(36, 13, 3);
        },
      },
    ];

    foods.forEach(({ key, draw }) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      draw(g);
      g.generateTexture(key, 48, 48);
      g.destroy();
    });
  }

  // ─── Tiles ─────────────────────────────────────────────────────────────────

  private generateTileTextures() {
    const TS = 32;
    const tiles = [
      { key: "tile_duct_h",      draw: this.drawDuctHorizontal.bind(this) },
      { key: "tile_duct_v",      draw: this.drawDuctVertical.bind(this) },
      { key: "tile_solid",       draw: this.drawSolid.bind(this) },
      { key: "tile_corner_tl",   draw: (g: Phaser.GameObjects.Graphics) => this.drawCorner(g, "tl") },
      { key: "tile_corner_tr",   draw: (g: Phaser.GameObjects.Graphics) => this.drawCorner(g, "tr") },
      { key: "tile_corner_bl",   draw: (g: Phaser.GameObjects.Graphics) => this.drawCorner(g, "bl") },
      { key: "tile_corner_br",   draw: (g: Phaser.GameObjects.Graphics) => this.drawCorner(g, "br") },
      { key: "tile_bg",          draw: this.drawBackground.bind(this) },
      { key: "tile_exit",        draw: this.drawExit.bind(this) },
    ];

    tiles.forEach(({ key, draw }) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      draw(g);
      g.generateTexture(key, TS, TS);
      g.destroy();
    });
  }

  private drawDuctHorizontal(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x4a5568, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x718096, 1);
    g.fillRect(0, 0, 32, 4);
    g.fillRect(0, 28, 32, 4);
    g.fillStyle(0x2d3748, 1);
    g.fillRect(0, 4, 32, 2);
    g.fillRect(0, 26, 32, 2);
    g.lineStyle(1, 0x718096, 0.3);
    for (let x = 0; x < 32; x += 16) {
      g.fillStyle(0x5a6a80, 0.4);
      g.fillRect(x, 6, 2, 20);
    }
  }

  private drawDuctVertical(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x4a5568, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x718096, 1);
    g.fillRect(0, 0, 4, 32);
    g.fillRect(28, 0, 4, 32);
    g.fillStyle(0x2d3748, 1);
    g.fillRect(4, 0, 2, 32);
    g.fillRect(26, 0, 2, 32);
    g.fillStyle(0x5a6a80, 0.4);
    for (let y = 0; y < 32; y += 16) {
      g.fillRect(6, y, 20, 2);
    }
  }

  private drawSolid(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x2d3748, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x4a5568, 0.5);
    g.fillRect(0, 0, 32, 2);
    g.fillRect(0, 0, 2, 32);
  }

  private drawCorner(g: Phaser.GameObjects.Graphics, pos: "tl" | "tr" | "bl" | "br") {
    g.fillStyle(0x4a5568, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x718096, 1);
    if (pos === "tl" || pos === "tr") g.fillRect(0, 0, 32, 4);
    if (pos === "bl" || pos === "br") g.fillRect(0, 28, 32, 4);
    if (pos === "tl" || pos === "bl") g.fillRect(0, 0, 4, 32);
    if (pos === "tr" || pos === "br") g.fillRect(28, 0, 4, 32);
  }

  private drawBackground(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x16213e, 0.5);
    g.fillRect(0, 0, 32, 1);
    g.fillRect(0, 0, 1, 32);
  }

  private drawExit(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x2ecc71, 0.3);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(2, 0x2ecc71, 0.9);
    g.strokeRect(1, 1, 30, 30);
    g.fillStyle(0x2ecc71, 1);
    g.fillTriangle(10, 8, 22, 16, 10, 24);
  }

  // ─── UI Textures ───────────────────────────────────────────────────────────

  private generateUITextures() {
    // Stage dot (filled)
    const dotOn = this.make.graphics({ x: 0, y: 0 }, false);
    dotOn.fillStyle(0x6fdc8c, 1);
    dotOn.fillCircle(8, 8, 7);
    dotOn.generateTexture("ui_dot_on", 16, 16);
    dotOn.destroy();

    // Stage dot (empty)
    const dotOff = this.make.graphics({ x: 0, y: 0 }, false);
    dotOff.lineStyle(2, 0x4a5568, 1);
    dotOff.strokeCircle(8, 8, 7);
    dotOff.generateTexture("ui_dot_off", 16, 16);
    dotOff.destroy();

    // Cooldown ring base
    const ring = this.make.graphics({ x: 0, y: 0 }, false);
    ring.lineStyle(4, 0x718096, 1);
    ring.strokeCircle(20, 20, 16);
    ring.generateTexture("ui_cooldown_ring", 40, 40);
    ring.destroy();
  }

  // ─── Animations ────────────────────────────────────────────────────────────

  private createAnimations() {
    const ANIM_DEFS = [
      { name: "idle", count: 4, frameRate: 6,  repeat: -1 },
      { name: "walk", count: 6, frameRate: 10, repeat: -1 },
      { name: "jump", count: 3, frameRate: 8,  repeat: 0  },
      { name: "fall", count: 2, frameRate: 6,  repeat: -1 },
      { name: "eat",  count: 4, frameRate: 10, repeat: 0  },
      { name: "burp", count: 5, frameRate: 8,  repeat: 0  },
    ];

    SIZE_STAGES.forEach((_, stageIdx) => {
      const key = `blob_stage${stageIdx}`;
      let frameStart = 0;

      ANIM_DEFS.forEach(({ name, count, frameRate, repeat }) => {
        const frames = Array.from({ length: count }, (_, i) => ({ key, frame: frameStart + i }));
        this.anims.create({
          key: `blob_${name}_${stageIdx}`,
          frames,
          frameRate,
          repeat,
        });
        frameStart += count;
      });
    });
  }
}
