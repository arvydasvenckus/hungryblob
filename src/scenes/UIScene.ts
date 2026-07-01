import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, SIZE_STAGES, SHRINK_COOLDOWN_MS } from "../config/constants";

// ─── Dock layout constants ───────────────────────────────────────────────────
const DOCK_H       = 96;
const DOCK_BOTTOM  = GAME_HEIGHT - 12;      // 1068
const DOCK_TOP     = DOCK_BOTTOM - DOCK_H;  // 972
const DOCK_CY      = DOCK_TOP + DOCK_H / 2; // 1020

const ICON_SIZE    = 52;
const ICON_GAP     = 12;
const STAGE_COUNT  = SIZE_STAGES.length;
const STAGE_W      = STAGE_COUNT * ICON_SIZE + (STAGE_COUNT - 1) * ICON_GAP; // 500
const DOCK_PAD     = 24;
const VESSEL_W     = 60;
const VESSEL_H     = 82;
const SEP_GAP      = 28;
const DOCK_W       = DOCK_PAD + STAGE_W + SEP_GAP + VESSEL_W + DOCK_PAD; // 644

const DOCK_LEFT    = (GAME_WIDTH - DOCK_W) / 2;  // ~638
const ICONS_LEFT   = DOCK_LEFT + DOCK_PAD;
const VESSEL_CX    = DOCK_LEFT + DOCK_PAD + STAGE_W + SEP_GAP + VESSEL_W / 2;

// Stage icon palette (green → yellow → orange → red → deep red)
const STAGE_COLORS = [0x6fdc8c, 0xa4de6c, 0xf4d03f, 0xf39c12, 0xe67e22, 0xe74c3c, 0xc0392b, 0x8e0000];

// American diner palette
const DINER_RED      = 0xc0392b;
const DINER_CREAM    = 0xfdf6e3;
const DINER_CHROME   = 0xe8e0d0;
const SODA_AMBER     = 0xc0392b; // cola-ish dark red for the soda
const SODA_FOAM      = 0xfdf6e3; // cream head

export class UIScene extends Phaser.Scene {
  private timerText!: Phaser.GameObjects.Text;
  private timerHidden = false;
  private scoreText!: Phaser.GameObjects.Text;
  private scoreThreshold = 0;
  private goalText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  // Dock
  private dockBg!: Phaser.GameObjects.Graphics;
  private stageIconGfx!: Phaser.GameObjects.Graphics;
  private vesselGfx!: Phaser.GameObjects.Graphics;
  private currentStage = 0;
  private currentFill  = 0;  // 0 = empty (just ate), 1 = full (ready to burp)
  private activeBubbles = 0;
  private bubbleTimer!: Phaser.Time.TimerEvent;
  private readonly MAX_BUBBLES = 6;

  constructor() { super({ key: "UIScene" }); }

