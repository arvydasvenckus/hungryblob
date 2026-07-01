import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { LEVELS, getStars } from "../config/levels";

export class ResultScene extends Phaser.Scene {
  constructor() { super({ key: "ResultScene" }); }

  init(data: { score: number; win: boolean; level: number }) {
    (this as any)._data = data;
  }

  create() {
    const { score, win, level } = (this as any)._data as { score: number; win: boolean; level: number };
    const hasNextLevel = win && level + 1 < LEVELS.length;
    const isTutorial   = level === 0;

    // Persist progress
    if (win) {
      const unlocked = Math.min(level + 1, LEVELS.length - 1);
      const current  = parseInt(localStorage.getItem("hungryBob_unlockedLevel") ?? "0", 10);
      if (unlocked > (isNaN(current) ? 0 : current)) {
        localStorage.setItem("hungryBob_unlockedLevel", String(unlocked));
      }
    }

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const title      = win ? (isTutorial ? "well done, bob." : "great job, bob.") : "oh no, bob.";
    const titleColor = win ? "#6fdc8c" : "#a0a0a0";

    this.add.text(GAME_WIDTH / 2, 180, title, {
      fontSize: "104px",
      color: titleColor,
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      stroke: "#000000",
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 340, `points: ${score}`, {
      fontSize: "72px",
      color: "#f1c40f",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Star rating (win only)
    if (win) {
      const stars = getStars(score, LEVELS[level]);

      const key = `hungryBob_stars_${level}`;
      const prev = parseInt(localStorage.getItem(key) ?? "0", 10);
      if (stars > (isNaN(prev) ? 0 : prev)) {
        localStorage.setItem(key, String(stars));
      }

      if (stars === 3) {
        this.add.text(GAME_WIDTH / 2, 400, "perfect run.", {
          fontSize: "38px",
          color: "#f1c40f",
          fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
          stroke: "#000000",
          strokeThickness: 4,
        }).setOrigin(0.5);
      }

      const starCY    = 475;
      const starGap   = 120;
      const starScale = 0.214;

      for (let i = 0; i < 3; i++) {
        const cx  = GAME_WIDTH / 2 + (i - 1) * starGap;
        const k   = i < stars ? "star-full" : "star-empty";
        this.add.image(cx, starCY, k).setScale(starScale).setOrigin(0.5);
      }
    }

    // Bob sprite
    const blobSpr = this.add.sprite(GAME_WIDTH / 2, 630, "blob_stage0", 0);
    blobSpr.setScale(2);
    if (win) {
      blobSpr.play("blob_idle_0");
    } else {
      blobSpr.play("blob_sad_0");
      blobSpr.setTint(0x888888);
    }
    this.tweens.add({ targets: blobSpr, y: 610, duration: 1100, ease: "Sine.InOut", yoyo: true, repeat: -1 });

    let transitioning = false;
    const go = (fn: () => void) => { if (!transitioning) { transitioning = true; fn(); } };

    // Build options list: [{label, action, color}]
    type Option = { label: string; action: () => void; color: string; y: number };
    const options: Option[] = [];

    if (hasNextLevel) {
      const nextName = LEVELS[level + 1].name;
      options.push({ label: `Next level: ${nextName}`, action: () => go(() => this.goNext()), color: "#6fdc8c", y: 800 });
      options.push({ label: "Play again",   action: () => go(() => this.restart()), color: "#718096", y: 890 });
    } else {
      options.push({ label: "Try again",   action: () => go(() => this.restart()), color: "#6fdc8c", y: 800 });
    }
    options.push({ label: "Main menu", action: () => go(() => this.goMenu()), color: "#a0aec0", y: hasNextLevel ? 950 : 890 });

    let selectedOption = 0;

    // Highlight bar behind active option
    const highlight = this.add.graphics().setDepth(4);

    // Cursor indicator (▶ to the left of the selected option)
    const cursor = this.add.text(0, 0, "▶", {
      fontSize: "36px",
      color: "#6fdc8c",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(1, 0.5).setDepth(6);

    // Create text objects for each option
    const optionTexts = options.map((opt, i) => {
      const sz = i === 0 ? "48px" : "36px";
      const t = this.add.text(GAME_WIDTH / 2, opt.y, opt.label, {
        fontSize: sz,
        color: opt.color,
        fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
        stroke: "#000000",
        strokeThickness: i === 0 ? 5 : 3,
      }).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });

      t.on("pointerover",  () => { selectedOption = i; refreshSelection(); });
      t.on("pointerdown",  () => opt.action());
      return t;
    });

    const refreshSelection = () => {
      highlight.clear();
      optionTexts.forEach((t, i) => {
        const active = i === selectedOption;
        const bw = i === 0 ? 680 : 540;
        const bh = i === 0 ? 70 : 58;
        const br = 12;
        const bx = GAME_WIDTH / 2 - bw / 2;
        const by = t.y - bh / 2;
        if (active) {
          highlight.fillStyle(0x163824, 0.92);
          highlight.fillRoundedRect(bx, by, bw, bh, br);
          highlight.lineStyle(2.5, 0x6fdc8c, 1);
          highlight.strokeRoundedRect(bx, by, bw, bh, br);
        } else {
          highlight.fillStyle(0x111111, 0.45);
          highlight.fillRoundedRect(bx, by, bw, bh, br);
          highlight.lineStyle(1.5, 0x2d3a30, 0.55);
          highlight.strokeRoundedRect(bx, by, bw, bh, br);
        }
        t.setColor(active ? "#a4de6c" : options[i].color);
        t.setAlpha(active ? 1 : 0.8);
        t.setScale(1.0);
      });
      // Move cursor alongside active button
      const sel = optionTexts[selectedOption];
      cursor.setPosition(sel.x - sel.width / 2 - 24, sel.y);
    };

    refreshSelection();

    // Keyboard: UP/DOWN + ENTER + ESC only
    this.input.keyboard!.on("keydown-UP", () => {
      selectedOption = (selectedOption - 1 + options.length) % options.length;
      refreshSelection();
    });
    this.input.keyboard!.on("keydown-DOWN", () => {
      selectedOption = (selectedOption + 1) % options.length;
      refreshSelection();
    });
    this.input.keyboard!.on("keydown-ENTER", () => options[selectedOption].action());
    this.input.keyboard!.on("keydown-ESC",   () => go(() => this.goMenu()));

    // Navigation hint
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, "↑ ↓ to choose   ENTER to confirm   ESC for menu", {
      fontSize: "26px",
      color: "#4a5568",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
    }).setOrigin(0.5);

    if (!this.sound.get("menumusic")?.isPlaying) {
      this.sound.play("menumusic", { loop: true, volume: 0.4 });
    }
  }

  private goNext() {
    const { level } = (this as any)._data as { level: number };
    const nextLevel = level + 1;
    if (level === 0) {
      this.scene.start("BriefingScene", { targetLevel: nextLevel });
    } else {
      this.sound.stopByKey("menumusic");
      this.scene.start("GameScene", { level: nextLevel });
    }
  }

  private restart() {
    const { level } = (this as any)._data as { level: number };
    this.sound.stopByKey("menumusic");
    this.scene.start("GameScene", { level });
  }

  private goMenu() {
    this.scene.start("MenuScene");
  }
}
