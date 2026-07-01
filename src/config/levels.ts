export type FoodCategory = "healthy" | "unhealthy";

export type HealthyFood =
  | "apple" | "banana" | "broccoli" | "carrot"
  | "watermelon" | "grapes" | "orange" | "strawberry";

export type UnhealthyFood =
  | "burger" | "pizza" | "donut" | "cake"
  | "hotdog" | "icecream" | "fries" | "candy";

export type FoodType = HealthyFood | UnhealthyFood;

const HEALTHY_SET = new Set<FoodType>([
  "apple", "banana", "broccoli", "carrot",
  "watermelon", "grapes", "orange", "strawberry",
]);

export function getFoodCategory(type: FoodType): FoodCategory {
  return HEALTHY_SET.has(type) ? "healthy" : "unhealthy";
}

/** Healthy = 1 growth unit, Unhealthy = 2 growth units */
export function getFoodGrowth(type: FoodType): 1 | 2 {
  return HEALTHY_SET.has(type) ? 1 : 2;
}

/** Healthy = 50 pts, Unhealthy = 100 pts */
export function getFoodScore(type: FoodType): number {
  return HEALTHY_SET.has(type) ? 50 : 100;
}

export interface FoodSpawn {
  x: number;
  y: number;
  type: FoodType;
}

export interface LevelConfig {
  key: string;
  /** null = tutorial (no timer shown, no time limit) */
  timeLimit: number | null;
  /** which music track to play during this level */
  music: "menu" | "level";
  /** minimum score required before the exit unlocks (0 = no requirement) */
  scoreThreshold: number;
  foods: FoodSpawn[];
  playerStart: { x: number; y: number };
  name: string;
}

/**
 * Returns the star rating (1–3) for a completed level.
 *   1 star  — met the score threshold (door-unlock minimum)
 *   2 stars — reached the midpoint between threshold and max possible score
 *   3 stars — collected all food (max possible score)
 */
export function getStars(score: number, cfg: LevelConfig): 1 | 2 | 3 {
  const maxScore   = cfg.foods.reduce((s, f) => s + getFoodScore(f.type), 0);
  const twoStarMin = Math.ceil((cfg.scoreThreshold + maxScore) / 2);
  if (score >= maxScore)   return 3;
  if (score >= twoStarMin) return 2;
  return 1;
}

