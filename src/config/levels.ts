export interface FoodSpawn {
  x: number;
  y: number;
  type: FoodType;
}

export type FoodType =
  | "donut"
  | "pizza"
  | "burger"
  | "taco"
  | "cookie"
  | "hotdog"
  | "icecream"
  | "cake";

export interface LevelConfig {
  key: string;
  tilemapKey: string;
  tilesetKey: string;
  tilesetImage: string;
  timeLimit: number;  // seconds
  foods: FoodSpawn[];
  playerStart: { x: number; y: number };
  exitZone: { x: number; y: number; width: number; height: number };
  bgColor: number;
  name: string;
}

export const LEVELS: LevelConfig[] = [
  {
    key: "level1",
    tilemapKey: "map_level1",
    tilesetKey: "tiles_duct",
    tilesetImage: "tileset_duct",
    timeLimit: 90,
    name: "Air Ducts",
    bgColor: 0x1a1a2e,
    playerStart: { x: 80, y: 460 },
    exitZone: { x: 1820, y: 400, width: 48, height: 80 },
    foods: [
      { x: 320,  y: 460, type: "cookie"   },
      { x: 520,  y: 380, type: "donut"    },
      { x: 680,  y: 300, type: "hotdog"   },
      { x: 900,  y: 460, type: "taco"     },
      { x: 1050, y: 220, type: "pizza"    },
      { x: 1200, y: 460, type: "burger"   },
      { x: 1380, y: 300, type: "icecream" },
      { x: 1550, y: 460, type: "cake"     },
      { x: 1700, y: 380, type: "donut"    },
      { x: 240,  y: 300, type: "cookie"   },
    ],
  },
];
