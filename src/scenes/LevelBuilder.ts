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
  platforms:      Phaser.Physics.Arcade.StaticGroup;
  exitZone:       Phaser.GameObjects.Zone;
  exitDoorImage:  Phaser.GameObjects.Image;
  bgGraphics:     Phaser.GameObjects.Graphics;
  levelWidth:     number;
  levelHeight:    number;
}

export function buildLevel1(scene: Phaser.Scene): LevelObjects {
  const platforms = scene.physics.add.staticGroup();

  const bg = scene.add.graphics();
  bg.fillStyle(0x1c1208, 1);
  bg.fillRect(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
  drawRestaurantKitchenBg(bg, LEVEL_WIDTH, LEVEL_HEIGHT);

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

  // ── SECOND BARRIER (x=1260): 56px floor gap — stages 0–1 only ────────────
  // Player eats burger at x=1200 (becomes stage 3, 85px) → hits this wall.
  // Must wait/mash to burp down to stage 1 (47px) or stage 0 (28px) to pass.
  // gap=56px: stage 0 (28px) ✓, stage 1 (47px) ✓, stage 2 (66px) ✗
  vertWall(1260, FLOOR_Y - 56, FLOOR_Y);

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

  const exitDoorImage = scene.add.image(exitX + T * 0.75, exitY + T, "exit_door_locked");
  const exitZone = scene.add.zone(exitX + T * 0.75, exitY + T, T * 1.5, T * 2);
  scene.physics.world.enable(exitZone, Phaser.Physics.Arcade.STATIC_BODY);

  scene.add.text(exitX + T * 0.75, exitY - 22, "EXIT ▼", {
    fontSize: "13px", color: "#2ecc71", fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1, stroke: "#000", strokeThickness: 2,
  }).setOrigin(0.5);

  return { platforms, exitZone, exitDoorImage, bgGraphics: bg, levelWidth: LEVEL_WIDTH, levelHeight: LEVEL_HEIGHT };
}

// ─────────────────────────────────────────────────────────────────────────────
// Level 1 — "The Squeeze"   (kitchen theme, timed, challenging)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Three elevation lanes create stacked ceiling beams and vertical travel:
 *
 *   Floor  lane: y=528  — always open
 *   Mid    lane: y=420  — stages 0–3 jump from floor (rise=108px; stage 4: 91px, just short)
 *   High   lane: y=340  — stages 0–4 jump from mid (rise=80px); stage 0 only from floor (rise=188px)
 *
 * Gap physics:
 *   GAP_A = 56px  → stage 0–1 fit,   stage 2 blocked
 *   GAP_B = 75px  → stage 0–2 fit,   stage 3 blocked
 *   GAP_C = 94px  → stage 0–3 fit,   stage 4 blocked
 *
 * Layout:
 *   x=32–350    Zone 1: open start
 *   x=350–650   Zone 2: single floor GAP_B beam (stages 0–2)
 *   x=650–1050  Zone 3: DUAL LAYER — floor GAP_A + mid platform y=420 with GAP_B ceiling
 *   x=1050–1500 Zone 4: TRIPLE LAYER — floor open + mid y=420 + high y=340, each with ceiling
 *   x=1500–1900 Zone 5: descending steps high→mid→floor + vertical wall
 *   x=1900–2200 Zone 6: GAP_C floor duct (stages 0–3)
 *   x=2200–2950 Zone 7: final sprint + exit
 *
 * Food rule: NEVER inside a duct (all food in open zones or open platform edges).
 */
export const LEVEL2_WIDTH  = 3000;
export const LEVEL2_HEIGHT = 560;

export function buildLevel2(scene: Phaser.Scene): LevelObjects {
  const T2     = TILE_SIZE;
  const FLOOR2 = LEVEL2_HEIGHT - T2; // 528
  const GAP_A  = 56;  // stage 0–1 fit,  stage 2 (66px) blocked
  const GAP_B  = 75;  // stage 0–2 fit,  stage 3 (85px) blocked
  const GAP_C  = 94;  // stage 0–3 fit,  stage 4 (104px) blocked

  // Elevation lanes
  const MID_Y  = 420; // mid platform top  (rise 108px from floor; stages 0–3)
  const HIGH_Y = 340; // high platform top (rise 80px from mid;   stages 0–4)

  const platforms = scene.physics.add.staticGroup();

  const bg = scene.add.graphics();
  bg.fillStyle(0x0e1218, 1);
  bg.fillRect(0, 0, LEVEL2_WIDTH, LEVEL2_HEIGHT);
  drawSupermarketBg(bg, LEVEL2_WIDTH, LEVEL2_HEIGHT);

  // ── Wall helper ─────────────────────────────────────────────────────────────
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

  // Floor-level ceiling duct
  function ductCeiling2(x: number, gap: number, width: number) {
    wall2(x, FLOOR2 - gap - T2, width, T2);
  }

  // Elevated duct: platform + ceiling slab at gap distance above it
  // openLeft / openRight = px to leave uncovered at each edge (food-safe zones)
  function elevatedDuct(x: number, platformY: number, gap: number, width: number,
                        openLeft = 0, openRight = 0) {
    wall2(x, platformY, width, T2, true);                           // platform floor
    const ceilX = x + openLeft;
    const ceilW = width - openLeft - openRight;
    if (ceilW > 0) wall2(ceilX, platformY - gap - T2, ceilW, T2);  // ceiling slab
  }

  // Vertical wall with horizontal passage
  function vertWall(x: number, gapTop: number, gapBottom: number) {
    if (gapTop > 0)         wall2(x, 0,          T2, gapTop);
    if (gapBottom < FLOOR2) wall2(x, gapBottom,  T2, FLOOR2 - gapBottom);
  }

  // ── Boundaries ─────────────────────────────────────────────────────────────
  wall2(0,                0,      T2,           LEVEL2_HEIGHT);
  wall2(LEVEL2_WIDTH - T2, 0,     T2,           LEVEL2_HEIGHT);
  wall2(0,                0,      LEVEL2_WIDTH, T2);
  wall2(0,                FLOOR2, LEVEL2_WIDTH, T2);

  // ── Zone 1 (x=32–350): open start ─────────────────────────────────────────
  // (food: apple at x=150)

  // ── Zone 2 (x=350–650): single floor GAP_B beam ───────────────────────────
  // One beam at floor level. Stages 0–2 walk through.
  ductCeiling2(350, GAP_B, 300);

  // ── Zone 3 (x=650–1050): DUAL LAYER ──────────────────────────────────────
  //
  //   y=313  ─────────────  mid ceiling  (GAP_B above mid platform)
  //   y=345    (gap 75px)
  //   y=420  ═════════════  mid platform
  //   y=440  ─────────────  floor ceiling (GAP_A)
  //   y=472    (gap 56px)
  //   y=528                 floor
  //
  // Floor path: stages 0–1 only (GAP_A=56)
  // Mid path:   jump to y=420 (stages 0–3) + pass GAP_B ceiling (stages 0–2)
  // Stage 3+:   blocked both ways → burp first
  ductCeiling2(650, GAP_A, 400);                           // floor beam
  elevatedDuct(650, MID_Y, GAP_B, 400, 0, 0);             // mid platform + mid ceiling

  // ── Zone 4 (x=1050–1500): TRIPLE LAYER ───────────────────────────────────
  //
  //   y=233  ─────────────  high ceiling (GAP_B above high platform)
  //   y=265    (gap 75px)
  //   y=340  ═════════════  high platform (step from mid: rise=80px, stages 0–4)
  //   y=313  ─────────────  mid ceiling  (GAP_B above mid platform)
  //   y=345    (gap 75px)
  //   y=420  ═════════════  mid platform (rise=108px from floor, stages 0–3)
  //   y=528                 floor — OPEN (food zone, no floor beam here)
  //
  // Open edges: 80px at each side of each platform before ceiling starts,
  //             giving food-safe zones and visible "entry/exit" indicators.
  const Z4_LEFT  = 1050;
  const Z4_RIGHT = 1500;
  const Z4_W     = Z4_RIGHT - Z4_LEFT; // 450

  // Mid lane: platform x=1050–1500, ceiling x=1130–1420 (80px open each side)
  elevatedDuct(Z4_LEFT, MID_Y, GAP_B, Z4_W, 80, 80);

  // High lane: platform x=1180–1450, ceiling x=1250–1380 (70px open each side)
  // Accessible only by stepping up from mid (rise=80px, stages 0–4)
  elevatedDuct(1180, HIGH_Y, GAP_B, 270, 70, 70);

  // ── Zone 5 (x=1500–1900): descending steps + vertical wall ────────────────
  //
  // Staircase descends: high → mid → floor
  // Step A: bridge from high (y=340) to mid (y=420) zone
  wall2(1500, 380, 100, T2, true);   // STEP-A shortened to 100px → 40px gap before STEP-B
  wall2(1640, 436, 120, T2, true);   // STEP-B: step down toward floor y=436
  // Vertical wall with GAP_B gap — stages 0–2 pass (stepping platform at y=436)
  vertWall(1760, 361, 436);           // gap: y=361–436 = 75px
  // (Bob drops from x=1760 right side back to floor)

  // ── Zone 6 (x=1900–2200): GAP_C floor duct (stages 0–3) ──────────────────
  ductCeiling2(1900, GAP_C, 300);

  // ── Zone 7 (x=2200–2950): final sprint ───────────────────────────────────
  // (food + exit — open)

  // ── EXIT ──────────────────────────────────────────────────────────────────
  const exitX = LEVEL2_WIDTH - T2 * 3;
  const exitY = FLOOR2 - T2 * 2;

  const exitDoorImage = scene.add.image(exitX + T2 * 0.75, exitY + T2, "exit_door_locked");
  const exitZone = scene.add.zone(exitX + T2 * 0.75, exitY + T2, T2 * 1.5, T2 * 2);
  scene.physics.world.enable(exitZone, Phaser.Physics.Arcade.STATIC_BODY);

  scene.add.text(exitX + T2 * 0.75, exitY - 22, "EXIT ▼",
    { fontSize: "13px", color: "#2ecc71", fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1, stroke: "#000", strokeThickness: 2 })
    .setOrigin(0.5);

  return { platforms, exitZone, exitDoorImage, bgGraphics: bg, levelWidth: LEVEL2_WIDTH, levelHeight: LEVEL2_HEIGHT };
}

// ─── Theme: Restaurant Kitchen (Tutorial) ───────────────────────────────────
function drawRestaurantKitchenBg(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  const T = TILE_SIZE;

  // Upper section — slightly lighter warm tone to suggest wall depth
  g.fillStyle(0x241810, 1); g.fillRect(0, 0, w, Math.round(h * 0.57));

  // Pot rail along ceiling
  g.fillStyle(0x3d2a1a, 1); g.fillRect(0, T, w, 8);
  g.fillStyle(0x5a3d22, 0.5); g.fillRect(0, T, w, 2); // top highlight

  // Warm overhead glow — one per 240px from rail
  for (let x = 120; x < w; x += 240) {
    g.fillStyle(0xc04800, 0.03); g.fillEllipse(x, T, 210, 150);
    g.fillStyle(0xe06010, 0.025); g.fillEllipse(x, T, 100, 80);
  }

  // Hanging pots / pans — alternating shapes every 240px
  for (let x = 120; x < w - 60; x += 240) {
    g.fillStyle(0x1e1208, 0.85);
    if (((x / 240) | 0) % 2 === 0) {
      // Pot — round body, two side handles
      g.fillRect(x - 3, T + 8, 6, 40);                          // rod
      g.fillRoundedRect(x - 22, T + 48, 44, 38, 5);             // body
      g.fillRect(x - 32, T + 62, 12, 8);                        // left handle
      g.fillRect(x + 20, T + 62, 12, 8);                        // right handle
      g.fillStyle(0x2e1e0e, 0.5); g.fillRect(x - 22, T + 48, 44, 4); // rim
    } else {
      // Pan — elliptical disc, long handle extending right
      g.fillRect(x - 3, T + 8, 6, 36);                          // rod
      g.fillEllipse(x, T + 58, 52, 28);                         // pan face
      g.fillRect(x + 22, T + 52, 40, 9);                        // handle
    }
  }

  // Wall tile grid
  g.lineStyle(1, 0x3d2618, 0.38);
  for (let x = 0; x <= w; x += 56) {
    g.beginPath(); g.moveTo(x, T); g.lineTo(x, h - 80); g.strokePath();
  }
  for (let y = T; y < h - 80; y += 56) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.strokePath();
  }

  // Counter band near floor
  g.fillStyle(0x2a1e12, 1); g.fillRect(0, h - 80, w, 80);
  // Metallic counter-top edge
  g.fillStyle(0x6a4a30, 0.6); g.fillRect(0, h - 81, w, 3);
  g.fillStyle(0x4a3020, 0.35); g.fillRect(0, h - 78, w, 2);
  // Kick plate
  g.fillStyle(0x120a04, 0.7); g.fillRect(0, h - 18, w, 18);

  // Steam wisps (very subtle)
  g.lineStyle(1.5, 0x7a5a38, 0.15);
  for (let x = 320; x < w; x += 480) {
    for (let i = 0; i < 3; i++) {
      const sx = x + i * 18;
      g.beginPath();
      g.moveTo(sx, h - 80); g.lineTo(sx + 6, h - 130); g.lineTo(sx - 3, h - 180);
      g.strokePath();
    }
  }
}

