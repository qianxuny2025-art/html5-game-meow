export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum CatType {
  NORMAL = 'NORMAL',
  BOMB = 'BOMB', // The one with the timer
}

export enum GameState {
  START_MENU = 'START_MENU',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST',
}

export interface CatEntity {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  type: CatType;
  timer?: number; // In seconds
  color: string;
  isExited: boolean;
  isMoving: boolean;
}

export interface LevelData {
  cats: CatEntity[];
  gridSize: number;
  level: number;
  unlockedMessage?: string; // Optional message for new unlocks
}