import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RotateCcw, Volume2, VolumeX, Award, Sparkles, Trash2, Shuffle, Repeat, Play, Clock, Cat as CatIcon, Home, Pause, X } from 'lucide-react';
import { CatEntity, Direction, GameState, CatType } from './types';
import { CELL_SIZE_PX, GAP_PX, getDelta } from './constants';
import Cat from './components/Cat';
import { generateLevel, shuffleCats } from './utils/levelGenerator';

type ToolType = 'NONE' | 'REMOVE';

// Cheerful background music URL
const BGM_URL = "https://cdn.pixabay.com/audio/2022/03/24/audio_c8c8a73467.mp3";

const PRAISE_MESSAGES = [
  "Purr-fect!",
  "Pawsome Job!",
  "Meow-velous!",
  "Cat-tastic!",
  "You're the Cat's Whiskers!",
  "Fur-nominal!",
  "Clawsome!"
];

const App: React.FC = () => {
  // Initialize level from localStorage if available
  const [level, setLevel] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('meow_parking_level');
      if (saved) {
        const parsed = parseInt(saved, 10);
        return !isNaN(parsed) && parsed > 0 ? parsed : 1;
      }
    }
    return 1;
  });

  const [cats, setCats] = useState<CatEntity[]>([]);
  const [gridSize, setGridSize] = useState(10);
  const [gameState, setGameState] = useState<GameState>(GameState.START_MENU);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  
  // Timer State
  const [startTime, setStartTime] = useState<number>(0);
  const [levelDuration, setLevelDuration] = useState<number>(0);
  
  // Pause State
  const [isPaused, setIsPaused] = useState(false);
  
  // Audio Ref
  const audioRef = useRef<HTMLAudioElement>(null);

  // Tool State
  const [activeTool, setActiveTool] = useState<ToolType>('NONE');

  // Hint System State
  const [hintCatId, setHintCatId] = useState<string | null>(null);
  const [interactionTrigger, setInteractionTrigger] = useState(0); // Used to reset hint timer

  // Save level to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('meow_parking_level', level.toString());
    }
  }, [level]);

  // --- TELEGRAM INIT ---
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Optional: Set header color if needed, but allowing native look is often better
      // tg.setHeaderColor('#86efac'); 
    }
  }, []);

  // Initialize Level
  const startLevel = useCallback((lvl: number) => {
    try {
      const levelData = generateLevel(lvl);
      setCats(levelData.cats);
      setGridSize(levelData.gridSize);
      setGameState(GameState.PLAYING);
      setIsAnimating(false);
      setActiveTool('NONE');
      setStartTime(Date.now()); // Reset timer
      setIsPaused(false);
      setHintCatId(null);
      setInteractionTrigger(prev => prev + 1);

      if (levelData.unlockedMessage) {
        setToastMessage(levelData.unlockedMessage);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (e) {
      console.error("Failed to generate level", e);
      // Fallback
      setGameState(GameState.START_MENU);
    }
  }, []);

  // Audio Control Logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.3; // Moderate volume

    const playAudio = () => {
      audio.play().catch(err => {
        // Autoplay policy prevented playback
        console.log("Autoplay prevented:", err);
      });
    };

    if (isSoundEnabled && gameState !== GameState.START_MENU) {
      // Play audio when not in start menu
      playAudio();
      
      const handleFirstInteraction = () => {
        if (isSoundEnabled && audio.paused) {
          audio.play().catch(() => {});
        }
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };

      document.addEventListener('click', handleFirstInteraction);
      document.addEventListener('touchstart', handleFirstInteraction);

      return () => {
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };
    } else {
      audio.pause();
    }
  }, [isSoundEnabled, gameState]);

  // Timer Logic (Bomb Cats)
  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused) return;

    const interval = setInterval(() => {
      setCats(currentCats => {
        let hasChanges = false;
        let gameOver = false;

        const nextCats = currentCats.map(cat => {
          if (cat.type === CatType.BOMB && !cat.isExited && cat.timer !== undefined) {
            if (cat.timer <= 0) {
              gameOver = true;
              return cat;
            }
            hasChanges = true;
            return { ...cat, timer: cat.timer - 1 };
          }
          return cat;
        });

        if (gameOver) setGameState(GameState.LOST);
        return hasChanges ? nextCats : currentCats;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, isPaused]);

  // Hint Logic: Check inactivity and find moveable cat
  useEffect(() => {
    if (gameState !== GameState.PLAYING || isPaused || isAnimating || activeTool !== 'NONE') {
        setHintCatId(null);
        return;
    }

    // Reset hint immediately on change
    setHintCatId(null);

    const timer = setTimeout(() => {
        // Find a cat that can exit
        const activeCats = cats.filter(c => !c.isExited);
        const validCat = activeCats.find(cat => {
            const { dx, dy } = getDelta(cat.direction);
            // Simulate path
            for (let step = 1; step <= gridSize; step++) {
                 const nx = cat.x + dx * step;
                 const ny = cat.y + dy * step;
                 
                 // If out of bounds -> Valid exit
                 if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return true;
                 
                 // If blocked -> Invalid
                 const isBlocked = activeCats.some(other => {
                    if (other.id === cat.id) return false;
                    // Check Head
                    if (Math.round(other.x) === nx && Math.round(other.y) === ny) return true;
                    // Check Tail
                    const od = getDelta(other.direction);
                    if (Math.round(other.x - od.dx) === nx && Math.round(other.y - od.dy) === ny) return true;
                    return false;
                 });
                 if (isBlocked) return false;
            }
            return false;
        });

        if (validCat) {
            setHintCatId(validCat.id);
        }
    }, 10000); // 10 seconds of inactivity

    return () => clearTimeout(timer);
  }, [cats, gameState, isPaused, isAnimating, activeTool, gridSize, interactionTrigger]);


  // Check Win
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    
    // Win if all active cats are gone
    // We check `cats.length > 0` to ensure we don't win on an empty board (initializing)
    const activeCats = cats.filter(c => !c.isExited);
    
    if (cats.length > 0 && activeCats.length === 0) {
      // Calculate duration immediately upon winning condition met
      const durationSec = (Date.now() - startTime) / 1000;
      setLevelDuration(durationSec);

      const timer = setTimeout(() => {
        setGameState(GameState.WON);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [cats, gameState, startTime]);

  // --- TOOL LOGIC ---

  const handleToolShuffle = () => {
    if (gameState !== GameState.PLAYING || isAnimating || isPaused) return;
    setInteractionTrigger(p => p + 1);
    setIsAnimating(true);
    const shuffled = shuffleCats(cats, gridSize);
    setCats(shuffled);
    setActiveTool('NONE');
    setTimeout(() => setIsAnimating(false), 500); // Fake animation time
  };

  const handleToolRemove = (id: string) => {
    setInteractionTrigger(p => p + 1);
    setCats(prev => prev.filter(c => c.id !== id));
    setActiveTool('NONE');
    setToastMessage("Meow! Removed!");
    setTimeout(() => setToastMessage(null), 1000);
  };

  const handleGlobalFlip = () => {
    if (gameState !== GameState.PLAYING || isAnimating || isPaused) return;
    setInteractionTrigger(p => p + 1);
    setIsAnimating(true);

    setCats(prev => prev.map(cat => {
      if (cat.isExited) return cat;

      let newDir = Direction.UP;
      if (cat.direction === Direction.UP) newDir = Direction.DOWN;
      else if (cat.direction === Direction.DOWN) newDir = Direction.UP;
      else if (cat.direction === Direction.LEFT) newDir = Direction.RIGHT;
      else if (cat.direction === Direction.RIGHT) newDir = Direction.LEFT;

      const delta = getDelta(cat.direction);
      const newHeadX = cat.x - delta.dx;
      const newHeadY = cat.y - delta.dy;

      return {
        ...cat,
        direction: newDir,
        x: newHeadX,
        y: newHeadY
      };
    }));

    setActiveTool('NONE');
    setToastMessage("All cats flipped!");
    setTimeout(() => {
        setToastMessage(null);
        setIsAnimating(false);
    }, 600);
  };

  // --- INTERACTION ---

  const handleCatClick = useCallback((id: string) => {
    if (gameState !== GameState.PLAYING || isAnimating || isPaused) return;

    setInteractionTrigger(p => p + 1); // Reset hint timer on any attempt

    if (activeTool === 'REMOVE') {
      handleToolRemove(id);
      return;
    }

    const catIndex = cats.findIndex(c => c.id === id);
    if (catIndex === -1) return;
    
    const cat = cats[catIndex];
    if (cat.isExited) return;

    setIsAnimating(true);

    const { dx, dy } = getDelta(cat.direction);
    let targetX = cat.x;
    let targetY = cat.y;
    let willExit = false;

    // Raycast
    for (let step = 1; step <= gridSize; step++) {
      const nextX = cat.x + (dx * step);
      const nextY = cat.y + (dy * step);

      if (nextX < 0 || nextX >= gridSize || nextY < 0 || nextY >= gridSize) {
        willExit = true;
        // Move cat 2.5x grid size away to ensure it clears the screen visually
        targetX = nextX + (dx * (gridSize * 2.5)); 
        targetY = nextY + (dy * (gridSize * 2.5));
        break;
      }

      const obstacle = cats.find(c => {
        if (c.id === id || c.isExited) return false;
        if (Math.round(c.x) === nextX && Math.round(c.y) === nextY) return true; // Head
        const { dx: tdx, dy: tdy } = getDelta(c.direction);
        const tailX = c.x - tdx;
        const tailY = c.y - tdy;
        if (Math.round(tailX) === nextX && Math.round(tailY) === nextY) return true; // Tail
        return false;
      });

      if (obstacle) {
        targetX = nextX - dx;
        targetY = nextY - dy;
        willExit = false;
        break;
      }

      targetX = nextX;
      targetY = nextY;
    }

    if (targetX === cat.x && targetY === cat.y) {
       setIsAnimating(false);
       return;
    }

    const newCats = [...cats];
    newCats[catIndex] = {
      ...cat,
      x: targetX,
      y: targetY,
      isExited: willExit,
      isMoving: true,
    };

    setCats(newCats);
    setTimeout(() => setIsAnimating(false), 300);

  }, [cats, gameState, isAnimating, gridSize, activeTool, isPaused]);


  // ---- Layout Calculations ----
  const boardSizePx = gridSize * (CELL_SIZE_PX + GAP_PX) - GAP_PX;
  const boardPadding = 40;
  const boardTotalSize = boardSizePx + boardPadding;

  useEffect(() => {
    const handleResize = () => {
      const rotatedWidth = boardTotalSize * Math.sqrt(2);
      const safeMargin = 16; // Reduce margin for smaller mobile screens
      
      // Use window.innerWidth/Height which works for Telegram WebApp (Expanded)
      const availableWidth = window.innerWidth - safeMargin;
      // Adjust height calculation to be more aggressive for vertical mobile play
      const availableHeight = window.innerHeight - 200; 

      const scaleX = availableWidth / rotatedWidth;
      const scaleY = availableHeight / rotatedWidth;
      const newScale = Math.min(1.2, scaleX, scaleY);
      setScale(newScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [boardTotalSize]);

  // Removed sorting logic to prevent DOM re-ordering during animations
  // Sorting was causing cats to jump to end of DOM list when Y coord increased rapidly,
  // canceling the CSS transition and making them "disappear".
  // Z-index in Cat.tsx handles the visual layering correctly.
  
  // Memoized encouraging message
  const encouragingMessage = useMemo(() => {
     return PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
  }, [level, gameState]);

  const handleStartGame = () => {
    // Start from the current persisted level instead of resetting to 1
    startLevel(level);
    if (audioRef.current && isSoundEnabled && audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleNextLevel = () => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    
    // CRITICAL FIX: Temporarily clear cats to ensure win-check effect 
    // doesn't see old state (0 active cats) and re-trigger win immediately.
    setCats([]);
    
    startLevel(nextLevel);
  };
  
  const handleHome = () => {
    setIsPaused(true);
  };

  const confirmHome = () => {
    setGameState(GameState.START_MENU);
    setIsPaused(false);
  };

  const resumeGame = () => {
    setIsPaused(false);
  };

  return (
    <div className={`relative w-full h-screen bg-grass flex flex-col items-center overflow-hidden ${activeTool !== 'NONE' ? 'cursor-crosshair' : ''}`}>
      
      {/* Background Audio */}
      <audio ref={audioRef} src={BGM_URL} loop />

      {/* --- START SCREEN --- */}
      {gameState === GameState.START_MENU && (
        <div className="absolute inset-0 z-[100] bg-grass flex flex-col items-center justify-center p-6">
           <div className="bg-white/90 backdrop-blur-md rounded-3xl p-10 shadow-2xl flex flex-col items-center max-w-sm w-full border-4 border-green-500 animate-bounce-in">
              <div className="mb-6 relative">
                 <CatIcon size={80} className="text-orange-400 drop-shadow-lg" />
                 <Sparkles size={40} className="text-yellow-400 absolute -top-4 -right-4 animate-pulse" />
              </div>
              <h1 className="text-4xl font-black text-slate-800 text-center mb-2 leading-tight">Meow<br/>Parking Jam</h1>
              <p className="text-slate-600 mb-8 font-medium text-center">Help the kitties escape!</p>
              
              <button 
                onClick={handleStartGame}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-xl shadow-lg shadow-green-300 transform transition hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
              >
                <Play fill="currentColor" />
                Play Now {level > 1 && <span className="text-sm opacity-80">(Lvl {level})</span>}
              </button>

              <div className="mt-6 flex gap-4">
                 <button 
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                    className="p-3 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                  >
                   {isSoundEnabled ? <Volume2 size={24}/> : <VolumeX size={24}/>}
                 </button>
              </div>
           </div>
           <div className="absolute bottom-8 text-green-800/60 font-bold text-sm">
             v1.2.6
           </div>
        </div>
      )}

      {/* --- HUD --- */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-start z-50 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm border-2 border-green-500 rounded-2xl px-4 py-2 shadow-lg flex items-center gap-2 pointer-events-auto">
           <Award className="text-yellow-500" />
           <span className="font-bold text-green-800 text-lg">Level {level}</span>
        </div>

        <div className="flex gap-2 pointer-events-auto">
             <button 
              onClick={handleHome}
              title="Pause & Home"
              className="bg-white/90 p-2 rounded-full shadow-lg border-2 border-green-500 text-green-700 hover:bg-green-50 transition"
            >
               <Home size={24}/>
            </button>
            <button 
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="bg-white/90 p-2 rounded-full shadow-lg border-2 border-green-500 text-green-700 hover:bg-green-50 transition"
            >
               {isSoundEnabled ? <Volume2 size={24}/> : <VolumeX size={24}/>}
            </button>
             <button 
              onClick={() => startLevel(level)}
              className="bg-white/90 p-2 rounded-full shadow-lg border-2 border-green-500 text-green-700 hover:bg-green-50 transition"
            >
               <RotateCcw size={24}/>
            </button>
        </div>
      </div>

      {/* --- Toast --- */}
      {toastMessage && (
        <div className="absolute top-24 z-50 animate-bounce-in pointer-events-none w-full flex justify-center px-4">
          <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-6 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 text-sm sm:text-base">
             <span className="text-center">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* --- Game Board --- */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div 
          className="relative flex items-center justify-center transition-transform duration-300 ease-out"
          style={{ transform: `scale(${scale})` }}
        >
          <div 
              className="relative bg-green-200/50 rounded-xl shadow-2xl border-4 border-green-600/30 rotate-45 transition-all duration-500"
              style={{ width: boardTotalSize, height: boardTotalSize, padding: 20 }}
          >
            <div className="relative transition-all duration-500" style={{ width: boardSizePx, height: boardSizePx }}>
              {/* Grid Background */}
               {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                 const x = i % gridSize;
                 const y = Math.floor(i / gridSize);
                 return (
                   <div
                      key={i}
                      className="absolute bg-black/5 rounded-lg"
                      style={{
                        width: CELL_SIZE_PX,
                        height: CELL_SIZE_PX,
                        left: x * (CELL_SIZE_PX + GAP_PX),
                        top: y * (CELL_SIZE_PX + GAP_PX),
                      }}
                   />
                 );
               })}

               {/* Cats */}
               {cats.map(cat => (
                 <div key={cat.id} className={`${activeTool === 'REMOVE' ? 'hover:opacity-50' : ''}`}>
                   <Cat 
                      cat={cat} 
                      cellSize={CELL_SIZE_PX} 
                      gap={GAP_PX} 
                      onClick={handleCatClick} 
                      isHint={cat.id === hintCatId}
                   />
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- Bottom Toolbar (Tools) --- */}
      <div className="w-full pb-8 pt-2 px-6 flex justify-center items-end gap-4 z-50">
          {/* Tool: Remove */}
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={() => setActiveTool(activeTool === 'REMOVE' ? 'NONE' : 'REMOVE')}
              className={`p-4 rounded-2xl shadow-xl border-b-4 transition-all active:scale-95 ${
                activeTool === 'REMOVE' 
                ? 'bg-red-500 border-red-700 text-white translate-y-1' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50'
              }`}
            >
              <Trash2 size={28} />
            </button>
            <span className="text-xs font-bold text-white drop-shadow-md">Remove</span>
          </div>

          {/* Tool: Shuffle */}
          <div className="flex flex-col items-center gap-1 mb-4">
            <button 
              onClick={handleToolShuffle}
              disabled={isAnimating || isPaused}
              className="p-5 rounded-full shadow-2xl border-b-4 bg-gradient-to-tr from-blue-400 to-blue-500 border-blue-700 text-white transition-all hover:scale-105 active:scale-95 active:border-b-0"
            >
              <Shuffle size={32} />
            </button>
            <span className="text-xs font-bold text-white drop-shadow-md">Shuffle</span>
          </div>

          {/* Tool: Flip */}
          <div className="flex flex-col items-center gap-1">
             <button 
              onClick={handleGlobalFlip}
              disabled={isAnimating || isPaused}
              className={`p-4 rounded-2xl shadow-xl border-b-4 bg-white border-slate-200 text-slate-600 hover:bg-purple-50 transition-all active:scale-95`}
            >
              <Repeat size={28} />
            </button>
            <span className="text-xs font-bold text-white drop-shadow-md">Flip All</span>
          </div>
      </div>
      
      {/* Tool Hint Overlay */}
      {activeTool === 'REMOVE' && (
         <div className="absolute bottom-32 bg-slate-900/80 text-white px-6 py-2 rounded-full font-bold animate-pulse pointer-events-none z-50">
            Tap a cat to remove it!
         </div>
      )}


      {/* --- Pause Modal --- */}
      {isPaused && (
        <div className="absolute inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-bounce-in relative">
              <button onClick={resumeGame} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
             <h2 className="text-3xl font-black text-slate-800 mb-6">Game Paused</h2>
             <div className="flex flex-col gap-3">
               <button
                  onClick={resumeGame}
                  className="w-full py-4 rounded-xl font-bold text-white text-xl bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg shadow-blue-300 transition transform hover:scale-105 active:scale-95"
               >
                  Resume
               </button>
               <button
                  onClick={confirmHome}
                  className="w-full py-4 rounded-xl font-bold text-slate-600 text-xl bg-slate-100 border-2 border-slate-200 shadow-md transition transform hover:bg-slate-200 active:scale-95"
               >
                  Quit to Home
               </button>
             </div>
          </div>
        </div>
      )}

      {/* --- Win/Loss Modals --- */}
      {(gameState === GameState.WON || gameState === GameState.LOST) && (
        <div className="absolute inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-bounce-in relative overflow-hidden">
             
             {/* Decor */}
             {gameState === GameState.WON && (
               <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                  <div className="absolute top-10 left-10 text-yellow-500 animate-spin-slow"><Sparkles size={40}/></div>
                  <div className="absolute bottom-10 right-10 text-yellow-500 animate-spin-slow"><Sparkles size={40}/></div>
               </div>
             )}

             <div className="text-6xl mb-4 animate-bounce">
                {gameState === GameState.WON ? '🎉' : '😿'}
             </div>
             
             <h2 className="text-3xl font-black text-slate-800 mb-2">
               {gameState === GameState.WON ? 'Level Cleared!' : 'Game Over!'}
             </h2>

             {gameState === GameState.WON && (
               <div className="flex flex-col gap-1 mb-6">
                 <div className="text-xl font-bold text-purple-600 animate-pulse">
                    {encouragingMessage}
                 </div>
                 <div className="inline-flex items-center justify-center gap-2 text-slate-500 bg-slate-100 rounded-full px-4 py-1 mx-auto mt-2">
                    <Clock size={16} />
                    <span className="font-bold text-lg">{Math.floor(levelDuration)}s</span>
                 </div>
               </div>
             )}
             
             {gameState === GameState.LOST && (
                <p className="text-slate-600 mb-6 text-sm">
                   The bomb cat ran out of time!
                </p>
             )}
             
             <button
                onClick={() => {
                  if (gameState === GameState.WON) {
                    handleNextLevel();
                  } else {
                    startLevel(level);
                  }
                }}
                className={`w-full py-4 rounded-xl font-bold text-white text-xl shadow-lg transition transform hover:scale-105 active:scale-95 ${
                  gameState === GameState.WON 
                    ? 'bg-gradient-to-r from-green-400 to-green-600 shadow-green-300' 
                    : 'bg-gradient-to-r from-red-400 to-red-600 shadow-red-300'
                }`}
             >
                {gameState === GameState.WON ? 'Next Level' : 'Try Again'}
             </button>
             
             {/* Home button in Game Over screen too */}
             <button
                onClick={confirmHome}
                className="mt-4 text-slate-400 font-bold hover:text-slate-600 text-sm underline"
             >
               Back to Home
             </button>
          </div>
        </div>
      )}

      <div className="absolute top-16 left-4 text-green-800/60 text-xs font-bold pointer-events-none">
         Density: {Math.round((cats.length * 2) / (gridSize * gridSize) * 100)}%
      </div>
    </div>
  );
};

export default App;