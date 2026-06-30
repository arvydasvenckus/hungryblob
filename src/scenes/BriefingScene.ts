import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { LEVELS } from "../config/levels";

/**
 * Shown once, between the tutorial result screen and Level 1.
 * Explains that the real game now has a time limit and score requirement.
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

    // Subtle grid
    bg.lineStyle(2, 0x2d3748, 0.4);
    for (let x = 0; x < GAME_WIDTH; x += 120) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, GAME_HEIGHT); bg.strokePath();
    }
    for (let y = 0; y < GAME_HEIGHT; y += 120) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(GAME_WIDTH, y); bg.strokePath();
    }

    const cx = GAME_WIDTH / 2;

    // Header
    this.add.text(cx, 130, "HEADS UP!", {
      fontSize: "72px", color: "#f39c12", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 230, `Next: Level 1 — "${levelCfg.name}"`, {
      fontSize: "36px", color: "#a0aec0", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5);

    // Divider
    const div = this.add.graphics();
    div.lineStyle(2, 0x4a5568, 0.8);
    div.beginPath(); div.moveTo(cx - 380, 295); div.lineTo(cx + 380, 295); div.strokePath();

    // Briefing bullets
    const bullets: [string, string][] = [
      ["CLOCK IS TICKING",   `You have ${levelCfg.timeLimit} seconds to get through the level.`],
      ["SCORE TO UNLOCK",    `Collect ${levelCfg.scoreThreshold} points before the exit will open.`],
      ["WATCH YOUR SIZE",    "Tight spaces block big Bob — burp your way through."],
      ["JUNK FOOD = RISK",   "More points, but you grow faster. Choose wisely."],
    ];

    let y = 360;
    for (const [label, body] of bullets) {
      this.add.text(cx - 380, y, `▸ ${label}`, {
        fontSize: "26px", color: "#6fdc8c", fontFamily: "monospace",
        stroke: "#000", strokeThickness: 2,
      });
      this.add.text(cx - 380, y + 36, `  ${body}`, {
        fontSize: "22px", color: "#cbd5e0", fontFamily: "monospace",
        stroke: "#000", strokeThickness: 2,
      });
      y += 108;
    }

    // GO button
    let acting = false;
    const go = (fn: () => void) => { if (!acting) { acting = true; fn(); } };

    const btn = this.add.text(cx, GAME_HEIGHT - 110, "[ G ] GO!", {
      fontSize: "52px", color: "#6fdc8c", fontFamily: "monospace",
      stroke: "#000", strokeThickness: 5,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on("pointerover",  () => btn.setColor("#a4de6c"));
    btn.on("pointerout",   () => btn.setColor("#6fdc8c"));
    btn.on("pointerup",    () => go(() => this.startLevel(targetLevel)));
    btn.on("pointerdown",  () => go(() => this.startLevel(targetLevel)));
    this.input.keyboard!.on("keydown-G",     () => go(() => this.startLevel(targetLevel)));
    this.input.keyboard!.on("keydown-ENTER", () => go(() => this.startLevel(targetLevel)));

    this.tweens.add({
      targets: btn, alpha: 0.45, duration: 650, ease: "Sine.InOut", yoyo: true, repeat: -1,
    });

    this.add.text(cx, GAME_HEIGHT - 60, "or press ENTER", {
      fontSize: "22px", color: "#4a5568", fontFamily: "monospace",
    }).setOrigin(0.5);
  }

  private startLevel(level: number) {
    this.sound.stopByKey("menumusic");
    this.scene.start("GameScene", { level });
  }
}
