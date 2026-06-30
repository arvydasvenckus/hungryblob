import Phaser from "phaser";
import { GAME_WIDTH, SHRINK_COOLDOWN_MS, GRAVITY, STRESS_THRESHOLD } from "../config/constants";
import { LEVELS, getFoodGrowth, getFoodScore, getFoodCategory } from "../config/levels";
import { SizeSystem } from "../systems/SizeSystem";
import { TimerSystem } from "../systems/TimerSystem";
import { SoundSystem } from "../systems/SoundSystem";
import { Blob } from "../entities/Blob";
import { Food } from "../entities/Food";
import { buildLevel1, LEVEL_WIDTH, LEVEL_HEIGHT } from "./LevelBuilder";

export class GameScene extends Phaser.Scene {
  private blob!: Blob;
  private foods: Food[] = [];
  private sizeSystem!: SizeSystem;
  private timerSystem!: TimerSystem;
  private soundSystem!: SoundSystem;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private exitZone!: Phaser.GameObjects.Zone;
  private score = 0;
  private levelIndex = 0;
  private gameOver = false;
  private levelComplete = false;
  private stressTriggered = false;

  constructor() { super({ key: "GameScene" }); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.score = 0;
    this.gameOver = false;
    this.levelComplete = false;
    this.stressTriggered = false;
    this.foods = [];
  }

  create() {
    const levelCfg = LEVELS[this.levelIndex];

    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.physics.world.gravity.y = GRAVITY;

    const { platforms, exitZone } = buildLevel1(this);
    this.platforms = platforms;
    this.exitZone  = exitZone;

    this.sizeSystem  = new SizeSystem(() => Date.now());
    this.timerSystem = new TimerSystem(levelCfg.timeLimit);
    this.soundSystem = new SoundSystem();

    const { x, y } = levelCfg.playerStart;
    this.blob = new Blob(this, x, y, this.sizeSystem);
    this.physics.add.collider(this.blob.body, this.platforms);

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

    this.physics.add.overlap(
      this.blob.body,
      this.exitZone,
      () => this.completeLevel(),
      undefined,
      this
    );

    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.cameras.main.startFollow(this.blob.body, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(120, 80);

    this.cursors = this.input.keyboard!.createCursorKeys();

    // Size → UI events + sounds
    this.sizeSystem.onSizeChange((evt) => {
      const ui = this.scene.get("UIScene");
      ui.events.emit("update-stage", evt.stage);

      if (evt.type === "shrink") {
        this.soundSystem.burp();
        ui.events.emit("show-message", "BURP! Getting smaller...", "#6fdc8c");
      } else if (evt.type === "grow" || evt.type === "maxed") {
        this.soundSystem.grow();
      }
    });

    // Timer → UI
    this.timerSystem.onTick(({ type, remaining }) => {
      const ui = this.scene.get("UIScene");
      ui.events.emit("update-timer", remaining);

      // Stress at 15s
      if (!this.stressTriggered && remaining <= STRESS_THRESHOLD) {
        this.stressTriggered = true;
        this.blob.setStressed(true);
        this.soundSystem.stressHeartbeat();
        ui.events.emit("show-message", "HURRY UP!", "#f39c12");
      }

      if (type === "expired") this.failLevel();
    });

    this.timerSystem.start();

    const ui = this.scene.get("UIScene");
    ui.events.emit("update-timer", levelCfg.timeLimit);
    ui.events.emit("update-score", 0);
    ui.events.emit("update-stage", 0);

    this.input.keyboard!.on("keydown-ESC", () => this.togglePause());
  }

  private eatFood(food: Food) {
    if (!food.sprite.active) return;

    const type     = food.foodType;
    const category = getFoodCategory(type);
    const growth   = getFoodGrowth(type);
    const pts      = getFoodScore(type);

    // Play sound before removing sprite
    if (category === "healthy") this.soundSystem.eatHealthy();
    else                        this.soundSystem.eatUnhealthy();

    // Swallow tween: food flies into Bob's mouth then vanishes
    const foodSprite = food.sprite;
    foodSprite.disableBody(false, false); // keep visible but disable physics
    this.foods = this.foods.filter((f) => f !== food);

    this.tweens.add({
      targets: foodSprite,
      x: this.blob.body.x,
      y: this.blob.body.y - 8,
      scaleX: 0.15,
      scaleY: 0.15,
      alpha: 0,
      duration: 220,
      ease: "Quad.In",
      onComplete: () => foodSprite.destroy(),
    });

    // Play eat animation concurrently with swallow tween
    this.blob.playEatAnim();
    this.sizeSystem.eat(growth);

    this.score += pts;
    const ui = this.scene.get("UIScene");
    ui.events.emit("update-score", this.score);

    // Score pop with colour by category
    const popColor = category === "healthy" ? "#6fdc8c" : "#f39c12";
    const popText  = category === "healthy" ? `+${pts}` : `+${pts} ×2!`;
    const { x, y } = this.blob.body;
    const pop = this.add.text(x, y - 30, popText, {
      fontSize: "17px",
      color: popColor,
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
    this.tweens.add({
      targets: pop,
      y: y - 85,
      alpha: 0,
      duration: 850,
      onComplete: () => pop.destroy(),
    });
  }

  private completeLevel() {
    if (this.levelComplete || this.gameOver) return;
    this.levelComplete = true;
    this.timerSystem.pause();
    this.soundSystem.levelComplete();

    const timeBonus = Math.floor(this.timerSystem.getRemaining()) * 10;
    this.score += timeBonus;

    const ui = this.scene.get("UIScene");
    ui.events.emit("update-score", this.score);
    ui.events.emit("show-message", `LEVEL COMPLETE!\n+${timeBonus} time bonus`, "#6fdc8c");

    this.time.delayedCall(3000, () => {
      this.scene.stop("UIScene");
      this.scene.start("ResultScene", { score: this.score, win: true, level: this.levelIndex });
    });
  }

  private failLevel() {
    if (this.levelComplete || this.gameOver) return;
    this.gameOver = true;
    this.soundSystem.levelFail();

    const ui = this.scene.get("UIScene");
    ui.events.emit("show-message", "TIME'S UP!", "#e74c3c");

    this.blob.body.setVelocity(0, 0);
    this.blob.playSadAnim(); // grayscale + sad face

    this.time.delayedCall(2500, () => {
      this.scene.stop("UIScene");
      this.scene.start("ResultScene", { score: this.score, win: false, level: this.levelIndex });
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

    const pct = this.sizeSystem.getShrinkCooldownRemaining() / SHRINK_COOLDOWN_MS;
    const ui = this.scene.get("UIScene");
    ui.events.emit("update-cooldown", pct);
  }

  shutdown() {
    this.sizeSystem?.destroy();
    this.soundSystem?.destroy();
    this.foods.forEach((f) => f.destroy());
    this.foods = [];
  }
}
