import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, SHRINK_COOLDOWN_MS, STRESS_THRESHOLD } from "../config/constants";
import type { StageIndex } from "../config/constants";
import { LEVELS, getFoodGrowth, getFoodScore, getFoodCategory } from "../config/levels";
import { SizeSystem } from "../systems/SizeSystem";
import { TimerSystem } from "../systems/TimerSystem";
import { SoundSystem } from "../systems/SoundSystem";
import { Blob } from "../entities/Blob";
import { Food } from "../entities/Food";
import { buildLevel1, buildLevel2, LEVEL_HEIGHT } from "./LevelBuilder";

export class GameScene extends Phaser.Scene {
  private blob!: Blob;
  private foods: Food[] = [];
  private sizeSystem!: SizeSystem;
  private timerSystem!: TimerSystem | null;
  private soundSystem!: SoundSystem;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private exitZone!: Phaser.GameObjects.Zone;
  private score = 0;
  private levelIndex = 0;
  private gameOver = false;
  private levelComplete = false;
  private stressTriggered = false;
  private blobWasOnGround = true;
  private lockLabel: Phaser.GameObjects.Text | null = null;
  private exitLocked = false;
  // Tutorial progressive hints
  private tutHints: Map<string, Phaser.GameObjects.Text> = new Map();
  private tutShown: Set<string> = new Set();

  constructor() { super({ key: "GameScene" }); }

  init(data: { level?: number }) {
    this.levelIndex = data.level ?? 0;
    this.score = 0;
    this.gameOver = false;
    this.levelComplete = false;
    this.stressTriggered = false;
    this.foods = [];
    this.timerSystem = null;
    this.lockLabel = null;
    this.exitLocked = false;
    this.tutHints.clear();
    this.tutShown.clear();
  }

