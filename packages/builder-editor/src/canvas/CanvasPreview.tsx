/**
 * CanvasPreview — A read-only canvas that renders nodes at a fixed breakpoint.
 *
 * Used in dual-canvas mode to show the secondary device (e.g. mobile) alongside
 * the primary interactive canvas. Click anywhere to activate this canvas and
 * switch the editor to this breakpoint.
 *
 * This component is intentionally minimal and self-contained so it can be
 * removed without any impact on the primary single-canvas mode.
 */
import React, { useRef, useState, useCallback } from "react";
import { NodeRenderer, BreakpointOverrideProvider, useBuilder } from "@ui-builder/builder-react";
import type { Breakpoint } from "@ui-builder/builder-core";
import { DEVICE_VIEWPORT_PRESETS } from "@ui-builder/builder-core";
import { CanvasRoot } from "./CanvasRoot";
import { Monitor, Smartphone } from "lucide-react";

interface CanvasPreviewProps {
  breakpoint: Breakpoint;
  /** Called when user clicks on this canvas to activate it */
  onActivate: () => void;
  /** Whether this canvas is currently the active one */
  isActive: boolean;
}

const DEVICE_ICONS: Record<Breakpoint, typeof Monitor> = {
  desktop: Monitor,
  tablet: Monitor,
  mobile: Smartphone,
};

export function CanvasPreview({ breakpoint, onActivate, isActive }: CanvasPreviewProps) {
  const { state } = useBuilder();
  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.35);
  const [panOffset, setPanOffset] = useState({ x: 16, y: 16 });

  const { width, height } = DEVICE_VIEWPORT_PRESETS[breakpoint] ?? { width: 375, height: 812 };
  const document = state.document;
  const DeviceIcon = DEVICE_ICONS[breakpoint] ?? Smartphone;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isActive) {
        onActivate();
      }
    },
    [isActive, onActivate],
  );

  return (
    <div
      className="relative flex flex-col overflow-hidden bg-muted/20 rounded-lg border-2 transition-colors"
      style={{
        width: 320,
        minWidth: 280,
        borderColor: isActive ? "hsl(var(--primary))" : "hsl(var(--border))",
      }}
      onClick={handleClick}
    >
      {/* Label bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 border-b text-xs text-muted-foreground select-none">
        <DeviceIcon size={12} />
        <span className="font-medium capitalize">{breakpoint}</span>
        <span className="ml-auto">{width}px</span>
        {isActive && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
            Active
          </span>
        )}
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 400 }}>
        <BreakpointOverrideProvider breakpoint={breakpoint}>
          <CanvasRoot
            canvasConfig={document.canvasConfig}
            zoom={zoom}
            panOffset={panOffset}
            onZoomChange={setZoom}
            onPanOffsetChange={setPanOffset}
            activeTool="pan"
          >
            <div
              ref={canvasFrameRef}
              style={{
                width,
                minHeight: height,
                backgroundColor: document.canvasConfig.backgroundColor ?? "#ffffff",
                position: "relative",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                borderRadius: 4,
                pointerEvents: isActive ? undefined : "none",
              }}
            >
              <NodeRenderer nodeId={document.rootNodeId} mode="editor" />
            </div>
          </CanvasRoot>
        </BreakpointOverrideProvider>
      </div>

      {/* Click-to-activate overlay when not active */}
      {!isActive && (
        <div
          className="absolute inset-0 cursor-pointer z-10"
          style={{ background: "transparent" }}
          title={`Click to switch to ${breakpoint} editing`}
        />
      )}
    </div>
  );
}
