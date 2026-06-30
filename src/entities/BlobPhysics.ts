/**
 * Standalone AABB physics engine for Bob.
 *
 * Owns position, velocity, and size as plain numbers — no Phaser body, no
 * preUpdate/postUpdate sync cycle. Resize is three lines of arithmetic.
 * The visual sprite follows this state each frame but never influences it.
 */

export interface Rect { x: number; y: number; w: number; h: number; }

export class BlobPhysics {
  /** Top-left corner of the hitbox in world space. */
  bx: number;
  by: number;
  /** Width and height of the hitbox. */
  bw: number;
  bh: number;
  vx = 0;
  vy = 0;
  onGround = false;

  private rects: Rect[] = [];

  /** cx/cy = spawn position (centre of body), w/h = initial size. */
  constructor(cx: number, cy: number, w: number, h: number) {
    this.bw = w;
    this.bh = h;
    this.bx = cx - w / 2;
    this.by = cy - h / 2;
  }

  // ─── Accessors ──────────────────────────────────────────────────────────────

  get cx()     { return this.bx + this.bw / 2; }
  get cy()     { return this.by + this.bh / 2; }
  get bottom() { return this.by + this.bh; }
  get right()  { return this.bx + this.bw; }

  // ─── Level geometry ─────────────────────────────────────────────────────────

  addRect(r: Rect) { this.rects.push(r); }

  // ─── Resize (keeps bottom-centre constant — the feet stay planted) ──────────

  resize(w: number, h: number) {
    const bottom  = this.by + this.bh;
    const centerX = this.bx + this.bw / 2;
    this.bw = w;
    this.bh = h;
    this.by = bottom  - h;
    this.bx = centerX - w / 2;
  }

  // ─── Physics step (call once per frame) ─────────────────────────────────────

  update(delta: number, gravity: number, worldW: number, worldH: number) {
    this.vy += gravity * delta;

    this.bx += this.vx * delta;
    this.by += this.vy * delta;

    // Hard world bounds
    if (this.bx < 0)            { this.bx = 0;           this.vx = Math.max(0, this.vx); }
    if (this.right > worldW)    { this.bx = worldW - this.bw; this.vx = Math.min(0, this.vx); }
    if (this.by < 0)            { this.by = 0;           this.vy = Math.max(0, this.vy); }
    if (this.bottom > worldH)   { this.by = worldH - this.bh; this.vy = 0; this.onGround = true; }

    this.onGround = false;

    // Two passes improve stability when Bob is wedged (e.g. growing inside corner).
    for (let pass = 0; pass < 2; pass++) {
      for (const r of this.rects) {
        this.resolve(r);
      }
    }
  }

  // ─── Overlap query (used for food + exit detection) ─────────────────────────

  overlapsRect(x: number, y: number, w: number, h: number): boolean {
    return this.bx < x + w && this.right > x &&
           this.by < y + h && this.bottom > y;
  }

  // ─── AABB resolver ──────────────────────────────────────────────────────────

  private resolve(r: Rect) {
    // Penetration amounts from each side
    const ol  = this.right  - r.x;         // Bob right into rect left
    const or_ = (r.x + r.w) - this.bx;    // rect right  into Bob left
    const ot  = this.bottom - r.y;         // Bob bottom into rect top
    const ob  = (r.y + r.h) - this.by;    // rect bottom into Bob top

    // No overlap on at least one axis → skip
    if (ol <= 0 || or_ <= 0 || ot <= 0 || ob <= 0) return;

    const minX = Math.min(ol, or_);
    const minY = Math.min(ot, ob);

    if (minX < minY) {
      // Resolve horizontally (wall)
      if (ol < or_) {
        this.bx -= ol;  // push left
      } else {
        this.bx += or_; // push right
      }
      this.vx = 0;
    } else {
      // Resolve vertically (floor / ceiling)
      if (ot < ob) {
        // Bob's bottom was inside rect's top → Bob is above → push up (floor landing)
        this.by    -= ot;
        this.vy     = Math.min(0, this.vy);
        this.onGround = true;
      } else {
        // Bob's top was inside rect's bottom → Bob is below → push down (ceiling hit)
        this.by += ob;
        this.vy  = Math.max(0, this.vy);
      }
    }
  }
}
