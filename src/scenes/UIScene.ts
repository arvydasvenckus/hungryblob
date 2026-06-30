import Phaser from "phaser";
import { GAME_WIDTH, SIZE_STAGES, SHRINK_COOLDOWN_MS } from "../config/constants";

export class UIScene extends Phaser.Scene {
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private stageDots: Phaser.GameObjects.Image[] = [];
  private cooldownArc!: Phaser.GameObjects.Graphics;
  private messageText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "UIScene" });
  }

  create() {
    // ── Reset mutable arrays/refs so restarts don't accumulate stale objects ──
    this.stageDots = [];

    const pad = 16;

    // Timer (top centre)
    this.timerText = this.add.text(GAME_WIDTH / 2, pad, "1:30", {
      fontSize: "28px",
      color: "#ffffff",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // Score (top left)
    this.scoreText = this.add.text(pad, pad, "Score: 0", {
      fontSize: "20px",
      color: "#f1c40f",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    });

    // Size stage indicator (top right) — 5 dots
    const dotSpacing = 22;
    const dotStartX = GAME_WIDTH - pad - SIZE_STAGES.length * dotSpacing;
    for (let i = 0; i < SIZE_STAGES.length; i++) {
      const dot = this.add.image(dotStartX + i * dotSpacing, pad + 10, "ui_dot_off");
      this.stageDots.push(dot);
    }

    // Cooldown ring
    this.cooldownArc = this.add.graphics();
    this.drawCooldown(0);

    // Message overlay
    this.messageText = this.add.text(GAME_WIDTH / 2, 260, "", {
      fontSize: "36px",
      color: "#ffffff",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    // Wire events from GameScene (use 'on' so they persist while scene is active)
    this.events.on("update-timer",    (r: number)               => this.setTimer(r));
    this.events.on("update-score",    (s: number)               => this.setScore(s));
    this.events.on("update-stage",    (s: number)               => this.setStage(s));
    this.events.on("update-cooldown", (p: number)               => this.setCooldown(p));
    this.events.on("show-message",    (m: string, c?: string)   => this.showMessage(m, c));
  }

  private setTimer(remaining: number) {
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    this.timerText.setText(`${mins}:${secs.toString().padStart(2, "0")}`);
    this.timerText.setColor(remaining < 15 ? "#e74c3c" : "#ffffff");
  }

  private setScore(score: number) {
    this.scoreText.setText(`Score: ${score}`);
  }

  private setStage(stage: number) {
    const colors = [0x6fdc8c, 0xa4de6c, 0xf4d03f, 0xf39c12, 0xe74c3c];
    this.stageDots.forEach((dot, i) => {
      dot.setTexture(i <= stage ? "ui_dot_on" : "ui_dot_off");
      if (i <= stage) dot.setTint(colors[stage]);
      else dot.clearTint();
    });
  }

  private setCooldown(pct: number) {
    this.drawCooldown(pct);
  }

  private drawCooldown(pct: number) {
    this.cooldownArc.clear();
    const cx = GAME_WIDTH - 30;
    const cy = 46;
    const r  = 12;

    this.cooldownArc.lineStyle(3, 0x4a5568, 1);
    this.cooldownArc.strokeCircle(cx, cy, r);

    if (pct > 0) {
      this.cooldownArc.lineStyle(3, 0x6fdc8c, 1);
      this.cooldownArc.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle   = startAngle + Math.PI * 2 * pct;
      this.cooldownArc.arc(cx, cy, r, startAngle, endAngle, false);
      this.cooldownArc.strokePath();
    }
  }

  showMessage(msg: string, color = "#ffffff") {
    this.messageText.setText(msg).setColor(color).setVisible(true);
    this.time.delayedCall(2500, () => {
      if (this.messageText?.active) this.messageText.setVisible(false);
    });
  }
}
