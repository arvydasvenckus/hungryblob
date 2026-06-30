import Phaser from "phaser";
import { TILE_SIZE, SIZE_STAGES } from "../config/constants";

/**
 * Tutorial Level 1 — "Air Ducts"
 *
 * HARD RULE: Food is NEVER placed inside a duct.
 * It is only placed in open sections where Bob can always grow upward freely.
 *
 * Gap physics:
 *   body.bottom = sprite.y + height/2.  body.top = body.bottom - height.
 *   A stage fits through a gap when:   gap > stageHeight  (body.top is below ceiling.bottom)
 *   A stage is blocked by a gap when:  gap ≤ stageHeight  (body.top ≥ ceiling.bottom → collision)
 *
 *   NARROW = 43px → stage 1 (38px) fits, stage 2 (50px) blocked
 *   MEDIUM = 72px → stage 3 (64px) fits, stage 4 (80px) blocked
 *
 * Open sections (food-safe zones):
 *   Section 1:  x = 32  → 490   (before narrow duct)
 *   Section 2:  x = 750 → 900   (between ducts — 150px gap, jumpable when small)
 *   Section 3:  x = 1230 → 1568 (after medium duct)  ← exit also here
 *
 * Guided food sequence:
 *   [Section 1]  apple (+1)          → Stage 1
 *   [NARROW DUCT x=490–750]
 *   [Section 2]  strawberry (+1)     → Stage 2  (small Bob can jump between duct tops here)
 *   [MEDIUM DUCT x=900–1230]   need to burp once (4→3) to pass
 *   [Section 3]  orange (+1)         → Stage 3
 *                burger (+2)         → Stage 4 (or 5 → stays at 4 MAX)
 *                carrot (+1)         → Stage 4 (stays max)
 *   [EXIT x≈1510]
 */

const T = TILE_SIZE; // 32

const NARROW = Math.round((SIZE_STAGES[1].height + SIZE_STAGES[2].height) / 2) - 1; // 43
const MEDIUM  = Math.round((SIZE_STAGES[3].height + SIZE_STAGES[4].height) / 2);    // 72

export const LEVEL_WIDTH  = 1600;
export const LEVEL_HEIGHT = 560;
const FLOOR_Y = LEVEL_HEIGHT - T; // 528

// Duct x-ranges (used to enforce the "no food inside ducts" rule visually)
const NARROW_X_START = 490;
const NARROW_X_END   = 750;
const MEDIUM_X_START = 900;
const MEDIUM_X_END   = 1230;

export interface LevelObjects {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  exitZone:  Phaser.GameObjects.Zone;
  bgGraphics: Phaser.GameObjects.Graphics;
}

