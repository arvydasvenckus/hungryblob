import Phaser from "phaser";
import type { StageIndex } from "../config/constants";
import {
  SIZE_STAGES,
  STAGE_JUMP_VELOCITY,
  STAGE_WALK_SPEED,
} from "../config/constants";
import { SizeSystem } from "../systems/SizeSystem";

export class Blob {
  readonly body: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private stage: StageIndex = 0;
  private isBurping = false;
  private isEating  = false;
  private isStressed = false;
  private isSad = false;

  constructor(scene: Phaser.Scene, x: number, y: number, sizeSystem: SizeSystem) {
    this.scene = scene;

    this.body = scene.physics.add.sprite(x, y, "blob_stage0", 0);
    this.body.setCollideWorldBounds(true);
    this.body.setGravityY(0);
    // Set initial scale + body size correctly at scale 1.0
    this.body.setScale(SIZE_STAGES[0].scale);
    this.body.setSize(SIZE_STAGES[0].width, SIZE_STAGES[0].height);
    this.body.play("blob_idle_0");

    sizeSystem.onSizeChange((evt) => {
      if (evt.type === "grow" || evt.type === "maxed") {
        this.applyStage(evt.stage as StageIndex);
      } else if (evt.type === "shrink") {
        this.triggerBurp(evt.stage as StageIndex);
      }
    });
  }

  // ─── Stage transitions ─────────────────────────────────────────────────────
  //
  // KEY RULE: setScale() + setSize() are ALWAYS called first, before any tween.
  // This keeps the physics body at the correct position throughout.
  // All squash/stretch tweens only touch scaleX — never scaleY.
  // (Tweening scaleY changes displayOriginY which shifts the body vertically,
  //  causing the "fall through floor" bug.)

  private applyStage(stage: StageIndex) {
    const pb = this.body.body as Phaser.Physics.Arcade.Body;
    // prevBottom is from the last completed physics step — body hasn't been
    // recalculated for this frame yet (we're in scene.update(), before preUpdate).
    const prevBottom = pb.bottom;

    this.stage = stage;
    const { scale, width, height } = SIZE_STAGES[stage];

    this.body.setScale(scale);
    this.body.setSize(width, height);

    // body.bottom = sprite.y + height/2  (verified from Phaser arcade formula).
    // Set sprite.y so the upcoming preUpdate() computes:
    //   pb.position.y = sprite.y - displayOriginY + offsetY = prevBottom - height
    // → pb.bottom = prevBottom (unchanged)  ✓
    this.body.y = prevBottom - height / 2;

    if (!this.isEating) this.refreshAnim();

    this.scene.tweens.killTweensOf(this.body);
    this.scene.tweens.add({
      targets: this.body,
      scaleX: scale * 1.32,
      duration: 80,
      ease: "Back.Out",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.body,
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

    // Phase 1: puff wide (X only — scaleY never touched)
    this.scene.tweens.killTweensOf(this.body);
    this.scene.tweens.add({
      targets: this.body,
      scaleX: oldScale * 1.45,
      duration: 100,
      ease: "Sine.Out",
      onComplete: () => {
        // Phase 2: compress → winding up
        this.scene.tweens.add({
          targets: this.body,
          scaleX: oldScale * 0.72,
          duration: 90,
          ease: "Sine.In",
          onComplete: () => {
            // Phase 3: play burp anim + BURP! bubble
            this.body.play(`blob_burp_${this.stage}`, true);
            this.spawnBurpBubble();

            this.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              // Defer the resize to scene.update() so it runs BEFORE the next
              // physics preUpdate — same reason as the eat deferral in GameScene.
              this.scene.time.delayedCall(0, () => {
                const pb2 = this.body.body as Phaser.Physics.Arcade.Body;
                const prevBottom2 = pb2.bottom;
                const { scale, width, height } = SIZE_STAGES[newStage];
                this.stage = newStage;
                this.body.setScale(scale);
                this.body.setSize(width, height);
                this.body.y = prevBottom2 - height / 2;

                // Wide pop then settle
                this.scene.tweens.add({
                  targets: this.body,
                  scaleX: scale * 1.3,
                  duration: 70,
                  ease: "Back.Out",
                  onComplete: () => {
                    this.scene.tweens.add({
                      targets: this.body,
                      scaleX: scale,
                      duration: 260,
                      ease: "Elastic.Out",
                      onComplete: () => {
                        this.isBurping = false;
                        this.refreshAnim();
                      },
                    });
                  },
                });
              });
            });
          },
        });
      },
    });
  }

