import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, SHRINK_COOLDOWN_MS, GRAVITY } from "../config/constants";
import { LEVELS } from "../config/levels";
import { SizeSystem } from "../systems/SizeSystem";
import { TimerSystem } from "../systems/TimerSystem";
import { Blob } from "../entities/Blob";
import { Food } from "../entities/Food";
import { buildLevel1, LEVEL_WIDTH, LEVEL_HEIGHT } from "./LevelBuilder";

export class GameScene extends Phaser.Scene {
  private blob!: Blob;
  private foods: Food[] = [];
  private sizeSystem!: SizeSystem;
  private timerSystem!: TimerSystem;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private exitZone!: Phaser.GameObjects.Zone;
  private score = 0;
  private levelIndex = 0;
  private gameOver = false;
  private levelComplete = false;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.score = 0;
    this.gameOver = false;
    this.levelComplete = false;
    this.foods = [];
  }

  create() {
    const levelCfg = LEVELS[this.levelIndex];

    // Physics world bounds
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.physics.world.gravity.y = GRAVITY;

    // Build level geometry
    const { platforms, exitZone } = buildLevel1(this);
    this.platforms = platforms;
    this.exitZone  = exitZone;

    // Systems
    this.sizeSystem  = new SizeSystem(() => Date.now());
    this.timerSystem = new TimerSystem(levelCfg.timeLimit);

    // Blob
    const { x, y } = levelCfg.playerStart;
    this.blob = new Blob(this, x, y, this.sizeSystem);

    // Collide blob with world platforms
    this.physics.add.collider(this.blob.body, this.platforms);

    // Spawn food items
    levelCfg.foods.forEach((f) => {
      const food = new Food(this, f.x, f.y, f.type);
      this.foods.push(food);
      this.physics.add.overlap(
        this.blob.body,
        food.sprite,
        () => this.eatFood(food),
        undefined,
        this
      );
    });

    // Exit overlap
    this.physics.add.overlap(
      this.blob.body,
      this.exitZone,
      () => this.completeLevel(),
      undefined,
      this
    );

    // Camera
    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.cameras.main.startFollow(this.blob.body, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(120, 80);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Wire size events → UI
    this.sizeSystem.onSizeChange((evt) => {
      const ui = this.scene.get("UIScene");
      ui.events.emit("update-stage", evt.stage);

      if (evt.type === "shrink") {
        ui.events.emit("show-message", "BURP! 🫧 Getting smaller...", "#6fdc8c");
      }
    });

    // Wire timer
    this.timerSystem.onTick(({ type, remaining }) => {
      const ui = this.scene.get("UIScene");
      ui.events.emit("update-timer", remaining);
      if (type === "expired") this.failLevel();
    });

    // Start timer
    this.timerSystem.start();

    // Initial UI state
    const ui = this.scene.get("UIScene");
    ui.events.emit("update-timer", levelCfg.timeLimit);
    ui.events.emit("update-score", 0);
    ui.events.emit("update-stage", 0);

    // ESC to pause
    this.input.keyboard!.on("keydown-ESC", () => this.togglePause());
  }

  private eatFood(food: Food) {
    if (food.sprite.active === false) return;
    food.collect();
    this.foods = this.foods.filter((f) => f !== food);

    this.blob.playEatAnim();
    this.sizeSystem.eat();

    this.score += 100;
    const ui = this.scene.get("UIScene");
    ui.events.emit("update-score", this.score);

    // Floating score pop
    const { x, y } = this.blob.body;
    const pop = this.add.text(x, y - 30, "+100", {
      fontSize: "18px",
      color: "#f1c40f",
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
    this.tweens.add({
      targets: pop,
      y: y - 80,
      alpha: 0,
      duration: 900,
      onComplete: () => pop.destroy(),
    });
  }

  private completeLevel() {
    if (this.levelComplete || this.gameOver) return;
    this.levelComplete = true;
    this.timerSystem.pause();

    const timeBonus = Math.floor(this.timerSystem.getRemaining()) * 10;
    this.score += timeBonus;

    const ui = this.scene.get("UIScene");
    ui.events.emit("update-score", this.score);
    ui.events.emit("show-message", `LEVEL COMPLETE!\n+${timeBonus} time bonus`, "#6fdc8c");

    this.time.delayedCall(3000, () => {
      this.scene.stop("UIScene");
      this.scene.start("ResultScene", {
        score: this.score,
        win: true,
        level: this.levelIndex,
      });
    });
  }

  private failLevel() {
    if (this.levelComplete || this.gameOver) return;
    this.gameOver = true;

    const ui = this.scene.get("UIScene");
    ui.events.emit("show-message", "TIME'S UP!", "#e74c3c");

    this.blob.body.setVelocity(0, 0);
    this.blob.body.setTint(0xe74c3c);

    this.time.delayedCall(2500, () => {
      this.scene.stop("UIScene");
      this.scene.start("ResultScene", {
        score: this.score,
        win: false,
        level: this.levelIndex,
      });
    });
  }

  private togglePause() {
    if (this.physics.world.isPaused) {
      this.physics.resume();
      this.timerSystem.resume();
    } else {
      this.physics.pause();
      this.timerSystem.pause();
    }
  }

  update() {
    if (this.gameOver || this.levelComplete) return;

    this.blob.update(this.cursors);
    this.timerSystem.update();

    // Cooldown ring
    const pct = this.sizeSystem.getShrinkCooldownRemaining() / SHRINK_COOLDOWN_MS;
    const ui = this.scene.get("UIScene");
    ui.events.emit("update-cooldown", pct);
  }

  shutdown() {
    this.sizeSystem?.destroy();
    this.foods.forEach((f) => f.destroy());
    this.foods = [];
  }
}
