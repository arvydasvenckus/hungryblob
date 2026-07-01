import Phaser from "phaser";
import type { StageIndex } from "../config/constants";
import {
  SIZE_STAGES,
  STAGE_JUMP_VELOCITY,
  STAGE_WALK_SPEED,
  GRAVITY,
  SHRINK_TWEEN_MS,
} from "../config/constants";
import { SizeSystem } from "../systems/SizeSystem";
import { BlobPhysics } from "./BlobPhysics";
import { LEVEL_WIDTH as DEFAULT_LEVEL_WIDTH, LEVEL_HEIGHT as DEFAULT_LEVEL_HEIGHT } from "../scenes/LevelBuilder";

export class Blob {
  /** Plain sprite — no physics body. Positioned from physics each frame. */
  readonly visual: Phaser.GameObjects.Sprite;
  private worldW: number;
  private worldH: number;
  /** Custom AABB physics engine — the single source of truth for position/size. */
  readonly physics: BlobPhysics;

  private scene: Phaser.Scene;
  private sizeSystem!: SizeSystem; // stored so phase 4 can query current authoritative stage
  private stage: StageIndex = 0;
  private isBurping  = false;
  private isEating   = false;
  private isStressed = false;
  private isSad      = false;

  constructor(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    sizeSystem: SizeSystem,
    worldW = DEFAULT_LEVEL_WIDTH,
    worldH = DEFAULT_LEVEL_HEIGHT,
  ) {
    this.scene = scene;
    this.sizeSystem = sizeSystem;
    this.worldW = worldW;
    this.worldH = worldH;

    const s0 = SIZE_STAGES[0];
    this.physics = new BlobPhysics(cx, cy, s0.width, s0.height);

    // Plain sprite — no physics body. Camera + tweens target this.
    // Scale is always 1: the texture's blob drawing already matches hitbox dimensions.
    // Depth 2: renders above tutorial hint texts (depth 1) but below UI overlays.
    this.visual = scene.add.sprite(cx, cy, "blob_stage0", 0);
    this.visual.setScale(1).setDepth(2);
    this.visual.play("blob_idle_0");

    sizeSystem.onSizeChange((evt) => {
      if (evt.type === "grow" || evt.type === "maxed") {
        this.applyStage(evt.stage as StageIndex);
      } else if (evt.type === "shrink") {
        this.triggerBurp(evt.stage as StageIndex);
      }
    });
  }

  // ─── Stage / size ──────────────────────────────────────────────────────────
  // resize() is pure arithmetic — no Phaser body, no sync formula needed.

