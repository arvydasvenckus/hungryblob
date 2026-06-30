/**
 * Circle physics engine for Bob.
 *
 * Bob is treated as a CIRCLE whose diameter equals his bounding-box width.
 * This matches the rounded-square visual: corners never collide, so Bob
 * doesn't snag on ceiling/wall edges where the visual shows clear space.
 *
 * Gap gating is unchanged: the circle's vertical extent (diameter) is
 * identical to the old bounding-box height.
 *
 * Resize and world-bound clamping still use the bounding box (bx, by, bw, bh)
 * — the circle radius is always derived as bw/2.
 */

export interface Rect { x: number; y: number; w: number; h: number; }

export class BlobPhysics {
  /** Top-left corner of the bounding box (= circle centre − radius). */
  bx: number;
  by: number;
  /** Diameter of the circle (= bw = bh, Bob is always square). */
  bw: number;
  bh: number;
  vx = 0;
  vy = 0;
  onGround = false;

  private rects: Rect[] = [];

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
  get radius() { return this.bw / 2; }

  // ─── Level geometry ─────────────────────────────────────────────────────────

  addRect(r: Rect) { this.rects.push(r); }

  // ─── Resize (keeps bottom-centre constant) ───────────────────────────────────

  resize(w: number, h: number) {
    const bottom  = this.by + this.bh;
    const centerX = this.bx + this.bw / 2;
    this.bw = w;
    this.bh = h;
    this.by = bottom  - h;
    this.bx = centerX - w / 2;
  }

  // ─── Physics step ───────────────────────────────────────────────────────────

  update(delta: number, gravity: number, worldW: number, worldH: number) {
    this.vy += gravity * delta;
    this.bx += this.vx * delta;
    this.by += this.vy * delta;

    // Hard world bounds (bounding-box based)
    if (this.bx < 0)          { this.bx = 0;                this.vx = Math.max(0, this.vx); }
    if (this.right > worldW)  { this.bx = worldW - this.bw; this.vx = Math.min(0, this.vx); }
    if (this.by < 0)          { this.by = 0;                this.vy = Math.max(0, this.vy); }
    if (this.bottom > worldH) { this.by = worldH - this.bh; this.vy = 0; this.onGround = true; }

    this.onGround = false;

    // Two passes for stability in wedged situations
    for (let pass = 0; pass < 2; pass++) {
      for (const r of this.rects) {
        this.resolve(r);
      }
    }
  }

  // ─── Overlap query (circle vs AABB) ─────────────────────────────────────────

  overlapsRect(x: number, y: number, w: number, h: number): boolean {
    const cx = this.cx, cy = this.cy, rad = this.radius;
    const nearX = Math.max(x, Math.min(cx, x + w));
    const nearY = Math.max(y, Math.min(cy, y + h));
    const dx = cx - nearX, dy = cy - nearY;
    return dx * dx + dy * dy < rad * rad;
  }

  // ─── Circle vs AABB resolver ─────────────────────────────────────────────────
  //
  // Algorithm: find the closest point on the rect to the circle centre.
  // If distance < radius, push the circle away along the contact normal.
  // The normal is derived from the contact point, so floors push up,
  // ceilings push down, and walls push horizontally — including at corners,
  // where the circle slides off smoothly instead of snagging.

  private resolve(r: Rect) {
    const cx  = this.cx;
    const cy  = this.cy;
    const rad = this.radius;

    // Closest point on rect to circle centre
    const nearX = Math.max(r.x, Math.min(cx, r.x + r.w));
    const nearY = Math.max(r.y, Math.min(cy, r.y + r.h));

    const dx = cx - nearX;
    const dy = cy - nearY;
    const distSq = dx * dx + dy * dy;

    if (distSq >= rad * rad) return; // no collision

    const dist = Math.sqrt(distSq);

    if (dist < 0.0001) {
      // Circle centre exactly on rect edge — push straight up as fallback
      this.by -= rad;
      this.vy  = Math.min(0, this.vy);
      this.onGround = true;
      return;
    }

    // Contact normal (circle centre → closest point, outward from rect)
    const nx = dx / dist;
    const ny = dy / dist;
    const penetration = rad - dist;

    // Push circle out
    this.bx += nx * penetration;
    this.by += ny * penetration;

    // Zero velocity component along the normal (only if moving into surface)
    const velDotNormal = this.vx * nx + this.vy * ny;
    if (velDotNormal < 0) {
      this.vx -= velDotNormal * nx;
      this.vy -= velDotNormal * ny;
    }

    // Floor: normal points upward (ny < 0 means circle is above the contact)
    if (ny < -0.5) this.onGround = true;

    // Ceiling: clamp downward velocity to prevent sticking
    if (ny > 0.5) this.vy = Math.max(0, this.vy);
  }
}
