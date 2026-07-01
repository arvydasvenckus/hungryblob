import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";

export class PauseScene extends Phaser.Scene {
  constructor() { super({ key: "PauseScene" }); }

  create() {
    let acted = false;
    const once = (fn: () => void) => { if (!acted) { acted = true; fn(); } };

    // Dark overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82);

    // Title
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 220, "PAUSED", {
      fontSize: "120px",
      color: "#ffffff",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      stroke: "#000000",
      strokeThickness: 8,
    }).setOrigin(0.5);

    // Options
    let selectedOption = 0; // 0 = Resume, 1 = Main Menu

    // Highlight bar behind active option
    const highlight = this.add.graphics().setDepth(1);

    const resume = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, "Resume", {
      fontSize: "60px",
      color: "#6fdc8c",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      stroke: "#000000",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });

    const menu = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, "Main Menu", {
      fontSize: "48px",
      color: "#4a5568",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2).setInteractive({ useHandCursor: true });

    const texts = [resume, menu];

    const refreshColors = () => {
      highlight.clear();
      texts.forEach((t, i) => {
        const active = i === selectedOption;
        const bw = 520, bh = 72, br = 12;
        const bx = GAME_WIDTH / 2 - bw / 2;
        const by = t.y - bh / 2;
        if (active) {
          highlight.fillStyle(0x163824, 0.92);
          highlight.fillRoundedRect(bx, by, bw, bh, br);
          highlight.lineStyle(2.5, 0x6fdc8c, 1);
          highlight.strokeRoundedRect(bx, by, bw, bh, br);
        } else {
          highlight.fillStyle(0x111111, 0.5);
          highlight.fillRoundedRect(bx, by, bw, bh, br);
          highlight.lineStyle(1.5, 0x3a4a40, 0.5);
          highlight.strokeRoundedRect(bx, by, bw, bh, br);
        }
        t.setColor(i === 0 ? (active ? "#6fdc8c" : "#4a7055") : (active ? "#ccdae5" : "#5a7080"));
        t.setAlpha(active ? 1 : 0.85);
        t.setScale(1.0);
      });
    };

    resume.on("pointerover",  () => { selectedOption = 0; refreshColors(); });
    resume.on("pointerdown",  () => once(() => this.doResume()));

    menu.on("pointerover",  () => { selectedOption = 1; refreshColors(); });
    menu.on("pointerdown",  () => once(() => this.doMenu()));

    // Initial draw
    refreshColors();

    // Hint text
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 290, "↑ ↓ to choose   ENTER to confirm   ESC resumes", {
      fontSize: "28px",
      color: "#4a5568",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
    }).setOrigin(0.5);

    // Keyboard — arrow keys + ENTER + ESC only
    this.input.keyboard!.on("keydown-UP", () => {
      selectedOption = 0;
      refreshColors();
    });
    this.input.keyboard!.on("keydown-DOWN", () => {
      selectedOption = 1;
      refreshColors();
    });
    this.input.keyboard!.on("keydown-ENTER", () => {
      if (selectedOption === 0) once(() => this.doResume());
      else                      once(() => this.doMenu());
    });
    this.input.keyboard!.on("keydown-ESC", () => once(() => this.doResume()));
  }

  private doResume() {
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
