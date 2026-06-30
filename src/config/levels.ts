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

/** Healthy = 100 pts, Unhealthy = 200 pts */
export function getFoodScore(type: FoodType): number {
  return HEALTHY_SET.has(type) ? 100 : 200;
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
  foods: FoodSpawn[];
  playerStart: { x: number; y: number };
  name: string;
}

export const LEVELS: LevelConfig[] = [
  // ── Index 0: Tutorial ─────────────────────────────────────────────────────
  {
    key: "tutorial",
    timeLimit: null,   // no timer — take your time
    music: "menu",     // familiar menu music keeps the mood gentle
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
    timeLimit: 65,     // tight — efficient run ~40s, punishing for greedy eating
    music: "level",
    name: "The Squeeze",
    playerStart: { x: 80, y: 514 },
    // Open sections:
    //   Section 1: x=32-400
    //   Section 2: x=680-950
    //   Section 3: x=1200-1500
    //   Section 4: x=1780-2168
    foods: [
      // Section 1 — safe intro food
      { x: 150, y: 500, type: "apple"      }, // +1 → stage 1   safe
      { x: 320, y: 500, type: "banana"     }, // +1 → stage 2   RISKY: blocks first GAP_A

      // Section 2 — reward for fitting through GAP_A, but temptation grows
      { x: 750, y: 500, type: "grapes"     }, // +1
      { x: 870, y: 500, type: "pizza"      }, // +2   big score, makes GAP_B risky

      // Section 3 — platform bonus and ground food
      { x: 1260, y: 500, type: "broccoli"  }, // +1   ground level
      { x: 1370, y: 424, type: "hotdog"    }, // +2   ON raised platform (top y=448)
                                               //      reachable at stage ≤4, not ≤5+

      // Section 4 — final sprint bonus
      { x: 1880, y: 500, type: "watermelon" }, // +1   points before exit
    ],
  },
];
