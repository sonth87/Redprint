import React, { memo, useRef, useLayoutEffect } from "react";
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
  SECTION_TOOLBAR_STICKY_MARGIN,
  SECTION_TOOLBAR_FADE_START_THRESHOLD,
  SECTION_TOOLBAR_FADE_DURATION,
  SECTION_TOOLBAR_OPACITY_TRANSITION,
  SECTION_TOOLBAR_OFFSCREEN_POS,
  SECTION_DEFAULT_MIN_HEIGHT,
} from "../constants";
import { AISectionPopover } from "../ai/ai-section";
import type { AIConfig } from "../ai/types";

export interface SectionToolbarProps {
  node: BuilderNode;
  sectionNodes: BuilderNode[];
  zoom: number;
  panOffset: Point;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to the outermost editor container — used for sticky clamping bounds. */
  canvasContainerRef: React.RefObject<HTMLElement | null>;
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
  /** AI Section Builder — optional. When provided, shows an AI Sparkles button. */
  aiConfig?: AIConfig;
  undo?: () => void;
  currentChildIds?: string[];
  availableComponentTypes?: string[];
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
  canvasContainerRef,
  dispatch,
  newNodeId,
  canvasMode,
  activeBreakpoint,
  desktopFrameWidth = 0,
  mobileFramePos,
  onDelete,
  aiConfig,
  undo,
  currentChildIds = [],
  availableComponentTypes = [],
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
  const showAIButton = !!(aiConfig && undo);
  const effectiveButtonCount = showAIButton ? NUM_TOOLBAR_BUTTONS : NUM_TOOLBAR_BUTTONS - 1;
  const toolbarHeight = effectiveButtonCount * BTN_SIZE + (effectiveButtonCount - 1) * TOOLBAR_BTN_GAP + TOOLBAR_PADDING * 2;

  // STICKY_MARGIN extracted to constants — see SECTION_TOOLBAR_STICKY_MARGIN

  const divRef = useRef<HTMLDivElement>(null);

