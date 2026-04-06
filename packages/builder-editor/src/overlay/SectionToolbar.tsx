import React, { memo } from "react";
import {
  Settings,
  Info,
  Bookmark,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Eye,
  Copy,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@ui-builder/ui";
import type { BuilderNode, CanvasMode } from "@ui-builder/builder-core";
import { TOOLTIP_DELAY_MS, type Point } from "@ui-builder/shared";
import {
  BTN_SIZE,
  TOOLBAR_WIDTH,
  ICON_SIZE,
  NUM_TOOLBAR_BUTTONS,
  TOOLBAR_BTN_GAP,
  TOOLBAR_PADDING,
  DUAL_GAP_PX,
  TOOLBAR_LEFT_OFFSET,
} from "../constants";

export interface SectionToolbarProps {
  node: BuilderNode;
  sectionNodes: BuilderNode[];
  zoom: number;
  panOffset: Point;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: string; payload: unknown; groupId?: string; description?: string }) => void;
  newNodeId: () => string;
  /** Dual-mode positioning extras */
  canvasMode?: CanvasMode;
  activeBreakpoint?: string;
  desktopFrameWidth?: number;
  mobileFramePos?: Point;
  /**
   * Optional delete override — called instead of dispatching REMOVE_NODE directly.
   * Allows BuilderEditor to show a confirmation dialog before deletion.
   */
  onDelete?: (nodeId: string) => void;
}

/**
 * Vertical icon toolbar anchored to the left of the selected section.
 * Positioned in screen-space (outside CanvasRoot transform), like ContextualToolbar.
 * Screen position: canvasX * zoom + panOffset.x
 */