  private spawnBurpBubble() {
    const { width, height } = SIZE_STAGES[this.stage];
    const x = this.body.x + width * 0.55;
    const y = this.body.y - height * 0.8;

    const bubble = this.scene.add.text(x, y, "BURP!", {
      fontSize: "22px",
      color: "#f1c40f",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0).setDepth(10);

    this.scene.tweens.add({
      targets: bubble,
      x: x + 18,
      y: y - 55,
      angle: 10,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 950,
      ease: "Quad.Out",
      onComplete: () => bubble.destroy(),
    });
  }

  // ─── Stress & sad ──────────────────────────────────────────────────────────

  setStressed(on: boolean) {
    if (this.isStressed === on || this.isBurping || this.isSad) return;
    this.isStressed = on;
    if (on) this.body.play(`blob_stress_${this.stage}`, true);
    else    this.refreshAnim();
  }

  playSadAnim() {
    this.isSad = true;
    this.body.play(`blob_sad_${this.stage}`, true);
    this.body.setTint(0x888888);
  }

  // ─── Animation helpers ─────────────────────────────────────────────────────

  private refreshAnim() {
    // Never interrupt eating or sad animations
    if (this.isEating || this.isSad) return;
    const base = this.isStressed
      ? `blob_stress_${this.stage}`
      : `blob_idle_${this.stage}`;
    if (this.body.anims.currentAnim?.key !== base) {
      this.body.play(base, true);
    }
  }

  // ─── Frame loop ────────────────────────────────────────────────────────────

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    if (this.isBurping || this.isSad) return;

    const physBody = this.body.body as Phaser.Physics.Arcade.Body;
    const onGround = physBody.blocked.down;
    const jumpVel  = STAGE_JUMP_VELOCITY[this.stage];
    const walkSpd  = STAGE_WALK_SPEED[this.stage];

    if (cursors.left.isDown) {
      this.body.setVelocityX(-walkSpd);
      this.body.setFlipX(true);
    } else if (cursors.right.isDown) {
      this.body.setVelocityX(walkSpd);
      this.body.setFlipX(false);
    } else {
      this.body.setVelocityX(0);
    }

    if ((cursors.up.isDown || cursors.space?.isDown) && onGround) {
      this.body.setVelocityY(jumpVel);
    }

    // Don't override the eat animation in the state machine
    if (this.isEating) return;

    const vx  = physBody.velocity.x;
    const vy  = physBody.velocity.y;
    const s   = this.stage;
    const cur = this.body.anims.currentAnim?.key ?? "";

    if (!onGround) {
      const airKey = vy > 0 ? `blob_fall_${s}` : `blob_jump_${s}`;
      if (!cur.startsWith("blob_jump") && !cur.startsWith("blob_fall")) {
        this.body.play(airKey, true);
      }
    } else if (Math.abs(vx) > 10) {
      const walkKey = `blob_walk_${s}`;
      if (!cur.startsWith(walkKey)) this.body.play(walkKey, true);
    } else {
      const idleKey = this.isStressed ? `blob_stress_${s}` : `blob_idle_${s}`;
      if (!cur.startsWith(idleKey)) this.body.play(idleKey, true);
    }
  }

  // ─── Eat animation ─────────────────────────────────────────────────────────

  playEatAnim(onComplete?: () => void) {
    this.isEating = true;
    this.body.play(`blob_eat_${this.stage}`, true);
    this.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isEating = false;
      this.refreshAnim();
      onComplete?.();
    });
  }

  getStage(): StageIndex { return this.stage; }
  destroy()              { this.body.destroy(); }
}
