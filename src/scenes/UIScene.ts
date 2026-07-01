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
    const bg = this.add.graphics().setDepth(2);
    const rx = 14;

    // Drop shadow — gives the panel lift off the background
    bg.fillStyle(0x000000, 0.55);
    bg.fillRoundedRect(DOCK_LEFT + 4, DOCK_TOP + 5, DOCK_W, DOCK_H, rx);

    // Main panel — dark lacquered countertop
    bg.fillStyle(0x1a1208, 1);
    bg.fillRoundedRect(DOCK_LEFT, DOCK_TOP, DOCK_W, DOCK_H, rx);

    // Warm wood-grain mid tone — very subtle texture strip
    bg.fillStyle(0x2a1e10, 0.6);
    bg.fillRoundedRect(DOCK_LEFT + 2, DOCK_TOP + DOCK_H * 0.35,
      DOCK_W - 4, DOCK_H * 0.3, 4);

    // Top highlight (light catching the panel edge)
    bg.fillStyle(0xffd080, 0.12);
    bg.fillRoundedRect(DOCK_LEFT + 3, DOCK_TOP + 2, DOCK_W - 6, 6, 4);

    // Amber/gold border — game HUD frame doubles as diner trim
    bg.lineStyle(3, 0xb8860b, 0.9);
    bg.strokeRoundedRect(DOCK_LEFT, DOCK_TOP, DOCK_W, DOCK_H, rx);

    // Inner bevel — second thinner inset line gives depth
    bg.lineStyle(1, 0x7a5c00, 0.4);
    bg.strokeRoundedRect(DOCK_LEFT + 4, DOCK_TOP + 4, DOCK_W - 8, DOCK_H - 8, rx - 4);

    // Recessed panel for stage icons
    bg.fillStyle(0x0a0804, 0.7);
    bg.fillRoundedRect(ICONS_LEFT - 6, DOCK_TOP + 10,
      STAGE_W + 12, DOCK_H - 20, 8);

    // Recessed panel for vessel
    bg.fillStyle(0x0c0a06, 0.7);
    bg.fillRoundedRect(VESSEL_CX - VESSEL_W / 2 - 8, DOCK_TOP + 6,
      VESSEL_W + 16, DOCK_H - 12, 8);

    // Vertical separator — gold trim line
    const sepX = DOCK_LEFT + DOCK_PAD + STAGE_W + SEP_GAP / 2;
    bg.lineStyle(2, 0xb8860b, 0.5);
    bg.beginPath(); bg.moveTo(sepX, DOCK_TOP + 12); bg.lineTo(sepX, DOCK_BOTTOM - 12); bg.strokePath();

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

    // Base icon size = 40px for stage 0, grows +2px per stage up to stage 7 (54px).
    // Icons are bottom-aligned so they grow upward from a common baseline.
    const BASE_SZ  = 40;
    const SZ_STEP  = 2;
    const BASELINE = DOCK_CY + DOCK_H * 0.28; // shared bottom edge for all icons

    // Recalculate icon x positions based on their individual sizes so they're
    // evenly spaced using the average icon width as the slot width.
    const SLOT_W = BASE_SZ + (STAGE_COUNT - 1) * SZ_STEP + ICON_GAP; // ~58px per slot

    for (let i = 0; i < STAGE_COUNT; i++) {
      const sz = BASE_SZ + i * SZ_STEP;           // 40, 42, 44 … 54
      const r  = sz * 0.32;                        // corner radius scales with size
      const c  = STAGE_COLORS[i];

      // Centre-of-slot x — slots are SLOT_W apart from ICONS_LEFT
      const slotCx = ICONS_LEFT + i * (BASE_SZ + SZ_STEP + ICON_GAP) + (BASE_SZ + i * SZ_STEP) / 2;
      // Bottom-align: top-left y = baseline - sz
      const iy = BASELINE - sz;

      if (i < stage) {
        // Past stages: dim fill, stage-colored outline
        this.stageIconGfx.fillStyle(c, 0.28);
        this.stageIconGfx.fillRoundedRect(slotCx - sz / 2, iy, sz, sz, r);
        this.stageIconGfx.lineStyle(2, c, 0.55);
        this.stageIconGfx.strokeRoundedRect(slotCx - sz / 2, iy, sz, sz, r);
      } else if (i === stage) {
        // Current stage: full brightness, stage-colored border + inner glow
        this.stageIconGfx.fillStyle(c, 1);
        this.stageIconGfx.fillRoundedRect(slotCx - sz / 2, iy, sz, sz, r);
        // Inner highlight shine
        this.stageIconGfx.fillStyle(0xffffff, 0.28);
        this.stageIconGfx.fillEllipse(slotCx - sz * 0.1, iy + sz * 0.18, sz * 0.38, sz * 0.2);
        // Stage-color border
        this.stageIconGfx.lineStyle(3, c, 1);
        this.stageIconGfx.strokeRoundedRect(slotCx - sz / 2, iy, sz, sz, r);
        // Outer glow ring (slightly larger, semi-transparent)
        this.stageIconGfx.lineStyle(5, c, 0.28);
        this.stageIconGfx.strokeRoundedRect(slotCx - sz / 2 - 3, iy - 3, sz + 6, sz + 6, r + 3);
      } else {
        // Future stages: just the outline at the per-stage color, very dim
        this.stageIconGfx.lineStyle(2, c, 0.22);
        this.stageIconGfx.strokeRoundedRect(slotCx - sz / 2, iy, sz, sz, r);
      }
      // No dot indicator — removed as requested
    }
  }

  // ─── Soda vessel (diner theme) ────────────────────────────────────────────

  private drawVessel(fill: number) {
    // fill = pct: 1 = full (just ate), 0 = empty (ready to burp)
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

    // Soda fill — tapered trapezoid matching the glass shape
    // fill = 1 (just ate, full glass) → fill = 0 (digested, empty, ready to burp)
    if (fill > 0.01) {
      const usableH   = vh - 10;                     // drawable interior height
      const fillH     = usableH * fill;
      const fillBotY  = vt + vh - 10;                // bottom of fill area
      const fillTopY  = fillBotY - fillH;

      // Width at the fill top: linearly interpolated between botW and topW
      const widthAtFill = botW + (topW - botW) * (fillH / usableH);

      // Tapered fill polygon — clockwise
      this.vesselGfx.fillStyle(0x6d2b2b, 0.88);
      this.vesselGfx.fillPoints([
        { x: cx - botW / 2,        y: fillBotY },
        { x: cx + botW / 2,        y: fillBotY },
        { x: cx + widthAtFill / 2, y: fillTopY },
        { x: cx - widthAtFill / 2, y: fillTopY },
      ], true);

      // Foam/head layer at top of fill
      if (fill > 0.12) {
        this.vesselGfx.fillStyle(SODA_FOAM, 0.65);
        this.vesselGfx.fillEllipse(cx, fillTopY + 5, widthAtFill - 4, 11);
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

    // "Ready to burp" indicator: glass glows red when nearly empty (fill ≈ 0)
    if (fill < 0.12 && fill > 0) {
      const pulse = 0.4 + 0.5 * Math.abs(Math.sin(Date.now() * 0.004));
      this.vesselGfx.lineStyle(4, 0xe74c3c, pulse);
      this.vesselGfx.beginPath();
      this.vesselGfx.moveTo(botL - 2, vt + vh);
      this.vesselGfx.lineTo(botR + 2, vt + vh);
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
    // pct = remaining/total. Fill = pct directly:
    //   pct=1 → glass full (just ate, lots of time left)
    //   pct=0 → glass empty (digested, ready to burp)
    this.currentFill = pct;
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
