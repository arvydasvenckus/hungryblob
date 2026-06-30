import Phaser from "phaser";
import { GAME_WIDTH } from "../config/constants";

export class ResultScene extends Phaser.Scene {
  constructor() { super({ key: "ResultScene" }); }

  init(data: { score: number; win: boolean; level: number }) {
    (this as any)._data = data;
  }

  create() {
    const { score, win } = (this as any)._data as { score: number; win: boolean; level: number };

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, 540);

    const title      = win ? "GREAT JOB, BOB!" : "OH NO, BOB...";
    const titleColor = win ? "#6fdc8c"          : "#a0a0a0";

    this.add.text(GAME_WIDTH / 2, 120, title, {
      fontSize: "52px",
      color: titleColor,
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 210, `SCORE: ${score}`, {
      fontSize: "36px",
      color: "#f1c40f",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Bob sprite — sad (grayscale) on fail, happy on win
    const blobSpr = this.add.sprite(GAME_WIDTH / 2, 310, "blob_stage0", 0);
    if (win) {
      blobSpr.play("blob_idle_0");
    } else {
      blobSpr.play("blob_sad_0");
      blobSpr.setTint(0x888888);
    }
    this.tweens.add({
      targets: blobSpr,
      y: 300,
      duration: 1100,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });

    const retry = this.add.text(GAME_WIDTH / 2, 400, "[ ENTER ] Try Again", {
      fontSize: "22px",
      color: "#6fdc8c",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const menu = this.add.text(GAME_WIDTH / 2, 438, "[ M ] Main Menu", {
      fontSize: "20px",
      color: "#a0aec0",
      fontFamily: "monospace",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retry.on("pointerdown", () => this.restart());
    menu.on("pointerdown",  () => this.goMenu());
    this.input.keyboard!.on("keydown-ENTER", () => this.restart());
    this.input.keyboard!.on("keydown-M",     () => this.goMenu());

    this.tweens.add({ targets: retry, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
  }

  private restart() {
    const { level } = (this as any)._data as { level: number };
    this.scene.start("GameScene", { level });
    this.scene.launch("UIScene");
  }

  private goMenu() {
    this.scene.start("MenuScene");
  }
}
