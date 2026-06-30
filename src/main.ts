import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "./config/constants";
import { BootScene   } from "./scenes/BootScene";
import { MenuScene   } from "./scenes/MenuScene";
import { GameScene   } from "./scenes/GameScene";
import { UIScene     } from "./scenes/UIScene";
import { ResultScene } from "./scenes/ResultScene";
import { PauseScene  } from "./scenes/PauseScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1a1a2e",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 }, // per-world set in GameScene
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene, ResultScene],
  parent: "game",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
