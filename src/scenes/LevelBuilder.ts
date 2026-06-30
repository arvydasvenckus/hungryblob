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
 *   NARROW = 56px → stage 1 (47px) fits, stage 2 (66px) blocked
 *   MEDIUM = 132px → stage 5 (123px) fits, stage 6 (141px) blocked
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
 *   [MEDIUM DUCT x=900–1230]   stage 6+ blocked; burp to reach stage 5 or below to pass
 *   [Section 3]  orange (+1)         → Stage 3
 *                burger (+2)         → Stage 5
 *                carrot (+1)         → Stage 6
 *   [EXIT x≈1510]
 */

const T = TILE_SIZE; // 32

const NARROW = Math.round((SIZE_STAGES[1].height + SIZE_STAGES[2].height) / 2) - 1; // (34+40)/2-1 = 36
const MEDIUM  = Math.round((SIZE_STAGES[5].height + SIZE_STAGES[6].height) / 2);    // (62+71)/2 = 66

export const LEVEL_WIDTH  = 1600;
export const LEVEL_HEIGHT = 560;
const FLOOR_Y = LEVEL_HEIGHT - T; // 528

// Duct x-ranges (used to enforce the "no food inside ducts" rule visually)
const NARROW_X_START = 490;
const NARROW_X_END   = 750;
const MEDIUM_X_START = 900;
const MEDIUM_X_END   = 1230;

export interface LevelObjects {
  platforms:  Phaser.Physics.Arcade.StaticGroup;
  exitZone:   Phaser.GameObjects.Zone;
  bgGraphics: Phaser.GameObjects.Graphics;
  levelWidth: number;
  levelHeight: number;
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

  return { platforms, exitZone, bgGraphics: bg, levelWidth: LEVEL_WIDTH, levelHeight: LEVEL_HEIGHT };
}

// ─────────────────────────────────────────────────────────────────────────────
// Level 1 — "The Squeeze"   (kitchen theme, timed, challenging)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Two GAP_A ducts + one GAP_B duct force players to manage Bob's size carefully.
 *
 * Gap physics:
 *   GAP_A = 56px  → stage 1 (47px) fits, stage 2 (66px) blocked
 *   GAP_B = 75px  → stage 2 (66px) fits, stage 3 (85px) blocked
 *
 * Open sections (food-safe zones):
 *   Section 1: x=32-400
 *   Section 2: x=680-950
 *   Section 3: x=1200-1500
 *   Section 4: x=1780-2168
 *
 * The SECOND GAP_A (x=1500-1780) is the crunch: players who ate greedily in
 * sections 2-3 must burn clock time burping back to stage ≤1.
 */
export const LEVEL2_WIDTH  = 2200;
export const LEVEL2_HEIGHT = 560;

