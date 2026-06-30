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
    scoreThreshold: 0,
    name: "Tutorial",
    playerStart: { x: 80, y: 514 },
    // RULE: food is ONLY in open sections — never inside a duct.
    // Open sections: x=32-490, x=750-900, x=1230-1568.
    foods: [
      // Section 1 (x=32-490): one healthy food, Bob grows to stage 1
      { x: 280,  y: 500, type: "apple"      }, // +1 → stage 1
      // On top of the narrow duct ceiling slab — bonus for precise jump
      { x: 620,  y: 429, type: "watermelon" }, // +1 → extra stage for skilled players
      // Section 2 (x=750-900)
      { x: 820,  y: 500, type: "strawberry" }, // +1 → stage 2
      // Section 3 (x=1230-1568): after medium duct
      { x: 1310, y: 500, type: "orange"     }, // +1 → stage 3
      { x: 1380, y: 500, type: "burger"     }, // +2 → stage 5
      { x: 1430, y: 500, type: "carrot"     }, // +1 → stage 6
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
