import Phaser from "phaser";
import { TILE_SIZE, SIZE_STAGES } from "../config/constants";

/**
 * Tutorial — progressive mechanic introduction
 *
 * Learning sequence (left → right):
 *   1. Open arena          (x=32–380)   move + jump, no food
 *   2. Elevated platform   (x=360–460)  bonus grapes — easy to miss, creates backtrack need
 *   3. Apple on ground     (x=490)      first food → stage 1 (47px)
 *   4. THE WALL            (x=530)      full-height, 37px floor gap → stage 0 only
 *                                       stage 1 (47px) cannot pass → must wait for burp
 *   5. Junk food section   (x=600–850)  burger + watermelon, score lesson
 *   6. Locked exit         (x=1050)     200 pts needed → player may backtrack for grapes
 *
 * Backtrack mechanic:
 *   apple(50) + burger(100) = 150 → exit locked → go back through wall for grapes(50) or watermelon(50)
 *   Going back through the 37px gap requires being stage 0 again (must wait for burps).
 *   Teaches: junk food makes re-navigation harder.
 *
 * FOOD RULE: all food is in open zones — never under any ceiling.
 */

const T = TILE_SIZE; // 32

export const LEVEL_WIDTH  = 2400;
export const LEVEL_HEIGHT = 560;
const FLOOR_Y = LEVEL_HEIGHT - T; // 528

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

  // ── Vertical wall with horizontal floor gap ────────────────────────────────
  // gapTop = y where the gap starts (from ceiling), gapBottom = y where gap ends (toward floor)
  function vertWall(x: number, gapTop: number, gapBottom: number) {
    if (gapTop > T)           wall(x, T, T, gapTop - T);          // upper section (below global ceiling)
    if (gapBottom < FLOOR_Y)  wall(x, gapBottom, T, FLOOR_Y - gapBottom); // lower section (above floor)
  }

  // ── Boundaries ─────────────────────────────────────────────────────────────
  wall(0,               0,       T,           LEVEL_HEIGHT); // left
  wall(LEVEL_WIDTH - T, 0,       T,           LEVEL_HEIGHT); // right
  wall(0,               0,       LEVEL_WIDTH, T);            // ceiling
  wall(0,               FLOOR_Y, LEVEL_WIDTH, T);            // floor

  // ── TWO-BAR STACK (x=900–1060): too tall to jump over, gap too narrow for stage 1
  //
  //  ceiling (y=32)
  //  ═══════════  upper beam  y=32–280   (touches ceiling → can't jump above it)
  //  ═══════════  lower beam  y=280–495  (immediately adjacent → no air gap to exploit)
  //               floor gap   y=495–528 = 33px  (stage 0 = 28px fits; stage 1 = 47px blocked)
  //  floor (y=528)
  //
  // IMPORTANT: beams are adjacent (no air gap) so Bob cannot land between them.
  // Lower beam top at y=280: stage 0 peak body_bottom=354 > 280 → can't jump to top.
  // Stage 1 peak body_bottom=381 > 280 → also can't reach the lower beam top.
  // Only passage is the 33px floor gap — stage 0 (28px body) fits; stage 1 (47px) blocked.
  wall(900,  T,    160, 248); // upper beam — y=32 to y=280 (touches ceiling)
  wall(900,  280,  160, 215); // lower beam — y=280 to y=495 (adjacent, no air gap)

  // ── L-SECTION (L rotated 90° CW): sealed left wall, right-side entry ─────
  //
  // Shape: dead end on LEFT, entry on RIGHT (player encounters entry while going right)
  //
  //  x=1300   x=1460              x=1810  x=1850
  //    |  open dead-end |  tunnel (75px) | open entry
  //    |  [FOOD x=1420] |════════════════|  ↑ jump up
  //    |════════════════|════════════════|  from floor
  //    ← left wall seals             (open, no right wall)
  //
  // Tunnel gap: 424 − 349 = 75px → stage 0–2 (28/47/66px) fit; stage 3 (85px) blocked
  // Rise to enter: 528 − 424 = 104px → stages 0–2 can jump (stage 3: 102px, just short)
  // Food at x=1420 is in the open dead-end (x=1300–1460, no ceiling) → safe to eat & grow
  //
  // Backtrack path:
  //   pass x=1850 going right → hit exit (locked) → return → jump up at x=1810
  //   → traverse tunnel left → reach open dead-end → get watermelon → backtrack right
  //   → drop to floor at x=1850 → go right to exit (200 pts)

  // Main floor (y=528) is unobstructed under the elevated platform.
  // LEFT BARRIER at x=1460 (ceiling → platform): tunnel is only accessible from the RIGHT.
  // Players can jump onto the platform at x=1300-1460 (left section) but are stopped
  // at x=1460 by the barrier — they must instead jump up at x=1810-1850 to enter the tunnel.
  wall(1300, 424, 750, T);           // platform floor: x=1300–2050, top at y=424
  wall(1460, T,   T,   424 - T);    // left tunnel barrier: x=1460, y=32–424 (ceiling to platform)
  wall(1460, 317, 550, T);           // tunnel ceiling: x=1460–2010, bottom at y=349, gap=75px
  // Entry gap: x=2010–2050 (open, no ceiling) — player must walk right to x≈2010 to see it

  // ── EXIT ──────────────────────────────────────────────────────────────────
  const exitX = LEVEL_WIDTH - T * 3;
  const exitY  = FLOOR_Y - T * 2;

  const exitGfx = scene.add.graphics();
  exitGfx.fillStyle(0x2ecc71, 0.2);  exitGfx.fillRect(0, 0, T * 1.5, T * 2);
  exitGfx.lineStyle(3, 0x2ecc71, 1); exitGfx.strokeRect(0, 0, T * 1.5, T * 2);
  exitGfx.fillStyle(0x2ecc71, 1);    exitGfx.fillTriangle(8, T * 0.6, 18, T, 8, T * 1.4);
  exitGfx.generateTexture("exit_door", T * 1.5, T * 2);
  exitGfx.destroy();

  scene.add.image(exitX + T * 0.75, exitY + T, "exit_door");
  const exitZone = scene.add.zone(exitX + T * 0.75, exitY + T, T * 1.5, T * 2);
  scene.physics.world.enable(exitZone, Phaser.Physics.Arcade.STATIC_BODY);

  // ── Exit label only — all other hints are managed by GameScene (progressive disclosure)
  scene.add.text(exitX + T * 0.75, exitY - 22, "EXIT ▼", {
    fontSize: "13px", color: "#2ecc71", fontFamily: "monospace", stroke: "#000", strokeThickness: 2,
  }).setOrigin(0.5);

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
 * Layout (see plan for details):
 *   x=32-300   Open start
 *   x=300-640  GAP_B floor duct (stages 0–2)
 *   x=640-1050 Dual path: GAP_A floor duct (stages 0–1) + elevated platform bypass (stages 0–2)
 *   x=1050-350 Open relief
 *   x=1350-382 Vertical wall with 75px horizontal gap (stages 0–2 can pass)
 *   x=1650-900 Staircase: step A y=452, step B y=408
 *   x=2100-400 GAP_C floor duct (stages 0–3)
 *   x=2400-950 Final sprint + exit
 *
 * Food rule: NEVER inside a duct (all food in open zones or on open platforms).
 */