export function buildLevel1(scene: Phaser.Scene): LevelObjects {
  const platforms = scene.physics.add.staticGroup();

  const bg = scene.add.graphics();
  bg.fillStyle(0x1a1a2e, 1);
  bg.fillRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
  drawBgDetails(bg);

  // ── Wall / platform helper ─────────────────────────────────────────────────
  function wall(x: number, y: number, w: number, h: number) {
    const g = scene.add.graphics();
    g.fillStyle(0x2d3748, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x4a5568, 0.7); g.fillRect(0, 0, w, 3);
    g.fillStyle(0x718096, 0.3); g.fillRect(0, 0, 2, h);
    if (w > 64) {
      g.fillStyle(0x4a5568, 0.5);
      for (let rx = 12; rx < w - 12; rx += 48) {
        g.fillCircle(rx, h / 2, 3);
        g.fillCircle(rx + 24, h / 2, 3);
      }
    }
    const key = `wall_${x}_${y}_${w}_${h}`;
    g.generateTexture(key, w, h);
    g.destroy();
    const img = scene.physics.add.staticImage(x + w / 2, y + h / 2, key);
    img.setDisplaySize(w, h);
    img.refreshBody();
    platforms.add(img);
  }

  // ── Duct ceiling helper ────────────────────────────────────────────────────
  // Only creates the LOW CEILING — the main floor IS the duct floor.
  function ductCeiling(x: number, gapFromFloor: number, width: number, thickness = T) {
    const ceilBottom = FLOOR_Y - gapFromFloor;
    wall(x, ceilBottom - thickness, width, thickness);
  }

  // ── Boundary ───────────────────────────────────────────────────────────────
  wall(0,               0,       T,           LEVEL_HEIGHT); // left
  wall(LEVEL_WIDTH - T, 0,       T,           LEVEL_HEIGHT); // right
  wall(0,               0,       LEVEL_WIDTH, T);            // ceiling
  wall(0,               FLOOR_Y, LEVEL_WIDTH, T);            // floor

  // ── Narrow duct ceiling (x 490 → 750) ─────────────────────────────────────
  ductCeiling(NARROW_X_START, NARROW, NARROW_X_END - NARROW_X_START);

  // ── Medium duct ceiling (x 1000 → 1230) ───────────────────────────────────
  ductCeiling(MEDIUM_X_START, MEDIUM, MEDIUM_X_END - MEDIUM_X_START);

  // ── EXIT (section 3, safely after medium duct) ────────────────────────────
  const exitX = LEVEL_WIDTH - T * 3;
  const exitY = FLOOR_Y - T * 2;

  const exitGfx = scene.add.graphics();
  exitGfx.fillStyle(0x2ecc71, 0.2);
  exitGfx.fillRect(0, 0, T * 1.5, T * 2);
  exitGfx.lineStyle(3, 0x2ecc71, 1);
  exitGfx.strokeRect(0, 0, T * 1.5, T * 2);
  exitGfx.fillStyle(0x2ecc71, 1);
  exitGfx.fillTriangle(8, T * 0.6, 18, T, 8, T * 1.4);
  exitGfx.generateTexture("exit_door", T * 1.5, T * 2);
  exitGfx.destroy();

  scene.add.image(exitX + T * 0.75, exitY + T, "exit_door");
  const exitZone = scene.add.zone(exitX + T * 0.75, exitY + T, T * 1.5, T * 2);
  scene.physics.world.enable(exitZone, Phaser.Physics.Arcade.STATIC_BODY);

  // ── Tutorial hints ─────────────────────────────────────────────────────────
  const hs: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: "13px", color: "#a0aec0", fontFamily: "monospace",
    stroke: "#000000", strokeThickness: 2, align: "center",
  };

  scene.add.text(160, FLOOR_Y - 110, "← → Move\n↑ / SPACE Jump", hs).setOrigin(0.5);
  scene.add.text(280, FLOOR_Y - 92, "▼ +1 size", { fontSize: "13px", color: "#27ae60", fontFamily: "monospace", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5);
  scene.add.text(NARROW_X_START + 10, FLOOR_Y - 68, "Narrow duct →\nBurp if too big!", { ...hs, color: "#f39c12" }).setOrigin(0, 0.5);
  scene.add.text(870, FLOOR_Y - 105, "Junk food = +2 sizes\n+ ×2 score!", { ...hs, color: "#ff6b9d" }).setOrigin(0.5);
  scene.add.text(MEDIUM_X_START + 10, FLOOR_Y - 68, "Tight duct →\nBurp once to pass!", { ...hs, color: "#f39c12" }).setOrigin(0, 0.5);
  scene.add.text(exitX + T * 0.75, exitY - 22, "EXIT ▼", { fontSize: "13px", color: "#2ecc71", fontFamily: "monospace", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5);

  return { platforms, exitZone, bgGraphics: bg };
}

function drawBgDetails(g: Phaser.GameObjects.Graphics) {
  g.lineStyle(1, 0x16213e, 0.45);
  for (let x = 0; x < LEVEL_WIDTH; x += 64) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, LEVEL_HEIGHT); g.strokePath();
  }
  for (let y = 0; y < LEVEL_HEIGHT; y += 64) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(LEVEL_WIDTH, y); g.strokePath();
  }
  for (let x = 120; x < LEVEL_WIDTH - 64; x += 180) {
    g.fillStyle(0x16213e, 0.65);
    g.fillRect(x, 36, 52, 26);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x2d3748, 0.8);
      g.fillRect(x + 4 + i * 11, 40, 7, 18);
    }
  }
  g.fillStyle(0x4a5568, 0.4);
  for (let y = 60; y < LEVEL_HEIGHT - 60; y += 80) {
    g.fillCircle(20, y, 3);
    g.fillCircle(LEVEL_WIDTH - 20, y, 3);
  }
}
