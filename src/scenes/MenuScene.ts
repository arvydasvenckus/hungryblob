import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { LEVELS } from "../config/levels";

export class MenuScene extends Phaser.Scene {
  private selectedIdx  = 0;
  private unlockedIdxs: number[] = [];
  private cardGfx: Phaser.GameObjects.Graphics[] = [];
  private cardPositions: { cx: number; cy: number; w: number; h: number }[] = [];

  constructor() { super({ key: "MenuScene" }); }

  create() {
    this.cardGfx      = [];
    this.cardPositions = [];

    const savedLevel = this.getSavedLevel();

    // Start selection at the recommended (saved) level
    this.selectedIdx  = savedLevel;
    this.unlockedIdxs = LEVELS.map((_, i) => (i === 0 || savedLevel >= i ? i : -1))
                               .filter(i => i >= 0);

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.lineStyle(3, 0x2d3748, 0.4);
    for (let x = 0; x < GAME_WIDTH; x += 120) {
      bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, GAME_HEIGHT); bg.strokePath();
    }
    for (let y = 0; y < GAME_HEIGHT; y += 120) {
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(GAME_WIDTH, y); bg.strokePath();
    }

    // Title
    this.add.text(GAME_WIDTH / 2, 140, "HUNGRY BOB", {
      fontSize: "130px", color: "#6fdc8c", fontFamily: "monospace",
      stroke: "#000000", strokeThickness: 10,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 300, "eat. grow. squeeze.", {
      fontSize: "40px", color: "#a0aec0", fontFamily: "monospace",
    }).setOrigin(0.5);

    // Animated Bob preview
    const bob = this.add.sprite(GAME_WIDTH / 2, 440, "blob_stage0", 0);
    bob.setScale(2);
    bob.play("blob_idle_0");
    this.tweens.add({ targets: bob, y: 425, duration: 1200, ease: "Sine.InOut", yoyo: true, repeat: -1 });

    // Controls hint
    this.add.text(GAME_WIDTH / 2, 560, "← → move   ↑ / SPACE jump   ESC pause", {
      fontSize: "28px", color: "#718096", fontFamily: "monospace",
    }).setOrigin(0.5);

    // ── Level selector ─────────────────────────────────────────────────────
    this.add.text(GAME_WIDTH / 2, 650, "─── SELECT LEVEL ───", {
      fontSize: "30px", color: "#4a5568", fontFamily: "monospace",
    }).setOrigin(0.5);

    const CARD_W     = 300;
    const CARD_H     = 170;
    const CARD_GAP   = 60;
    const totalW     = LEVELS.length * CARD_W + (LEVELS.length - 1) * CARD_GAP;
    const cardStartX = (GAME_WIDTH - totalW) / 2;
    const CARD_Y     = 700;

    let acting = false;
    const go = (level: number) => {
      if (acting) return;
      acting = true;
      this.startLevel(level);
    };

    LEVELS.forEach((cfg, i) => {
      const unlocked = i === 0 || savedLevel >= i;
      const cx = cardStartX + i * (CARD_W + CARD_GAP);
      const cy = CARD_Y;

      // Graphics layer for the border (redrawn on selection change)
      const cardG = this.add.graphics();
      this.cardGfx.push(cardG);
      this.cardPositions.push({ cx, cy, w: CARD_W, h: CARD_H });

      // Static card fill (dark, doesn't change with selection)
      const fill = this.add.graphics();
      fill.fillStyle(unlocked ? 0x111827 : 0x0a0a14, 0.85);
      fill.fillRoundedRect(cx, cy, CARD_W, CARD_H, 14);

      // Level name
      this.add.text(cx + CARD_W / 2, cy + 54, cfg.name, {
        fontSize: "30px",
        color: unlocked ? "#ffffff" : "#4a5568",
        fontFamily: "monospace", stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5);

      // Status
      const statusLabel = unlocked ? (savedLevel === i ? "PLAY  ▶" : "REPLAY") : "LOCKED";
      const statusColor = unlocked ? (savedLevel === i ? "#6fdc8c" : "#a0aec0") : "#4a5568";
      this.add.text(cx + CARD_W / 2, cy + 108, statusLabel, {
        fontSize: "24px", color: statusColor, fontFamily: "monospace",
        stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5);

      if (unlocked) {
        const hit = this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0, 0)
          .setInteractive({ useHandCursor: true });
        hit.on("pointerover",  () => { if (this.selectedIdx !== i) { this.selectedIdx = i; this.redrawBorders(); } });
        hit.on("pointerdown",  () => go(i));
      }
    });

    // Draw initial borders
    this.redrawBorders();

    // Arrow key navigation (only across unlocked levels)
    this.input.keyboard!.on("keydown-LEFT", () => {
      const pos = this.unlockedIdxs.indexOf(this.selectedIdx);
      if (pos > 0) {
        this.selectedIdx = this.unlockedIdxs[pos - 1];
        this.redrawBorders();
      }
    });

    this.input.keyboard!.on("keydown-RIGHT", () => {
      const pos = this.unlockedIdxs.indexOf(this.selectedIdx);
      if (pos < this.unlockedIdxs.length - 1) {
        this.selectedIdx = this.unlockedIdxs[pos + 1];
        this.redrawBorders();
      }
    });

    this.input.keyboard!.on("keydown-ENTER", () => go(this.selectedIdx));

    // Navigation hint
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50,
      "← → to select   ENTER to start", {
        fontSize: "28px", color: "#4a5568", fontFamily: "monospace",
      }).setOrigin(0.5);

    if (!this.sound.get("menumusic")?.isPlaying) {
      this.sound.play("menumusic", { loop: true, volume: 0.4 });
    }
  }

  /** Redraws only the border/cursor layer for all cards. */
  private redrawBorders() {
    this.cardGfx.forEach((g, i) => {
      g.clear();
      const { cx, cy, w, h } = this.cardPositions[i];
      const unlocked = this.unlockedIdxs.includes(i);
      const selected = i === this.selectedIdx;

      if (!unlocked) {
        // Locked: very dim static border
        g.lineStyle(2, 0x2d3748, 0.5);
        g.strokeRoundedRect(cx, cy, w, h, 14);
        return;
      }

      if (selected) {
        // Selected: thick bright green border + subtle outer glow
        g.lineStyle(8, 0x6fdc8c, 0.25);
        g.strokeRoundedRect(cx - 4, cy - 4, w + 8, h + 8, 18);
        g.lineStyle(4, 0x6fdc8c, 1);
        g.strokeRoundedRect(cx, cy, w, h, 14);

        // Small triangle cursor above selected card
        const tip = cx + w / 2;
        const ty  = cy - 18;
        g.fillStyle(0x6fdc8c, 1);
        g.fillTriangle(tip - 14, ty, tip + 14, ty, tip, ty + 16);
      } else {
        // Unlocked but not selected: dim border
        g.lineStyle(2, 0x2d5a3d, 0.7);
        g.strokeRoundedRect(cx, cy, w, h, 14);
      }
    });
  }

  private getSavedLevel(): number {
    const raw   = localStorage.getItem("hungryBob_unlockedLevel");
    const saved = raw !== null ? parseInt(raw, 10) : 0;
    return isNaN(saved) ? 0 : saved;
  }

  private startLevel(level: number) {
    this.sound.stopByKey("menumusic");
    this.scene.start("GameScene", { level });
  }
}