// ─── Theme: Supermarket (Level 1 — The Squeeze) ─────────────────────────────
function drawSupermarketBg(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  const T = TILE_SIZE;

  // Ceiling band
  g.fillStyle(0x0a0d12, 1); g.fillRect(0, 0, w, T + 18);

  // Fluorescent light strip at ceiling line
  g.fillStyle(0x1a2838, 0.9); g.fillRect(0, T, w, 5);

  // Fluorescent glow — one pool per 280px
  for (let x = 140; x < w; x += 280) {
    g.fillStyle(0x8cb4e0, 0.04); g.fillEllipse(x, T, 300, 200);
    g.fillStyle(0xaad0f4, 0.03); g.fillEllipse(x, T, 140, 100);
    // Light housing tube
    g.fillStyle(0x243448, 0.7); g.fillRect(x - 65, T + 2, 130, 4);
  }

  // Repeating shelf units — one per 320px
  for (let sx = 0; sx < w; sx += 320) {
    const rx  = sx + 50;
    const rw  = 220;
    const rh  = h - T - 18 - 64;

    // Back panel
    g.fillStyle(0x111c28, 1); g.fillRect(rx, T + 18, rw, rh);
    // Side uprights
    g.fillStyle(0x0e1820, 1);
    g.fillRect(rx,           T + 18, 10, rh);
    g.fillRect(rx + rw - 10, T + 18, 10, rh);
    // Top cap
    g.fillStyle(0x1c2c3c, 1); g.fillRect(rx, T + 14, rw, 5);

    // 7 shelf boards with product silhouettes
    const shelfStep = rh / 7;
    for (let si = 0; si < 7; si++) {
      const sy = T + 18 + si * shelfStep;
      g.fillStyle(0x182434, 1); g.fillRect(rx + 10, sy, rw - 20, 8);

      // Product boxes (4 per shelf, random heights)
      for (let bi = 0; bi < 4; bi++) {
        const bx = rx + 14 + bi * 50;
        const bh = 28 + ((si * 4 + bi) * 13) % 26;
        g.fillStyle(0x162030, 0.85); g.fillRect(bx, sy + 8, 42, bh);
        // Subtle edge highlight
        g.fillStyle(0x1e2c40, 0.45); g.fillRect(bx, sy + 8, 3, bh);
      }
    }
  }

  // Floor band
  g.fillStyle(0x0c1016, 1); g.fillRect(0, h - 66, w, 66);
  // Floor reflection edge
  g.fillStyle(0x1a2838, 0.22); g.fillRect(0, h - 67, w, 3);
  // Floor tile grid
  g.lineStyle(1, 0x141e2a, 0.42);
  for (let x = 0; x <= w; x += 100) {
    g.beginPath(); g.moveTo(x, h - 66); g.lineTo(x, h); g.strokePath();
  }
  for (let y = h - 66; y <= h; y += 33) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.strokePath();
  }
}

