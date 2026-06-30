import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "MenuScene" }); }

  create() {
    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Duct grid lines
    bg.lineStyle(2, 0x2d3748, 0.5);
    for (let x = 0; x < GAME_WIDTH; x += 60) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, GAME_HEIGHT); bg.strokePath();
    }
    for (let y = 0; y < GAME_HEIGHT; y += 60) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(GAME_WIDTH, y); bg.strokePath();
    }

    // Title
    this.add.text(GAME_WIDTH / 2, 95, "HUNGRY BOB", {
      fontSize: "72px",
      color: "#6fdc8c",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 178, "eat. grow. squeeze.", {
      fontSize: "22px",
      color: "#a0aec0",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // Animated Bob preview
    const bob = this.add.sprite(GAME_WIDTH / 2, 278, "blob_stage0", 0);
    bob.play("blob_idle_0");
    this.tweens.add({
      targets: bob,
      y: 270,
      duration: 1200,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });

    // Controls
    this.add.text(GAME_WIDTH / 2, 358, "← → move   ↑ / SPACE jump", {
      fontSize: "16px",
      color: "#718096",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 385, "Eat food to score — but Bob grows!\nWait to digest (burp) to squeeze through tight ducts.\nReach the exit before time runs out.", {
      fontSize: "14px",
      color: "#a0aec0",
      fontFamily: "monospace",
      align: "center",
    }).setOrigin(0.5);

    // Food legend
    this.add.text(GAME_WIDTH / 2 - 120, 430, "🟢 Healthy  +1 growth  +100 pts", {
      fontSize: "13px", color: "#6fdc8c", fontFamily: "monospace",
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2 + 120, 430, "🔴 Junk  +2 growth  +200 pts", {
      fontSize: "13px", color: "#f39c12", fontFamily: "monospace",
    }).setOrigin(0.5);

    // Play button
    const btn = this.add.text(GAME_WIDTH / 2, 480, "[ PRESS ENTER TO PLAY ]", {
      fontSize: "24px",
      color: "#6fdc8c",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
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
