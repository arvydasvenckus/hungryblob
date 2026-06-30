import type { StageIndex } from "../config/constants";
import { SHRINK_COOLDOWN_MS } from "../config/constants";

export type SizeEventType = "grow" | "shrink" | "maxed";

export interface SizeEvent {
  type: SizeEventType;
  stage: StageIndex;
}

type SizeListener = (event: SizeEvent) => void;

const MAX_STAGE = 7 as StageIndex;

/**
 * Direct stage-based growth model:
 *   eat(1) → stage += 1   (healthy food)
 *   eat(2) → stage += 2   (unhealthy food)
 *   shrink  → stage -= 1  (one burp = one stage down)
 * Stage is capped at MAX_STAGE (4). Burping continues on a timer
 * until stage reaches 0.
 */
export class SizeSystem {
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

  /** @param growthStages 1 for healthy food, 2 for unhealthy food */
  eat(growthStages: 1 | 2 = 1) {
    this.lastEatTime = this.getTime();
    const newStage = Math.min(this.stage + growthStages, MAX_STAGE) as StageIndex;
    this.stage = newStage;
    this.scheduleShrink();
    this.emit({ type: newStage >= MAX_STAGE ? "maxed" : "grow", stage: newStage });
  }

  private scheduleShrink() {
    if (this.shrinkTimer) clearTimeout(this.shrinkTimer);
    this.shrinkTimer = setTimeout(() => this.shrink(), SHRINK_COOLDOWN_MS);
  }

  private shrink() {
    if (this.stage === 0) return;
    this.stage = (this.stage - 1) as StageIndex;
    this.emit({ type: "shrink", stage: this.stage });
    if (this.stage > 0) this.scheduleShrink();
  }

  getStage(): StageIndex { return this.stage; }

  getShrinkCooldownRemaining(): number {
    if (this.shrinkTimer === null || this.stage === 0) return 0;
    const elapsed = this.getTime() - this.lastEatTime;
    return Math.max(0, SHRINK_COOLDOWN_MS - elapsed);
  }

  reset() {
    if (this.shrinkTimer) clearTimeout(this.shrinkTimer);
    this.shrinkTimer = null;
    this.stage = 0;
    this.lastEatTime = 0;
  }

  destroy() {
    this.reset();
    this.listeners = [];
  }
}
