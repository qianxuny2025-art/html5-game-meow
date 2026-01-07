import React from 'react';
import { CatEntity, CatType, Direction } from '../types';
import { getRotationClass } from '../constants';
import { Timer } from 'lucide-react';

interface CatProps {
  cat: CatEntity;
  cellSize: number;
  gap: number;
  onClick: (id: string) => void;
  isHint?: boolean;
}

const Cat: React.FC<CatProps> = ({ cat, cellSize, gap, onClick, isHint }) => {
  const { x, y, direction, color, type, timer, isExited } = cat;

  // Calculate position on the grid
  const left = x * (cellSize + gap);
  const top = y * (cellSize + gap);

  const isBomb = type === CatType.BOMB;
  
  // Dimensions for 1:2 ratio
  const width = cellSize;
  const height = (cellSize * 2) + gap;

  // SCALING LOGIC:
  // The internal design was built for 48px cells.
  // We render the internals at 48px reference size and scale down.
  const REF_SIZE = 48;
  const REF_GAP = 8;
  const REF_HEIGHT = (REF_SIZE * 2) + REF_GAP;
  const scale = cellSize / REF_SIZE;

  // Transform Origin Y for the SCALED content
  const originY = ((REF_SIZE / 2) / REF_HEIGHT) * 100;

  // Transition styles
  // Use standard tailwind class 'duration-1000' instead of JIT syntax to ensure compatibility
  const transitionClass = isExited ? 'duration-1000 ease-in' : 'duration-300 ease-in-out';

  // Wrapper Style: Positions the component at the logical (x,y) cell
  const wrapperStyle = {
    transform: `translate(${left}px, ${top}px)`,
    width: `${width}px`,
    height: `${width}px`, // Logic wrapper is 1x1
    // Ensure exiting cats are always on top (zIndex 9999), otherwise use grid-based layering
    zIndex: isExited ? 9999 : (Math.floor(y) * 10 + Math.floor(x)), 
  };

  // Rotation Wrapper: Handles rotation
  const rotationStyle = {
    width: `${width}px`,
    height: `${height}px`,
    // We adjust the rotation pivot to be the center of the "Head" (the top square)
    transformOrigin: `50% ${ (width/2) / height * 100 }%`,
  };

  return (
    <div
      className={`absolute transition-all ${transitionClass} z-10 will-change-transform`}
      style={wrapperStyle}
    >
      {/* Rotation Container */}
      <div 
        className={`absolute top-0 left-0 ${getRotationClass(direction)} transition-transform duration-300 cursor-pointer hover:scale-105`}
        style={rotationStyle}
        onClick={(e) => {
          e.stopPropagation();
          onClick(cat.id);
        }}
      >
        {/* Scaling Container:
            This div is sized to the REFERENCE dimensions (large) 
            and then scaled down to fit the actual `cellSize`. 
            It is centered at the top-left of the rotation container.
        */}
        <div 
           style={{
             width: REF_SIZE,
             height: REF_HEIGHT,
             transform: `scale(${scale})`,
             transformOrigin: 'top left',
           }}
        >
          {/* Hint Ring (Underneath body) */}
          {isHint && !isExited && (
            <div className="absolute inset-0 rounded-full border-4 border-red-500 hint-ring w-[95%] h-[98%] mx-auto z-0 pointer-events-none"></div>
          )}

          {/* Main Body Shape: Elongated (1:2) */}
          <div className={`w-[90%] h-[95%] mx-auto ${isBomb ? 'bg-red-500' : color} rounded-full shadow-[0_4px_0_rgba(0,0,0,0.15)] relative flex flex-col items-center border-2 border-black/5 overflow-hidden ${isHint ? 'animate-wiggle' : ''} z-10`}>
            
            {/* --- HEAD SECTION (Top ~40%) --- */}
            <div className="w-full h-[45%] relative flex justify-center">
                {/* Ears */}
                <div className={`absolute -top-1 left-1 w-5 h-5 ${isBomb ? 'bg-red-500' : color} rounded-md rotate-[20deg] border-2 border-transparent border-t-black/5 border-l-black/5`}></div>
                <div className={`absolute -top-1 right-1 w-5 h-5 ${isBomb ? 'bg-red-500' : color} rounded-md -rotate-[20deg] border-2 border-transparent border-t-black/5 border-r-black/5`}></div>

                {/* Face Details */}
                <div className="flex flex-col items-center mt-5 z-10">
                    {/* Eyes */}
                    <div className="flex space-x-2.5">
                        <div className="w-3.5 h-3.5 bg-slate-900 rounded-full relative overflow-hidden">
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                        <div className="w-3.5 h-3.5 bg-slate-900 rounded-full relative overflow-hidden">
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                    </div>
                    
                    {/* Nose/Mouth */}
                    <div className="flex flex-col items-center -mt-0.5">
                      <div className="w-2.5 h-1.5 bg-pink-400 rounded-full"></div>
                      <div className="w-4 h-2 border-b-2 border-slate-900/20 rounded-full -mt-1"></div>
                    </div>
                </div>

                {/* Whiskers */}
                <div className="absolute top-8 -left-1 w-5 h-0.5 bg-black/10 rotate-12"></div>
                <div className="absolute top-9 -left-1 w-5 h-0.5 bg-black/10 -rotate-6"></div>
                <div className="absolute top-8 -right-1 w-5 h-0.5 bg-black/10 -rotate-12"></div>
                <div className="absolute top-9 -right-1 w-5 h-0.5 bg-black/10 rotate-6"></div>
            </div>

            {/* --- BODY SECTION (Bottom ~60%) --- */}
            <div className="w-full h-[55%] relative flex flex-col items-center justify-end pb-3">
                
                {/* Back Pattern */}
                <div className="absolute top-2 w-12 h-16 bg-black/5 rounded-full blur-[1px]"></div>

                {/* Paws - Rear */}
                <div className="absolute bottom-2 w-full flex justify-between px-4 z-10">
                  <div className="w-3.5 h-3.5 bg-white/40 rounded-full"></div>
                  <div className="w-3.5 h-3.5 bg-white/40 rounded-full"></div>
                </div>
                
                {/* Paws - Front */}
                <div className="absolute bottom-12 w-full flex justify-between px-5 opacity-80">
                  <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                  <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                </div>

                {/* Tail */}
                <div className={`absolute -bottom-2 w-4 h-8 ${isBomb ? 'bg-red-500' : color} rounded-full z-0 border border-black/5`}></div>
            </div>

            {/* Bomb Timer Overlay */}
            {isBomb && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center shadow-md whitespace-nowrap z-20 border border-white/20 animate-pulse">
                <Timer size={10} className="mr-0.5" />
                {timer}s
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cat;