// ─── Theme: Vinted Kitchen (Level 2 — Sewer Depths) ─────────────────────────
// Vinted brand teal: #00b5a5
function drawVintedKitchenBg(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  const T    = TILE_SIZE;
  const TEAL = 0x00b5a5;

  // Ceiling band
  g.fillStyle(0x0a1010, 1); g.fillRect(0, 0, w, T + 20);

  // Teal brand glow from ceiling — one per 300px
  for (let x = 150; x < w; x += 300) {
    g.fillStyle(TEAL, 0.04); g.fillEllipse(x, T, 280, 210);
    g.fillStyle(0x00c8b8, 0.03); g.fillEllipse(x, T, 130, 110);
  }

  // Upper cabinet / utensil rail
  g.fillStyle(0x1e3030, 1); g.fillRect(0, T, w, 8);
  g.fillStyle(TEAL, 0.25); g.fillRect(0, T, w, 2); // teal highlight

  // Hanging utensils — three alternating shapes every 100px
  for (let x = 80; x < w - 40; x += 100) {
    g.fillStyle(0x142020, 0.88);
    const v = (x / 100 | 0) % 3;
    if (v === 0) {
      // Spatula: rod + flat rectangular head
      g.fillRect(x - 2, T + 8, 4, 50);
      g.fillRoundedRect(x - 9, T + 58, 18, 22, 2);
    } else if (v === 1) {
      // Ladle: rod + circle bowl
      g.fillRect(x - 2, T + 8, 4, 44);
      g.fillCircle(x, T + 60, 11);
    } else {
      // Fork: rod + two tines
      g.fillRect(x - 2, T + 8, 4, 54);
      g.fillRect(x - 8, T + 8, 4, 22);
      g.fillRect(x + 4, T + 8, 4, 22);
    }
  }

  // Wall tile grid (teal-tinted lines)
  g.lineStyle(1, 0x1e3232, 0.42);
  for (let x = 0; x <= w; x += 56) {
    g.beginPath(); g.moveTo(x, T); g.lineTo(x, h - 72); g.strokePath();
  }
  for (let y = T; y < h - 72; y += 56) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.strokePath();
  }

  // Sparse teal accent tiles — one every 280px × 168px grid cell
  for (let x = 56; x < w; x += 280) {
    for (let y = T + 56; y < h - 72; y += 168) {
      g.fillStyle(TEAL, 0.05); g.fillRect(x, y, 56, 56);
    }
  }

  // Counter band near floor
  g.fillStyle(0x1a2828, 1); g.fillRect(0, h - 74, w, 74);
  // Teal counter-top edge
  g.fillStyle(TEAL, 0.28); g.fillRect(0, h - 75, w, 3);
  g.fillStyle(0x1e3838, 0.55); g.fillRect(0, h - 72, w, 2);
  // Kick plate
  g.fillStyle(0x0a1212, 0.9); g.fillRect(0, h - 20, w, 20);
}

