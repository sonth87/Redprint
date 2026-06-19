import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  memo,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { Plus, UnfoldVertical, LayoutTemplate, Sparkles, PlusSquare } from "lucide-react";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { Point } from "@ui-builder/shared";
import { SECTION_HOVER_ZONE, SECTION_OVERLAY_TRANSITION_FAST } from "../constants";
import { AISectionPopover } from "../ai/ai-section/AISectionPopover";
import type { AIConfig } from "../ai/types";
import { useTranslation } from "react-i18next";

interface SectionBoundary {
  nodeId: string;
  order: number;
  /** Top of the section in canvas-space */
  top: number;
  /** Bottom of the section in canvas-space */
  bottom: number;
  /** Current rendered height in canvas-space */
  height: number;
}

export interface SectionOverlayProps {
  /** All nodes in the document */
  nodes: Record<string, BuilderNode>;
  /** Root node id */
  rootNodeId: string;
  zoom: number;
  panOffset: Point;
  /** Ref to the canvas frame element */
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /** Called when user wants to add a new section after the given order */
  onAddSection: (afterOrder: number) => void;
  /** Called when user starts resizing a section */
  onResizeStart: (
    nodeId: string,
    clientY: number,
    currentHeight: number,
    gestureGroupId: string,
    minAllowedHeight: number,
  ) => void;
  /** Called to select a section */
  onSelect?: (nodeId: string) => void;
  /** Whether a section resize is in progress (suppresses UI jitter) */
  isResizing: boolean;
  selectedNodeIds?: string[];
  onOpenPaletteGroup?: (groupId: string, sectionId?: string) => void;
  /**
   * Called when user clicks the "Designed Section" button on an empty section.
   * Provides the section node ID so the palette can track the intended target,
   * independent of selection state.
   */
  onDSButtonClick?: (sectionId: string) => void;
  /** True while a Designed Section item is being dragged from the palette. Enables drop-zone highlighting. */
  isDSDragging?: boolean;
  aiConfig?: AIConfig;
  dispatch?: (action: {
    type: string;
    payload: unknown;
    groupId?: string;
    description?: string;
  }) => unknown;
  undo?: () => void;
  availableComponentTypes?: string[];
}

/**
 * SectionOverlay — renders "Thêm mới Section" + resize handle at the bottom
 * boundary of each Section node that is a direct child of root.
 *
 * Positioned absolutely inside the canvas transform space (same as SelectionOverlay).
 */