  create() {
    const levelCfg = LEVELS[this.levelIndex];
    // #region agent log
    fetch('http://127.0.0.1:7553/ingest/78dd097e-7875-4bca-a1cb-75d8dedeb0be',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'15718d'},body:JSON.stringify({sessionId:'15718d',location:'GameScene.ts:create-start',message:'GameScene create starting',data:{levelIndex:this.levelIndex,levelName:levelCfg.name},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Select the correct level builder
    const { platforms, exitZone, levelWidth, levelHeight } =
      this.levelIndex === 0 ? buildLevel1(this) : buildLevel2(this);
    this.exitZone = exitZone;
    // #region agent log
    fetch('http://127.0.0.1:7553/ingest/78dd097e-7875-4bca-a1cb-75d8dedeb0be',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'15718d'},body:JSON.stringify({sessionId:'15718d',location:'GameScene.ts:create-post-build',message:'Level built OK',data:{levelWidth,levelHeight,platformCount:platforms.children.size},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    this.physics.world.setBounds(0, 0, levelWidth, levelHeight);
    this.physics.world.gravity.y = 0;

    this.sizeSystem  = new SizeSystem(() => Date.now());
    this.soundSystem = new SoundSystem(this);

    const { x, y } = levelCfg.playerStart;
    this.blob = new Blob(this, x, y, this.sizeSystem, levelWidth, levelHeight);

    // Register level geometry with BlobPhysics
    platforms.children.entries.forEach((go) => {
      const b = (go as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.StaticBody;
      this.blob.physics.addRect({ x: b.x, y: b.y, w: b.width, h: b.height });
    });

    levelCfg.foods.forEach((f) => {
      this.foods.push(new Food(this, f.x, f.y, f.type));
    });

    this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);
    // Zoom so the level fills the canvas vertically without changing any geometry
    this.cameras.main.setZoom(GAME_HEIGHT / levelHeight);
    this.cameras.main.startFollow(this.blob.visual, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(240, 160);

    this.cursors = this.input.keyboard!.createCursorKeys();

    if (!this.scene.isActive("UIScene")) {
      this.scene.launch("UIScene");
    }

    // Tutorial progressive hints — created for level 0 only
    if (this.levelIndex === 0) this.createTutorialHints();

    // Size → UI events + sounds
    this.sizeSystem.onSizeChange((evt) => {
      const ui = this.scene.get("UIScene");
      ui.events.emit("update-stage", evt.stage);

      if (evt.type === "shrink") {
        this.soundSystem.burp(Math.min(7, evt.stage + 1) as StageIndex);
        if (this.levelIndex === 0 && evt.stage === 0) {
          // Bob just shrank back to stage 0 — hide the "wait" hints
          this.hideTutHint("grew1"); this.hideTutHint("grew2"); this.hideTutHint("ring");
        }
      } else if (evt.type === "grow" || evt.type === "maxed") {
        this.soundSystem.grow();
        if (this.levelIndex === 0 && evt.stage === 1 && !this.tutShown.has("grew1")) {
          // Bob just ate the first food and grew — show the "wait to shrink" cluster
          this.showTutHint("grew1", 0);
          this.showTutHint("grew2", 600);
          this.showTutHint("ring",  1200);
        }
      }
    });

    // Timer — only for timed levels
    if (levelCfg.timeLimit !== null) {
      this.timerSystem = new TimerSystem(levelCfg.timeLimit);

      this.timerSystem.onTick(({ type, remaining }) => {
        const ui = this.scene.get("UIScene");
        ui.events.emit("update-timer", remaining);

        if (!this.stressTriggered && remaining <= STRESS_THRESHOLD) {
          this.stressTriggered = true;
          this.blob.setStressed(true);
          this.soundSystem.stressHeartbeat();
          ui.events.emit("show-message", "HURRY UP!", "#f39c12");
        }

        if (type === "expired") this.failLevel();
      });

      this.timerSystem.start();
    }

    // Lock label in world space — shown above the exit door when score threshold unmet
    if (levelCfg.scoreThreshold > 0) {
      this.exitLocked = true;
      this.lockLabel = this.add.text(
        exitZone.x, exitZone.y - 48,
        `🔒 ${levelCfg.scoreThreshold} pts`,
        { fontSize: "16px", color: "#e74c3c", fontFamily: "monospace", stroke: "#000", strokeThickness: 3 }
      ).setOrigin(0.5).setDepth(5);
    }

    this.time.delayedCall(0, () => {
      const ui = this.scene.get("UIScene");
      if (ui) {
        if (levelCfg.timeLimit === null) {
          ui.events.emit("hide-timer");
        } else {
          ui.events.emit("update-timer", levelCfg.timeLimit);
        }
        ui.events.emit("update-score", 0);
        ui.events.emit("update-stage", 0);
        ui.events.emit("set-score-threshold", levelCfg.scoreThreshold);
      }
    });

    this.input.keyboard!.on("keydown-ESC", () => this.openPause());

    // scene.pause() / scene.resume() fire these Phaser lifecycle events —
    // hook them to handle timer/sound/sizeSystem pause/resume in one place.
    this.events.on(Phaser.Scenes.Events.PAUSE,  () => this.onScenePause());
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.onSceneResume());

    // Music — tutorial uses menu track, timed levels use the level track
    const track = levelCfg.music === "menu" ? "menumusic" : "bgmusic";
    if (!this.sound.get(track)?.isPlaying) {
      this.sound.play(track, { loop: true, volume: 0.4 });
    }
  }

  private eatFood(food: Food) {
    if (!food.sprite.active) return;
    food.sprite.setActive(false);
    food.sprite.disableBody(true, false);

    const type     = food.foodType;
    const category = getFoodCategory(type);
    const growth   = getFoodGrowth(type);
    const pts      = getFoodScore(type);

    this.soundSystem.eat();

    const foodSprite = food.sprite;
    this.foods = this.foods.filter((f) => f !== food);

    // Swallow tween: food flies toward Bob's centre
    this.tweens.add({
      targets: foodSprite,
      x: this.blob.visual.x,
      y: this.blob.visual.y - 8,
      scaleX: 0.15, scaleY: 0.15, alpha: 0,
      duration: 220, ease: "Quad.In",
      onComplete: () => foodSprite.destroy(),
    });

    this.blob.playEatAnim();
    this.sizeSystem.eat(growth);

    this.score += pts;
    const ui = this.scene.get("UIScene");
    ui.events.emit("update-score", this.score);

    // Check if exit just unlocked
    const threshold = LEVELS[this.levelIndex].scoreThreshold;
    if (this.exitLocked && threshold > 0 && this.score >= threshold) {
      this.exitLocked = false;
      if (this.lockLabel) {
        this.lockLabel.setText("✓ EXIT").setColor("#6fdc8c");
        this.time.delayedCall(1200, () => this.lockLabel?.setVisible(false));
      }
      ui.events.emit("exit-unlocked");
    }

    const popColor = category === "healthy" ? "#6fdc8c" : "#f39c12";
    const popText  = category === "healthy" ? `+${pts}` : `+${pts} ×2!`;
    const { x, y } = this.blob.visual;
    const pop = this.add.text(x, y - 30, popText, {
      fontSize: "17px", color: popColor,
      fontFamily: "monospace",
      stroke: "#000000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);
    this.tweens.add({
      targets: pop, y: y - 85, alpha: 0, duration: 850,
      onComplete: () => pop.destroy(),
    });
  }

  private stopLevelMusic() {
    this.sound.stopByKey("bgmusic");
    this.sound.stopByKey("menumusic");
  }

  private completeLevel() {
    if (this.levelComplete || this.gameOver) return;
    this.levelComplete = true;
    this.timerSystem?.pause();
    this.stopLevelMusic();
    this.soundSystem.levelComplete();

    const ui = this.scene.get("UIScene");
    ui.events.emit("update-score", this.score);
    ui.events.emit("show-message", "LEVEL COMPLETE!", "#6fdc8c");

    this.time.delayedCall(3000, () => {
      this.scene.stop("UIScene");
      this.scene.start("ResultScene", { score: this.score, win: true, level: this.levelIndex });
    });
  }

  private failLevel() {
    if (this.levelComplete || this.gameOver) return;
    this.gameOver = true;
    this.stopLevelMusic();
    this.soundSystem.levelFail();

    const ui = this.scene.get("UIScene");
    ui.events.emit("show-message", "TIME'S UP!", "#e74c3c");

    this.blob.playSadAnim();

    this.time.delayedCall(2500, () => {
      this.scene.stop("UIScene");
      this.scene.start("ResultScene", { score: this.score, win: false, level: this.levelIndex });
    });
  }

  private openPause() {
    if (this.gameOver || this.levelComplete) return;
    if (this.scene.isActive("PauseScene")) return; // already open
    // scene.pause() freezes tweens, animations, physics, and the update loop
    // all at once — truly frozen mid-air. The PAUSE lifecycle event triggers
    // onScenePause() below which handles timer/sound/sizeSystem.
    this.scene.pause();
    this.scene.launch("PauseScene");
  }

  /** Called by Phaser when this scene is paused (via scene.pause()). */
  private onScenePause() {
    this.timerSystem?.pause();
    this.sizeSystem?.pauseShrinkTimer();
    this.sound.pauseAll();
  }

  /** Called by Phaser when this scene is resumed (via scene.resume()). */
  private onSceneResume() {
    this.timerSystem?.resume();
    this.sizeSystem?.resumeShrinkTimer();
    this.sound.resumeAll();
  }

  update(_time: number, delta: number) {
    if (this.gameOver || this.levelComplete) return;

    this.blob.update(this.cursors, delta);
    this.timerSystem?.update();

    // Jump sound — fires on the frame Bob leaves the ground moving upward
    const onGround = this.blob.physics.onGround;
    if (!onGround && this.blobWasOnGround && this.blob.physics.vy < 0) {
      this.soundSystem.jump(this.sizeSystem.getStage());
    }
    this.blobWasOnGround = onGround;

    // Manual food overlap checks (replaces physics.add.overlap).
    // Process at most one food per frame to avoid double-eat edge cases.
    for (const food of this.foods) {
      if (!food.sprite.active) continue;
      const fx = food.sprite.x - 24;
      const fy = food.sprite.y - 24;
      if (this.blob.physics.overlapsRect(fx, fy, 48, 48)) {
        this.eatFood(food);
        break;
      }
    }

    // Exit zone overlap check.
    if (!this.levelComplete) {
      const eb = this.exitZone.body as Phaser.Physics.Arcade.StaticBody;
      if (this.blob.physics.overlapsRect(eb.x, eb.y, eb.width, eb.height)) {
        if (this.exitLocked) {
          const needed = LEVELS[this.levelIndex].scoreThreshold - this.score;
          const ui = this.scene.get("UIScene");
          ui.events.emit("show-message", `Need ${needed} more pts!`, "#e74c3c");
        } else {
          this.completeLevel();
        }
      }
    }

    const pct = this.sizeSystem.getShrinkCooldownRemaining() / SHRINK_COOLDOWN_MS;
    const ui = this.scene.get("UIScene");
    ui.events.emit("update-cooldown", pct);

    // Tutorial: position-based hint triggers
    if (this.levelIndex === 0) this.updateTutorialHints(this.blob.physics.cx);
  }

  // ─── Tutorial progressive hints ────────────────────────────────────────────

  private createTutorialHints() {
    const FLOOR = 528;
    const add = (key: string, x: number, y: number, text: string, color = "#e0e0e0") => {
      const t = this.add.text(x, y, text, {
        fontSize: "14px", color, fontFamily: "monospace",
        stroke: "#000", strokeThickness: 3, align: "center",
      }).setOrigin(0.5).setAlpha(0).setDepth(8);
      this.tutHints.set(key, t);
    };

    add("move",  400, FLOOR - 120, "← → Move     ↑ / SPACE Jump");
    add("eat",   800, FLOOR - 110, "▼  Eat this to grow!");
    add("grew1", 870, FLOOR -  80, "You grew! The gap is now too narrow.");
    add("grew2", 870, FLOOR - 118, "Stand here and wait...");
    add("ring",  870, FLOOR - 160, "↗  Watch the ring in the top-right.\nWhen it fills — Bob burps and shrinks!");
    add("junk", 1200, FLOOR - 120, "▼  JUNK FOOD — 2× points but 2× growth!\nEat wisely.", "#ff6b9d");
    add("tunnel",1600,  336 -  44, "Jump up here!\nOnly small Bob fits → bonus food inside.", "#f1c40f");
    add("goback",2200, FLOOR - 100, "Not enough points?\nGo back — there's food in the tunnel! ←");
  }

  private showTutHint(key: string, delayMs = 0) {
    if (this.tutShown.has(key)) return;
    this.tutShown.add(key);
    const t = this.tutHints.get(key);
    if (!t) return;
    this.time.delayedCall(delayMs, () => {
      if (t.active) this.tweens.add({ targets: t, alpha: 1, duration: 350 });
    });
  }

  private hideTutHint(key: string, delayMs = 0) {
    const t = this.tutHints.get(key);
    if (!t || t.alpha === 0) return;
    this.time.delayedCall(delayMs, () => {
      if (t.active) this.tweens.add({ targets: t, alpha: 0, duration: 350 });
    });
  }

  private updateTutorialHints(bx: number) {
    const shown = this.tutShown;

    // Zone 1: movement — show at start, hide when Bob starts moving
    if (!shown.has("move") && bx < 700) this.showTutHint("move");
    if (shown.has("move") && !shown.has("move-hide") && bx > 600) {
      shown.add("move-hide");
      this.hideTutHint("move");
    }

    // Zone 2: apple hint — show when Bob approaches the apple
    if (!shown.has("eat") && bx > 650 && bx < 870) this.showTutHint("eat");
    // "eat" hint is hidden by the sizeSystem "grew" handler above (naturally replaced)

    // Zone 3: junk food — show when past the stack
    if (!shown.has("junk") && bx > 1080) {
      this.showTutHint("junk");
      this.hideTutHint("eat"); // clean up if still showing
    }
    if (shown.has("junk") && !shown.has("junk-hide") && bx > 1380) {
      shown.add("junk-hide");
      this.hideTutHint("junk");
    }

    // Zone 4: L-tunnel hint — show when near tunnel entrance
    if (!shown.has("tunnel") && bx > 1330 && bx < 1860) this.showTutHint("tunnel");
    if (shown.has("tunnel") && !shown.has("tunnel-hide") && bx > 1860) {
      shown.add("tunnel-hide");
      this.hideTutHint("tunnel");
    }

    // Zone 5: go-back hint — show at exit when score is below threshold
    if (!shown.has("goback") && bx > 2200 && this.score < LEVELS[0].scoreThreshold) {
      this.showTutHint("goback");
    }
    if (shown.has("goback") && this.score >= LEVELS[0].scoreThreshold) {
      this.hideTutHint("goback");
    }
  }

  shutdown() {
    this.sizeSystem?.destroy();
    this.sound.stopByKey("bgmusic");
    this.stopLevelMusic();
    this.soundSystem?.destroy();
    this.foods.forEach((f) => f.destroy());
    this.foods = [];
  }
}