export const SectionToolbar = memo(function SectionToolbar({
  node,
  sectionNodes,
  zoom,
  panOffset,
  canvasFrameRef,
  dispatch,
  newNodeId,
  canvasMode,
  activeBreakpoint,
  desktopFrameWidth = 0,
  mobileFramePos,
  onDelete,
}: SectionToolbarProps) {
  const currentIdx = sectionNodes.findIndex((s) => s.id === node.id);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === sectionNodes.length - 1;
  const isMobileOrTablet = activeBreakpoint && activeBreakpoint !== "desktop";
  const isHidden = isMobileOrTablet
    ? Boolean(node.responsiveHidden?.[activeBreakpoint as "mobile" | "tablet"])
    : Boolean(node.hidden);

  const handleMoveUp = () => {
    if (isFirst) return;
    dispatch({
      type: "REORDER_NODE",
      payload: { nodeId: node.id, insertIndex: currentIdx - 1 },
      description: "Move section up",
    });
  };

  const handleMoveDown = () => {
    if (isLast) return;
    dispatch({
      type: "REORDER_NODE",
      payload: { nodeId: node.id, insertIndex: currentIdx + 1 },
      description: "Move section down",
    });
  };

  const handleToggleHidden = () => {
    const isMobileOrTablet = activeBreakpoint && activeBreakpoint !== "desktop";
    if (isMobileOrTablet) {
      // Per-breakpoint hide — does not affect desktop
      dispatch({
        type: "TOGGLE_RESPONSIVE_HIDDEN",
        payload: { nodeId: node.id, breakpoint: activeBreakpoint, hidden: !isHidden },
        description: isHidden ? "Show section on mobile" : "Hide section on mobile",
      });
    } else {
      // Global hide (desktop = base)
      dispatch({
        type: isHidden ? "SHOW_NODE" : "HIDE_NODE",
        payload: { nodeId: node.id },
        description: isHidden ? "Show section" : "Hide section",
      });
    }
  };

  const handleClone = () => {
    dispatch({
      type: "DUPLICATE_NODE",
      payload: { nodeId: node.id, offset: { x: 0, y: 0 }, newNodeId: newNodeId() },
      description: "Clone section",
    });
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(node.id);
    } else {
      dispatch({
        type: "REMOVE_NODE",
        payload: { nodeId: node.id },
        description: "Delete section",
      });
    }
  };

  // ── Screen-space positioning ────────────────────────────────────────────
  const toolbarHeight = NUM_TOOLBAR_BUTTONS * BTN_SIZE + (NUM_TOOLBAR_BUTTONS - 1) * TOOLBAR_BTN_GAP + TOOLBAR_PADDING * 2;

  // Use actual DOM position of the section element (accounts for content-driven height).
  // Fallback to cumulative minHeight estimate if the DOM isn't available yet.
  let canvasTop = sectionNodes
    .slice(0, currentIdx)
    .reduce((sum, s) => sum + ((s.props?.minHeight as number) ?? 0), 0);
  let canvasHeight = (node.props?.minHeight as number) ?? 400;

  const frame = canvasFrameRef.current;
  if (frame) {
    const frameRect = frame.getBoundingClientRect();
    const el = frame.querySelector(`[data-node-id="${node.id}"]`) as HTMLElement | null;
    if (el) {
      const r = el.getBoundingClientRect();
      // Convert viewport coords → canvas-space (same as SectionOverlay / useSelectionRect)
      canvasTop = (r.top - frameRect.top) / zoom;
      canvasHeight = r.height / zoom;
    }
  }

  const isOnMobile = canvasMode === "dual" && activeBreakpoint === "mobile";
  const mobileXOffset = isOnMobile
    ? (desktopFrameWidth + DUAL_GAP_PX + (mobileFramePos?.x ?? 0)) * zoom
    : 0;
  const mobileYOffset = isOnMobile ? (mobileFramePos?.y ?? 0) * zoom : 0;

  const toolbarTop =
    canvasTop * zoom + panOffset.y + mobileYOffset + (canvasHeight * zoom - toolbarHeight) / 2;
  const toolbarLeft = panOffset.x + mobileXOffset - TOOLBAR_WIDTH - TOOLBAR_LEFT_OFFSET;

  // ── Button definitions ─────────────────────────────────────────────────
  const buttons: Array<{
    icon: React.ReactNode;
    tooltip: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
  }> = [
    { icon: <Settings size={ICON_SIZE} />, tooltip: "Cài đặt section", onClick: () => {} },
    {
      icon: <Info size={ICON_SIZE} />,
      tooltip: `Section: ${node.name ?? node.id} · ${sectionNodes.length} sections`,
      onClick: () => {},
    },
    { icon: <Bookmark size={ICON_SIZE} />, tooltip: "Lưu làm preset", onClick: () => {} },
    {
      icon: <ArrowUp size={ICON_SIZE} />,
      tooltip: "Di chuyển lên trên",
      onClick: handleMoveUp,
      disabled: isFirst,
    },
    {
      icon: <ArrowDown size={ICON_SIZE} />,
      tooltip: "Di chuyển xuống dưới",
      onClick: handleMoveDown,
      disabled: isLast,
    },
    {
      icon: isHidden ? <Eye size={ICON_SIZE} /> : <EyeOff size={ICON_SIZE} />,
      tooltip: isHidden ? "Hiện section" : "Ẩn section",
      onClick: handleToggleHidden,
    },
    { icon: <Copy size={ICON_SIZE} />, tooltip: "Clone section", onClick: handleClone },
    {
      icon: <Trash2 size={ICON_SIZE} />,
      tooltip: "Xóa section",
      onClick: handleDelete,
      danger: true,
    },
  ];

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <div
        className="bg-background/95 border-border shadow-md absolute z-30 flex flex-col items-center rounded-md border backdrop-blur-md"
        style={{
          top: toolbarTop,
          left: toolbarLeft,
          width: TOOLBAR_WIDTH,
          padding: TOOLBAR_PADDING,
          gap: TOOLBAR_BTN_GAP,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {buttons.map((btn, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <button
                disabled={btn.disabled}
                onClick={btn.onClick}
                className={[
                  "flex h-7 w-7 items-center justify-center rounded transition-colors",
                  btn.disabled
                    ? "cursor-not-allowed text-muted-foreground/40"
                    : btn.danger
                      ? "text-destructive hover:bg-destructive/10 cursor-pointer"
                      : "text-foreground hover:bg-accent cursor-pointer",
                ].join(" ")}
              >
                {btn.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {btn.tooltip}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
});
