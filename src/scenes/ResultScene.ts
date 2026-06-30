import Phaser from "phaser";
import { GAME_WIDTH } from "../config/constants";
import { LEVELS } from "../config/levels";

export class ResultScene extends Phaser.Scene {
  constructor() { super({ key: "ResultScene" }); }

  init(data: { score: number; win: boolean; level: number }) {
    (this as any)._data = data;
  }

  create() {
    const { score, win, level } = (this as any)._data as { score: number; win: boolean; level: number };
    const hasNextLevel = win && level + 1 < LEVELS.length;
    const isTutorial   = level === 0;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, 540);

    const title      = win ? (isTutorial ? "WELL DONE, BOB!" : "GREAT JOB, BOB!") : "OH NO, BOB...";
    const titleColor = win ? "#6fdc8c" : "#a0a0a0";

    this.add.text(GAME_WIDTH / 2, 105, title, {
      fontSize: "52px",
      color: titleColor,
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 192, `SCORE: ${score}`, {
      fontSize: "36px",
      color: "#f1c40f",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Bob sprite
    const blobSpr = this.add.sprite(GAME_WIDTH / 2, 295, "blob_stage0", 0);
    if (win) {
      blobSpr.play("blob_idle_0");
    } else {
      blobSpr.play("blob_sad_0");
      blobSpr.setTint(0x888888);
    }
    this.tweens.add({
      targets: blobSpr,
      y: 285,
      duration: 1100,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });

    let transitioning = false;
    const go = (fn: () => void) => { if (!transitioning) { transitioning = true; fn(); } };

    // ── Primary action ──────────────────────────────────────────────────────
    if (hasNextLevel) {
      const nextName = LEVELS[level + 1].name;
      const next = this.add.text(GAME_WIDTH / 2, 380,
        `[ N ] Next Level: ${nextName}`, {
          fontSize: "24px",
          color: "#6fdc8c",
          fontFamily: "monospace",
          stroke: "#000000",
          strokeThickness: 3,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      next.on("pointerup",   () => go(() => this.goNext()));
      next.on("pointerdown", () => go(() => this.goNext()));
      this.input.keyboard!.on("keydown-N",     () => go(() => this.goNext()));
      this.input.keyboard!.on("keydown-ENTER", () => go(() => this.goNext()));
      this.tweens.add({ targets: next, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    } else {
      const retry = this.add.text(GAME_WIDTH / 2, 380, "[ ENTER ] Try Again", {
        fontSize: "22px",
        color: "#6fdc8c",
        fontFamily: "monospace",
        stroke: "#000000",
        strokeThickness: 3,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      retry.on("pointerup",   () => go(() => this.restart()));
      retry.on("pointerdown", () => go(() => this.restart()));
      this.input.keyboard!.on("keydown-ENTER", () => go(() => this.restart()));
      this.tweens.add({ targets: retry, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    }

    // ── Secondary actions ───────────────────────────────────────────────────
    const retryLabel = hasNextLevel ? "[ R ] Play Again" : "";
    if (hasNextLevel) {
      const again = this.add.text(GAME_WIDTH / 2, 425, retryLabel, {
        fontSize: "18px",
        color: "#718096",
        fontFamily: "monospace",
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      again.on("pointerup",   () => go(() => this.restart()));
      again.on("pointerdown", () => go(() => this.restart()));
      this.input.keyboard!.on("keydown-R", () => go(() => this.restart()));
    }

    const menu = this.add.text(GAME_WIDTH / 2, hasNextLevel ? 455 : 425, "[ M ] Main Menu", {
      fontSize: "18px",
      color: "#a0aec0",
      fontFamily: "monospace",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menu.on("pointerup",   () => go(() => this.goMenu()));
    menu.on("pointerdown", () => go(() => this.goMenu()));
    this.input.keyboard!.on("keydown-M", () => go(() => this.goMenu()));

    if (!this.sound.get("menumusic")?.isPlaying) {
      this.sound.play("menumusic", { loop: true, volume: 0.4 });
    }
  }

  private goNext() {
    const { level } = (this as any)._data as { level: number };
    this.sound.stopByKey("menumusic");
    this.scene.start("GameScene", { level: level + 1 });
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
