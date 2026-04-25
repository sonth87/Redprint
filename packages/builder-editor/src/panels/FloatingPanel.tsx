import React, { useState, useRef, useCallback } from "react";
import { Minus, Plus, X } from "lucide-react";
import { cn } from "@ui-builder/ui";

// Module-level counter — increments each time a panel is focused/dragged so
// the most-recently-interacted panel always renders on top.
let zCounter = 50;
function bumpZ() { return ++zCounter; }

export interface FloatingPanelProps {
  id?: string;
  title: string;
  children: React.ReactNode;
  defaultPosition: { x?: number; y: number; right?: number };
  width?: number;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  /**
   * When provided, replaces the collapse toggle with a close (X) button.
   * The panel is always fully expanded — no collapse state.
   */
  onClose?: () => void;
}

export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  title,
  children,
  defaultPosition,
  width = 280,
  defaultExpanded = true,
  icon,
  onClose,
}) => {
  // Compute initial position synchronously so the panel renders at the correct
  // location on the very first paint — no flash from x:0 → x:right-anchored.
  const [position, setPosition] = useState(() => {
    const x =
      defaultPosition.right !== undefined
        ? window.innerWidth - defaultPosition.right - width
        : (defaultPosition.x ?? 16);
    return { x, y: defaultPosition.y };
  });
  const positionRef = useRef(position);
  // Direct ref to panel DOM node for imperative position updates during drag
  const panelRef = useRef<HTMLDivElement>(null);

  const [isExpanded, setIsExpanded] = useState(onClose ? true : defaultExpanded);
  const [isDragging, setIsDragging] = useState(false);
  const [zIndex, setZIndex] = useState(() => bumpZ());

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

  const handlePanelPointerDown = useCallback(() => {
    setZIndex(bumpZ());
  }, []);

  return (
    <div
      ref={panelRef}
      onPointerDown={handlePanelPointerDown}
      className={cn(
        "fixed flex flex-col bg-background/95 backdrop-blur-md rounded-lg border shadow-lg overflow-hidden select-none",
        isDragging && "shadow-xl bg-background/80",
      )}
      style={{
        width,
        left: position.x,
        top: position.y,
        zIndex,
      }}
    >
      {/* Header - Drag Handle */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
      >
        <div className="flex items-center gap-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onClose ? (
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              onPointerDown={(e) => e.stopPropagation()}
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-muted rounded text-muted-foreground"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {isExpanded ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex flex-col transition-[max-height,opacity]",
          isExpanded ? "max-h-[72vh] opacity-100 overflow-y-auto" : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        {children}
      </div>
    </div>
  );
};
