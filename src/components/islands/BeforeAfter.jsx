import React, { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

export default function BeforeAfter({ beforeImage, afterImage, beforeLabel, afterLabel }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = (event) => {
    if (!containerRef.current) return;
    
    // Support both mouse and touch events
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    
    setSliderPosition(percent);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleWindowMove = (e) => {
      if (isDragging) handleMove(e);
    };
    const handleWindowUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchmove', handleWindowMove, { passive: false });
    window.addEventListener('touchend', handleWindowUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowUp);
    };
  }, [isDragging]);

  return (
    <div 
      className="relative w-full aspect-video rounded-3xl overflow-hidden select-none cursor-ew-resize shadow-2xl border border-white/10 touch-none"
      ref={containerRef}
      onMouseDown={handleMove}
      onTouchStart={handleMove}
    >
      {/* After Image (Background) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      
      {/* Before Image (Clipped Foreground) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Label */}
         <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium border border-white/20">
          {beforeLabel}
        </div>
      </div>
      
      {/* After Label */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium border border-white/20 pointer-events-none">
          {afterLabel}
      </div>


      {/* Slider Handle */}
      <div
        className="absolute inset-y-0 -ml-0.5 w-1 bg-white cursor-ew-resize z-20"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <button
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-black hover:scale-110 transition-transform focus:outline-none focus:ring-4 focus:ring-primary/50 cursor-ew-resize"
            aria-label="Move slider"
        >
            <GripVertical className="w-4 h-4 md:w-6 md:h-6 opacity-60" />
        </button>
      </div>
    </div>
  );
}
