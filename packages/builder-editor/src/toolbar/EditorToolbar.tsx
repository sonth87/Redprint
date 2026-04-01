import React, { memo, useCallback } from "react";
import { Button, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, Toggle } from "@ui-builder/ui";
import type { Breakpoint } from "@ui-builder/builder-core";
import { Monitor, Tablet, Smartphone, Undo2, Redo2, ZoomIn, ZoomOut, Grid, MousePointer2, Hand, Magnet } from "lucide-react";
import type { EditorTool } from "../types";

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
      <div className="absolute top-4 right-4 z-40 flex items-center h-10 px-3 gap-1.5 bg-background/95 backdrop-blur-md rounded-full border shadow-sm">

        {/* Tool selection */}
        <div className="flex items-center gap-0.5 mr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={activeTool === "select"}
                onPressedChange={() => onToolChange("select")}
                aria-label="Select tool (V)"
              >
                <MousePointer2 className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Select (V)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={activeTool === "pan"}
                onPressedChange={() => onToolChange("pan")}
                aria-label="Pan tool (H)"
              >
                <Hand className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">Pan (H)</TooltipContent>
          </Tooltip>
        </div>

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canUndo}
              onClick={onUndo}
              aria-label="Undo (⌘Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Undo (⌘Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!canRedo}
              onClick={onRedo}
              aria-label="Redo (⌘Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Redo (⌘⇧Z)</TooltipContent>
        </Tooltip>

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Breakpoints */}
        <div className="flex items-center gap-0.5">
          {BREAKPOINTS.map(({ bp, label, icon: Icon, shortcut }) => (
            <Tooltip key={bp}>
              <TooltipTrigger asChild>
                <Button
                  variant={breakpoint === bp ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => onBreakpointChange(bp)}
                  aria-label={`${label} breakpoint`}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{label} ({shortcut})</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={zoomOut} aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums w-10 text-center">{zoomPct}%</span>
          <Button variant="ghost" size="icon-sm" onClick={zoomIn} aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* Grid toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={showGrid}
              onPressedChange={onGridToggle}
              aria-label="Toggle grid"
            >
              <Grid className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle Grid</TooltipContent>
        </Tooltip>

        {/* Snap toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={snapEnabled}
              onPressedChange={onSnapToggle}
              aria-label="Toggle snap"
            >
              <Magnet className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="bottom">Snap to grid</TooltipContent>
        </Tooltip>

      </div>
    </TooltipProvider>
  );
});