  /**
   * Compute the toolbar's screen-space position from live DOM measurements.
   *
   * Timing: CanvasRoot applies its CSS transform in a useLayoutEffect, so by
   * the time this sibling useLayoutEffect runs, getBoundingClientRect() already
   * reflects the NEW pan/zoom position — no frame lag.
   *
   * Sticky behaviour: 
   * - When section is fully visible: toolbar centers on section, opacity = 1
   * - When section partially scrolled: toolbar sticks within bounds, opacity fades based on visibility
   * - When section completely out of view: toolbar hidden (opacity = 0) but still positioned
   * - Toolbar follows the section's vertical movement instead of getting stuck
   */
  useLayoutEffect(() => {
    const div = divRef.current;
    const frame = canvasFrameRef.current;
    if (!div) return;

    // ── 1. Section bounds in viewport coordinates ────────────────────────
    let sectionViewportTop: number;
    let sectionViewportHeight: number;

    if (frame) {
      const el = frame.querySelector(`[data-node-id="${node.id}"]`) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        sectionViewportTop = r.top;
        sectionViewportHeight = r.height;
      } else {
        // Fallback: estimate from canvas frame position
        const frameRect = frame.getBoundingClientRect();
        const fallbackTop = sectionNodes
          .slice(0, currentIdx)
          .reduce((sum, s) => sum + ((s.props?.minHeight as number) ?? 0), 0);
        sectionViewportTop = frameRect.top + fallbackTop * zoom;
        sectionViewportHeight = ((node.props?.minHeight as number) ?? SECTION_DEFAULT_MIN_HEIGHT) * zoom;
      }
    } else {
      // No frame yet — place off-screen until next update
      div.style.top = `${SECTION_TOOLBAR_OFFSCREEN_POS}px`;
      div.style.left = `${SECTION_TOOLBAR_OFFSCREEN_POS}px`;
      div.style.opacity = "0";
      return;
    }

    // ── 2. Container bounds ───────────────────────────────────────────────
    const containerEl = canvasContainerRef.current;
    const containerOriginTop = containerEl ? containerEl.getBoundingClientRect().top : 0;
    const containerHeight = containerEl ? containerEl.clientHeight : window.innerHeight;
    const containerBottom = containerOriginTop + containerHeight;

    // ── 3. Compute fade opacity based on visibility ────────────────────────
    //    Toolbar fades out when section has only ~50px visible in viewport
    //    Completely transparent when fully scrolled out
    const sectionBottom = sectionViewportTop + sectionViewportHeight;

    let opacityAlpha = 1;

    // Calculate how much of the section is actually visible within container
    const visibleTop = Math.max(sectionViewportTop, containerOriginTop);
    const visibleBottom = Math.min(sectionBottom, containerBottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);

    // If visible height is less than threshold, start fading
    if (visibleHeight < SECTION_TOOLBAR_FADE_START_THRESHOLD) {
      const fadeProgress = (SECTION_TOOLBAR_FADE_START_THRESHOLD - visibleHeight) / SECTION_TOOLBAR_FADE_DURATION;
      opacityAlpha = Math.max(0, Math.min(1, 1 - fadeProgress));
    }

    // ── 4. Position: try to center on visible part; if section scrolled,
    //                stick within bounds (follow the section's edge) ────────
    const idealCenterTop = sectionViewportTop + sectionViewportHeight / 2;
    let toolbarCenterViewport = idealCenterTop;

    // If section top is above container → stick to container top + margin
    if (sectionViewportTop < containerOriginTop + SECTION_TOOLBAR_STICKY_MARGIN) {
      toolbarCenterViewport = containerOriginTop + SECTION_TOOLBAR_STICKY_MARGIN + toolbarHeight / 2;
    }
    // If section bottom is below container → stick to container bottom - margin
    else if (sectionBottom > containerBottom - SECTION_TOOLBAR_STICKY_MARGIN) {
      toolbarCenterViewport = containerBottom - SECTION_TOOLBAR_STICKY_MARGIN - toolbarHeight / 2;
    }

    const top = toolbarCenterViewport - toolbarHeight / 2 - containerOriginTop;

    // ── 5. Clamp position to container bounds ──────────────────────────────
    const minTop = SECTION_TOOLBAR_STICKY_MARGIN;
    const maxTop = containerHeight - toolbarHeight - SECTION_TOOLBAR_STICKY_MARGIN;
    const clampedTop = Math.max(minTop, Math.min(maxTop, top));

    // ── 6. Horizontal: left of the canvas frame (dual-mode aware) ────────
    const isOnMobile = canvasMode === "dual" && activeBreakpoint === "mobile";
    const mobileXOffset = isOnMobile
      ? (desktopFrameWidth + DUAL_GAP_PX + (mobileFramePos?.x ?? 0)) * zoom
      : 0;
    const left = panOffset.x + mobileXOffset - TOOLBAR_WIDTH - TOOLBAR_LEFT_OFFSET;

    // ── 7. Apply styles with smooth opacity fade ────────────────────────
    div.style.top = `${clampedTop}px`;
    div.style.left = `${left}px`;
    div.style.opacity = String(opacityAlpha);
    div.style.transition = SECTION_TOOLBAR_OPACITY_TRANSITION;
  }, [
    zoom, panOffset, node.id, node.props, sectionNodes, currentIdx, canvasFrameRef,
    canvasContainerRef, canvasMode, activeBreakpoint, desktopFrameWidth, mobileFramePos,
    toolbarHeight,
  ]);

  // Initial style for first render (prevents flash at 0,0 before useLayoutEffect fires)
  const isOnMobile = canvasMode === "dual" && activeBreakpoint === "mobile";
  const mobileXOffset = isOnMobile
    ? (desktopFrameWidth + DUAL_GAP_PX + (mobileFramePos?.x ?? 0)) * zoom
    : 0;
  const fallbackCanvasTop = sectionNodes
    .slice(0, currentIdx)
    .reduce((sum, s) => sum + ((s.props?.minHeight as number) ?? 0), 0);
  const fallbackCanvasHeight = (node.props?.minHeight as number) ?? SECTION_DEFAULT_MIN_HEIGHT;
  const mobileYOffset = isOnMobile ? (mobileFramePos?.y ?? 0) * zoom : 0;

  const toolbarTop =
    fallbackCanvasTop * zoom + panOffset.y + mobileYOffset + (fallbackCanvasHeight * zoom - toolbarHeight) / 2;
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
        ref={divRef}
        className="bg-background/95 border-border shadow-md absolute z-30 flex flex-col items-center rounded-md border backdrop-blur-md"
        style={{
          top: toolbarTop,
          left: toolbarLeft,
          width: TOOLBAR_WIDTH,
          padding: TOOLBAR_PADDING,
          gap: TOOLBAR_BTN_GAP,
          opacity: 1,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* First N-1 buttons (everything except Trash) */}
        {buttons.slice(0, -1).map((btn, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <button
                disabled={btn.disabled}
                onClick={btn.onClick}
                className={[
                  "flex h-7 w-7 items-center justify-center rounded transition-colors",
                  btn.disabled
                    ? "cursor-not-allowed text-muted-foreground/40"
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

        {/* AI Section Builder button */}
        {showAIButton && (
          <AISectionPopover
            sectionNodeId={node.id}
            currentChildIds={currentChildIds}
            availableComponentTypes={availableComponentTypes}
            aiConfig={aiConfig!}
            dispatch={dispatch}
            undo={undo!}
          />
        )}

        {/* Trash (danger) button — always last */}
        {buttons.slice(-1).map((btn, i) => (
          <Tooltip key={`last-${i}`}>
            <TooltipTrigger asChild>
              <button
                disabled={btn.disabled}
                onClick={btn.onClick}
                className="text-destructive hover:bg-destructive/10 flex h-7 w-7 cursor-pointer items-center justify-center rounded transition-colors"
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
