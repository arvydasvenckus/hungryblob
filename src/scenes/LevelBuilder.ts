import Phaser from "phaser";
import { TILE_SIZE, SIZE_STAGES } from "../config/constants";

/**
 * Builds Level 1 (Air Duct theme) entirely in code using Phaser's arcade
 * physics static groups and graphics. When real Tiled tilemaps are ready,
 * swap this out with a Phaser tilemap loader.
 *
 * Passage widths are sized to gate specific blob stages:
 *   narrow  = 1.3 × Stage 0 height → only Stage 0 (28px) fits → gap ~37px
 *   medium  = 1.3 × Stage 1 height → Stage 0–1 (38px) fits  → gap ~50px
 *   wide    = 1.3 × Stage 2 height → Stage 0–2 (50px) fits  → gap ~65px
 *   open    = 1.3 × Stage 3 height → Stage 0–3 fit          → gap ~83px
 */

const T = TILE_SIZE; // 32
const NARROW = Math.ceil(SIZE_STAGES[0].height * 1.3); // ~37 → use 40
const MEDIUM = Math.ceil(SIZE_STAGES[1].height * 1.3); // ~50 → use 52
const WIDE   = Math.ceil(SIZE_STAGES[2].height * 1.3); // ~65 → use 68
const OPEN   = Math.ceil(SIZE_STAGES[3].height * 1.3); // ~84 → use 88

export const LEVEL_WIDTH  = 1920;
export const LEVEL_HEIGHT = 560;

export interface LevelObjects {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  exitZone: Phaser.GameObjects.Zone;
  bgGraphics: Phaser.GameObjects.Graphics;
}

