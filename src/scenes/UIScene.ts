import Phaser from "phaser";
import { GAME_WIDTH, SIZE_STAGES, SHRINK_COOLDOWN_MS } from "../config/constants";

export class UIScene extends Phaser.Scene {
  private timerText!: Phaser.GameObjects.Text;
  private timerHidden = false;
  private scoreText!: Phaser.GameObjects.Text;
  private scoreThreshold = 0;
  private goalText!: Phaser.GameObjects.Text;
  private stageDots: Phaser.GameObjects.Image[] = [];
  private cooldownArc!: Phaser.GameObjects.Graphics;
  private messageText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "UIScene" });
  }

  create() {
    this.stageDots      = [];
    this.timerHidden    = false;
    this.scoreThreshold = 0;

    const pad = 32; // was 16 — scaled 2×

    // Timer (top centre)
    this.timerText = this.add.text(GAME_WIDTH / 2, pad, "1:05", {
      fontSize: "56px",
      color: "#ffffff",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 5,
    }).setOrigin(0.5, 0);

    // Score (top left)
    this.scoreText = this.add.text(pad, pad, "Score: 0", {
      fontSize: "40px",
      color: "#f1c40f",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 5,
    });

    // Goal indicator — shown below score when a score threshold exists
    this.goalText = this.add.text(pad, pad + 52, "", {
      fontSize: "26px",
      color: "#e74c3c",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    }).setVisible(false);

    // Size stage indicator (top right)
    const dotSpacing = 44;
    const dotStartX  = GAME_WIDTH - pad - SIZE_STAGES.length * dotSpacing;
    for (let i = 0; i < SIZE_STAGES.length; i++) {
      const dot = this.add.image(dotStartX + i * dotSpacing, pad + 20, "ui_dot_off");
      dot.setScale(2);
      this.stageDots.push(dot);
    }

    // Cooldown ring
    this.cooldownArc = this.add.graphics();
    this.drawCooldown(0);

    // Message overlay
    this.messageText = this.add.text(GAME_WIDTH / 2, 520, "", {
      fontSize: "72px",
      color: "#ffffff",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center",
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    this.events.on("update-timer",       (r: number)             => this.setTimer(r));
    this.events.on("update-score",       (s: number)             => this.setScore(s));
    this.events.on("update-stage",       (s: number)             => this.setStage(s));
    this.events.on("update-cooldown",    (p: number)             => this.setCooldown(p));
    this.events.on("show-message",       (m: string, c?: string) => this.showMessage(m, c));
    this.events.on("hide-timer",         ()                      => this.hideTimer());
    this.events.on("set-score-threshold",(t: number)             => this.setGoal(t));
    this.events.on("exit-unlocked",      ()                      => this.onExitUnlocked());
  }

  private hideTimer() {
    this.timerHidden = true;
    this.timerText.setVisible(false);
  }

  private setTimer(remaining: number) {
    if (this.timerHidden) return;
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    this.timerText.setText(`${mins}:${secs.toString().padStart(2, "0")}`);
    this.timerText.setColor(remaining < 15 ? "#e74c3c" : "#ffffff");
  }

  private setGoal(threshold: number) {
    this.scoreThreshold = threshold;
    if (threshold > 0) {
      this.goalText.setText(`🔒 GOAL: ${threshold}`).setVisible(true);
    }
  }

  private onExitUnlocked() {
    this.goalText.setText("✓ EXIT OPEN").setColor("#6fdc8c");
    this.time.delayedCall(2000, () => {
      if (this.goalText?.active) this.goalText.setVisible(false);
    });
  }

  private setScore(score: number) {
    this.scoreText.setText(`Score: ${score}`);
    // Update goal indicator colour as score approaches threshold
    if (this.scoreThreshold > 0 && score < this.scoreThreshold) {
      const pct = score / this.scoreThreshold;
      const color = pct >= 0.66 ? "#f39c12" : "#e74c3c";
      this.goalText.setText(`🔒 GOAL: ${this.scoreThreshold - score} left`).setColor(color);
    }
  }

  private setStage(stage: number) {
    const colors = [0x6fdc8c, 0xa4de6c, 0xf4d03f, 0xf39c12, 0xe74c3c];
    this.stageDots.forEach((dot, i) => {
      dot.setTexture(i <= stage ? "ui_dot_on" : "ui_dot_off");
      if (i <= stage) dot.setTint(colors[Math.min(stage, colors.length - 1)]);
      else dot.clearTint();
    });
  }

  private setCooldown(pct: number) {
    this.drawCooldown(pct);
  }

  private drawCooldown(pct: number) {
    this.cooldownArc.clear();
    const cx = GAME_WIDTH - 60;  // was -30
    const cy = 92;               // was 46
    const r  = 24;               // was 12

    this.cooldownArc.lineStyle(6, 0x4a5568, 1); // was 3
    this.cooldownArc.strokeCircle(cx, cy, r);

    if (pct > 0) {
      this.cooldownArc.lineStyle(6, 0x6fdc8c, 1);
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