  private applyStage(stage: StageIndex) {
    if (!this.visual?.active) return; // stale timer guard
    this.stage = stage;
    const { width, height } = SIZE_STAGES[stage];

    this.physics.resize(width, height); // keeps body.bottom constant — trivially correct
    // Always scale 1: the blob drawing in the texture already matches the hitbox
    // dimensions at scale 1. Using any other scale makes the visual larger than
    // the hitbox, causing visible ceiling/floor pass-through.
    this.visual.setScale(1);

    if (!this.isEating) this.refreshAnim();

    // X-only squash bounce (visual only)
    this.scene.tweens.killTweensOf(this.visual);
    this.scene.tweens.add({
      targets: this.visual,
      scaleX: 1.32,
      duration: 80,
      ease: "Back.Out",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.visual,
          scaleX: 1,
          duration: 140,
          ease: "Elastic.Out",
        });
      },
    });
  }

  // ─── Burp / shrink ─────────────────────────────────────────────────────────

  private triggerBurp(newStage: StageIndex) {
    if (this.isBurping) return;
    // Guard: abort if the visual sprite was destroyed by scene teardown.
    // A stale SizeSystem setTimeout can fire after scene shutdown, and calling
    // tween/play on a destroyed sprite crashes the game.
    if (!this.visual?.active) return;
    this.isBurping = true;

    this.scene.tweens.killTweensOf(this.visual);

    // Phase 1: mild squash anticipation
    this.scene.tweens.add({
      targets: this.visual,
      scaleX: 1.28,
      scaleY: 0.72,
      duration: 75,
      ease: "Sine.In",
      onComplete: () => {
        // Phase 2: puff up — air rising
        this.scene.tweens.add({
          targets: this.visual,
          scaleX: 0.80,
          scaleY: 1.35,
          duration: 90,
          ease: "Sine.Out",
          onComplete: () => {
            // Phase 3: reset scale cleanly, then play burp frames
            this.visual.setScale(1);
            this.visual.play(`blob_burp_${this.stage}`, true);
            this.spawnBurpBubble();

            this.visual.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              // Phase 4: physics resize.
              // Use sizeSystem.getStage() as the authoritative final stage.
              // If eat() fired during this burp, sizeSystem's stage reflects both the shrink
              // and the eat — using newStage (captured at shrink time) would wrongly revert it.
              const finalStage = this.sizeSystem.getStage() as StageIndex;
              const oldW = SIZE_STAGES[this.stage].width;
              const { width, height } = SIZE_STAGES[finalStage];
              this.stage = finalStage;
              this.physics.resize(width, height);
              const scaleRatio = oldW / width;
              // If stressed, go straight to stress anim — skip the brief idle/smile
              const postBurpKey = this.isStressed
                ? `blob_stress_${finalStage}`
                : `blob_idle_${finalStage}`;
              this.visual.play(postBurpKey, true);
              this.visual.setScale(scaleRatio);
              this.scene.tweens.add({
                targets: this.visual,
                scaleX: 1,
                scaleY: 1,
                duration: SHRINK_TWEEN_MS,
                ease: "Elastic.Out",
                onComplete: () => {
                  this.isBurping = false;
                  this.refreshAnim();
                },
              });
            });
          },
        });
      },
    });
  }

  private spawnBurpBubble() {
    const { width, height } = SIZE_STAGES[this.stage];
    const x = this.visual.x + width * 0.42;
    const y = this.visual.y - height * 0.44;
    const fontSize = Math.max(11, Math.round(width * 0.2));

    const bubble = this.scene.add.text(x, y, "burp!", {
      fontSize: `${fontSize}px`,
      color: "#f1c40f",
      fontFamily: "CandyBeans, monospace", resolution: window.devicePixelRatio || 1,
      fontStyle: "bold",
      stroke: "#1a1a2e",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    this.scene.tweens.add({
      targets: bubble,
      y:     y - height * 0.75,
      x:     x + width * 0.25,
      alpha: 0,
      angle: 10,
      scaleX: 1.35,
      scaleY: 1.35,
      duration: 950,
      ease: "Quad.Out",
      onComplete: () => bubble.destroy(),
    });
  }

  // ─── Stress & sad ──────────────────────────────────────────────────────────

  setStressed(on: boolean) {
    if (this.isStressed === on || this.isSad) return;
    this.isStressed = on;
    // Don't interrupt an in-progress burp animation — refreshAnim() will pick
    // up the stress state once the burp's Phase 4 onComplete fires.
    if (this.isBurping) return;
    if (on) this.visual.play(`blob_stress_${this.stage}`, true);
    else    this.refreshAnim();
  }

  playSadAnim() {
    this.isSad = true;
    this.physics.vx = 0;
    this.physics.vy = 0;
    this.visual.play(`blob_sad_${this.stage}`, true);
    this.visual.setTint(0x888888);
  }

  // ─── Animation helpers ─────────────────────────────────────────────────────

  private refreshAnim() {
    if (this.isEating || this.isSad) return;
    const base = this.isStressed
      ? `blob_stress_${this.stage}`
      : `blob_idle_${this.stage}`;
    if (this.visual.anims.currentAnim?.key !== base) {
      this.visual.play(base, true);
    }
  }

  // ─── Main update (called every frame from GameScene) ───────────────────────

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys, delta: number) {
    if (this.isSad) return;

    // Movement input is always processed — even during burp animation.
    // Log evidence (vxAtBurpStart:-184) confirmed that blocking input during burp
    // causes velocity to stay stuck. Removing the isBurping guard lets Bob
    // start/stop movement freely. The animation state machine below still
    // prevents walk/idle from interrupting the burp visual.
    {
      const walkSpd = STAGE_WALK_SPEED[this.stage];
      const jumpVel = STAGE_JUMP_VELOCITY[this.stage];

      if (cursors.left.isDown) {
        this.physics.vx = -walkSpd;
        this.visual.setFlipX(true);
      } else if (cursors.right.isDown) {
        this.physics.vx = walkSpd;
        this.visual.setFlipX(false);
      } else {
        this.physics.vx = 0;
      }

      if ((cursors.up.isDown || cursors.space?.isDown) && this.physics.onGround) {
        this.physics.vy = jumpVel;
      }
    }

    this.physics.update(delta / 1000, GRAVITY, this.worldW, this.worldH);

    // Visual is always scale 1 → blob drawn size = hitbox size → centres match.
    this.visual.setPosition(this.physics.cx, this.physics.cy);

    // Animation state machine
    if (this.isEating || this.isBurping) return;

    const { vx, vy, onGround } = this.physics;
    const s   = this.stage;
    const cur = this.visual.anims.currentAnim?.key ?? "";

    if (!onGround) {
      if (this.isStressed) {
        const stressKey = `blob_stress_${s}`;
        if (!cur.startsWith(stressKey)) this.visual.play(stressKey, true);
      } else {
        const airKey = vy > 0 ? `blob_fall_${s}` : `blob_jump_${s}`;
        if (!cur.startsWith("blob_jump") && !cur.startsWith("blob_fall")) {
          this.visual.play(airKey, true);
        }
      }
    } else if (Math.abs(vx) > 10) {
      const walkKey = this.isStressed ? `blob_stress_${s}` : `blob_walk_${s}`;
      if (!cur.startsWith(walkKey)) this.visual.play(walkKey, true);
    } else {
      const idleKey = this.isStressed ? `blob_stress_${s}` : `blob_idle_${s}`;
      if (!cur.startsWith(idleKey)) this.visual.play(idleKey, true);
    }
  }

  // ─── Eat animation ─────────────────────────────────────────────────────────

  playEatAnim(onComplete?: () => void) {
    this.isEating = true;
    this.visual.play(`blob_eat_${this.stage}`, true);
    this.visual.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isEating = false;
      this.refreshAnim();
      onComplete?.();
    });
  }

  getStage(): StageIndex { return this.stage; }

  /** True while the burp animation chain is running. Used to guard external tween kills. */
  get isBurpingNow(): boolean { return this.isBurping; }

  destroy() {
    this.visual.destroy();
  }
}
