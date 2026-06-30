import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { LEVELS } from "../config/levels";

/**
 * Shown once, between the tutorial result screen and Level 1.
 * A focused heads-up before the timed challenge begins.
 */
export class BriefingScene extends Phaser.Scene {
  constructor() { super({ key: "BriefingScene" }); }

  init(data: { targetLevel: number }) {
    (this as any)._target = data.targetLevel ?? 1;
  }

  create() {
    const targetLevel = (this as any)._target as number;
    const levelCfg   = LEVELS[targetLevel];

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    bg.lineStyle(2, 0x2d3748, 0.35);
    for (let x = 0; x < GAME_WIDTH; x += 120) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, GAME_HEIGHT); bg.strokePath();
    }
    for (let y = 0; y < GAME_HEIGHT; y += 120) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(GAME_WIDTH, y); bg.strokePath();
    }

    const cx = GAME_WIDTH / 2;

    // Level label
    this.add.text(cx, 100, `LEVEL 1 — "${levelCfg.name}"`, {
      fontSize: "34px", color: "#718096", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5);

    // Main alert
    this.add.text(cx, 210, "REAL CHALLENGE STARTS NOW", {
      fontSize: "68px", color: "#f39c12", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5);

    // Divider
    const div = this.add.graphics();
    div.lineStyle(2, 0x4a5568, 0.7);
    div.beginPath(); div.moveTo(cx - 440, 300); div.lineTo(cx + 440, 300); div.strokePath();

    // Two key conditions — big, clear
    this.add.text(cx, 395, `${levelCfg.timeLimit}s`, {
      fontSize: "120px", color: "#e74c3c", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(cx, 510, "to get through the level", {
      fontSize: "32px", color: "#a0aec0", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(cx, 615, `${levelCfg.scoreThreshold} points`, {
      fontSize: "80px", color: "#f1c40f", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 7,
    }).setOrigin(0.5);
    this.add.text(cx, 705, "needed to unlock the exit", {
      fontSize: "32px", color: "#a0aec0", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5);

    // Divider
    const div2 = this.add.graphics();
    div2.lineStyle(2, 0x4a5568, 0.7);
    div2.beginPath(); div2.moveTo(cx - 440, 770); div2.lineTo(cx + 440, 770); div2.strokePath();

    // GO button
    let acting = false;
    const go = (fn: () => void) => { if (!acting) { acting = true; fn(); } };

    const btn = this.add.text(cx, 875, "[ ENTER ] I'M READY", {
      fontSize: "48px", color: "#6fdc8c", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 5,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on("pointerover",  () => btn.setColor("#a4de6c"));
    btn.on("pointerout",   () => btn.setColor("#6fdc8c"));
    btn.on("pointerup",    () => go(() => this.startLevel(targetLevel)));
    btn.on("pointerdown",  () => go(() => this.startLevel(targetLevel)));
    this.input.keyboard!.on("keydown-ENTER", () => go(() => this.startLevel(targetLevel)));
    this.input.keyboard!.on("keydown-G",     () => go(() => this.startLevel(targetLevel)));

    this.tweens.add({
      targets: btn, alpha: 0.45, duration: 650, ease: "Sine.InOut", yoyo: true, repeat: -1,
    });
  }

  private startLevel(level: number) {
    this.sound.stopByKey("menumusic");
    this.scene.start("GameScene", { level });
  }
}
