import Phaser from "phaser";
import type { FoodType } from "../config/levels";

export class Food {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly foodType: FoodType;
  private bobTween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, type: FoodType) {
    this.foodType = type;
    this.sprite = scene.physics.add.sprite(x, y, type);
    this.sprite.setImmovable(true);
    (this.sprite.body as Phaser.Physics.Arcade.Body).allowGravity = false;

    // Gentle bob animation
    this.bobTween = scene.tweens.add({
      targets: this.sprite,
      y: y - 8,
      duration: 900 + Math.random() * 300,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
  }

  collect() {
    this.bobTween.stop();
    this.sprite.destroy();
  }

  destroy() {
    this.bobTween.stop();
    this.sprite.destroy();
  }
}