export const LEVEL2_WIDTH  = 3000;
export const LEVEL2_HEIGHT = 560;

export function buildLevel2(scene: Phaser.Scene): LevelObjects {
  const T2     = TILE_SIZE;
  const FLOOR2 = LEVEL2_HEIGHT - T2; // 528
  const GAP_A  = 56;  // allows stage 1 (47px),  blocks stage 2 (66px)
  const GAP_B  = 75;  // allows stage 2 (66px),  blocks stage 3 (85px)
  const GAP_C  = 94;  // allows stage 3 (85px),  blocks stage 4 (104px)

  const platforms = scene.physics.add.staticGroup();

  // Background — warm kitchen palette
  const bg = scene.add.graphics();
  bg.fillStyle(0x2c1810, 1);
  bg.fillRect(0, 0, LEVEL2_WIDTH, LEVEL2_HEIGHT);
  drawKitchenBg(bg, LEVEL2_WIDTH, LEVEL2_HEIGHT);

  // ── Wall helper (warm cast-iron look) ──────────────────────────────────────
  function wall2(x: number, y: number, w: number, h: number, isRaised = false) {
    const g = scene.add.graphics();
    const baseColor = isRaised ? 0x8B7355 : 0x4a3728;
    g.fillStyle(baseColor, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0x6b5042, 0.7); g.fillRect(0, 0, w, 3);
    g.fillStyle(0x8b6b50, 0.4); g.fillRect(0, 0, 2, h);
    if (w > 64) {
      g.fillStyle(0x6b5042, 0.5);
      for (let rx = 16; rx < w - 16; rx += 56) g.fillCircle(rx, h / 2, 4);
    }
    const key = `l2_wall_${x}_${y}_${w}_${h}`;
    g.generateTexture(key, w, h);
    g.destroy();
    const img = scene.physics.add.staticImage(x + w / 2, y + h / 2, key);
    img.setDisplaySize(w, h); img.refreshBody();
    platforms.add(img);
  }

  // Floor-level horizontal duct ceiling
  function ductCeiling2(x: number, gap: number, width: number, thickness = T2) {
    wall2(x, FLOOR2 - gap - thickness, width, thickness);
  }

  // Vertical wall with a horizontal passage (gap from gapTop to gapBottom)
  function vertWall(x: number, gapTop: number, gapBottom: number) {
    if (gapTop > 0) wall2(x, 0, T2, gapTop);              // upper section
    if (gapBottom < FLOOR2) wall2(x, gapBottom, T2, FLOOR2 - gapBottom); // lower section
  }

  // ── Boundaries ─────────────────────────────────────────────────────────────
  wall2(0,                0,       T2,            LEVEL2_HEIGHT);
  wall2(LEVEL2_WIDTH - T2, 0,      T2,            LEVEL2_HEIGHT);
  wall2(0,                0,       LEVEL2_WIDTH,  T2);
  wall2(0,                FLOOR2,  LEVEL2_WIDTH,  T2);

  // ── Zone 1: GAP_B floor duct (x=300–640, stages 0–2) ─────────────────────
  ductCeiling2(300, GAP_B, 340);

  // ── Zone 2: Dual path (x=640–1050) ────────────────────────────────────────
  //    Floor path:    GAP_A duct — only stages 0–1 can walk through
  //    Elevated path: open platform at y=416 — stages 0–2 can jump to it
  //                   (rise=112px; stage 3 jump=102px, just short)
  //    Stage 2 MUST take the elevated path. Stage 3+ blocked by both → burp first.
  ductCeiling2(640, GAP_A, 410);          // floor-level narrow duct ceiling
  wall2(640, 416, 410, T2, true);         // elevated platform (top at y=416)

  // ── Zone 3: Open relief (x=1050–1280) ────────────────────────────────────
  // (food + breathing room)

  // ── Zone 4: Vertical wall with horizontal gap (x=1350, y=377–452) ─────────
  //    Stepping platform at y=452 on the left (rise=76px, stages 0–4 can reach)
  //    Gap = 75px (GAP_B): stages 0–2 can pass through while on the platform
  //    Stage 3 (85px): body top = 452−85=367 < 377 → hits upper wall → blocked
  //    Stage 4+ can't even reach the platform (jump < 76px)
  wall2(1280, 452, 70, T2, true);         // left stepping platform
  vertWall(1350, 377, 452);              // vertical wall with 75px gap
  // The right side lower wall top (y=452) acts as exit ledge; Bob drops to floor

  // ── Zone 5: Staircase (x=1650–1890) ──────────────────────────────────────
  //    Step A: y=452, rise=76px (stages 0–4)
  //    Step B: y=408, rise=120px from floor (stage 2 jump=125px — just reaches)
  wall2(1650, 452, 120, T2, true);        // step A
  wall2(1770, 408, 120, T2, true);        // step B

  // ── Zone 6: GAP_C floor duct (x=2100–2400, stages 0–3) ───────────────────
  ductCeiling2(2100, GAP_C, 300);

  // ── EXIT ──────────────────────────────────────────────────────────────────
  const exitX = LEVEL2_WIDTH - T2 * 3;
  const exitY = FLOOR2 - T2 * 2;

  if (!scene.textures.exists("exit_door")) {
    const exitGfx = scene.add.graphics();
    exitGfx.fillStyle(0x2ecc71, 0.2);  exitGfx.fillRect(0, 0, T2 * 1.5, T2 * 2);
    exitGfx.lineStyle(3, 0x2ecc71, 1); exitGfx.strokeRect(0, 0, T2 * 1.5, T2 * 2);
    exitGfx.fillStyle(0x2ecc71, 1);    exitGfx.fillTriangle(8, T2 * 0.6, 18, T2, 8, T2 * 1.4);
    exitGfx.generateTexture("exit_door", T2 * 1.5, T2 * 2); exitGfx.destroy();
  }
  scene.add.image(exitX + T2 * 0.75, exitY + T2, "exit_door");
  const exitZone = scene.add.zone(exitX + T2 * 0.75, exitY + T2, T2 * 1.5, T2 * 2);
  scene.physics.world.enable(exitZone, Phaser.Physics.Arcade.STATIC_BODY);

  // ── Hints ─────────────────────────────────────────────────────────────────
  const hs: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: "13px", color: "#c9956a", fontFamily: "monospace",
    stroke: "#000", strokeThickness: 2, align: "center",
  };
  scene.add.text(310, FLOOR2 - 68, "Tighten up →", { ...hs }).setOrigin(0, 0.5);
  scene.add.text(648, FLOOR2 - 68, "Jump up or squeeze!", { ...hs, color: "#f39c12" }).setOrigin(0, 0.5);
  scene.add.text(1290, FLOOR2 - 60, "Jump & fit the gap →", { ...hs, color: "#e67e22" }).setOrigin(0, 0.5);
  scene.add.text(1660, FLOOR2 - 68, "Staircase ↑", { ...hs }).setOrigin(0, 0.5);
  scene.add.text(2108, FLOOR2 - 68, "Big squeeze →", { ...hs, color: "#e74c3c" }).setOrigin(0, 0.5);
  scene.add.text(exitX + T2 * 0.75, exitY - 22, "EXIT ▼",
    { fontSize: "13px", color: "#2ecc71", fontFamily: "monospace", stroke: "#000", strokeThickness: 2 })
    .setOrigin(0.5);

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