// ─────────────────────────────────────────────────────────────────────────────
// Level 3 — "Sewer Depths"   (cave theme, multi-tier platforms, three wall gaps)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Three escalating vertical-wall challenges (floor, mid, elevated gaps)
 * combined with an ascending and descending platform tower.
 *
 * Gap physics (body height must fit inside gap):
 *   84px gap — stages 0–2 (≤66px) pass; stage 3 (85px) blocked
 *   72px gap — stages 0–2 (≤66px) pass; stage 3 blocked
 *   80px gap — stages 0–2 (≤66px) pass; stage 3 blocked
 *
 * Vertical-wall mid-height gaps need a stepping platform on the left so Bob
 * can stand with his feet at gapBottom and walk through.
 *
 * Platform height design:
 *   Step A  y=448  rise=80px from floor  (stages 0–4 reach)
 *   Step B  y=384  rise=64px from A      (stages 0–5 from A)
 *   Step C  y=320  rise=64px from B
 *   Plat A  y=416  rise=112px from floor (stages 0–2 only)
 *   Plat B  y=464  rise=64px  from floor (stages 0–5)
 *   Plat C  y=432  rise=96px  from floor (stages 0–3)
 *   Plat D  y=416  rise=112px from floor (stages 0–2 only)
 *   Bonus   y=448  rise=80px  from floor (stages 0–4)
 */

