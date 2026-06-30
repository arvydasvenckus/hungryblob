import type { StageIndex } from "../config/constants";
import { SIZE_STAGES, MAX_FOOD, SHRINK_COOLDOWN_MS } from "../config/constants";

export type SizeEventType = "grow" | "shrink" | "maxed";

export interface SizeEvent {
  type: SizeEventType;
  stage: StageIndex;
  foodCount: number;
}

type SizeListener = (event: SizeEvent) => void;

export class SizeSystem {
  private foodCount = 0;
  private stage: StageIndex = 0;
  private lastEatTime = 0;
  private shrinkTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: SizeListener[] = [];

  constructor(private getTime: () => number) {}

  onSizeChange(fn: SizeListener) {
    this.listeners.push(fn);
  }

  private emit(event: SizeEvent) {
    this.listeners.forEach((fn) => fn(event));
  }

  private stageFor(food: number): StageIndex {
    for (let i = SIZE_STAGES.length - 1; i >= 0; i--) {
      if (food >= SIZE_STAGES[i].minFood) return i as StageIndex;
    }
    return 0;
  }

  eat(): boolean {
    if (this.foodCount >= MAX_FOOD) return false;

    this.foodCount++;
    this.lastEatTime = this.getTime();

    const newStage = this.stageFor(this.foodCount);
    const grew = newStage > this.stage;
    this.stage = newStage;

    this.scheduleShrink();

    this.emit({
      type: grew ? "grow" : this.foodCount >= MAX_FOOD ? "maxed" : "grow",
      stage: this.stage,
      foodCount: this.foodCount,
    });

    return grew;
  }

  private scheduleShrink() {
    if (this.shrinkTimer) clearTimeout(this.shrinkTimer);
    this.shrinkTimer = setTimeout(() => this.shrink(), SHRINK_COOLDOWN_MS);
  }

  private shrink() {
    if (this.stage === 0) return;
    this.stage = (this.stage - 1) as StageIndex;
    // Recalculate food count to match the new stage upper boundary
    this.foodCount = SIZE_STAGES[this.stage].maxFood;
    this.emit({ type: "shrink", stage: this.stage, foodCount: this.foodCount });
    // Keep scheduling shrinks until back to stage 0
    if (this.stage > 0) this.scheduleShrink();
  }

  getStage(): StageIndex { return this.stage; }
  getFoodCount(): number { return this.foodCount; }

  /** Ms remaining until next shrink (0 if not scheduled) */
  getShrinkCooldownRemaining(): number {
    if (this.shrinkTimer === null || this.foodCount === 0) return 0;
    const elapsed = this.getTime() - this.lastEatTime;
    return Math.max(0, SHRINK_COOLDOWN_MS - elapsed);
  }

  reset() {
    if (this.shrinkTimer) clearTimeout(this.shrinkTimer);
    this.shrinkTimer = null;
    this.foodCount = 0;
    this.stage = 0;
    this.lastEatTime = 0;
  }

  destroy() {
    this.reset();
    this.listeners = [];
  }
}
