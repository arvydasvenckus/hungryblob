/**
 * Rounded-square physics engine for Bob.
 *
 * Bob's hitbox is a rounded rectangle (rounded square) whose corner radius is
 * CORNER_RATIO × half-width. This matches the visual art precisely — corners
 * are empty space, so Bob slides past ceiling/wall edges smoothly instead of
 * snagging on them with a hard square corner.
 *
 * Collision uses the rounded-rectangle SDF (signed distance function):
 *
 *   p   = nearest point on wall AABB − Bob's centre
 *   q   = (max(|px| − (hw−r), 0)·sign(px),
 *          max(|py| − (hh−r), 0)·sign(py))
 *   sdf = length(q) − r
 *
 * sdf < 0  →  collision, penetration = −sdf, contact normal = q/|q|.
 *
 * For flat surfaces qx or qy is zero, giving a pure axis-aligned normal
 * (identical to AABB). In corner regions both are non-zero, giving a smooth
 * diagonal normal that guides Bob around the corner instead of stopping him.
 */

export interface Rect { x: number; y: number; w: number; h: number; }

/** Corner radius as a fraction of the hitbox half-width. */
const CORNER_RATIO = 0.35;

export class BlobPhysics {
  /** Top-left corner of the bounding box. */
  bx: number;
  by: number;
  /** Width and height (Bob is always square, bw === bh). */
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

    // Hard world bounds (bounding-box edges)
    if (this.bx < 0)          { this.bx = 0;                this.vx = Math.max(0, this.vx); }
    if (this.right > worldW)  { this.bx = worldW - this.bw; this.vx = Math.min(0, this.vx); }
    if (this.by < 0)          { this.by = 0;                this.vy = Math.max(0, this.vy); }
    if (this.bottom > worldH) { this.by = worldH - this.bh; this.vy = 0; this.onGround = true; }

    this.onGround = false;

    // Two passes improve stability in wedge/corner situations
    for (let pass = 0; pass < 2; pass++) {
      for (const r of this.rects) {
        this.resolve(r);
      }
    }
  }

  // ─── Overlap query — rounded-rect vs AABB ───────────────────────────────────

  overlapsRect(x: number, y: number, w: number, h: number): boolean {
    const cx = this.cx, cy = this.cy;
    const hw = this.bw / 2, hh = this.bh / 2;
    const cr = hw * CORNER_RATIO;

    // Nearest point on query rect to Bob's centre
    const nearX = Math.max(x, Math.min(cx, x + w));
    const nearY = Math.max(y, Math.min(cy, y + h));
    const px = nearX - cx, py = nearY - cy;

    // Rounded-rect SDF: distance past the inner rectangle to the nearest point
    const qx = Math.max(Math.abs(px) - (hw - cr), 0);
    const qy = Math.max(Math.abs(py) - (hh - cr), 0);

    return qx * qx + qy * qy < cr * cr; // sdf < 0
  }

  // ─── Rounded-rectangle SDF resolver ─────────────────────────────────────────

  private resolve(r: Rect) {
    const cx = this.cx, cy = this.cy;
    const hw = this.bw / 2, hh = this.bh / 2;
    const cr = hw * CORNER_RATIO; // corner radius

    // Nearest point on wall rect to Bob's centre
    const nearX = Math.max(r.x, Math.min(cx, r.x + r.w));
    const nearY = Math.max(r.y, Math.min(cy, r.y + r.h));
    const px = nearX - cx;
    const py = nearY - cy;

    // SDF helper vectors
    // qx/qy are zero on flat faces, non-zero in corner regions
    const qx = Math.max(Math.abs(px) - (hw - cr), 0) * Math.sign(px || 1);
    const qy = Math.max(Math.abs(py) - (hh - cr), 0) * Math.sign(py || 1);
    const ql  = Math.sqrt(qx * qx + qy * qy);
    const sdf = ql - cr;

    if (sdf >= 0) return; // no collision
    const penetration = -sdf;

    // Contact normal: points from Bob's centre toward the wall (inward)
    let nx: number, ny: number;
    if (ql < 0.0001) {
      // Nearest AABB point inside inner rect (deep penetration) — axis fallback
      if (Math.abs(px) >= Math.abs(py)) {
        nx = Math.sign(px || 1); ny = 0;
      } else {
        nx = 0; ny = Math.sign(py || 1);
      }
    } else {
      nx = qx / ql;
      ny = qy / ql;
    }

    // Push Bob away from the wall
    this.bx -= nx * penetration;
    this.by -= ny * penetration;

    // Zero the velocity component moving into the surface
    const vdn = this.vx * nx + this.vy * ny;
    if (vdn > 0) {
      this.vx -= vdn * nx;
      this.vy -= vdn * ny;
    }

    // Floor detection: normal has downward component (wall below Bob)
    if (ny > 0.5) this.onGround = true;

    // Ceiling hit: prevent sticking by clamping upward velocity
    if (ny < -0.5) this.vy = Math.max(0, this.vy);
  }
}
