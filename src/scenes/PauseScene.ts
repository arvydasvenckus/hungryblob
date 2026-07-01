import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";

export class PauseScene extends Phaser.Scene {
  constructor() { super({ key: "PauseScene" }); }

  create() {
    let acted = false;
    const once = (fn: () => void) => { if (!acted) { acted = true; fn(); } };

    // Dark overlay — high opacity so the frozen game recedes clearly
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82);

    // Title
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 220, "PAUSED", {
      fontSize: "120px",
      color: "#ffffff",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      stroke: "#000000",
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Resume button
    const resume = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, "[ R ] Resume", {
      fontSize: "60px",
      color: "#6fdc8c",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      stroke: "#000000",
      strokeThickness: 5,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resume.on("pointerover",  () => resume.setColor("#a4de6c"));
    resume.on("pointerout",   () => resume.setColor("#6fdc8c"));
    resume.on("pointerup",    () => once(() => this.doResume()));
    resume.on("pointerdown",  () => once(() => this.doResume()));

    this.tweens.add({ targets: resume, alpha: 0.5, duration: 700, ease: "Sine.InOut", yoyo: true, repeat: -1 });

    // Main Menu button
    const menu = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, "[ M ] Main Menu", {
      fontSize: "48px",
      color: "#a0aec0",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menu.on("pointerover",  () => menu.setColor("#cbd5e0"));
    menu.on("pointerout",   () => menu.setColor("#a0aec0"));
    menu.on("pointerup",    () => once(() => this.doMenu()));
    menu.on("pointerdown",  () => once(() => this.doMenu()));

    // Hint text
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 290, "ESC also resumes", {
      fontSize: "28px",
      color: "#4a5568",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
    }).setOrigin(0.5);

    // Keyboard
    this.input.keyboard!.on("keydown-R",   () => once(() => this.doResume()));
    this.input.keyboard!.on("keydown-ESC", () => once(() => this.doResume()));
    this.input.keyboard!.on("keydown-M",   () => once(() => this.doMenu()));
  }

  private doResume() {
    // scene.resume() fires GameScene's RESUME lifecycle event, which calls
    // onSceneResume() — that re-enables timer, sizeSystem timer, and sound.
    this.scene.resume("GameScene");
    this.scene.stop("PauseScene");
  }

  private doMenu() {
    this.sound.stopAll();
    this.scene.stop("UIScene");
    this.scene.stop("GameScene");
    this.scene.stop("PauseScene");
    this.scene.start("MenuScene");
  }
}