export const LEVEL3_WIDTH  = 4000;
export const LEVEL3_HEIGHT = 560;

export function buildLevel3(scene: Phaser.Scene): LevelObjects {
  const T3     = TILE_SIZE;
  const FLOOR3 = LEVEL3_HEIGHT - T3; // 528

  const platforms = scene.physics.add.staticGroup();

  const bg = scene.add.graphics();
  bg.setDepth(-10);
  bg.fillStyle(0x0c1716, 1);
  bg.fillRect(0, 0, LEVEL3_WIDTH, LEVEL3_HEIGHT);
  drawVintedKitchenBg(bg, LEVEL3_WIDTH, LEVEL3_HEIGHT);

  // Vinted logo — world-space background element (does not follow camera)
  // Camera zoom ≈ 1.71×, so world-scale 0.42 → ~216px wide on screen
  // Positioned in the upper-right area of the starting camera view
  if (scene.textures.exists("vinted-logo")) {
    scene.add.image(940, 50, "vinted-logo")
      .setOrigin(0.5, 0)
      .setScale(0.42)
      .setAlpha(0.65)
      .setDepth(-8); // above bg fill, below platforms and gameplay elements
  }

  // ── Platform helper — dark stone-green sewer blocks ────────────────────────
  function wall3(x: number, y: number, w: number, h: number, raised = false) {
    const g = scene.add.graphics();
    const base = raised ? 0x1e4a30 : 0x1c3a2a;
    g.fillStyle(base, 1);
    g.fillRect(0, 0, w, h);
    // Top highlight
    g.fillStyle(0x2e6b47, 0.8); g.fillRect(0, 0, w, 3);
    // Left edge
    g.fillStyle(0x3a8a5a, 0.25); g.fillRect(0, 0, 2, h);
    // Rivets / texture
    if (w > 64) {
      g.fillStyle(0x2e6b47, 0.4);
      for (let rx = 16; rx < w - 16; rx += 52) g.fillCircle(rx, h / 2, 3.5);
    }
    // Bottom drip shadow
    g.fillStyle(0x050e07, 0.35); g.fillRect(0, h - 3, w, 3);
    const key = `l3_wall_${x}_${y}_${w}_${h}`;
    g.generateTexture(key, w, h);
    g.destroy();
    const img = scene.physics.add.staticImage(x + w / 2, y + h / 2, key);
    img.setDisplaySize(w, h); img.refreshBody();
    platforms.add(img);
  }

  // Floor-level horizontal duct ceiling
  function ductCeiling3(x: number, gap: number, width: number, thickness = T3) {
    wall3(x, FLOOR3 - gap - thickness, width, thickness);
  }

  // Vertical wall with a horizontal-passage gap
  function vertWall3(x: number, gapTop: number, gapBottom: number) {
    if (gapTop > 0)      wall3(x, 0,        T3, gapTop);
    if (gapBottom < FLOOR3) wall3(x, gapBottom, T3, FLOOR3 - gapBottom);
  }

  // ── Boundaries ─────────────────────────────────────────────────────────────
  wall3(0,               0,       T3,            LEVEL3_HEIGHT);
  wall3(LEVEL3_WIDTH - T3, 0,     T3,            LEVEL3_HEIGHT);
  wall3(0,               0,       LEVEL3_WIDTH,  T3);
  wall3(0,               FLOOR3,  LEVEL3_WIDTH,  T3);

  // ── S2: Ascending triple-step tower (x=400–760) ────────────────────────────
  wall3(400,  448, 120, T3, true);   // Step A  top=448  rise=80px (stages 0–4)
  wall3(520,  384, 120, T3, true);   // Step B  top=384  rise=64px from A
  wall3(640,  320, 120, T3, true);   // Step C  top=320  rise=64px from B
  wall3(740,  448,  80, T3, true);   // Descent ledge — intermediate drop back to floor

  // ── S3: Vertical Wall 1 — floor-level gap (x=820) ─────────────────────────
  // Gap 444→528 = 84px. Stages 0–2 (≤66px) pass; stage 3 (85px) blocked.
  vertWall3(820, 0, 444);

  // ── S4: Suspended platform field (x=880–1280) ──────────────────────────────
  wall3(880,  416, 120, T3, true);   // Plat A  top=416  rise=112px (stages 0–2 only)
  wall3(1020, 464, 120, T3, true);   // Plat B  top=464  rise=64px  (stages 0–5)
  wall3(1160, 432, 120, T3, true);   // Plat C  top=432  rise=96px  (stages 0–3)

  // ── S5: Vertical Wall 2 — mid-height gap (x=1350) ─────────────────────────
  // Stepping platform left of wall: Bob stands with feet at y=472, passes gap 400→472 (72px).
  // height ≤ 72 → stages 0–2 pass; stage 3 (85px) blocked.
  wall3(1300, 472,  50, T3, true);   // left stepping platform  top=472
  vertWall3(1350, 400, 472);

  // ── S6: Wide descending platform + floor duct (x=1420–1930) ───────────────
  wall3(1420, 432, 180, T3, true);   // wide platform top=432 (food-safe open above)

  // Floor duct: 72px gap, stages 0–2 pass, stage 3 (85px) blocked
  ductCeiling3(1650, 72, 280);

  // ── S7: Post-duct elevated platform (x=2000–2150) ─────────────────────────
  wall3(2000, 416, 150, T3, true);   // Plat D  top=416  rise=112px (stages 0–2)

  // ── S8: Vertical Wall 3 — highest elevated gap (x=2520) ───────────────────
  // Left stepping platform: feet at y=416, gap 336→416 = 80px.
  // height ≤ 80 → stages 0–2 pass; stage 3 (85px) blocked.
  wall3(2460, 416,  60, T3, true);   // left stepping platform  top=416
  vertWall3(2520, 336, 416);
  // Right drop: no platform — Bob falls to floor after passing the gap.

  // ── S9: Bonus platform in final sprint (x=3300–3450) ─────────────────────
  wall3(3300, 448, 150, T3, true);   // bonus platform top=448  rise=80px (stages 0–4)

  // ── EXIT ──────────────────────────────────────────────────────────────────
  const exitX = LEVEL3_WIDTH - T3 * 4;
  const exitY = FLOOR3 - T3 * 2;

  const exitDoorImage = scene.add.image(exitX + T3 * 0.75, exitY + T3, "exit_door_locked");
  const exitZone = scene.add.zone(exitX + T3 * 0.75, exitY + T3, T3 * 1.5, T3 * 2);
  scene.physics.world.enable(exitZone, Phaser.Physics.Arcade.STATIC_BODY);

  scene.add.text(exitX + T3 * 0.75, exitY - 22, "EXIT ▼",
    { fontSize: "13px", color: "#2ecc71", fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1, stroke: "#000", strokeThickness: 2 })
    .setOrigin(0.5);

  return { platforms, exitZone, exitDoorImage, bgGraphics: bg, levelWidth: LEVEL3_WIDTH, levelHeight: LEVEL3_HEIGHT };
}

