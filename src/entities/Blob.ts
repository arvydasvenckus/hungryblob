import Phaser from "phaser";
import type { StageIndex } from "../config/constants";
import {
  SIZE_STAGES,
  STAGE_JUMP_VELOCITY,
  STAGE_WALK_SPEED,
  SHRINK_TWEEN_MS,
} from "../config/constants";
import { SizeSystem } from "../systems/SizeSystem";

export class Blob {
  readonly body: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private sizeSystem: SizeSystem;
  private stage: StageIndex = 0;
  private isBurping = false;
  private isStressed = false;
  private isSad = false;

  constructor(scene: Phaser.Scene, x: number, y: number, sizeSystem: SizeSystem) {
    this.scene = scene;
    this.sizeSystem = sizeSystem;

    this.body = scene.physics.add.sprite(x, y, "blob_stage0", 0);
    this.body.setCollideWorldBounds(true);
    this.body.setSize(SIZE_STAGES[0].width, SIZE_STAGES[0].height);
    this.body.setGravityY(0);
    this.body.play("blob_idle_0");

    sizeSystem.onSizeChange((evt) => {
      if (evt.type === "grow" || evt.type === "maxed") {
        this.applyStage(evt.stage as StageIndex, false);
      } else if (evt.type === "shrink") {
        this.triggerBurp(evt.stage as StageIndex);
      }
    });
  }

  // ─── Stage / size ──────────────────────────────────────────────────────────

  private applyStage(stage: StageIndex, instant: boolean) {
    this.stage = stage;
    const { scale, width, height } = SIZE_STAGES[stage];

    if (instant) {
      this.body.setScale(scale);
      this.body.setSize(width, height);
      this.refreshAnim();
    } else {
      this.scene.tweens.add({
        targets: this.body,
        scaleX: scale,
        scaleY: scale * 1.18,
        duration: 110,
        ease: "Back.Out",
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.body,
            scaleY: scale,
            duration: 80,
            ease: "Sine.Out",
          });
          this.body.setSize(width, height);
          this.refreshAnim();
        },
      });
    }
  }

  // ─── Burp (shrink) ─────────────────────────────────────────────────────────

  private triggerBurp(newStage: StageIndex) {
    if (this.isBurping) return;
    this.isBurping = true;

    const currentScale = SIZE_STAGES[this.stage].scale;
    const targetScale  = SIZE_STAGES[newStage].scale;

    // Phase 1: squash flat (cheeks puffed)
    this.scene.tweens.add({
      targets: this.body,
      scaleX: currentScale * 1.35,
      scaleY: currentScale * 0.65,
      duration: 100,
      ease: "Sine.Out",
      onComplete: () => {
        // Phase 2: stretch tall (winding up)
        this.scene.tweens.add({
          targets: this.body,
          scaleX: currentScale * 0.8,
          scaleY: currentScale * 1.4,
          duration: 100,
          ease: "Sine.In",
          onComplete: () => {
            // Phase 3: play burp anim frames + show BURP! text
            this.body.play(`blob_burp_${this.stage}`, true);
            this.spawnBurpBubble();

            // Phase 4: after burp frames, tween to new size
            this.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              this.scene.tweens.add({
                targets: this.body,
                scaleX: targetScale,
                scaleY: targetScale,
                duration: SHRINK_TWEEN_MS,
                ease: "Elastic.Out",
                onComplete: () => {
                  this.isBurping = false;
                  this.stage = newStage;
                  const { width, height } = SIZE_STAGES[newStage];
                  this.body.setSize(width, height);
                  this.refreshAnim();
                },
              });
            });
          },
        });
      },
    });
  }

  private spawnBurpBubble() {
    const x = this.body.x + SIZE_STAGES[this.stage].width * 0.6;
    const y = this.body.y - SIZE_STAGES[this.stage].height * 0.7;

    const bubble = this.scene.add.text(x, y, "BURP!", {
      fontSize: "22px",
      color: "#f1c40f",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0).setDepth(10);

    this.scene.tweens.add({
      targets: bubble,
      x: x + 20,
      y: y - 50,
      angle: 12,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 900,
      ease: "Quad.Out",
      onComplete: () => bubble.destroy(),
    });
  }

  // ─── Stress & sad states ───────────────────────────────────────────────────

  setStressed(on: boolean) {
    if (this.isStressed === on || this.isBurping || this.isSad) return;
    this.isStressed = on;
    if (on) {
      this.body.play(`blob_stress_${this.stage}`, true);
    } else {
      this.refreshAnim();
    }
  }

  playSadAnim() {
    this.isSad = true;
    this.body.play(`blob_sad_${this.stage}`, true);
    // Grayscale via tint (desaturate approximation)
    this.body.setTint(0x888888);
  }

  // ─── Animation helpers ─────────────────────────────────────────────────────

  private refreshAnim() {
    if (this.isSad) return;
    const base = this.isStressed
      ? `blob_stress_${this.stage}`
      : `blob_idle_${this.stage}`;
    if (this.body.anims.currentAnim?.key !== base) {
      this.body.play(base, true);
    }
  }

  // ─── Update (called every frame) ───────────────────────────────────────────

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    if (this.isBurping || this.isSad) return;

    const physBody = this.body.body as Phaser.Physics.Arcade.Body;
    const onGround = physBody.blocked.down;

    const jumpVel  = STAGE_JUMP_VELOCITY[this.stage];
    const walkSpd  = STAGE_WALK_SPEED[this.stage];

    // Horizontal movement
    if (cursors.left.isDown) {
      this.body.setVelocityX(-walkSpd);
      this.body.setFlipX(true);
    } else if (cursors.right.isDown) {
      this.body.setVelocityX(walkSpd);
      this.body.setFlipX(false);
    } else {
      this.body.setVelocityX(0);
    }

    // Jump
    if ((cursors.up.isDown || cursors.space?.isDown) && onGround) {
      this.body.setVelocityY(jumpVel);
    }

    // Animation state machine
    const vx = physBody.velocity.x;
    const vy = physBody.velocity.y;
    const s  = this.stage;

    if (!onGround) {
      const airKey = vy > 0 ? `blob_fall_${s}` : `blob_jump_${s}`;
      const cur = this.body.anims.currentAnim?.key ?? "";
      if (!cur.startsWith("blob_jump") && !cur.startsWith("blob_fall")) {
        this.body.play(airKey, true);
      }
    } else if (Math.abs(vx) > 10) {
      const walkKey = `blob_walk_${s}`;
      if (!this.body.anims.currentAnim?.key.startsWith(walkKey)) {
        this.body.play(walkKey, true);
      }
    } else {
      const idleKey = this.isStressed ? `blob_stress_${s}` : `blob_idle_${s}`;
      if (!this.body.anims.currentAnim?.key.startsWith(idleKey)) {
        this.body.play(idleKey, true);
      }
    }
  }

  // ─── Eat animation (plays then returns to idle) ────────────────────────────

  playEatAnim(onComplete?: () => void) {
    this.body.play(`blob_eat_${this.stage}`, true);
    this.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.refreshAnim();
      onComplete?.();
    });
  }

  getStage(): StageIndex { return this.stage; }

  destroy() { this.body.destroy(); }
}
