export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const TILE_SIZE = 32;

// Size stages: food units eaten → stage index (0-based)
export const SIZE_STAGES = [
  { minFood: 0,  maxFood: 2,  width: 28, height: 28, scale: 1.0,  label: "Tiny"   },
  { minFood: 3,  maxFood: 5,  width: 38, height: 38, scale: 1.35, label: "Small"  },
  { minFood: 6,  maxFood: 8,  width: 50, height: 50, scale: 1.78, label: "Medium" },
  { minFood: 9,  maxFood: 11, width: 64, height: 64, scale: 2.28, label: "Large"  },
  { minFood: 12, maxFood: 15, width: 80, height: 80, scale: 2.85, label: "Huge"   },
] as const;

export const MAX_FOOD = 15;
export const SHRINK_COOLDOWN_MS = 10_000;
export const SHRINK_TWEEN_MS    = 500;

// Per-stage physics — bigger Bob feels heavier
export const STAGE_JUMP_VELOCITY = [-520, -480, -430, -370, -300] as const;
export const STAGE_WALK_SPEED    = [200,  185,  165,  140,  115]  as const;

export const GRAVITY = 900;

export const LEVEL_TIME_LIMIT = 90;
export const STRESS_THRESHOLD = 15; // seconds remaining when Bob looks stressed

export type SizeStage  = (typeof SIZE_STAGES)[number];
export type StageIndex = 0 | 1 | 2 | 3 | 4;
