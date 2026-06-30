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
  timeLimit: number;
  foods: FoodSpawn[];
  playerStart: { x: number; y: number };
  name: string;
}

export const LEVELS: LevelConfig[] = [
  {
    key: "level1",
    timeLimit: 90,
    name: "Air Ducts",
    playerStart: { x: 80, y: 514 },
    foods: [
      // Before narrow duct: 1 healthy → Stage 1 immediately
      { x: 280,  y: 500, type: "apple"      }, // +1 → stage 1
      // After narrow duct: grow toward max
      { x: 820,  y: 500, type: "strawberry" }, // +1 → stage 2
      { x: 960,  y: 500, type: "burger"     }, // +2 → stage 4 (MAX)
      // After medium duct: replenish stages after digestion
      { x: 1240, y: 500, type: "orange"     }, // +1 → stage 4 (or 3→4 after burp)
      { x: 1340, y: 500, type: "carrot"     }, // +1 → stays stage 4
    ],
  },
];
