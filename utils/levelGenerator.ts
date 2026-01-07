import { CatEntity, CatType, Direction, LevelData } from '../types';
import { CAT_SKINS, getDelta, BOMB_TIME_SECONDS } from '../constants';

// Generate a random unique ID
const genId = () => Math.random().toString(36).substr(2, 9);

interface LevelConfig {
  size: number;
  skinCount: number;
  bombChance: number;
  unlockMsg?: string;
}

const getLevelConfig = (level: number): LevelConfig => {
  // --- LEVEL PROGRESSION DESIGN ---
  // Grid size grows slowly
  let size = 8; // Start smaller (8x8) for better mobile view
  if (level >= 5) size = 9;
  if (level >= 10) size = 10;
  if (level >= 20) size = 11;
  
  const skinCount = Math.min(CAT_SKINS.length, 2 + Math.floor((level - 1) / 3));

  let bombChance = 0;
  if (level >= 5) bombChance = 0.05; 
  if (level >= 15) bombChance = 0.10; 
  if (level >= 30) bombChance = 0.15; 

  let unlockMsg = undefined;
  if (level === 1) unlockMsg = "Tap cats to clear!";
  else if (level === 5) unlockMsg = "⚠️ Bomb Cats & Bigger Grid!";
  
  return { size, skinCount, bombChance, unlockMsg };
};

// Helper to check bounds
const isValid = (x: number, y: number, size: number) => x >= 0 && x < size && y >= 0 && y < size;

const getOppositeDir = (dir: Direction): Direction => {
  switch (dir) {
    case Direction.UP: return Direction.DOWN;
    case Direction.DOWN: return Direction.UP;
    case Direction.LEFT: return Direction.RIGHT;
    case Direction.RIGHT: return Direction.LEFT;
  }
};

export const generateLevel = (levelNumber: number): LevelData => {
  const config = getLevelConfig(levelNumber);
  const gridSize = config.size;
  const cats: CatEntity[] = [];
  const occupied = new Set<string>(); // "x,y" string

  const markOccupied = (x: number, y: number) => occupied.add(`${x},${y}`);
  const isOccupied = (x: number, y: number) => occupied.has(`${x},${y}`);

  // Calculate target number of cats for HIGH DENSITY
  // Leave at most 10 empty slots.
  const totalCells = gridSize * gridSize;
  const maxEmpty = 10;
  const minEmpty = 2;
  const emptySlots = Math.floor(Math.random() * (maxEmpty - minEmpty + 1)) + minEmpty;
  
  const targetCatCount = Math.floor((totalCells - emptySlots) / 2);

  // --- CENTER-OUT PLACEMENT STRATEGY ---
  
  // 1. Generate all valid coordinate pairs and Sort by distance from center
  let allCells: {x: number, y: number}[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      allCells.push({x, y});
    }
  }
  
  const centerX = gridSize / 2;
  const centerY = gridSize / 2;
  // Shuffle slightly to avoid identical patterns every time
  allCells.sort((a, b) => Math.random() - 0.5); 
  // Then sort mainly by distance (Center first)
  allCells.sort((a, b) => {
    const distA = Math.hypot(a.x - centerX, a.y - centerY);
    const distB = Math.hypot(b.x - centerX, b.y - centerY);
    return distA - distB; 
  });

  // 2. Place cats
  for (const cell of allCells) {
    if (cats.length >= targetCatCount) break;
    if (isOccupied(cell.x, cell.y)) continue;

    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    // Shuffle directions
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const dir of directions) {
      const delta = getDelta(dir);
      const tailX = cell.x - delta.dx;
      const tailY = cell.y - delta.dy;

      if (isValid(tailX, tailY, gridSize) && !isOccupied(tailX, tailY)) {
        // Found a valid spot
        const isBomb = Math.random() < config.bombChance;
        const availableSkins = CAT_SKINS.slice(0, config.skinCount);
        const skin = availableSkins[Math.floor(Math.random() * availableSkins.length)];

        // SWAPPED LOGIC:
        // Original: Head at `cell` (closer to center), Tail at `tailX` (further). Moves INTO center.
        // New: Head at `tailX` (further), Tail at `cell` (closer). Moves OUT of center.
        
        const oppositeDir = getOppositeDir(dir);

        cats.push({
          id: genId(),
          x: tailX,
          y: tailY,
          direction: oppositeDir,
          type: isBomb ? CatType.BOMB : CatType.NORMAL,
          timer: isBomb ? BOMB_TIME_SECONDS : undefined,
          color: skin,
          isExited: false,
          isMoving: false,
        });

        markOccupied(cell.x, cell.y);
        markOccupied(tailX, tailY);
        break; 
      }
    }
  }

  cats.sort((a, b) => (a.y - b.y) || (a.x - b.x));

  return {
    cats,
    gridSize,
    level: levelNumber,
    unlockedMessage: config.unlockMsg
  };
};

// --- Shuffle Logic ---
export const shuffleCats = (currentCats: CatEntity[], gridSize: number): CatEntity[] => {
  const activeCats = currentCats.filter(c => !c.isExited);
  const exitedCats = currentCats.filter(c => c.isExited);
  
  const newActiveCats: CatEntity[] = [];
  const occupied = new Set<string>();
  const markOccupied = (x: number, y: number) => occupied.add(`${x},${y}`);
  const isOccupied = (x: number, y: number) => occupied.has(`${x},${y}`);
  const isValid = (x: number, y: number) => x >= 0 && x < gridSize && y >= 0 && y < gridSize;

  // Generate all grid positions and randomize
  let allCells: {x: number, y: number}[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      allCells.push({x, y});
    }
  }
  allCells.sort(() => Math.random() - 0.5);

  // Try to place each existing cat into a new random spot
  for (const oldCat of activeCats) {
    let placed = false;
    
    // Iterate through random cells to find a spot
    for (const cell of allCells) {
      if (isOccupied(cell.x, cell.y)) continue;

      const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
      // Randomize direction
      directions.sort(() => Math.random() - 0.5);

      for (const dir of directions) {
        const delta = getDelta(dir);
        const tailX = cell.x - delta.dx;
        const tailY = cell.y - delta.dy;

        if (isValid(tailX, tailY) && !isOccupied(tailX, tailY)) {
          // Place it
          newActiveCats.push({
            ...oldCat,
            x: cell.x,
            y: cell.y,
            direction: dir,
            isMoving: false
          });
          markOccupied(cell.x, cell.y);
          markOccupied(tailX, tailY);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    // If we fail to place (rare), the cat is effectively removed.
  }

  // Combine and sort
  const result = [...exitedCats, ...newActiveCats];
  result.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return result;
};