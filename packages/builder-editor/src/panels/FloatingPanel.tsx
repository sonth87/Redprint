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
  // Committed position — used only for initial style. Updated to React state once on pointerup.
  const [position, setPosition] = useState({ x: 0, y: defaultPosition.y });
  const positionRef = useRef(position);
  // Direct ref to panel DOM node for imperative position updates during drag
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initial =
      defaultPosition.right !== undefined
        ? { x: window.innerWidth - defaultPosition.right - width, y: defaultPosition.y }
        : { x: defaultPosition.x ?? 16, y: defaultPosition.y };
    setPosition(initial);
    positionRef.current = initial;
  }, [defaultPosition.right, defaultPosition.x, defaultPosition.y, width]);

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      // Capture pointer so move/up always reach this element even when cursor
      // moves over the canvas or other panels.
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const initialX = positionRef.current.x;
      const initialY = positionRef.current.y;

      setIsDragging(true);

      const onMove = (ev: PointerEvent) => {
        const newX = Math.max(0, Math.min(window.innerWidth - width, initialX + ev.clientX - startX));
        const newY = Math.max(0, Math.min(window.innerHeight - 40, initialY + ev.clientY - startY));
        // Update DOM directly — no React state update, no re-render during drag
        if (panelRef.current) {
          panelRef.current.style.left = `${newX}px`;
          panelRef.current.style.top = `${newY}px`;
        }
        positionRef.current = { x: newX, y: newY };
      };

      const onUp = () => {
        setIsDragging(false);
        // Commit final position to React state once so subsequent renders are correct
        setPosition({ ...positionRef.current });
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width],
  );

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed z-40 flex flex-col bg-background/95 backdrop-blur-md rounded-lg border shadow-lg overflow-hidden select-none",
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
