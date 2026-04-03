import React, { memo, useCallback } from "react";
import { TooltipProvider } from "@ui-builder/ui";
import {
  type Breakpoint,
  type CanvasMode,
  DEVICE_VIEWPORT_PRESETS,
} from "@ui-builder/builder-core";
import {
  Monitor,
  Smartphone,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid,
  MousePointer2,
  Hand,
  Columns2,
} from "lucide-react";
import type { EditorTool } from "../types";
import { ToolbarButton } from "./ToolbarButton";

export interface EditorToolbarProps {
  breakpoint: Breakpoint;
  zoom: number;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeTool: EditorTool;
  canvasMode: CanvasMode;
  onBreakpointChange: (bp: Breakpoint) => void;
  onZoomChange: (zoom: number) => void;
  onGridToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToolChange: (tool: EditorTool) => void;
  onCanvasModeToggle: () => void;
}

// Only Desktop + Mobile — tablet is mapped to one of these based on content
const BREAKPOINTS: { bp: Breakpoint; label: string; icon: typeof Monitor; shortcut: string }[] = [
  { bp: "desktop", label: "Desktop", icon: Monitor, shortcut: "D" },
  { bp: "mobile", label: "Mobile", icon: Smartphone, shortcut: "M" },
];

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

/**
 * EditorToolbar — top toolbar with breakpoints, zoom, tool selection, undo/redo, grid/dual toggle.
 */
export const EditorToolbar = memo(function EditorToolbar({
  breakpoint,
  zoom,
  showGrid,
  canUndo,
  canRedo,
  activeTool,
  canvasMode,
  onBreakpointChange,
  onZoomChange,
  onGridToggle,
  onUndo,
  onRedo,
  onToolChange,
  onCanvasModeToggle,
}: EditorToolbarProps) {
  const zoomPct = Math.round(zoom * 100);
  const deviceWidth = DEVICE_VIEWPORT_PRESETS[breakpoint]?.width ?? 1280;

  const zoomIn = useCallback(() => {
    const next = ZOOM_LEVELS.find((z) => z > zoom);
    if (next) onZoomChange(next);
  }, [zoom, onZoomChange]);

  const zoomOut = useCallback(() => {
    const prev = [...ZOOM_LEVELS].reverse().find((z) => z < zoom);
    if (prev) onZoomChange(prev);
  }, [zoom, onZoomChange]);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="bg-background/60 absolute left-1/2 top-4 z-40 flex h-10 -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 shadow-sm backdrop-blur-md">
        {/* Tool selection */}
        <div className="mr-2 flex items-center gap-0.5 rounded-md p-1">
          <ToolbarButton
            icon={MousePointer2}
            tooltip="Select (V)"
            isActive={activeTool === "select"}
            onClick={() => onToolChange("select")}
            aria-label="Select tool (V)"
            compact
          />
          <ToolbarButton
            icon={Hand}
            tooltip="Pan (H)"
            isActive={activeTool === "pan"}
            onClick={() => onToolChange("pan")}
            aria-label="Pan tool (H)"
            compact
          />
        </div>

        {/* Undo / Redo */}
        <ToolbarButton
          icon={Undo2}
          tooltip="Undo (⌘Z)"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label="Undo (⌘Z)"
        />
        <ToolbarButton
          icon={Redo2}
          tooltip="Redo (⌘⇧Z)"
          disabled={!canRedo}
          onClick={onRedo}
          aria-label="Redo (⌘Y)"
        />

        {/* Separator */}
        <div className="bg-border mx-1 h-6 w-px" />

        {/* Breakpoints — Desktop and Mobile only */}
        {canvasMode !== "dual" && (
          <>
            <div className="flex items-center gap-0.5">
              {BREAKPOINTS.map(({ bp, label, icon: Icon, shortcut }) => (
                <ToolbarButton
                  key={bp}
                  icon={Icon}
                  tooltip={`${label} ${DEVICE_VIEWPORT_PRESETS[bp].width}px (${shortcut})`}
                  isActive={breakpoint === bp}
                  onClick={() => onBreakpointChange(bp)}
                  aria-label={`${label} breakpoint`}
                  compact
                />
              ))}
            </div>

            {/* Current device width indicator */}
            <span className="text-muted-foreground select-none px-1 text-[10px] tabular-nums">
              {deviceWidth}px
            </span>

            {/* Separator */}
            <div className="bg-border mx-1 h-6 w-px" />
          </>
        )}

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={ZoomOut}
            tooltip="Zoom out"
            onClick={zoomOut}
            aria-label="Zoom out"
            compact
          />
          <span className="w-10 text-center text-xs tabular-nums">{zoomPct}%</span>
          <ToolbarButton
            icon={ZoomIn}
            tooltip="Zoom in"
            onClick={zoomIn}
            aria-label="Zoom in"
            compact
          />
        </div>

        {/* Separator */}
        <div className="bg-border mx-1 h-6 w-px" />

        {/* Grid toggle */}
        <ToolbarButton
          icon={Grid}
          tooltip="Toggle Grid"
          isActive={showGrid}
          onClick={onGridToggle}
          aria-label="Toggle grid"
          compact
        />

        {/* Dual canvas toggle */}
        <ToolbarButton
          icon={Columns2}
          tooltip={
            canvasMode === "dual"
              ? "Single canvas (current: side-by-side)"
              : "Dual canvas — Desktop + Mobile side-by-side"
          }
          isActive={canvasMode === "dual"}
          onClick={onCanvasModeToggle}
          aria-label="Toggle dual canvas mode"
          compact
        />
      </div>
    </TooltipProvider>
  );
});
