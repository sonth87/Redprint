import React, { useState, useRef, useEffect, useCallback } from "react";
import { Move, Minus, Plus } from "lucide-react";
import { cn } from "@ui-builder/ui";

export interface FloatingPanelProps {
  id?: string;
  title: string;
  children: React.ReactNode;
  defaultPosition: { x?: number; y: number; right?: number };
  width?: number;
  defaultExpanded?: boolean;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  title,
  children,
  defaultPosition,
  width = 280,
  defaultExpanded = true,
}) => {
  const [position, setPosition] = useState({ x: 0, y: defaultPosition.y });
  
  useEffect(() => {
    // initialize position after mount
    if (defaultPosition.right !== undefined) {
      setPosition({ x: window.innerWidth - defaultPosition.right - width, y: defaultPosition.y });
    } else {
      setPosition({ x: defaultPosition.x || 16, y: defaultPosition.y });
    }
  }, [defaultPosition.right, defaultPosition.x, defaultPosition.y, width]);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartInfo = useRef<{ startX: number; startY: number; initialPanelX: number; initialPanelY: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId); // let child events flow but allow drag
    setIsDragging(true);
    dragStartInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanelX: position.x,
      initialPanelY: position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStartInfo.current) return;
      const dx = e.clientX - dragStartInfo.current.startX;
      const dy = e.clientY - dragStartInfo.current.startY;
      
      let newX = dragStartInfo.current.initialPanelX + dx;
      let newY = dragStartInfo.current.initialPanelY + dy;

      // Ensure panel doesn't go off screen (rough boundaries)
      newX = Math.max(0, Math.min(window.innerWidth - width, newX));
      newY = Math.max(0, Math.min(window.innerHeight - 40, newY));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      dragStartInfo.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, width]);

  return (
    <div
      className={cn(
        "fixed z-40 flex flex-col bg-background/95 backdrop-blur-md rounded-lg border shadow-lg overflow-hidden transition-all duration-200",
        isDragging && "shadow-xl select-none opacity-90",
      )}
      style={{
        width,
        left: position.x,
        top: position.y,
      }}
    >
      {/* Header - Drag Handle */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
      >
        <div className="flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-muted rounded text-muted-foreground"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex flex-col transition-all overflow-hidden",
          isExpanded ? "h-auto max-h-[70vh] opacity-100" : "h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
};
