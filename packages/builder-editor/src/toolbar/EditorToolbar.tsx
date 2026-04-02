import React, { memo, useCallback } from "react";
import { TooltipProvider } from "@ui-builder/ui";
import type { Breakpoint } from "@ui-builder/builder-core";
import { Monitor, Tablet, Smartphone, Undo2, Redo2, ZoomIn, ZoomOut, Grid, MousePointer2, Hand, Magnet } from "lucide-react";
import type { EditorTool } from "../types";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarToggle } from "./ToolbarToggle";

export interface EditorToolbarProps {
  breakpoint: Breakpoint;
  zoom: number;
  showGrid: boolean;
  snapEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeTool: EditorTool;
  onBreakpointChange: (bp: Breakpoint) => void;
  onZoomChange: (zoom: number) => void;
  onGridToggle: () => void;
  onSnapToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToolChange: (tool: EditorTool) => void;
}

const BREAKPOINTS = [
  { bp: "desktop" as Breakpoint, label: "Desktop", icon: Monitor, shortcut: "D" },
  { bp: "tablet" as Breakpoint, label: "Tablet", icon: Tablet, shortcut: "T" },
  { bp: "mobile" as Breakpoint, label: "Mobile", icon: Smartphone, shortcut: "M" },
];

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

/**
 * EditorToolbar — top toolbar with breakpoints, zoom, tool selection, undo/redo, grid toggle.
 */
export const EditorToolbar = memo(function EditorToolbar({
  breakpoint,
  zoom,
  showGrid,
  snapEnabled,
  canUndo,
  canRedo,
  activeTool,
  onBreakpointChange,
  onZoomChange,
  onGridToggle,
  onSnapToggle,
  onUndo,
  onRedo,
  onToolChange,
}: EditorToolbarProps) {
  const zoomPct = Math.round(zoom * 100);

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
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center h-10 px-3 gap-1.5 bg-background/95 backdrop-blur-md rounded-full border shadow-sm">

        {/* Tool selection */}
        <div className="flex items-center gap-0.5 mr-2 bg-muted rounded-md p-1">
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
        <div className="h-6 w-px bg-border mx-1" />

        {/* Breakpoints */}
        <div className="flex items-center gap-0.5">
          {BREAKPOINTS.map(({ bp, label, icon: Icon, shortcut }) => (
            <ToolbarButton
              key={bp}
              icon={Icon}
              tooltip={`${label} (${shortcut})`}
              isActive={breakpoint === bp}
              onClick={() => onBreakpointChange(bp)}
              aria-label={`${label} breakpoint`}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <ToolbarButton 
            icon={ZoomOut}
            tooltip="Zoom out"
            onClick={zoomOut}
            aria-label="Zoom out"
          />
          <span className="text-xs tabular-nums w-10 text-center">{zoomPct}%</span>
          <ToolbarButton 
            icon={ZoomIn}
            tooltip="Zoom in"
            onClick={zoomIn}
            aria-label="Zoom in"
          />
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Grid toggle */}
        <ToolbarToggle
          icon={Grid}
          tooltip="Toggle Grid"
          pressed={showGrid}
          onPressedChange={onGridToggle}
          aria-label="Toggle grid"
        />

        {/* Snap toggle */}
        <ToolbarToggle
          icon={Magnet}
          tooltip="Snap to grid"
          pressed={snapEnabled}
          onPressedChange={onSnapToggle}
          aria-label="Toggle snap"
        />

      </div>
    </TooltipProvider>
  );
});