export const LEVELS: LevelConfig[] = [
  // ── Index 0: Tutorial ─────────────────────────────────────────────────────
  {
    key: "tutorial",
    timeLimit: null,
    music: "menu",
    scoreThreshold: 200, // exit locked until 200 pts collected
    name: "Tutorial",
    playerStart: { x: 80, y: 514 },
    // FOOD RULE: all food in open zones — never inside any duct or under a ceiling.
    //
    // Open zones:
    //   x=32-530    (left of THE WALL)  — grapes on elevated platform (x=360-460, y=452), apple on ground
    //   x=562-1568  (right of THE WALL) — burger, watermelon, exit
    //
    // Backtrack design: apple(50)+burger(100)=150 → exit locked → go back for grapes(50) or watermelon(50)
    // Open zones (food-safe, never under a ceiling):
    //   x=32-900     Left of two-bar stack: elevated platform (x=580-700,y=452), ground
    //   x=1060-1400  Between stack and L-tunnel: open floor
    //   L-tunnel interior x=1400-1800 at y=368-424: tunnel floor platform (open above when inside)
    //   x=1800-2400  After tunnel: open floor to exit
    // Open zones: x=32-900 (left of stack), x=1060-1400 (between stack and tunnel),
    //             x=1400-1800 tunnel interior (open above on platform), x=1800-2400 (after tunnel)
    foods: [
      // First food — must eat before reaching the stack
      { x: 800,  y: 500, type: "apple"      }, // +1 → stage 1; 50 pts
      // After the stack — junk food lesson
      { x: 1200, y: 500, type: "burger"     }, // +2 → stage 3; 100 pts
      // Inside the tunnel (x=1620, between ceiling bottom y=349 and platform y=424, gap=75px)
      // Bob eats while traversing the tunnel leftward during backtrack.
      // Stage 0→1 (47px<75px) can still exit after eating ✓; stage 1→2 (66px<75px) also ✓
      { x: 1620, y: 400, type: "watermelon" }, // +1;  50 pts  (rests on tunnel platform floor)
    ],
  },

  // ── Index 1: Level 1 — "The Squeeze" ──────────────────────────────────────
  {
    key: "level1",
    timeLimit: 59,     // tight — reduced by 6s for extra pressure
    music: "level",
    scoreThreshold: 300, // exit locked until 300 pts collected
    name: "The Squeeze",
    playerStart: { x: 80, y: 514 },
    // FOOD RULE: NEVER inside a duct — only in open zones or platform open edges.
    // Open zones (redesigned level):
    //   x=32-350    Zone 1 floor (no ceiling)
    //   x=1050-1130 Left open edge of mid platform y=420 (before mid ceiling at x=1130)
    //   x=1050-1500 Floor under zone 4 (no floor-level beam in zone 4)
    //   x=2200-2950 Zone 7 sprint (open floor)
    foods: [
      // Zone 1 — open floor
      { x: 150,  y: 500, type: "apple"      }, // +1 → stage 1; 50 pts

      // Zone 4 floor — open (tempting junk food in the clear middle section)
      { x: 1150, y: 500, type: "burger"     }, // +2 → stage 3; 100 pts

      // Zone 4 mid platform open left edge (x=1050–1130, before mid ceiling)
      // food center y = 420 - 24 = 396. No ceiling above at x=1080. Safe to grow ✓
      { x: 1080, y: 396, type: "watermelon" }, // +1; 50 pts. Requires jumping to mid lane.

      // Zone 5: descending step A platform (x=1500–1640, top y=380) — open above, no ceiling
      { x: 1570, y: 356, type: "strawberry" }, // +1; 50 pts

      // Zone 7 — final sprint bonus
      { x: 2400, y: 500, type: "orange"     }, // +1; 50 pts

      // Zone 7 — second sprint bonus (50px after orange, open floor)
      { x: 2700, y: 500, type: "grapes"     }, // +1; 50 pts
    ],
  },

  // ── Index 2: Level 2 — "Sewer Depths" ────────────────────────────────────
  {
    key: "level2",
    timeLimit: 75,
    music: "level",
    scoreThreshold: 400,
    name: "Feast Mode",
    playerStart: { x: 80, y: 514 },
    // Food rule: NEVER inside a duct or under any ceiling.
    // Open zones:
    //   x=32-400    (open start, S1)
    //   Step C platform y=320 (open above, S2)
    //   x=820-1350  (S4 — platform tops are open above)
    //   x=1380-1640 (wide platform + open floor before duct, S6)
    //   x=1950-2450 (post-duct platforms + open floor, S7)
    //   x=2560-3700 (final sprint, S9)
    foods: [
      // S1: open start — safe first eat
      { x: 200,  y: 500, type: "apple"      }, // +1 → stage 1;  50pts

      // S2: top of triple tower (Step C y=320) — reward for climbing
      { x: 700,  y: 296, type: "grapes"     }, // +1 → stage 2;  50pts

      // S4: Plat A (y=416, rise=112px — only stages 0–2 reach)
      // Junk food as a high-risk high-reward choice when small
      { x: 930,  y: 392, type: "pizza"      }, // +2 → stage 3+; 100pts

      // S4: Plat C (y=432, rise=96px — stages 0–3)
      { x: 1210, y: 408, type: "strawberry" }, // +1;  50pts

      // S6: wide platform (y=432, open above)
      { x: 1500, y: 408, type: "burger"     }, // +2;  100pts

      // S7: Plat D (y=416, rise=112px — stages 0–2)
      { x: 2060, y: 392, type: "watermelon" }, // +1;  50pts

      // S7: open floor — tempting junk before Wall 3
      { x: 2300, y: 500, type: "donut"      }, // +2;  100pts

      // S9: final sprint — healthy padding toward threshold
      { x: 2700, y: 500, type: "orange"     }, // +1;  50pts
      { x: 3100, y: 500, type: "carrot"     }, // +1;  50pts

      // S9: bonus platform (y=448, open above) — optional last push
      { x: 3370, y: 424, type: "cake"       }, // +2;  100pts
    ],
  },
];
