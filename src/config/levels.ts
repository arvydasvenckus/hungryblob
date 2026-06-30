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
      // Inside open dead-end chamber of L-section (x=1300-1460, no ceiling → safe to eat)
      { x: 1420, y: 400, type: "watermelon" }, // +1;  50 pts  (y=424-24=400 above platform)
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
    // Open sections:
    //   Section 1: x=32-400
    //   Section 2: x=680-950
    //   Section 3: x=1200-1500
    //   Section 4: x=1780-2168
    // FOOD RULE: NEVER inside a duct — only in open zones or on open platforms.
    // Open zones:
    //   x=32-300   (before first duct)
    //   elevated platform x=640-1050 y=416 (open above, ductless)
    //   x=1050-1280 (between duct and vertical wall approach)
    //   x=1382-1650 (after vertical wall, before staircase)
    //   step B platform x=1770-1890, y=408 (open above)
    //   x=2400-2968 (final sprint)
    foods: [
      // Zone 1: open start
      { x: 150,  y: 500, type: "apple"      }, // +1 → stage 1
      { x: 280,  y: 500, type: "grapes"     }, // +1 → stage 2  (risky: GAP_A needs stage ≤1)

      // Zone 2: elevated platform (open above — no ceiling, food safe to grow here)
      { x: 800,  y: 392, type: "pizza"      }, // +2  only accessible if Bob jumps to platform

      // Zone 3: open relief
      { x: 1150, y: 500, type: "burger"     }, // +2  tempting before vertical wall

      // Zone 4: after vertical wall
      { x: 1500, y: 500, type: "donut"      }, // +2

      // Zone 5: stair step B (open above)
      { x: 1830, y: 384, type: "watermelon" }, // +1  only accessible if Bob reaches step B

      // Zone 6: final sprint
      { x: 2550, y: 500, type: "orange"     }, // +1  bonus before exit
    ],
  },
];
