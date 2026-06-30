import Phaser from "phaser";
import type { StageIndex } from "../config/constants";
import {
  SIZE_STAGES,
  STAGE_JUMP_VELOCITY,
  STAGE_WALK_SPEED,
  GRAVITY,
  SHRINK_TWEEN_MS,
} from "../config/constants";
import { SizeSystem } from "../systems/SizeSystem";
import { BlobPhysics } from "./BlobPhysics";
import { LEVEL_WIDTH, LEVEL_HEIGHT } from "../scenes/LevelBuilder";

export class Blob {
  /** Plain sprite — no physics body. Positioned from physics each frame. */
  readonly visual: Phaser.GameObjects.Sprite;
  /** Custom AABB physics engine — the single source of truth for position/size. */
  readonly physics: BlobPhysics;

  private scene: Phaser.Scene;
  private stage: StageIndex = 0;
  private isBurping  = false;
  private isEating   = false;
  private isStressed = false;
  private isSad      = false;

  constructor(scene: Phaser.Scene, cx: number, cy: number, sizeSystem: SizeSystem) {
    this.scene = scene;

    const s0 = SIZE_STAGES[0];
    this.physics = new BlobPhysics(cx, cy, s0.width, s0.height);

    // Plain sprite — no physics body. Camera + tweens target this.
    this.visual = scene.add.sprite(cx, cy, "blob_stage0", 0);
    this.visual.setScale(s0.scale);
    this.visual.play("blob_idle_0");

    sizeSystem.onSizeChange((evt) => {
      if (evt.type === "grow" || evt.type === "maxed") {
        this.applyStage(evt.stage as StageIndex);
      } else if (evt.type === "shrink") {
        this.triggerBurp(evt.stage as StageIndex);
      }
    });
  }

  // ─── Stage / size ──────────────────────────────────────────────────────────
  // resize() is pure arithmetic — no Phaser body, no sync formula needed.