  create() {
    this.timerHidden    = false;
    this.scoreThreshold = 0;
    this.currentStage   = 0;
    this.currentFill    = 0;
    this.activeBubbles  = 0;

    const pad = 32;

    // ── Timer (top centre) ─────────────────────────────────────────────────
    this.timerText = this.add.text(GAME_WIDTH / 2, pad, "1:05", {
      fontSize: "56px", color: "#ffffff", fontFamily: "monospace",
      stroke: "#000000", strokeThickness: 5,
    }).setOrigin(0.5, 0);

    // ── Score (top left) ───────────────────────────────────────────────────
    this.scoreText = this.add.text(pad, pad, "Score: 0", {
      fontSize: "40px", color: "#f1c40f", fontFamily: "monospace",
      stroke: "#000000", strokeThickness: 5,
    });

    // ── Goal indicator ─────────────────────────────────────────────────────
    this.goalText = this.add.text(pad, pad + 52, "", {
      fontSize: "26px", color: "#e74c3c", fontFamily: "monospace",
      stroke: "#000000", strokeThickness: 3,
    }).setVisible(false);

    // ── Bottom dock ────────────────────────────────────────────────────────
    this.buildDock();

    // ── Message overlay ────────────────────────────────────────────────────
    this.messageText = this.add.text(GAME_WIDTH / 2, 520, "", {
      fontSize: "72px", color: "#ffffff", fontFamily: "monospace",
      stroke: "#000000", strokeThickness: 6, align: "center",
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    // ── Event wiring ───────────────────────────────────────────────────────
    this.events.on("update-timer",       (r: number)             => this.setTimer(r));
    this.events.on("update-score",       (s: number)             => this.setScore(s));
    this.events.on("update-stage",       (s: number)             => this.setStage(s));
    this.events.on("update-cooldown",    (p: number)             => this.setCooldown(p));
    this.events.on("show-message",       (m: string, c?: string) => this.showMessage(m, c));
    this.events.on("hide-timer",         ()                      => this.hideTimer());
    this.events.on("set-score-threshold",(t: number)             => this.setGoal(t));
    this.events.on("exit-unlocked",      ()                      => this.onExitUnlocked());
    this.events.on("show-ring-hint",     ()                      => this.showRingHighlight());
  }

  // ─── Dock construction ────────────────────────────────────────────────────

  private buildDock() {
    // Dock background — diner chrome rail style
    const bg = this.add.graphics().setDepth(2);
    const rx = 20; // corner radius

    // Outer shadow/depth
    bg.fillStyle(0x2c1810, 0.7);
    bg.fillRoundedRect(DOCK_LEFT + 3, DOCK_TOP + 3, DOCK_W, DOCK_H, rx);

    // Main chrome body
    bg.fillStyle(DINER_CHROME, 0.92);
    bg.fillRoundedRect(DOCK_LEFT, DOCK_TOP, DOCK_W, DOCK_H, rx);

    // Red accent stripe along top edge (diner rail)
    bg.fillStyle(DINER_RED, 0.85);
    bg.fillRoundedRect(DOCK_LEFT, DOCK_TOP, DOCK_W, 8, { tl: rx, tr: rx, bl: 0, br: 0 });

    // Inner highlight
    bg.fillStyle(0xffffff, 0.18);
    bg.fillRoundedRect(DOCK_LEFT + 4, DOCK_TOP + 10, DOCK_W - 8, 16, 6);

    // Subtle vertical separator before vessel
    const sepX = DOCK_LEFT + DOCK_PAD + STAGE_W + SEP_GAP / 2;
    bg.lineStyle(2, 0x8b7355, 0.5);
    bg.beginPath(); bg.moveTo(sepX, DOCK_TOP + 14); bg.lineTo(sepX, DOCK_BOTTOM - 14); bg.strokePath();

    this.dockBg = bg;

    // Stage icons graphics layer
    this.stageIconGfx = this.add.graphics().setDepth(3);
    this.drawStageIcons(0);

    // Vessel graphics layer
    this.vesselGfx = this.add.graphics().setDepth(3);
    this.drawVessel(0);

    // Bubble spawner
    this.bubbleTimer = this.time.addEvent({
      delay: 700,
      loop: true,
      callback: this.spawnBubble,
      callbackScope: this,
    });
  }

  // ─── Stage icons ──────────────────────────────────────────────────────────

  private drawStageIcons(stage: number) {
    this.stageIconGfx.clear();

    for (let i = 0; i < STAGE_COUNT; i++) {
      const ix = ICONS_LEFT + i * (ICON_SIZE + ICON_GAP) + ICON_SIZE / 2;
      const iy = DOCK_CY;
      const r  = ICON_SIZE * 0.35; // corner radius to match Bob

      if (i < stage) {
        // Past stages: dimmer, filled
        const c = STAGE_COLORS[Math.min(i, STAGE_COLORS.length - 1)];
        this.stageIconGfx.fillStyle(c, 0.35);
        this.stageIconGfx.fillRoundedRect(ix - ICON_SIZE / 2, iy - ICON_SIZE / 2, ICON_SIZE, ICON_SIZE, r);
        this.stageIconGfx.lineStyle(2, c, 0.5);
        this.stageIconGfx.strokeRoundedRect(ix - ICON_SIZE / 2, iy - ICON_SIZE / 2, ICON_SIZE, ICON_SIZE, r);
      } else if (i === stage) {
        // Current stage: bright + slightly larger
        const c = STAGE_COLORS[Math.min(i, STAGE_COLORS.length - 1)];
        const sz = ICON_SIZE + 8;
        this.stageIconGfx.fillStyle(c, 1);
        this.stageIconGfx.fillRoundedRect(ix - sz / 2, iy - sz / 2, sz, sz, r + 2);
        // Inner shine
        this.stageIconGfx.fillStyle(0xffffff, 0.25);
        this.stageIconGfx.fillEllipse(ix - sz * 0.12, iy - sz * 0.15, sz * 0.35, sz * 0.22);
        // Border
        this.stageIconGfx.lineStyle(3, 0xffffff, 0.6);
        this.stageIconGfx.strokeRoundedRect(ix - sz / 2, iy - sz / 2, sz, sz, r + 2);
      } else {
        // Future stages: dim outline
        this.stageIconGfx.lineStyle(2, 0x8b7355, 0.4);
        this.stageIconGfx.strokeRoundedRect(ix - ICON_SIZE / 2, iy - ICON_SIZE / 2, ICON_SIZE, ICON_SIZE, r);
      }

      // Stage number inside icon
      if (i <= stage) {
        this.stageIconGfx.fillStyle(0x1a1a2e, i === stage ? 0.8 : 0.5);
        // Small dot at bottom-centre to indicate index
        this.stageIconGfx.fillCircle(ix, iy + ICON_SIZE * 0.28, 3);
      }
    }
  }

  // ─── Soda vessel (diner theme) ────────────────────────────────────────────

  private drawVessel(fill: number) {
    // fill: 0 = empty, 1 = full (ready to burp)
    this.vesselGfx.clear();

    const cx   = VESSEL_CX;
    const cy   = DOCK_CY;
    const vw   = VESSEL_W;
    const vh   = VESSEL_H;
    const vl   = cx - vw / 2;
    const vt   = cy - vh / 2;

    // ── Glass body (tapered like a diner soda glass) ────────────────────────
    // The glass is slightly wider at the top (cone-ish)
    // Draw as a trapezoid using polygon
    const topW  = vw;
    const botW  = vw * 0.75;
    const botL  = cx - botW / 2;
    const botR  = cx + botW / 2;
    const topL  = vl;
    const topR  = vl + topW;

    // Soda fill inside glass
    if (fill > 0.01) {
      const fillH     = (vh - 10) * fill; // leave a little space at the bottom
      const fillT     = vt + vh - 10 - fillH;
      // Interpolate fill color: dark cola amber → lighter as foam at top
      const fillAlpha = 0.85;
      // Draw soda body (cola-colored)
      this.vesselGfx.fillStyle(0x6d2b2b, fillAlpha);   // deep cola
      this.vesselGfx.fillRect(vl + 3, fillT, vw - 6, fillH);

      // Foam/head layer at top of fill (cream colored)
      if (fill > 0.15) {
        this.vesselGfx.fillStyle(SODA_FOAM, 0.7);
        this.vesselGfx.fillEllipse(cx, fillT + 4, vw - 8, 12);
      }
    }

    // Glass outline — chrome diner style
    this.vesselGfx.lineStyle(4, DINER_CHROME, 1);
    // Left side (angled)
    this.vesselGfx.beginPath();
    this.vesselGfx.moveTo(topL, vt);
    this.vesselGfx.lineTo(botL, vt + vh);
    this.vesselGfx.strokePath();
    // Right side (angled)
    this.vesselGfx.beginPath();
    this.vesselGfx.moveTo(topR, vt);
    this.vesselGfx.lineTo(botR, vt + vh);
    this.vesselGfx.strokePath();
    // Top rim
    this.vesselGfx.beginPath();
    this.vesselGfx.moveTo(topL - 4, vt);
    this.vesselGfx.lineTo(topR + 4, vt);
    this.vesselGfx.strokePath();
    // Bottom
    this.vesselGfx.beginPath();
    this.vesselGfx.moveTo(botL, vt + vh);
    this.vesselGfx.lineTo(botR, vt + vh);
    this.vesselGfx.strokePath();

    // Glass shine (left reflection)
    this.vesselGfx.lineStyle(2, 0xffffff, 0.3);
    this.vesselGfx.beginPath();
    this.vesselGfx.moveTo(topL + 6, vt + 6);
    this.vesselGfx.lineTo(botL + 6, vt + vh - 6);
    this.vesselGfx.strokePath();

    // "Full" indicator: red glow at rim when ready to burp
    if (fill > 0.9) {
      const pulse = 0.4 + 0.5 * Math.abs(Math.sin(Date.now() * 0.004));
      this.vesselGfx.lineStyle(4, 0xe74c3c, pulse);
      this.vesselGfx.beginPath();
      this.vesselGfx.moveTo(topL - 4, vt);
      this.vesselGfx.lineTo(topR + 4, vt);
      this.vesselGfx.strokePath();
    }

    // Label below vessel: "DIGEST" in diner font style
    // (done once in buildDock as static text, not redrawn every frame)
  }

  private spawnBubble() {
    if (this.currentFill < 0.08) return;
    if (this.activeBubbles >= this.MAX_BUBBLES) return;
    if (!this.sys.isActive()) return;

    const cx   = VESSEL_CX;
    const vh   = VESSEL_H;
    const vt   = DOCK_CY - vh / 2;
    const vw   = VESSEL_W;

    // Bubble spawns within the soda fill area
    const fillT = vt + vh - 10 - (vh - 10) * this.currentFill;
    const bx    = cx + (Math.random() - 0.5) * (vw * 0.5);
    const by    = vt + vh - 14;   // start at bottom
    const r     = 2 + Math.random() * 3;

    const bubble = this.add.graphics().setDepth(4);
    bubble.fillStyle(0xfdf6e3, 0.7);
    bubble.fillCircle(0, 0, r);
    bubble.setPosition(bx, by);

    this.activeBubbles++;

    const riseH = fillT - vt - 6;
    this.tweens.add({
      targets: bubble,
      y: fillT + 8,
      alpha: 0,
      duration: 900 + Math.random() * 600,
      ease: "Sine.Out",
      onComplete: () => {
        bubble.destroy();
        this.activeBubbles = Math.max(0, this.activeBubbles - 1);
      },
    });
  }

  // ─── Event handlers ───────────────────────────────────────────────────────

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
  }

  private setScore(score: number) {
    this.scoreText.setText(`Score: ${score}`);
    if (this.scoreThreshold > 0 && score < this.scoreThreshold) {
      const pct   = score / this.scoreThreshold;
      const color = pct >= 0.66 ? "#f39c12" : "#e74c3c";
      this.goalText.setText(`🔒 GOAL: ${this.scoreThreshold - score} left`).setColor(color);
    }
  }

  private setStage(stage: number) {
    this.currentStage = stage;
    this.drawStageIcons(stage);
  }

  private setCooldown(pct: number) {
    // pct = remaining/total. Fill is inverse: 0 just after eating, 1 = ready to burp.
    this.currentFill = pct > 0 ? 1 - pct : 0;
    this.drawVessel(this.currentFill);
  }

  showMessage(msg: string, color = "#ffffff") {
    this.messageText.setText(msg).setColor(color).setVisible(true);
    this.time.delayedCall(2500, () => {
      if (this.messageText?.active) this.messageText.setVisible(false);
    });
  }

  // ─── Tutorial ring hint — now points at vessel in dock ────────────────────

  private showRingHighlight() {
    const cx = VESSEL_CX, cy = DOCK_CY, r = 38;
    const glow = this.add.graphics().setDepth(20);
    const label = this.add.text(cx - r - 14, cy,
      "Bob's\ndigest\nmeter", {
        fontSize: "22px", color: "#e67e22", fontFamily: "monospace",
        stroke: "#000", strokeThickness: 3, align: "right",
      }).setOrigin(1, 0.5).setAlpha(0).setDepth(20);

    let tick = 0;
    const interval = this.time.addEvent({ delay: 80, loop: true, callback: () => {
      tick++;
      glow.clear();
      glow.lineStyle(6, 0xe67e22, 0.35 + 0.55 * Math.abs(Math.sin(tick * 0.38)));
      glow.strokeCircle(cx, cy, r + 8);
    }});

    this.tweens.add({ targets: label, alpha: 1, duration: 300 });
    this.time.delayedCall(8000, () => {
      interval.remove();
      glow.destroy();
      this.tweens.add({ targets: label, alpha: 0, duration: 400,
        onComplete: () => label.destroy() });
    });
  }
}
