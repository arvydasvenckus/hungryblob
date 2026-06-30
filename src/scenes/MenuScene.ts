import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "MenuScene" }); }

  create() {
    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Duct grid lines (spacing × 2)
    bg.lineStyle(3, 0x2d3748, 0.5);
    for (let x = 0; x < GAME_WIDTH; x += 120) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, GAME_HEIGHT); bg.strokePath();
    }
    for (let y = 0; y < GAME_HEIGHT; y += 120) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(GAME_WIDTH, y); bg.strokePath();
    }

    // Title
    this.add.text(GAME_WIDTH / 2, 190, "HUNGRY BOB", {
      fontSize: "144px",
      color: "#6fdc8c",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 10,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 356, "eat. grow. squeeze.", {
      fontSize: "44px",
      color: "#a0aec0",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // Animated Bob preview
    const bob = this.add.sprite(GAME_WIDTH / 2, 556, "blob_stage0", 0);
    bob.play("blob_idle_0");
    this.tweens.add({
      targets: bob,
      y: 540,
      duration: 1200,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });

    // Controls
    this.add.text(GAME_WIDTH / 2, 716, "← → move   ↑ / SPACE jump", {
      fontSize: "32px",
      color: "#718096",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 770, "Eat food to score — but Bob grows!\nWait to digest (burp) to squeeze through tight ducts.\nReach the exit before time runs out.", {
      fontSize: "28px",
      color: "#a0aec0",
      fontFamily: "monospace",
      align: "center",
    }).setOrigin(0.5);

    // Food legend
    this.add.text(GAME_WIDTH / 2 - 240, 860, "🟢 Healthy  +1 growth  +100 pts", {
      fontSize: "26px", color: "#6fdc8c", fontFamily: "monospace",
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2 + 240, 860, "🔴 Junk  +2 growth  +200 pts", {
      fontSize: "26px", color: "#f39c12", fontFamily: "monospace",
    }).setOrigin(0.5);

    // Play button
    const btn = this.add.text(GAME_WIDTH / 2, 960, "[ PRESS ENTER TO PLAY ]", {
      fontSize: "48px",
      color: "#6fdc8c",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 5,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on("pointerover",  () => btn.setColor("#a4de6c"));
    btn.on("pointerout",   () => btn.setColor("#6fdc8c"));
    btn.on("pointerdown",  () => this.startGame());
    this.input.keyboard!.on("keydown-ENTER", () => this.startGame());

    this.tweens.add({ targets: btn, alpha: 0.4, duration: 700, ease: "Sine.InOut", yoyo: true, repeat: -1 });

    if (!this.sound.get("menumusic")?.isPlaying) {
      this.sound.play("menumusic", { loop: true, volume: 0.4 });
    }
  }

  private startGame() {
    this.sound.stopByKey("menumusic");
    this.scene.start("GameScene", { level: 0 });
  }
}
