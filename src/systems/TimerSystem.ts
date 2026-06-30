export type TimerEventType = "tick" | "expired";

type TimerListener = (event: { type: TimerEventType; remaining: number }) => void;

export class TimerSystem {
  private remaining: number;
  private running = false;
  private lastTick = 0;
  private listeners: TimerListener[] = [];

  constructor(private limitSeconds: number) {
    this.remaining = limitSeconds;
  }

  onTick(fn: TimerListener) {
    this.listeners.push(fn);
  }

  start() {
    this.running = true;
    this.lastTick = Date.now();
  }

  pause() { this.running = false; }
  resume() { this.running = true; this.lastTick = Date.now(); }

  update() {
    if (!this.running || this.remaining <= 0) return;
    const now = Date.now();
    const delta = (now - this.lastTick) / 1000;
    this.lastTick = now;
    this.remaining = Math.max(0, this.remaining - delta);

    const type: TimerEventType = this.remaining <= 0 ? "expired" : "tick";
    this.listeners.forEach((fn) => fn({ type, remaining: this.remaining }));
    if (this.remaining <= 0) this.running = false;
  }

  getRemaining(): number { return this.remaining; }
  isRunning(): boolean { return this.running; }

  reset() {
    this.remaining = this.limitSeconds;
    this.running = false;
  }
}