export const SectionOverlay = memo(function SectionOverlay({
  nodes,
  rootNodeId,
  zoom,
  canvasFrameRef,
  onAddSection,
  onResizeStart,
  onSelect,
  isResizing,
  onOpenPaletteGroup,
  onDSButtonClick,
  isDSDragging,
  aiConfig,
  dispatch,
  undo,
  availableComponentTypes,
}: SectionOverlayProps) {
  const { t } = useTranslation();
  const [boundaries, setBoundaries] = useState<SectionBoundary[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  // Tracks which empty section is being hovered while dragging a Designed Section
  const [dsDragTarget, setDsDragTarget] = useState<string | null>(null);
  const dsDragCounterRef = useRef<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);

  // Derive section nodes: direct children of root with type "Section", sorted by order
  const sectionNodes = useMemo(
    () =>
      Object.values(nodes)
        .filter((n) => n.parentId === rootNodeId && n.type === "Section")
        .sort((a, b) => a.order - b.order),
    [nodes, rootNodeId],
  );

  // Measure DOM rects and convert to canvas-space coordinates
  const measureBoundaries = useCallback(() => {
    const frame = canvasFrameRef.current;
    if (!frame) return;
    const frameRect = frame.getBoundingClientRect();

    const next: SectionBoundary[] = [];
    for (const sec of sectionNodes) {
      const el = frame.querySelector(`[data-node-id="${sec.id}"]`) as HTMLElement | null;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      // Convert DOM viewport coords → canvas-space (account for zoom + panOffset)
      const top = (r.top - frameRect.top) / zoom;
      const height = r.height / zoom;
      next.push({
        nodeId: sec.id,
        order: sec.order,
        top,
        bottom: top + height,
        height,
      });
    }
    setBoundaries(next);
  }, [canvasFrameRef, sectionNodes, zoom]);

  // Re-measure after DOM commits (synchronous, avoids flicker)
  useLayoutEffect(() => {
    measureBoundaries();
  }, [canvasFrameRef, measureBoundaries]);

  // ResizeObserver re-measures whenever the canvas frame changes size.
  // This is the reliable fallback for cases where the initial useLayoutEffect
  // fires before the browser has fully settled layout (e.g. after switching
  // between single/dual canvas modes in production builds where StrictMode
  // doesn't double-invoke effects to self-heal the timing).
  useEffect(() => {
    const frame = canvasFrameRef.current;
    if (!frame) return;
    const ro = new ResizeObserver(() => measureBoundaries());
    ro.observe(frame);
    return () => ro.disconnect();
  }, [canvasFrameRef, measureBoundaries]);

  useEffect(() => {
    if (!isResizing) return;
    const loop = () => {
      measureBoundaries();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isResizing, measureBoundaries]);

  if (boundaries.length === 0) return null;

  return (
    <>
      {boundaries.map((b) => {
        const isHov = hovered === b.nodeId;
        const sectionChildren = Object.values(nodes).filter((n) => n.parentId === b.nodeId);
        const isEmpty = sectionChildren.length === 0;

        const isDSDropTarget = dsDragTarget === b.nodeId;
        const clearHoverUnlessSectionPortal = (event: React.MouseEvent<HTMLElement>) => {
          const nextTarget = event.relatedTarget as HTMLElement | null;
          if (nextTarget?.closest(`[data-section-overlay-portal="${b.nodeId}"]`)) {
            return;
          }
          setHovered(null);
        };
        const startResize = (clientY: number) => {
          const id = b.nodeId + "-resize-" + Date.now();
          const sectionEl = canvasFrameRef.current?.querySelector(
            `[data-node-id="${b.nodeId}"]`,
          ) as HTMLElement | null;
          let computedMinHeight = 100;
          if (sectionEl) {
            const sectionRect = sectionEl.getBoundingClientRect();
            const children = Array.from(
              sectionEl.querySelectorAll("[data-node-id]"),
            ) as HTMLElement[];
            let maxChildBottom = 100;
            for (const child of children) {
              const childRect = child.getBoundingClientRect();
              // Track the full extent: from top of section to bottom of child.
              // childRect.top may be above sectionRect.top (negative local top) —
              // in that case localBottom still reflects the child's local bottom
              // relative to the section origin, which is what we care about.
              const localBottom = (childRect.bottom - sectionRect.top) / zoom;
              if (localBottom > maxChildBottom) {
                maxChildBottom = localBottom;
              }
              // Also ensure section is tall enough to include children above origin
              const localTop = (childRect.top - sectionRect.top) / zoom;
              if (localTop < 0) {
                // Child overflows above; extend minHeight so a future resize can't
                // shrink the section to less than childHeight worth of bottom room
                const childHeightLocal = childRect.height / zoom;
                const bottomIfTopClamped = childHeightLocal;
                if (bottomIfTopClamped > maxChildBottom) {
                  maxChildBottom = bottomIfTopClamped;
                }
              }
            }
            computedMinHeight = Math.max(100, maxChildBottom);
          }
          // Pass canvas-space height (NOT multiplied by zoom)
          onResizeStart(b.nodeId, clientY, b.height, id, computedMinHeight);
        };

        return (
          <div key={b.nodeId} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {/* ── DS Drag Drop Zone (highlight only — drop bubbles to canvas handler) ── */}
            {isEmpty && (
              <div
                // data-node-id lets canvas's handleDrop identify this as the section node
                data-node-id={b.nodeId}
                style={{
                  position: "absolute",
                  top: b.top,
                  left: 0,
                  width: "100%",
                  height: b.height,
                  pointerEvents: isDSDragging ? "auto" : "none",
                  zIndex: 52,
                  background: isDSDropTarget ? "rgba(99,102,241,0.08)" : "transparent",
                  border: isDSDropTarget
                    ? `2px dashed rgba(99,102,241,0.6)`
                    : "2px dashed transparent",
                  borderRadius: 4,
                  transition: "background 0.15s, border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onDragEnter={(e) => {
                  if (!e.dataTransfer.types.includes("application/builder-designed-section"))
                    return;
                  e.preventDefault();
                  dsDragCounterRef.current[b.nodeId] =
                    (dsDragCounterRef.current[b.nodeId] ?? 0) + 1;
                  setDsDragTarget(b.nodeId);
                }}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes("application/builder-designed-section"))
                    return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDragLeave={(e) => {
                  if (!e.dataTransfer.types.includes("application/builder-designed-section"))
                    return;
                  dsDragCounterRef.current[b.nodeId] =
                    (dsDragCounterRef.current[b.nodeId] ?? 1) - 1;
                  if ((dsDragCounterRef.current[b.nodeId] ?? 0) <= 0) {
                    dsDragCounterRef.current[b.nodeId] = 0;
                    setDsDragTarget(null);
                  }
                }}
                onDrop={() => {
                  // Clear highlight only — do NOT preventDefault/stopPropagation.
                  // The drop bubbles to the canvas container's onDrop handler,
                  // which uses e.target.closest("[data-node-id]") to find the section
                  // (this div carries data-node-id={b.nodeId} for that purpose).
                  dsDragCounterRef.current[b.nodeId] = 0;
                  setDsDragTarget(null);
                }}
              />
            )}

            {/* ── Empty State UI ── */}
            {isEmpty && (
              <>
                {/* Main Section Hover Zone (only active when empty to avoid blocking components) */}
                <div
                  style={{
                    position: "absolute",
                    top: b.top,
                    left: 0,
                    width: "100%",
                    height: b.height,
                    pointerEvents: "auto",
                    zIndex: 48,
                  }}
                  onMouseEnter={() => setHovered(b.nodeId)}
                  onMouseLeave={clearHoverUnlessSectionPortal}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      onSelect?.(b.nodeId);
                    }
                  }}
                />

                {(() => {
                  const frame = canvasFrameRef.current;
                  const frameRect = frame?.getBoundingClientRect();
                  if (!frame || !frameRect || typeof document === "undefined") return null;

                  const portalRoot =
                    frame.closest<HTMLElement>("[data-canvas-root]") ?? document.body;
                  const centerX = frameRect.left + frameRect.width / 2;
                  const centerY = frameRect.top + (b.top + b.height / 2) * zoom;
                  const showAI = Boolean(aiConfig && dispatch && undo);
                  const cardCount = showAI ? 3 : 2;
                  const naturalGap = 20;
                  const naturalCardWidth = 110;
                  const naturalGroupWidth =
                    cardCount * naturalCardWidth + (cardCount - 1) * naturalGap;
                  const naturalGroupHeight = 14 + naturalGap + 110;
                  const availableWidth = Math.max(0, frameRect.width - 24);
                  const availableHeight = Math.max(0, b.height * zoom - 24);
                  const visualScale = Math.min(
                    1,
                    availableWidth / naturalGroupWidth,
                    availableHeight / naturalGroupHeight,
                  );
                  const ui = (value: number) => Math.max(1, value * visualScale);
                  const cardBaseStyle: React.CSSProperties = {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: ui(10),
                    width: ui(110),
                    height: ui(110),
                    background: "#ffffff",
                    border: `${ui(1)}px solid #e2e8f0`,
                    borderRadius: ui(12),
                    cursor: "pointer",
                    transition: "transform 0.2s, border-color 0.2s, box-shadow 0.2s",
                    boxShadow: `0 ${ui(4)}px ${ui(12)}px rgba(0,0,0,0.03)`,
                    padding: ui(4),
                  };

                  const iconBaseStyle: React.CSSProperties = {
                    width: ui(44),
                    height: ui(44),
                    borderRadius: ui(10),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  };

                  const labelStyle: React.CSSProperties = {
                    fontSize: ui(12),
                    color: "#475569",
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.2,
                  };

                  const setCardHover = (
                    element: HTMLElement,
                    color: string,
                    shadowColor: string,
                  ) => {
                    element.style.borderColor = color;
                    element.style.transform = `translateY(${-ui(4)}px)`;
                    element.style.boxShadow = `0 ${ui(10)}px ${ui(25)}px ${-ui(5)}px ${shadowColor}, 0 ${ui(8)}px ${ui(10)}px ${-ui(6)}px ${shadowColor}`;
                  };

                  const resetCardHover = (element: HTMLElement) => {
                    element.style.borderColor = "#e2e8f0";
                    element.style.transform = "translateY(0)";
                    element.style.boxShadow = `0 ${ui(4)}px ${ui(12)}px rgba(0,0,0,0.03)`;
                  };

                  return createPortal(
                    <div
                      style={{
                        position: "fixed",
                        left: centerX,
                        top: centerY,
                        transform: "translate(-50%, -50%)",
                        zIndex: 120,
                        pointerEvents: "auto",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: ui(20),
                      }}
                      data-section-overlay-portal={b.nodeId}
                      onMouseEnter={() => setHovered(b.nodeId)}
                      onMouseLeave={() => setHovered(null)}
                      onPointerDown={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <p
                        style={{
                          fontSize: ui(14),
                          fontWeight: 600,
                          color: "#94a3b8",
                          margin: 0,
                          letterSpacing: 0,
                          textTransform: "uppercase" as const,
                        }}
                      >
                        {t("section.startingPoint")}
                      </p>
                      <div style={{ display: "flex", gap: ui(20) }}>
                        <button
                          onClick={() => onDSButtonClick?.(b.nodeId)}
                          style={cardBaseStyle}
                          onMouseEnter={(e) =>
                            setCardHover(e.currentTarget, "#6366f1", "rgba(99, 102, 241, 0.1)")
                          }
                          onMouseLeave={(e) => resetCardHover(e.currentTarget)}
                        >
                          <div
                            style={{
                              ...iconBaseStyle,
                              background: "#f8faff",
                              color: "#6366f1",
                            }}
                          >
                            <LayoutTemplate size={ui(24)} strokeWidth={1.5} />
                          </div>
                          <span style={labelStyle}>{t("section.designedSection")}</span>
                        </button>

                        {aiConfig && dispatch && undo ? (
                          <AISectionPopover
                            sectionNodeId={b.nodeId}
                            currentChildIds={[]}
                            availableComponentTypes={availableComponentTypes ?? []}
                            aiConfig={aiConfig}
                            dispatch={dispatch}
                            undo={undo}
                            trigger={
                              <button
                                style={cardBaseStyle}
                                onMouseEnter={(e) =>
                                  setCardHover(
                                    e.currentTarget,
                                    "#8b5cf6",
                                    "rgba(139, 92, 246, 0.1)",
                                  )
                                }
                                onMouseLeave={(e) => resetCardHover(e.currentTarget)}
                              >
                                <div
                                  style={{
                                    ...iconBaseStyle,
                                    background: "#fdfaff",
                                    color: "#8b5cf6",
                                  }}
                                >
                                  <Sparkles size={ui(24)} strokeWidth={1.5} />
                                </div>
                                <span style={labelStyle}>{t("section.aiGenerator")}</span>
                              </button>
                            }
                          />
                        ) : null}

                        <button
                          onClick={() => onOpenPaletteGroup?.("text", b.nodeId)}
                          style={cardBaseStyle}
                          onMouseEnter={(e) =>
                            setCardHover(e.currentTarget, "#64748b", "rgba(100, 116, 139, 0.1)")
                          }
                          onMouseLeave={(e) => resetCardHover(e.currentTarget)}
                        >
                          <div
                            style={{
                              ...iconBaseStyle,
                              background: "#f8fafc",
                              color: "#64748b",
                            }}
                          >
                            <PlusSquare size={ui(24)} strokeWidth={1.5} />
                          </div>
                          <span style={labelStyle}>{t("section.addElements")}</span>
                        </button>
                      </div>
                    </div>,
                    portalRoot,
                  );
                })()}
              </>
            )}

            {/* ── Section Gutter Handles ── */}
            {isHov && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: -250,
                    width: "calc(100% + 500px)",
                    top: b.top,
                    borderTop: `${Math.max(1, 1.5 / zoom)}px dashed hsl(221.2 83.2% 53.3%)`,
                    opacity: 0.7,
                    pointerEvents: "none",
                    zIndex: 55,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: -250,
                    width: "calc(100% + 500px)",
                    top: b.bottom,
                    borderTop: `${Math.max(1, 1.5 / zoom)}px dashed hsl(221.2 83.2% 53.3%)`,
                    opacity: 0.7,
                    pointerEvents: "none",
                    zIndex: 55,
                  }}
                />
              </>
            )}

            {/* Left Gutter Handle */}
            <div
              style={{
                position: "absolute",
                left: -250,
                width: 250,
                top: b.top,
                height: b.height,
                pointerEvents: "auto",
                cursor: "pointer",
                zIndex: 49,
                userSelect: "none",
              }}
              onMouseEnter={() => setHovered(b.nodeId)}
              onMouseLeave={clearHoverUnlessSectionPortal}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
              }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                // Prevent selection/focus
                e.preventDefault();
              }}
              onClick={(e) => {
                if (e.button !== 0) return;
                if (e.metaKey || e.ctrlKey) return;
                onSelect?.(b.nodeId);
              }}
              data-section-handle="left"
            />

            {/* Right Gutter Handle */}
            <div
              style={{
                position: "absolute",
                right: -250,
                width: 250,
                top: b.top,
                height: b.height,
                pointerEvents: "auto",
                cursor: "pointer",
                zIndex: 49,
                userSelect: "none",
              }}
              onMouseEnter={() => setHovered(b.nodeId)}
              onMouseLeave={clearHoverUnlessSectionPortal}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
              }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
              }}
              onClick={(e) => {
                if (e.button !== 0) return;
                if (e.metaKey || e.ctrlKey) return;
                onSelect?.(b.nodeId);
              }}
              data-section-handle="right"
            />

            {/* Hover detection zone at bottom of section */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: b.bottom - SECTION_HOVER_ZONE / zoom / 2,
                width: "100%",
                height: SECTION_HOVER_ZONE / zoom,
                zIndex: 60,
                pointerEvents: "auto",
                cursor: "default",
              }}
              onMouseEnter={() => setHovered(b.nodeId)}
              onMouseLeave={clearHoverUnlessSectionPortal}
            >
              {/* ── Dashed separator line ─── */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  width: "100%",
                  height: 0,
                  borderTop: `${Math.max(1, 1 / zoom)}px dashed ${isHov ? "#6366f1" : "#c4c4c4"}`,
                  transition: `border-color ${SECTION_OVERLAY_TRANSITION_FAST}`,
                  pointerEvents: "none",
                }}
              />

              {/* ── "Thêm mới Section" button + resize handle ─── */}
              {isHov || isResizing
                ? (() => {
                    const frame = canvasFrameRef.current;
                    const frameRect = frame?.getBoundingClientRect();
                    if (!frame || !frameRect || typeof document === "undefined") return null;
                    const portalRoot =
                      frame.closest<HTMLElement>("[data-canvas-root]") ?? document.body;

                    const centerX = frameRect.left + frameRect.width / 2;
                    const bottomY = frameRect.top + b.bottom * zoom;

                    return createPortal(
                      <div
                        style={{
                          position: "fixed",
                          left: centerX,
                          top: bottomY,
                          transform: "translate(-50%, -50%)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          zIndex: 130,
                          pointerEvents: "auto",
                        }}
                        data-section-overlay-portal={b.nodeId}
                        onMouseEnter={() => setHovered(b.nodeId)}
                        onMouseLeave={() => setHovered(null)}
                        onPointerDown={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          title={t("section.addNew")}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                            background: "#ffffff",
                            border: "1px solid #e2e2e2",
                            borderRadius: 4,
                            fontSize: 11,
                            color: "#374151",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                            lineHeight: 1,
                            userSelect: "none",
                          }}
                          data-section-action="add"
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            if (e.button !== 0) return;
                            onAddSection(b.order);
                          }}
                        >
                          {t("section.addNew")}
                          <Plus size={10} />
                        </button>

                        <button
                          title={t("section.resizeHint")}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 20,
                            height: 20,
                            background: "#ffffff",
                            border: "1px solid #e2e2e2",
                            borderRadius: 4,
                            cursor: "ns-resize",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                            padding: 0,
                            flexShrink: 0,
                            userSelect: "none",
                          }}
                          data-resize-handle="section"
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            e.preventDefault();
                            e.stopPropagation();
                            startResize(e.clientY);
                          }}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            e.preventDefault();
                            e.stopPropagation();
                            if (typeof window !== "undefined" && "PointerEvent" in window) return;
                            startResize(e.clientY);
                          }}
                        >
                          <UnfoldVertical size={10} />
                        </button>
                      </div>,
                      portalRoot,
                    );
                  })()
                : null}
            </div>
          </div>
        );
      })}
    </>
  );
});
