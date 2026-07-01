import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { LEVELS } from "../config/levels";

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: "MenuScene" }); }

  create() {
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

    const savedLevel = this.getSavedLevel();
    const CARD_W    = 300;
    const CARD_H    = 170;
    const CARD_GAP  = 60;
    const cardCount = LEVELS.length;
    const totalW    = cardCount * CARD_W + (cardCount - 1) * CARD_GAP;
    const cardStartX = (GAME_WIDTH - totalW) / 2;
    const CARD_Y    = 690;

    let acting = false;
    const go = (level: number) => {
      if (acting) return;
      acting = true;
      this.startLevel(level);
    };

    LEVELS.forEach((cfg, i) => {
      const unlocked    = i === 0 || savedLevel >= i;
      const recommended = i === savedLevel;
      const cx = cardStartX + i * (CARD_W + CARD_GAP);
      const cy = CARD_Y;

      // Card background (graphics layer)
      const card = this.add.graphics();

      const drawCard = (hover: boolean) => {
        card.clear();
        if (unlocked) {
          const fillCol = recommended ? 0x0d2a1a : 0x111827;
          const alpha   = hover ? 0.95 : 0.85;
          card.fillStyle(fillCol, alpha);
          card.fillRoundedRect(cx, cy, CARD_W, CARD_H, 14);
          const borderCol = recommended ? 0x6fdc8c : (hover ? 0x4a7c5e : 0x2d5a3d);
          card.lineStyle(recommended ? 4 : 2, borderCol, 1);
          card.strokeRoundedRect(cx, cy, CARD_W, CARD_H, 14);
        } else {
          card.fillStyle(0x0a0a14, 0.7);
          card.fillRoundedRect(cx, cy, CARD_W, CARD_H, 14);
          card.lineStyle(2, 0x2d3748, 0.6);
          card.strokeRoundedRect(cx, cy, CARD_W, CARD_H, 14);
        }
      };

      drawCard(false);

      // Key number badge
      this.add.text(cx + 18, cy + 16, `${i + 1}`, {
        fontSize: "24px", color: unlocked ? "#6fdc8c" : "#4a5568", fontFamily: "monospace",
        stroke: "#000", strokeThickness: 2,
      });

      // Level name
      this.add.text(cx + CARD_W / 2, cy + 60, cfg.name, {
        fontSize: "30px",
        color: unlocked ? (recommended ? "#ffffff" : "#cbd5e0") : "#4a5568",
        fontFamily: "monospace", stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5);

      // Status label
      const statusLabel = unlocked
        ? (recommended ? "PLAY  ▶" : "REPLAY")
        : "LOCKED";
      const statusColor = unlocked
        ? (recommended ? "#6fdc8c" : "#a0aec0")
        : "#4a5568";
      this.add.text(cx + CARD_W / 2, cy + 110, statusLabel, {
        fontSize: "24px", color: statusColor, fontFamily: "monospace",
        stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5);

      // Key hint
      this.add.text(cx + CARD_W / 2, cy + CARD_H - 18, `Press ${i + 1}`, {
        fontSize: "18px", color: "#4a5568", fontFamily: "monospace",
      }).setOrigin(0.5);

      if (unlocked) {
        // Transparent hit area
        const hit = this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0, 0)
          .setInteractive({ useHandCursor: true });
        hit.on("pointerover",  () => drawCard(true));
        hit.on("pointerout",   () => drawCard(false));
        hit.on("pointerdown",  () => go(i));

        // Keyboard shortcut
        this.input.keyboard!.on(`keydown-${i + 1}`, () => go(i));
      }

      // Blinking border on recommended card
      if (recommended) {
        this.tweens.add({
          targets: { v: 0 },
          v: 1, duration: 800, yoyo: true, repeat: -1,
          ease: "Sine.InOut",
          onUpdate: (tween) => {
            const v = tween.getValue() as number;
            card.clear();
            const fillCol = 0x0d2a1a;
            card.fillStyle(fillCol, 0.9);
            card.fillRoundedRect(cx, cy, CARD_W, CARD_H, 14);
            card.lineStyle(4, 0x6fdc8c, 0.4 + 0.6 * v);
            card.strokeRoundedRect(cx, cy, CARD_W, CARD_H, 14);
          },
        });
      }
    });

    // Enter key starts recommended level
    this.input.keyboard!.on("keydown-ENTER", () => go(savedLevel));

    // Bottom hint
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50,
      "Press ENTER to start recommended level", {
        fontSize: "26px", color: "#4a5568", fontFamily: "monospace",
      }).setOrigin(0.5);

    if (!this.sound.get("menumusic")?.isPlaying) {
      this.sound.play("menumusic", { loop: true, volume: 0.4 });
    }
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
