import React, { useState, useRef, useEffect, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import { Layers } from "lucide-react";
import { cn, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import type { PaletteCatalog, PaletteGroup } from "@ui-builder/builder-core";
import { useTranslation } from "react-i18next";

// ── Dynamic Lucide icon helper ─────────────────────────────────────────────

const STORAGE_KEY = "ui-builder:palette-position";

function getLucideIcon(name: string): React.ElementType {
  const pascal = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return (LucideIcons as Record<string, unknown>)[pascal] as React.ElementType ?? LucideIcons.Box;
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface FloatingPaletteProps {
  catalog: PaletteCatalog;
  activeGroupId?: string | null;
  onGroupSelect: (groupId: string) => void;
  locale?: string;
  /** Whether the Layers panel is currently open */
  layersOpen?: boolean;
  /** Called when the Layers button is clicked; receives the button's screen position */
  onLayersToggle?: (pos: { x: number; y: number }) => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export const FloatingPalette: React.FC<FloatingPaletteProps> = ({
  catalog,
  activeGroupId,
  onGroupSelect,
  locale,
  layersOpen = false,
  onLayersToggle,
}) => {
  const { t } = useTranslation();

  // Restore persisted position from localStorage
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as { x: number; y: number };
    } catch {
      // ignore
    }
    return { x: 16, y: 80 };
  });

  const positionRef = useRef(position);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const groups: PaletteGroup[] = catalog?.groups 
    ? [...catalog.groups].sort((a, b) => a.order - b.order)
    : [];

  const getGroupLabel = useCallback(
    (group: PaletteGroup): string => {
      if (locale && group.i18n) {
        const override = (group.i18n as Record<string, string>)[locale];
        if (override) return override;
      }
      return t(`palette.groups.${group.id}`, { defaultValue: group.label });
    },
    [locale, t],
  );

  // Persist position on drag end
  const persistPosition = useCallback((pos: { x: number; y: number }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // ignore storage errors
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const initialX = positionRef.current.x;
      const initialY = positionRef.current.y;

      setIsDragging(true);

      const onMove = (ev: PointerEvent) => {
        const newX = Math.max(0, Math.min(window.innerWidth - 56, initialX + ev.clientX - startX));
        const newY = Math.max(0, Math.min(window.innerHeight - 60, initialY + ev.clientY - startY));
        if (panelRef.current) {
          panelRef.current.style.left = `${newX}px`;
          panelRef.current.style.top = `${newY}px`;
        }
        positionRef.current = { x: newX, y: newY };
      };

      const onUp = () => {
        setIsDragging(false);
        setPosition({ ...positionRef.current });
        persistPosition(positionRef.current);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [persistPosition],
  );

  // Sync ref when position state changes
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={panelRef}
        className={cn(
          "fixed z-50 flex flex-col items-center gap-2 select-none",
          isDragging && "opacity-90",
        )}
        style={{ left: position.x, top: position.y }}
      >
        {/* ── Main strip ── */}
        <div
          className={cn(
            "flex flex-col items-center gap-1 py-2 px-1.5",
            "bg-background/50 backdrop-blur-md border border-border/50 rounded-xl shadow-xl",
            isDragging && "shadow-2xl",
          )}
        >
          {/* Drag handle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="w-6 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors mb-0.5"
                onPointerDown={handlePointerDown}
              >
                <LucideIcons.GripHorizontal className="w-3.5 h-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="bg-black/30 backdrop-blur-lg border-white/20 text-foreground"
            >
              {t("palette.dragToMove", { defaultValue: "Drag to reposition" })}
            </TooltipContent>
          </Tooltip>

          {/* Group icons */}
          {groups.map((group) => {
            const Icon = getLucideIcon(group.icon);
            const label = getGroupLabel(group);
            const isActive = group.id === activeGroupId;

            return (
              <Tooltip key={group.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={label}
                    onClick={() => onGroupSelect(group.id)}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                      "text-muted-foreground hover:text-foreground hover:bg-accent/70",
                      isActive && "bg-primary/10 text-primary ring-1 ring-primary/30",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-white/40 backdrop-blur-md border border-white/20 text-foreground"
                >
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}

        {/* Separator + open-first-group button */}
        {/* <div className="w-5 h-px bg-border/60 my-0.5" />
        <button
          type="button"
          title={t("palette.title", { defaultValue: "Add Elements" })}
          aria-label={t("palette.title", { defaultValue: "Add Elements" })}
          onClick={() => onGroupSelect(groups[0]?.id ?? "")}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button> */}
      </div>

        {/* ── Layers button — separate floating card ── */}
        {onLayersToggle && (
          <div
            className={cn(
              "flex flex-col items-center py-1.5 px-1.5",
              "bg-background/50 backdrop-blur-md border border-border/50 rounded-xl shadow-xl",
              isDragging && "shadow-2xl",
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Layers"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const panelH = Math.min(window.innerHeight * 0.35 + 48, 360);
                    const y = Math.max(8, rect.top + rect.height / 2 - panelH / 2);
                    onLayersToggle({ x: rect.right + 20, y });
                  }}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                    "text-muted-foreground hover:text-foreground hover:bg-accent/70",
                    layersOpen && "bg-primary/10 text-primary ring-1 ring-primary/30",
                  )}
                >
                  <Layers className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-black/30 backdrop-blur-lg border-white/20 text-foreground"
              >
                Layers
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