// ─────────────────────────────────────────────────────────────────────────────
// Level 4 — "All You Can Eat"   (neon nightclub theme)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Hardest level. Rare foods force Bob to stage 7 (160px) through a food gauntlet,
 * then a 165px mega-duct squeezes him through with just 5px clearance.
 * Four distinct squeeze points of escalating tightness.
 *
 * Stage progression eating in order:
 *   broccoli (+1) → 1  |  banana (+1) → 2
 *   [Wall 1: 68px floor gap — stage 2 just fits]
 *   icecream (+2) → 4
 *   [Fries platform: rise=91px — stage 4 (91px jump) just reaches]
 *   fries    (+2) → 6
 *   [Candy platform: rise=50px — stage 6 (53px jump) just reaches]
 *   candy    (+2) → 7 MAX
 *   ★ MEGA DUCT: 165px ceiling — stage 7 (160px) fits with 5px clearance ★
 *   hotdog / pizza (+2 each) → stay MAX, score only
 *   [Wall 2: 88px floor gap — must burp from 7 to stage 3]
 *   apple (+1) — platform reward
 *   [Tight duct: 68px — must be stage ≤2]
 *   carrot (+1) / cake (+2) — score run
 *   [Final wall: 50px mid-height gap — stages 0–1 only]
 *
 * Gap physics:
 *   68px  → stages 0–2 (≤66px) pass; stage 3 blocked
 *   88px  → stages 0–3 (≤85px) pass; stage 4 blocked
 *   165px → all stages; stage 7 (160px) with 5px clearance
 *   50px  → stages 0–1 (≤47px) only — final squeeze
 */
export const LEVEL4_WIDTH  = 4600;
export const LEVEL4_HEIGHT = 560;