export function buildLevel1(scene: Phaser.Scene): LevelObjects {
  const platforms = scene.physics.add.staticGroup();

  const bg = scene.add.graphics();
  bg.fillStyle(0x1a1a2e, 1);
  bg.fillRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
  drawBgDetails(bg);

  // Helper: add a solid platform rectangle
  function wall(x: number, y: number, w: number, h: number) {
    const g = scene.add.graphics();
    g.fillStyle(0x2d3748, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x4a5568, 0.6);
    g.fillRect(0, 0, w, 3);
    g.fillRect(0, 0, 3, h);
    g.fillStyle(0x718096, 0.3);
    g.fillRect(0, 0, w, 1);
    g.generateTexture(`wall_${x}_${y}`, w, h);
    g.destroy();

    const img = scene.physics.add.staticImage(x + w / 2, y + h / 2, `wall_${x}_${y}`);
    img.setDisplaySize(w, h);
    img.refreshBody();
    platforms.add(img);
  }

  // Helper: duct ceiling/floor pair that creates a passage gap
  function duct(x: number, floorY: number, passageH: number, w: number, thickness = T) {
    const ceilY = floorY - passageH - thickness;
    wall(x, ceilY, w, thickness);          // ceiling
    wall(x, floorY, w, thickness);         // floor
  }

  // ── FLOOR ─────────────────────────────────────────────────────────────────
  // Main floor runs the full width
  wall(0, LEVEL_HEIGHT - T, LEVEL_WIDTH, T);

  // ── CEILING ───────────────────────────────────────────────────────────────
  wall(0, 0, LEVEL_WIDTH, T);

  // ── LEFT WALL ─────────────────────────────────────────────────────────────
  wall(0, 0, T, LEVEL_HEIGHT);

  // ── RIGHT WALL ────────────────────────────────────────────────────────────
  wall(LEVEL_WIDTH - T, 0, T, LEVEL_HEIGHT);

  // ── SECTION 1: Open start area ────────────────────────────────────────────
  // Platform player starts on
  wall(T, LEVEL_HEIGHT - T * 2, T * 6, T / 2);

  // ── SECTION 2: Narrow duct (Stage 0 only) ─────────────────────────────────
  // Horizontal duct from x=220 to x=500, gap = NARROW
  const ductFloor1 = LEVEL_HEIGHT - T * 4;
  duct(220, ductFloor1, NARROW, 280);

  // Step up to enter duct
  wall(160, ductFloor1 - T, T * 2, T / 2);

  // ── SECTION 3: Open chamber with food ────────────────────────────────────
  // Drop down into a chamber
  wall(500, LEVEL_HEIGHT - T * 2, T * 4, T / 2); // landing

  // ── SECTION 4: Medium duct (Stage 0–1) ────────────────────────────────────
  const ductFloor2 = LEVEL_HEIGHT - T * 6;
  duct(620, ductFloor2, MEDIUM, 300);
  wall(500, ductFloor2 - T, T * 4, T / 2); // step up

  // ── SECTION 5: Vertical shaft ─────────────────────────────────────────────
  // Left wall of shaft
  wall(920, T, T, LEVEL_HEIGHT - T * 3);
  // Right wall (open at bottom for player to enter from left)
  wall(920 + OPEN + T, T, T, LEVEL_HEIGHT - T * 5);

  // ── SECTION 6: Wide duct (Stage 0–2) ──────────────────────────────────────
  const ductFloor3 = T * 5;
  duct(960 + OPEN, ductFloor3, WIDE, 340);
  // Landing at top right of shaft
  wall(920 + OPEN + T, ductFloor3 - T, T * 4, T / 2);

  // ── SECTION 7: Descending platforms ───────────────────────────────────────
  wall(1350, T * 8, T * 5, T / 2);
  wall(1480, T * 11, T * 5, T / 2);
  wall(1350, T * 14, T * 5, T / 2);

  // ── SECTION 8: Final narrow squeeze before exit ───────────────────────────
  const ductFloor4 = LEVEL_HEIGHT - T * 4;
  duct(1560, ductFloor4, NARROW, 220);

  // ── EXIT ──────────────────────────────────────────────────────────────────
  // Green door graphic
  const exitGfx = scene.add.graphics();
  exitGfx.fillStyle(0x2ecc71, 0.25);
  exitGfx.fillRect(0, 0, T * 2, T * 3);
  exitGfx.lineStyle(3, 0x2ecc71, 1);
  exitGfx.strokeRect(0, 0, T * 2, T * 3);
  exitGfx.fillStyle(0x2ecc71, 1);
  exitGfx.fillTriangle(12, T, 20, T * 1.5, 12, T * 2);
  exitGfx.generateTexture("exit_door", T * 2, T * 3);
  exitGfx.destroy();

  const exitX = LEVEL_WIDTH - T * 3;
  const exitY = LEVEL_HEIGHT - T * 4;
  scene.add.image(exitX + T, exitY + T * 1.5, "exit_door");

  const exitZone = scene.add.zone(exitX + T, exitY + T * 1.5, T * 2, T * 3);
  scene.physics.world.enable(exitZone, Phaser.Physics.Arcade.STATIC_BODY);

  return { platforms, exitZone, bgGraphics: bg };
}

function drawBgDetails(g: Phaser.GameObjects.Graphics) {
  // Subtle grid lines to evoke ceiling panels
  g.lineStyle(1, 0x16213e, 0.5);
  for (let x = 0; x < LEVEL_WIDTH; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, LEVEL_HEIGHT);
    g.strokePath();
  }
  for (let y = 0; y < LEVEL_HEIGHT; y += 64) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(LEVEL_WIDTH, y);
    g.strokePath();
  }
  // Vent grille decorations
  for (let x = 80; x < LEVEL_WIDTH; x += 200) {
    g.fillStyle(0x16213e, 0.7);
    g.fillRect(x, 40, 48, 24);
    g.lineStyle(1, 0x2d3748, 0.8);
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0x2d3748, 0.8);
      g.fillRect(x + 4 + i * 10, 44, 6, 16);
    }
  }
}
