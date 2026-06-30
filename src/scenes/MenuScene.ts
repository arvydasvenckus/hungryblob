import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Decorative duct lines
    bg.lineStyle(2, 0x2d3748, 0.6);
    for (let x = 0; x < GAME_WIDTH; x += 60) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, GAME_HEIGHT); bg.strokePath();
    }
    for (let y = 0; y < GAME_HEIGHT; y += 60) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(GAME_WIDTH, y); bg.strokePath();
    }

    // Title
    this.add.text(GAME_WIDTH / 2, 120, "BLOBDUCT", {
      fontSize: "72px",
      color: "#6fdc8c",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 200, "eat. grow. squeeze.", {
      fontSize: "22px",
      color: "#a0aec0",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // Animated blob preview (stage 0 sprite)
    const blobPreview = this.add.sprite(GAME_WIDTH / 2, 290, "blob_stage0", 0);
    blobPreview.play("blob_idle_0");
    this.tweens.add({
      targets: blobPreview,
      y: 282,
      duration: 1200,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });

    // Controls hint
    this.add.text(GAME_WIDTH / 2, 370, "← → to move   ↑ / SPACE to jump", {
      fontSize: "16px",
      color: "#718096",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 395, "Eat food to score — but you'll grow!\nShrink by waiting (digest) to squeeze through tight ducts.\nReach the exit before time runs out.", {
      fontSize: "15px",
      color: "#a0aec0",
      fontFamily: "monospace",
      align: "center",
    }).setOrigin(0.5);

    // Play button
    const btn = this.add.text(GAME_WIDTH / 2, 470, "[ PRESS ENTER TO PLAY ]", {
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

    // Blink animation on button
    this.tweens.add({
      targets: btn,
      alpha: 0.4,
      duration: 700,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
  }

  private startGame() {
    this.scene.start("GameScene", { level: 0 });
    this.scene.launch("UIScene");
  }
}