export function buildLevel2(scene: Phaser.Scene): LevelObjects {
  const T2       = TILE_SIZE;
  const FLOOR2   = LEVEL2_HEIGHT - T2; // 528
  const GAP_A    = 56; // allows stage 1 (47px), blocks stage 2 (66px)
  const GAP_B    = 75; // allows stage 2 (66px), blocks stage 3 (85px)

  const platforms = scene.physics.add.staticGroup();

  // Background — warm kitchen palette
  const bg = scene.add.graphics();
  bg.fillStyle(0x2c1810, 1); // dark warm brown (kitchen wall)
  bg.fillRect(0, 0, LEVEL2_WIDTH, LEVEL2_HEIGHT);
  drawKitchenBg(bg, LEVEL2_WIDTH, LEVEL2_HEIGHT);

  // ── Wall helper (warm steel / cast-iron look) ──────────────────────────────
  function wall2(x: number, y: number, w: number, h: number, isRaised = false) {
    const g = scene.add.graphics();
    const baseColor = isRaised ? 0x8B7355 : 0x4a3728; // wood-ish platform vs dark wall
    g.fillStyle(baseColor, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x6b5042, 0.7); g.fillRect(0, 0, w, 3);
    g.fillStyle(0x8b6b50, 0.4); g.fillRect(0, 0, 2, h);
    if (w > 64) {
      g.fillStyle(0x6b5042, 0.5);
      for (let rx = 16; rx < w - 16; rx += 56) {
        g.fillCircle(rx, h / 2, 4);
      }
    }
    const key = `l2_wall_${x}_${y}_${w}_${h}`;
    g.generateTexture(key, w, h);
    g.destroy();
    const img = scene.physics.add.staticImage(x + w / 2, y + h / 2, key);
    img.setDisplaySize(w, h);
    img.refreshBody();
    platforms.add(img);
  }

  function ductCeiling2(x: number, gap: number, width: number, thickness = T2) {
    const ceilBottom = FLOOR2 - gap;
    wall2(x, ceilBottom - thickness, width, thickness);
  }

  // ── Boundaries ─────────────────────────────────────────────────────────────
  wall2(0,                0,          T2,            LEVEL2_HEIGHT);
  wall2(LEVEL2_WIDTH - T2, 0,         T2,            LEVEL2_HEIGHT);
  wall2(0,                0,          LEVEL2_WIDTH,  T2);
  wall2(0,                FLOOR2,     LEVEL2_WIDTH,  T2);

  // ── First GAP_A duct (x=400-680) ──────────────────────────────────────────
  ductCeiling2(400, GAP_A, 280);

  // ── GAP_B duct (x=950-1200) ───────────────────────────────────────────────
  ductCeiling2(950, GAP_B, 250);

  // ── Second GAP_A duct (x=1500-1780) ─ the crunch ─────────────────────────
  ductCeiling2(1500, GAP_A, 280);

  // ── Raised platform in section 3 (x=1310, top y=448) ─────────────────────
  // Reachable by stage ≤4, NOT by stage 5+ (jump height drops below 80px)
  wall2(1310, 448, 96, 16, true);

  // ── EXIT ──────────────────────────────────────────────────────────────────
  const exitX = LEVEL2_WIDTH - T2 * 3;
  const exitY = FLOOR2 - T2 * 2;

  // Re-use cached texture if it exists, otherwise generate
  if (!scene.textures.exists("exit_door")) {
    const exitGfx = scene.add.graphics();
    exitGfx.fillStyle(0x2ecc71, 0.2);
    exitGfx.fillRect(0, 0, T2 * 1.5, T2 * 2);
    exitGfx.lineStyle(3, 0x2ecc71, 1);
    exitGfx.strokeRect(0, 0, T2 * 1.5, T2 * 2);
    exitGfx.fillStyle(0x2ecc71, 1);
    exitGfx.fillTriangle(8, T2 * 0.6, 18, T2, 8, T2 * 1.4);
    exitGfx.generateTexture("exit_door", T2 * 1.5, T2 * 2);
    exitGfx.destroy();
  }
  scene.add.image(exitX + T2 * 0.75, exitY + T2, "exit_door");
  const exitZone = scene.add.zone(exitX + T2 * 0.75, exitY + T2, T2 * 1.5, T2 * 2);
  scene.physics.world.enable(exitZone, Phaser.Physics.Arcade.STATIC_BODY);

  // ── Level label ───────────────────────────────────────────────────────────
  const hs2: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: "13px", color: "#c9956a", fontFamily: "monospace",
    stroke: "#000", strokeThickness: 2, align: "center",
  };
  scene.add.text(exitX + T2 * 0.75, exitY - 22, "EXIT ▼",
    { fontSize: "13px", color: "#2ecc71", fontFamily: "monospace", stroke: "#000", strokeThickness: 2 })
    .setOrigin(0.5);

  // Duct entrance hints
  scene.add.text(410, FLOOR2 - 68, "Tight! →", { ...hs2, color: "#e67e22" }).setOrigin(0, 0.5);
  scene.add.text(960, FLOOR2 - 68, "Wider →", { ...hs2 }).setOrigin(0, 0.5);
  scene.add.text(1510, FLOOR2 - 68, "Tight again! →", { ...hs2, color: "#e74c3c" }).setOrigin(0, 0.5);

  return { platforms, exitZone, bgGraphics: bg, levelWidth: LEVEL2_WIDTH, levelHeight: LEVEL2_HEIGHT };
}

function drawKitchenBg(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  // Tile-like wall pattern (kitchen tiles)
  g.lineStyle(1, 0x3d2418, 0.5);
  for (let x = 0; x < w; x += 48) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.strokePath();
  }
  for (let y = 0; y < h; y += 48) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.strokePath();
  }

  // Hanging pots / pans silhouettes at ceiling
  for (let x = 120; x < w - 80; x += 260) {
    // Pan
    g.fillStyle(0x1a0f0a, 0.7);
    g.fillEllipse(x, 55, 44, 28);
    g.fillRect(x + 20, 48, 28, 6); // handle
    // Pot next to it
    g.fillStyle(0x1a0f0a, 0.6);
    g.fillRoundedRect(x + 80, 40, 32, 30, 4);
    g.fillRect(x + 74, 48, 10, 6);  // left handle
    g.fillRect(x + 112, 48, 10, 6); // right handle
  }

  // Steam wisps rising from floor level
  g.lineStyle(1.5, 0x8b6b50, 0.2);
  for (let x = 200; x < w - 100; x += 350) {
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      const sx = x + i * 20;
      g.moveTo(sx, h - 60);
      g.lineTo(sx + 8, h - 120);
      g.lineTo(sx - 4, h - 180);
      g.strokePath();
    }
  }

  // Counter-top / shelf line near floor
  g.fillStyle(0x5c3d26, 0.4);
  g.fillRect(0, h - 70, w, 6);
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
