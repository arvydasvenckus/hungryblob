export const GAME_WIDTH = 1440;
export const GAME_HEIGHT = 810;

export const TILE_SIZE = 32;

// Size stages: food units eaten → stage index (0-based)
// Linear ~19px steps from 28 → 160px; each stage transition is visibly dramatic.
export const SIZE_STAGES = [
  { minFood: 0,  maxFood: 2,  width: 28,  height: 28,  scale: 1.00, label: "Tiny"     },
  { minFood: 3,  maxFood: 5,  width: 47,  height: 47,  scale: 1.68, label: "Small"    },
  { minFood: 6,  maxFood: 8,  width: 66,  height: 66,  scale: 2.36, label: "Smallish" },
  { minFood: 9,  maxFood: 11, width: 85,  height: 85,  scale: 3.04, label: "Medium"   },
  { minFood: 12, maxFood: 14, width: 104, height: 104, scale: 3.71, label: "Chunky"   },
  { minFood: 15, maxFood: 17, width: 123, height: 123, scale: 4.39, label: "Large"    },
  { minFood: 18, maxFood: 20, width: 141, height: 141, scale: 5.04, label: "Big"      },
  { minFood: 21, maxFood: 23, width: 160, height: 160, scale: 5.71, label: "Huge"     },
] as const;

export const MAX_FOOD = 23;
export const SHRINK_COOLDOWN_MS = 6_667;
export const SHRINK_TWEEN_MS    = 500;

// Per-stage physics — wider range makes the size difference feel dramatic.
// Stage 0: nimble. Stage 7: sluggish. Perfect linear steps between extremes.
export const STAGE_JUMP_VELOCITY = [-560, -515, -475, -430, -390, -345, -305, -260] as const;
export const STAGE_WALK_SPEED    = [220,  202,  184,  167,  149,  131,  113,   95]  as const;

export const GRAVITY = 900;

export const LEVEL_TIME_LIMIT = 90;
export const STRESS_THRESHOLD = 15; // seconds remaining when Bob looks stressed

export type SizeStage  = (typeof SIZE_STAGES)[number];
export type StageIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
