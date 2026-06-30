import Phaser from "phaser";
import type { StageIndex } from "../config/constants";
import {
  SIZE_STAGES,
  JUMP_VELOCITY,
  WALK_SPEED,
  SHRINK_TWEEN_MS,
} from "../config/constants";
import { SizeSystem } from "../systems/SizeSystem";

export class Blob {
  readonly body: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private sizeSystem: SizeSystem;
  private stage: StageIndex = 0;
  private isBurping = false;
  private facingRight = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    sizeSystem: SizeSystem
  ) {
    this.scene = scene;
    this.sizeSystem = sizeSystem;

    this.body = scene.physics.add.sprite(x, y, "blob_stage0", 0);
    this.body.setCollideWorldBounds(true);

    const stageData = SIZE_STAGES[0];
    this.body.setSize(stageData.width, stageData.height);
    this.body.setGravityY(0); // world gravity handles it

    this.body.play("blob_idle_0");

    sizeSystem.onSizeChange((evt) => {
      if (evt.type === "grow") {
        this.applyStage(evt.stage as StageIndex, false);
      } else if (evt.type === "shrink") {
        this.triggerBurp(evt.stage as StageIndex);
      }
    });
  }

  private applyStage(stage: StageIndex, instant: boolean) {
    this.stage = stage;
    const stageData = SIZE_STAGES[stage];

    const targetScale = stageData.scale;
    const targetW = stageData.width;
    const targetH = stageData.height;

    if (instant) {
      this.body.setScale(targetScale);
      this.body.setSize(targetW, targetH);
      this.refreshAnim();
    } else {
      this.scene.tweens.add({
        targets: this.body,
        scaleX: targetScale,
        scaleY: targetScale * 1.15, // squash on growth
        duration: 120,
        ease: "Back.Out",
        yoyo: false,
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.body,
            scaleY: targetScale,
            duration: 80,
            ease: "Sine.Out",
          });
          this.body.setSize(targetW, targetH);
          this.refreshAnim();
        },
      });
    }
  }

  private triggerBurp(newStage: StageIndex) {
    if (this.isBurping) return;
    this.isBurping = true;

    // Puff out then shrink
    const current = SIZE_STAGES[this.stage].scale;
    const target  = SIZE_STAGES[newStage].scale;

    this.scene.tweens.add({
      targets: this.body,
      scaleX: current * 1.25,
      scaleY: current * 0.75,
      duration: 120,
      ease: "Sine.Out",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.body,
          scaleX: target,
          scaleY: target,
          duration: SHRINK_TWEEN_MS,
          ease: "Elastic.Out",
          onComplete: () => {
            this.isBurping = false;
            this.stage = newStage;
            this.body.setSize(SIZE_STAGES[newStage].width, SIZE_STAGES[newStage].height);
            this.refreshAnim();
          },
        });
      },
    });
  }

  private refreshAnim() {
    const base = `blob_idle_${this.stage}`;
    if (this.body.anims.currentAnim?.key !== base) {
      this.body.play(base, true);
    }
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    if (this.isBurping) return;

    const onGround = (this.body.body as Phaser.Physics.Arcade.Body).blocked.down;

    // Horizontal movement
    if (cursors.left.isDown) {
      this.body.setVelocityX(-WALK_SPEED);
      this.body.setFlipX(true);
      this.facingRight = false;
    } else if (cursors.right.isDown) {
      this.body.setVelocityX(WALK_SPEED);
      this.body.setFlipX(false);
      this.facingRight = true;
    } else {
      this.body.setVelocityX(0);
    }

    // Jump
    if ((cursors.up.isDown || cursors.space?.isDown) && onGround) {
      this.body.setVelocityY(JUMP_VELOCITY);
      this.body.play(`blob_jump_${this.stage}`, true);
    }

    // Animation state machine
    const vx = (this.body.body as Phaser.Physics.Arcade.Body).velocity.x;
    const vy = (this.body.body as Phaser.Physics.Arcade.Body).velocity.y;

    if (!onGround) {
      const fallAnim = vy > 0 ? `blob_fall_${this.stage}` : `blob_jump_${this.stage}`;
      if (!this.body.anims.currentAnim?.key.startsWith("blob_jump") &&
          !this.body.anims.currentAnim?.key.startsWith("blob_fall")) {
        this.body.play(fallAnim, true);
      }
    } else if (Math.abs(vx) > 10) {
      if (!this.body.anims.currentAnim?.key.startsWith(`blob_walk_${this.stage}`)) {
        this.body.play(`blob_walk_${this.stage}`, true);
      }
    } else {
      if (!this.body.anims.currentAnim?.key.startsWith(`blob_idle_${this.stage}`)) {
        this.body.play(`blob_idle_${this.stage}`, true);
      }
    }
  }

  playEatAnim(onComplete?: () => void) {
    this.body.play(`blob_eat_${this.stage}`, true);
    this.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.refreshAnim();
      onComplete?.();
    });
  }

  getStage(): StageIndex { return this.stage; }

  destroy() {
    this.body.destroy();
  }
}