export function buildLevel4(scene: Phaser.Scene): LevelObjects {
  const T4     = TILE_SIZE;
  const FLOOR4 = LEVEL4_HEIGHT - T4; // 528

  const platforms = scene.physics.add.staticGroup();

  const bg = scene.add.graphics();
  bg.setDepth(-10);
  bg.fillStyle(0x05010e, 1);
  bg.fillRect(0, 0, LEVEL4_WIDTH, LEVEL4_HEIGHT);
  drawNightclubBg(bg, LEVEL4_WIDTH, LEVEL4_HEIGHT);

  // ── Platform helper — dark purple with neon magenta top edge ──────────────
  function wall4(x: number, y: number, w: number, h: number, raised = false) {
    const g = scene.add.graphics();
    g.fillStyle(raised ? 0x28094a : 0x1c0430, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(0xe83f8c, 0.9); g.fillRect(0, 0, w, 3);   // neon top highlight
    g.fillStyle(0xff6baf, 0.2); g.fillRect(0, 0, 2, h);   // left edge
    if (w > 64) {
      g.fillStyle(0xe83f8c, 0.28);
      for (let rx = 18; rx < w - 18; rx += 52) g.fillCircle(rx, h / 2, 3.5);
    }
    g.fillStyle(0x080008, 0.5); g.fillRect(0, h - 3, w, 3);
    const key = `l4_wall_${x}_${y}_${w}_${h}`;
    g.generateTexture(key, w, h);
    g.destroy();
    const img = scene.physics.add.staticImage(x + w / 2, y + h / 2, key);
    img.setDisplaySize(w, h); img.refreshBody();
    platforms.add(img);
  }

  function ductCeiling4(x: number, gap: number, width: number, thickness = T4) {
    wall4(x, FLOOR4 - gap - thickness, width, thickness);
  }

  function vertWall4(x: number, gapTop: number, gapBottom: number) {
    if (gapTop > 0)         wall4(x, 0,         T4, gapTop);
    if (gapBottom < FLOOR4) wall4(x, gapBottom, T4, FLOOR4 - gapBottom);
  }

  // ── Boundaries ─────────────────────────────────────────────────────────────
  wall4(0,                 0,       T4,            LEVEL4_HEIGHT);
  wall4(LEVEL4_WIDTH - T4, 0,       T4,            LEVEL4_HEIGHT);
  wall4(0,                 0,       LEVEL4_WIDTH,  T4);
  wall4(0,                 FLOOR4,  LEVEL4_WIDTH,  T4);

  // ── S1: Ascending staircase (x=350–480) — rise=64px, all stages ────────────
  wall4(350, 464, 130, T4, true);

  // ── S2: Wall 1 — floor-level 68px gap (x=680) ─────────────────────────────
  // Stage 2 (66px) just fits: 66 < 68. Stage 3+ blocked.
  vertWall4(680, 460, 528);

  // ── S2: Upper tower in the open section after Wall 1 ──────────────────────
  // Bob is at most stage 2 here (passed the 68px gap).
  // Tower A1: rise=139px from floor — stage 2 (139px jump) EXACTLY reaches.
  wall4(790, 389, 120, T4, true);
  // Tower A2: 119px rise from A1 — stages 0–2 reach from A1.
  wall4(930, 270, 120, T4, true);

  // ── S3: Junk-food platform islands ─────────────────────────────────────────
  // Fries platform: rise=91px — stage 4 (91px jump) barely reaches.
  wall4(1180, 437, 120, T4, true);
  // Candy platform: rise=50px — stage 6 (53px jump) barely reaches.
  wall4(1500, 478, 120, T4, true);

  // ── S4: THE HUGE SECTION ───────────────────────────────────────────────────
  // Open neon floor. Stage 7 Bob (160px) crawls slowly through.
  // ★ Mega duct: 165px gap → stage 7 (160px) has just 5px clearance ★
  //   ceiling bottom at y=363, stage-7 body top at y=368 → 5px to spare
  ductCeiling4(2050, 165, 350);

  // ── S5: Wall 2 — floor-level 88px gap (x=2600) ────────────────────────────
  // Stage 3 (85px) fits: 85 < 88. Stage 4+ blocked.
  // Bob must burp from 7 down to 3 (four burps) to proceed.
  vertWall4(2600, 440, 528);

  // ── S5: Platform chain after Wall 2 (stages 0–3) ──────────────────────────
  // P1: rise=96px — stage 3 (115px) reaches; stage 4 cannot (91 < 96).
  wall4(2700, 432, 120, T4, true);
  // P2: 48px rise from P1 — all stages reach from P1. Apple rests here.
  wall4(2860, 384, 120, T4, true);

  // Tight duct: 68px (stages 0–2 only). One final burp if still at stage 3.
  ductCeiling4(3050, 68, 180);

  // ── S5b: Aerial platform above P2 (x=2830–2960) ──────────────────────────
  // High platform reachable from P2 (y=384). Rise = 384-290 = 94px.
  // Stage 2 (139 > 94 ✓) and stage 3 (115 > 94 ✓) reach from P2.
  wall4(2840, 290, 120, T4, true);

  // ── S6: Platform reward run (x=3290–3640) ─────────────────────────────────
  // P3: rise=96px from floor — stage 2 (139px) reaches easily.
  wall4(3290, 432, 150, T4, true);
  // Upper P3b: 112px rise from P3 — stage 2 (139>112 ✓), stage 3 (115>112 ✓).
  wall4(3300, 320, 130, T4, true);
  // Upper P3c: 120px rise from P3b — stage 1 (168>120 ✓), stage 2 (139>120 ✓).
  wall4(3440, 200, 130, T4, true);
  // P4: 32px rise from P3 — all stages. Cake rests here.
  wall4(3490, 400, 150, T4, true);

  // ── S7: Final squeeze — mid-height 50px gap, stages 0–1 only ──────────────
  // Stepping platform: rise=50px from floor.
  // Stages 0–1 (≤47px body) fit through; stage 2+ blocked.
  wall4(4020, 478, 130, T4, true);
  vertWall4(4150, 428, 478);

  // ── EXIT ──────────────────────────────────────────────────────────────────
  const exitX = LEVEL4_WIDTH - T4 * 3;
  const exitY  = FLOOR4 - T4 * 2;

  const exitDoorImage = scene.add.image(exitX + T4 * 0.75, exitY + T4, "exit_door_locked");
  const exitZone = scene.add.zone(exitX + T4 * 0.75, exitY + T4, T4 * 1.5, T4 * 2);
  scene.physics.world.enable(exitZone, Phaser.Physics.Arcade.STATIC_BODY);

  // ── Hints ─────────────────────────────────────────────────────────────────
  const hs: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: "13px", color: "#ff6baf", fontFamily: "CandyBeans, monospace",
    stroke: "#000", strokeThickness: 2, align: "center",
  };
  scene.add.text(360,  FLOOR4 - 68, "up you go →",              { ...hs }).setOrigin(0, 0.5);
  scene.add.text(690,  FLOOR4 - 68, "smaller gets through →",   { ...hs, color: "#f39c12" }).setOrigin(0, 0.5);
  scene.add.text(1190, FLOOR4 - 68, "earn your size ↑",         { ...hs, color: "#e67e22" }).setOrigin(0, 0.5);
  scene.add.text(2060, FLOOR4 - 68, "barely fits – just keep moving.", { ...hs, color: "#ff2d78" }).setOrigin(0, 0.5);
  scene.add.text(2610, FLOOR4 - 68, "time to digest.",           { ...hs, color: "#f39c12" }).setOrigin(0, 0.5);
  scene.add.text(3060, FLOOR4 - 68, "one more squeeze →",       { ...hs, color: "#e74c3c" }).setOrigin(0, 0.5);
  scene.add.text(4025, FLOOR4 - 68, "go tiny to finish →",      { ...hs, color: "#e74c3c" }).setOrigin(0, 0.5);
  scene.add.text(exitX + T4 * 0.75, exitY - 22, "EXIT ▼",
    { fontSize: "13px", color: "#2ecc71", fontFamily: "CandyBeans, monospace",
      stroke: "#000", strokeThickness: 2 }).setOrigin(0.5);

  return { platforms, exitZone, exitDoorImage, bgGraphics: bg, levelWidth: LEVEL4_WIDTH, levelHeight: LEVEL4_HEIGHT };
}

