import Phaser from "phaser";
import { TILE_SIZE, SIZE_STAGES } from "../config/constants";

/**
 * Tutorial Level 1 — "Air Ducts"
 *
 * Passage widths (gap between ceiling and main floor):
 *   NARROW = 37 px  → Stage 0 (28 px) fits,  Stage 1 (38 px) blocked
 *   MEDIUM = 44 px  → Stage 1 (38 px) fits,  Stage 2 (50 px) blocked
 *
 * Guided food sequence (see levels.ts):
 *   apple + banana          → reach Stage 0 max (food_count = 2)
 *   [NARROW DUCT]           → can only pass at Stage 0
 *   strawberry              → food_count = 3, Stage 1
 *   burger (+2) + pizza (+2)→ food_count = 7, Stage 2
 *   [MEDIUM DUCT]           → blocked at Stage 2, must digest to Stage 1
 *   orange + carrot         → food_count = 9–10, Stage 3
 *   [EXIT]
 */

const T = TILE_SIZE; // 32

// Gap sizes
const NARROW = Math.ceil(SIZE_STAGES[0].height * 1.3); // 37 px
const MEDIUM  = 44; // allows stage 1 (38 px), blocks stage 2 (50 px)

export const LEVEL_WIDTH  = 1440;
export const LEVEL_HEIGHT = 560;
const FLOOR_Y = LEVEL_HEIGHT - T; // y=528, top of floor tile

export interface LevelObjects {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  exitZone:  Phaser.GameObjects.Zone;
  bgGraphics: Phaser.GameObjects.Graphics;
}

export function buildLevel1(scene: Phaser.Scene): LevelObjects {
  const platforms = scene.physics.add.staticGroup();

  // ── Background ─────────────────────────────────────────────────────────────
  const bg = scene.add.graphics();
  bg.fillStyle(0x1a1a2e, 1);
  bg.fillRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
  drawBgDetails(bg);

  // ── Wall helper ────────────────────────────────────────────────────────────
  function wall(x: number, y: number, w: number, h: number, color = 0x2d3748) {
    const g = scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    // Top edge highlight
    g.fillStyle(0x4a5568, 0.7); g.fillRect(0, 0, w, 3);
    // Left edge highlight
    g.fillStyle(0x718096, 0.3); g.fillRect(0, 0, 2, h);
    // Rivet decorations on wider walls
    if (w > 64) {
      g.fillStyle(0x4a5568, 0.5);
      for (let rx = 12; rx < w - 12; rx += 48) {
        g.fillCircle(rx, h / 2, 3);
        g.fillCircle(rx + 24, h / 2, 3);
      }
    }
    const texKey = `wall_${x}_${y}_${w}_${h}`;
    g.generateTexture(texKey, w, h);
    g.destroy();
    const img = scene.physics.add.staticImage(x + w / 2, y + h / 2, texKey);
    img.setDisplaySize(w, h);
    img.refreshBody();
    platforms.add(img);
  }

  // ── Duct ceiling helper ─────────────────────────────────────────────────────
  // Creates ONLY the ceiling of a duct (the floor is the main floor).
  function ductCeiling(x: number, gapFromFloor: number, width: number, thickness = T) {
    const ceilBottom = FLOOR_Y - gapFromFloor;
    const ceilTop    = ceilBottom - thickness;
    wall(x, ceilTop, width, thickness);
  }

  // ── Boundary walls ─────────────────────────────────────────────────────────
  wall(0, 0, T, LEVEL_HEIGHT);                       // left
  wall(LEVEL_WIDTH - T, 0, T, LEVEL_HEIGHT);         // right
  wall(0, 0, LEVEL_WIDTH, T);                        // ceiling
  wall(0, FLOOR_Y, LEVEL_WIDTH, T);                  // floor

  // ── SECTION 1: Open start (x 32 → 480) ────────────────────────────────────
  // Nothing special — open space for player to learn controls.

  // ── SECTION 2: Narrow duct (x 490 → 750) ──────────────────────────────────
  // Gap = 37 px: stage 0 (28 px) fits, stage 1 (38 px) blocked.
  ductCeiling(490, NARROW, 260);

  // Low step ramp leading into the duct
  wall(430, FLOOR_Y - T * 1.5, 64, T * 0.5);

  // ── SECTION 3: Open chamber (x 750 → 1110) ────────────────────────────────
  // Spacious — unhealthy food here, player grows fast.
  // Small raised platform so it feels less flat
  wall(900, FLOOR_Y - T * 2, 80, T * 0.5);

  // ── SECTION 4: Medium duct (x 1115 → 1360) ────────────────────────────────
  // Gap = 44 px: stage 1 (38 px) fits, stage 2 (50 px) blocked.
  ductCeiling(1115, MEDIUM, 245);

  // ── EXIT ──────────────────────────────────────────────────────────────────
  const exitX = LEVEL_WIDTH - T * 2 - 10;
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

  // ── TUTORIAL HINTS (in-world text) ─────────────────────────────────────────
  const hintStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: "13px",
    color: "#a0aec0",
    fontFamily: "monospace",
    stroke: "#000000",
    strokeThickness: 2,
    align: "center",
  };

  // Controls
  scene.add.text(160, FLOOR_Y - 110, "← → Move\n↑ / SPACE Jump", hintStyle).setOrigin(0.5);

  // Arrow above apple spawn
  scene.add.text(280, FLOOR_Y - 90, "▼", { fontSize: "20px", color: "#27ae60", stroke: "#000", strokeThickness: 2 }).setOrigin(0.5);

  // Before narrow duct
  scene.add.text(510, FLOOR_Y - 70, "Too big? Wait to digest!", {
    ...hintStyle, color: "#f39c12",
  }).setOrigin(0.5);

  // After narrow duct — unhealthy food hint
  scene.add.text(960, FLOOR_Y - 100, "Unhealthy food\n×2 growth + ×2 score!", {
    ...hintStyle, color: "#ff6b9d",
  }).setOrigin(0.5);

  // Before medium duct
  scene.add.text(1135, FLOOR_Y - 70, "Digest again →", {
    ...hintStyle, color: "#f39c12",
  }).setOrigin(0.5);

  // Exit arrow
  scene.add.text(exitX + T * 0.75, exitY - 20, "EXIT ▼", {
    fontSize: "14px", color: "#2ecc71", fontFamily: "monospace",
    stroke: "#000", strokeThickness: 2,
  }).setOrigin(0.5);

  return { platforms, exitZone, bgGraphics: bg };
}

// ── Background detail ──────────────────────────────────────────────────────

function drawBgDetails(g: Phaser.GameObjects.Graphics) {
  // Subtle grid
  g.lineStyle(1, 0x16213e, 0.45);
  for (let x = 0; x < LEVEL_WIDTH; x += 64) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, LEVEL_HEIGHT); g.strokePath();
  }
  for (let y = 0; y < LEVEL_HEIGHT; y += 64) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(LEVEL_WIDTH, y); g.strokePath();
  }
  // Vent grilles along ceiling
  for (let x = 120; x < LEVEL_WIDTH - 64; x += 180) {
    g.fillStyle(0x16213e, 0.65);
    g.fillRect(x, 36, 52, 26);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x2d3748, 0.8);
      g.fillRect(x + 4 + i * 11, 40, 7, 18);
    }
  }
  // Small bolt/rivet dots on walls
  g.fillStyle(0x4a5568, 0.4);
  for (let y = 60; y < LEVEL_HEIGHT - 60; y += 80) {
    g.fillCircle(20, y, 3);
    g.fillCircle(LEVEL_WIDTH - 20, y, 3);
  }
}
