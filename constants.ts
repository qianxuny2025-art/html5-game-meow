import { CatType, Direction } from './types';

export const CELL_SIZE_PX = 26; // Reduced from 48 to fit 10x10 grid
export const GAP_PX = 3;
export const ANIMATION_DURATION_MS = 300;
export const BOMB_TIME_SECONDS = 120;

// Expanded skins for progression
export const CAT_SKINS = [
  'bg-slate-100', // 1. White (Basic)
  'bg-orange-300', // 2. Orange Tabby
  'bg-slate-400', // 3. Grey
  'bg-amber-200', // 4. Cream
  'bg-stone-600', // 5. Black/Brown
  'bg-pink-300',  // 6. Pink (Cute)
  'bg-purple-300', // 7. Mystic (High Level)
  'bg-teal-300',   // 8. Alien/Mint (High Level)
];

// Helper to get rotation class based on direction
export const getRotationClass = (dir: Direction) => {
  switch (dir) {
    case Direction.UP: return 'rotate-0';
    case Direction.RIGHT: return 'rotate-90';
    case Direction.DOWN: return 'rotate-180';
    case Direction.LEFT: return '-rotate-90';
  }
};

// Helper for delta coordinates
export const getDelta = (dir: Direction): { dx: number; dy: number } => {
  switch (dir) {
    case Direction.UP: return { dx: 0, dy: -1 };
    case Direction.DOWN: return { dx: 0, dy: 1 };
    case Direction.LEFT: return { dx: -1, dy: 0 };
    case Direction.RIGHT: return { dx: 1, dy: 0 };
  }
};