function drawNightclubBg(g: Phaser.GameObjects.Graphics, w: number, h: number) {
  const PINK = 0xff2d78;
  const CYAN = 0x00f5ff;
  const T    = TILE_SIZE;

  // Subtle purple grid
  g.lineStyle(1, 0x1a0030, 0.35);
  for (let x = 0; x <= w; x += 64) {
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.strokePath();
  }
  for (let y = 0; y <= h; y += 64) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.strokePath();
  }

  // Neon ceiling strip lights alternating pink / cyan
  for (let x = 80; x < w - 40; x += 280) {
    g.fillStyle(PINK, 0.22); g.fillRect(x,       T + 6, 180, 4);
    g.fillStyle(PINK, 0.06); g.fillRect(x - 4,   T + 4, 188, 10);
  }
  for (let x = 260; x < w; x += 280) {
    g.fillStyle(CYAN, 0.16); g.fillRect(x,  T + 6, 80, 4);
    g.fillStyle(CYAN, 0.04); g.fillRect(x,  T + 3, 80, 10);
  }

  // Floor glow strip
  g.fillStyle(PINK, 0.28); g.fillRect(0, h - T - 4, w, 4);
  g.fillStyle(PINK, 0.07); g.fillRect(0, h - T - 14, w, 14);

  // Circular spotlight pools on the dance-floor area
  for (let x = 300; x < w - 200; x += 600) {
    g.fillStyle(PINK, 0.05); g.fillCircle(x,       h * 0.55, 90);
    g.fillStyle(CYAN, 0.05); g.fillCircle(x + 300, h * 0.42, 70);
  }

  // Dark bar/counter along the floor — nightclub aesthetic
  g.fillStyle(0x0c0016, 1);   g.fillRect(0, h - 60, w, 60);
  g.fillStyle(PINK,    0.35); g.fillRect(0, h - 61, w, 3);
  g.fillStyle(0x1a0030, 0.8); g.fillRect(0, h - 58, w, 2);
}