  private applyStage(stage: StageIndex) {
    this.stage = stage;
    const { scale, width, height } = SIZE_STAGES[stage];

    this.physics.resize(width, height); // keeps body.bottom constant — trivially correct
    this.visual.setScale(scale);

    if (!this.isEating) this.refreshAnim();

    // X-only squash bounce (never touch scaleY — visual only)
    this.scene.tweens.killTweensOf(this.visual);
    this.scene.tweens.add({
      targets: this.visual,
      scaleX: scale * 1.32,
      duration: 80,
      ease: "Back.Out",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.visual,
          scaleX: scale,
          duration: 140,
          ease: "Elastic.Out",
        });
      },
    });
  }

  // ─── Burp / shrink ─────────────────────────────────────────────────────────

  private triggerBurp(newStage: StageIndex) {
    if (this.isBurping) return;
    this.isBurping = true;

    const oldScale = SIZE_STAGES[this.stage].scale;

    this.scene.tweens.killTweensOf(this.visual);
    // Phase 1: puff wide
    this.scene.tweens.add({
      targets: this.visual,
      scaleX: oldScale * 1.45,
      duration: 100,
      ease: "Sine.Out",
      onComplete: () => {
        // Phase 2: compress
        this.scene.tweens.add({
          targets: this.visual,
          scaleX: oldScale * 0.72,
          duration: 90,
          ease: "Sine.In",
          onComplete: () => {
            // Phase 3: burp anim + bubble
            this.visual.play(`blob_burp_${this.stage}`, true);
            this.spawnBurpBubble();

            this.visual.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              // Phase 4: resize + bounce
              const { scale, width, height } = SIZE_STAGES[newStage];
              this.stage = newStage;
              this.physics.resize(width, height); // pure arithmetic, always correct
              this.visual.setScale(scale);

              this.scene.tweens.add({
                targets: this.visual,
                scaleX: scale * 1.3,
                duration: 70,
                ease: "Back.Out",
                onComplete: () => {
                  this.scene.tweens.add({
                    targets: this.visual,
                    scaleX: scale,
                    duration: SHRINK_TWEEN_MS,
                    ease: "Elastic.Out",
                    onComplete: () => {
                      this.isBurping = false;
                      this.refreshAnim();
                    },
                  });
                },
              });
            });
          },
        });
      },
    });
  }

  private spawnBurpBubble() {
    const { width, height } = SIZE_STAGES[this.stage];
    const x = this.visual.x + width * 0.55;
    const y = this.visual.y - height * 0.8;

    const bubble = this.scene.add.text(x, y, "BURP!", {
      fontSize: "22px",
      color: "#f1c40f",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0).setDepth(10);

    this.scene.tweens.add({
      targets: bubble,
      x: x + 18, y: y - 55,
      angle: 10, alpha: 0,
      scaleX: 1.5, scaleY: 1.5,
      duration: 950, ease: "Quad.Out",
      onComplete: () => bubble.destroy(),
    });
  }

  // ─── Stress & sad ──────────────────────────────────────────────────────────

  setStressed(on: boolean) {
    if (this.isStressed === on || this.isBurping || this.isSad) return;
    this.isStressed = on;
    if (on) this.visual.play(`blob_stress_${this.stage}`, true);
    else    this.refreshAnim();
  }

  playSadAnim() {
    this.isSad = true;
    this.physics.vx = 0;
    this.physics.vy = 0;
    this.visual.play(`blob_sad_${this.stage}`, true);
    this.visual.setTint(0x888888);
  }

  // ─── Animation helpers ─────────────────────────────────────────────────────

  private refreshAnim() {
    if (this.isEating || this.isSad) return;
    const base = this.isStressed
      ? `blob_stress_${this.stage}`
      : `blob_idle_${this.stage}`;
    if (this.visual.anims.currentAnim?.key !== base) {
      this.visual.play(base, true);
    }
  }

  // ─── Main update (called every frame from GameScene) ───────────────────────

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, delta: number) {
    if (this.isSad) return;

    if (!this.isBurping) {
      const walkSpd = STAGE_WALK_SPEED[this.stage];
      const jumpVel = STAGE_JUMP_VELOCITY[this.stage];

      if (cursors.left.isDown) {
        this.physics.vx = -walkSpd;
        this.visual.setFlipX(true);
      } else if (cursors.right.isDown) {
        this.physics.vx = walkSpd;
        this.visual.setFlipX(false);
      } else {
        this.physics.vx = 0;
      }

      if ((cursors.up.isDown || cursors.space?.isDown) && this.physics.onGround) {
        this.physics.vy = jumpVel;
      }
    }

    this.physics.update(delta / 1000, GRAVITY, LEVEL_WIDTH, LEVEL_HEIGHT);

    // Align the visual so the blob's drawn bottom matches the physics body bottom.
    //
    // The blob sprite is drawn centred in an 80px cell and displayed at scale S.
    //   blob visual bottom = sprite.y + bh × S / 2
    // We want that to equal physics.bottom = physics.cy + bh/2.
    // Solving: sprite.y = physics.cy + bh × (1 − S) / 2
    // At S=1.0 the offset is zero; at S>1 the sprite shifts up so the visual
    // bottom stays flush with the floor rather than sinking through it.
    const { scale } = SIZE_STAGES[this.stage];
    const visualY = this.physics.cy + this.physics.bh * (1 - scale) / 2;
    this.visual.setPosition(this.physics.cx, visualY);

    // Animation state machine
    if (this.isEating || this.isBurping) return;

    const { vx, vy, onGround } = this.physics;
    const s   = this.stage;
    const cur = this.visual.anims.currentAnim?.key ?? "";

    if (!onGround) {
      const airKey = vy > 0 ? `blob_fall_${s}` : `blob_jump_${s}`;
      if (!cur.startsWith("blob_jump") && !cur.startsWith("blob_fall")) {
        this.visual.play(airKey, true);
      }
    } else if (Math.abs(vx) > 10) {
      const walkKey = `blob_walk_${s}`;
      if (!cur.startsWith(walkKey)) this.visual.play(walkKey, true);
    } else {
      const idleKey = this.isStressed ? `blob_stress_${s}` : `blob_idle_${s}`;
      if (!cur.startsWith(idleKey)) this.visual.play(idleKey, true);
    }
  }

  // ─── Eat animation ─────────────────────────────────────────────────────────

  playEatAnim(onComplete?: () => void) {
    this.isEating = true;
    this.visual.play(`blob_eat_${this.stage}`, true);
    this.visual.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isEating = false;
      this.refreshAnim();
      onComplete?.();
    });
  }

  getStage(): StageIndex { return this.stage; }

  destroy() {
    this.visual.destroy();
  }
}
