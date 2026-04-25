import React, { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  Sparkles,
  Maximize2,
  Info,
} from "lucide-react";
import { ZOOM_LEVELS, TOOLTIP_DELAY_EXTENDED_MS } from "@ui-builder/shared";
import type { EditorTool } from "../types";
import { ToolbarButton } from "./ToolbarButton";

// Figma logo as a small inline SVG button icon
const FigmaIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 28.5C19 23.8056 22.8056 20 27.5 20C32.1944 20 36 23.8056 36 28.5C36 33.1944 32.1944 37 27.5 37C22.8056 37 19 33.1944 19 28.5Z" fill="#1ABCFE"/>
    <path d="M2 46.5C2 41.8056 5.80558 38 10.5 38H19V46.5C19 51.1944 15.1944 55 10.5 55C5.80558 55 2 51.1944 2 46.5Z" fill="#0ACF83"/>
    <path d="M19 2V20H27.5C32.1944 20 36 16.1944 36 11.5C36 6.80558 32.1944 3 27.5 3L19 2Z" fill="#FF7262"/>
    <path d="M2 11.5C2 16.1944 5.80558 20 10.5 20H19V3H10.5C5.80558 3 2 6.80558 2 11.5Z" fill="#F24E1E"/>
    <path d="M2 28.5C2 33.1944 5.80558 37 10.5 37H19V20H10.5C5.80558 20 2 23.8056 2 28.5Z" fill="#A259FF"/>
  </svg>
);

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
  onZoomInFromCenter?: () => void;
  onZoomOutFromCenter?: () => void;
  onGridToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToolChange: (tool: EditorTool) => void;
  onCanvasModeToggle: () => void;
  onFitToScreen?: () => void;
  onAIOpen?: () => void;
  /** Open the Figma import dialog */
  onFigmaOpen?: () => void;
}

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
  onZoomInFromCenter,
  onZoomOutFromCenter,
  onGridToggle,
  onUndo,
  onRedo,
  onToolChange,
  onCanvasModeToggle,
  onFitToScreen,
  onAIOpen,
  onFigmaOpen,
}: EditorToolbarProps) {
  const zoomPct = Math.round(zoom * 100);
  const deviceWidth = DEVICE_VIEWPORT_PRESETS[breakpoint]?.width ?? 1280;
  const { t } = useTranslation();

  const breakpointOptions = [
    { bp: "desktop" as const, label: t("toolbar.desktop"), icon: Monitor, shortcut: "D" },
    { bp: "mobile" as const, label: t("toolbar.mobile"), icon: Smartphone, shortcut: "M" },
  ];

  const zoomIn = useCallback(() => {
    if (onZoomInFromCenter) {
      onZoomInFromCenter();
    } else {
      const next = ZOOM_LEVELS.find((z) => z > zoom);
      if (next) onZoomChange(next);
    }
  }, [zoom, onZoomChange, onZoomInFromCenter]);

  const zoomOut = useCallback(() => {
    if (onZoomOutFromCenter) {
      onZoomOutFromCenter();
    } else {
      const prev = [...ZOOM_LEVELS].reverse().find((z) => z < zoom);
      if (prev) onZoomChange(prev);
    }
  }, [zoom, onZoomChange, onZoomOutFromCenter]);

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_EXTENDED_MS}>
      <div className="bg-background/60 absolute left-1/2 top-4 z-40 flex h-10 -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 shadow-sm backdrop-blur-md" style={{ pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: "1.5px", width: "100%" }}>
          {/* Tool selection */}
          <div className="mr-2 flex items-center gap-0.5 rounded-md p-1">
            <ToolbarButton
              icon={MousePointer2}
              tooltip={`${t("toolbar.select")} (V)`}
              isActive={activeTool === "select"}
              onClick={() => onToolChange("select")}
              aria-label={`${t("toolbar.select")} (V)`}
              compact
            />
            <ToolbarButton
              icon={Hand}
              tooltip={`${t("toolbar.pan")} (H)`}
              isActive={activeTool === "pan"}
              onClick={() => onToolChange("pan")}
              aria-label={`${t("toolbar.pan")} (H)`}
              compact
            />
          </div>

          {/* Undo / Redo */}
          <ToolbarButton
            icon={Undo2}
            tooltip={`${t("toolbar.undo")} (⌘Z)`}
            disabled={!canUndo}
            onClick={onUndo}
            aria-label={`${t("toolbar.undo")} (⌘Z)`}
          />
          <ToolbarButton
            icon={Redo2}
            tooltip={`${t("toolbar.redo")} (⌘⇧Z)`}
            disabled={!canRedo}
            onClick={onRedo}
            aria-label={`${t("toolbar.redo")} (⌘Y)`}
          />

          {/* Separator */}
          <div className="bg-border mx-1 h-6 w-px" />

          {/* Breakpoints — Desktop and Mobile only */}
          {canvasMode !== "dual" && (
            <>
              <div className="flex items-center gap-0.5">
                {breakpointOptions.map(({ bp, label, icon: Icon, shortcut }) => {
                  const isMobile = bp === "mobile";
                  return (
                    <div key={bp} className="relative">
                      <ToolbarButton
                        icon={Icon}
                        tooltip={`${label} ${DEVICE_VIEWPORT_PRESETS[bp].width}px (${shortcut})`}
                        isActive={breakpoint === bp}
                        onClick={() => onBreakpointChange(bp)}
                        aria-label={`${label} breakpoint`}
                        compact
                      />
                      {isMobile && (
                        <TooltipProvider>
                          <ToolbarButton
                            icon={Info}
                            className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-indigo-600 p-0 text-[8px] text-white hover:bg-indigo-700 border border-background shadow-sm"
                            tooltip={
                              <div className="w-[280px] p-1 text-[11px] leading-relaxed">
                                {t("toolbar.mobileSyncNotice")}
                              </div>
                            }
                            compact
                          />
                        </TooltipProvider>
                      )}
                    </div>
                  );
                })}
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
              tooltip={t("toolbar.zoomOut")}
              onClick={zoomOut}
              aria-label={t("toolbar.zoomOut")}
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

          {/* Fit to Screen */}
          {onFitToScreen && (
            <ToolbarButton
              icon={Maximize2}
              tooltip={`${t("toolbar.fitToScreen")} (⇧1)`}
              onClick={onFitToScreen}
              aria-label={t("toolbar.fitToScreen")}
              compact
            />
          )}

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

          {(onAIOpen || onFigmaOpen) && (
            <>
              {/* Separator */}
              <div className="bg-border mx-1 h-6 w-px" />

              {onFigmaOpen && (
                <button
                  onClick={onFigmaOpen}
                  aria-label="Import từ Figma"
                  title="Import từ Figma"
                  className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <FigmaIcon size={14} />
                </button>
              )}

              {onAIOpen && (
                <ToolbarButton
                  icon={Sparkles}
                  tooltip={t("toolbar.aiAssistant")}
                  onClick={onAIOpen}
                  aria-label={t("toolbar.aiAssistant")}
                  compact
                />
              )}
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
});
