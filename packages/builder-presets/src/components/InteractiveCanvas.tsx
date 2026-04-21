import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import type { Breakpoint } from "@ui-builder/builder-core";
import { DEFAULT_BREAKPOINTS, DEVICE_VIEWPORT_PRESETS } from "@ui-builder/builder-core";
import { useBuilder, useSelection, useBreakpoint, NodeRenderer } from "@ui-builder/builder-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui-builder/ui";
import { Monitor, Tablet, Smartphone, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import {
  SelectionOverlay,
  SnapEngine,
  useResizeGesture,
  useRotateGesture,
  useSelectionRect,
} from "@ui-builder/builder-editor";
import type { ResizeHandleType } from "@ui-builder/builder-editor";
import { PresetContextualToolbar } from "./PresetContextualToolbar";
import { PresetInlineEditor } from "./PresetInlineEditor";

const ZOOM_LEVELS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2] as const;

const BREAKPOINT_ICONS: Record<Breakpoint, React.ElementType> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

interface Rect { x: number; y: number; width: number; height: number }

function getRelativeRect(el: HTMLElement, ref: HTMLElement): Rect {
  const er = el.getBoundingClientRect();
  const rr = ref.getBoundingClientRect();
  return { x: er.left - rr.left, y: er.top - rr.top, width: er.width, height: er.height };
}

export function InteractiveCanvas() {
  const { state, dispatch, builder } = useBuilder();
  const { selectedNodeIds, select, clearSelection } = useSelection();
  const { breakpoint, setBreakpoint } = useBreakpoint();
  const viewport = DEVICE_VIEWPORT_PRESETS[breakpoint];

  // Scale-to-fit (auto)
  const outerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [userScale, setUserScale] = useState<number | null>(null); // null = follow fit
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ pointer: { x: number; y: number }; offset: { x: number; y: number } } | null>(null);
  const scale = userScale ?? fitScale;

  /** Clamp pan so at least 80 px of canvas remains visible */
  const clampPan = useCallback(
    (rawX: number, rawY: number) => {
      const el = outerRef.current;
      if (!el) return { x: rawX, y: rawY };
      const margin = 80;
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      const cw = viewport.width * scale;
      const ch = (viewport.height ?? 900) * scale;
      return {
        x: Math.max(margin - cw, Math.min(vw - margin, rawX)),
        y: Math.max(margin - ch, Math.min(vh - margin, rawY)),
      };
    },
    [viewport.width, viewport.height, scale],
  );

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setFitScale(Math.min(1, (entry.contentRect.width - 64) / viewport.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewport.width]);

  // ── Center canvas when scale or viewport changes ──
  const centerCanvas = useCallback(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const { width, height } = outer.getBoundingClientRect();
    const canvasHeight = 120; // min-height of canvasFrameRef
    setPanOffset({
      x: (width - viewport.width * scale) / 2,
      y: Math.max(32, (height - canvasHeight * scale) / 2),
    });
  }, [scale, viewport.width]);

  useEffect(() => {
    if (userScale === null) {
      centerCanvas();
    }
  }, [userScale, fitScale, centerCanvas]);

  const zoomIn = useCallback(() => {
    const next = ZOOM_LEVELS.find((z) => z > scale);
    if (next) setUserScale(next);
  }, [scale]);

  const zoomOut = useCallback(() => {
    const prev = [...ZOOM_LEVELS].reverse().find((z) => z < scale);
    if (prev) setUserScale(prev);
  }, [scale]);

  const zoomFit = useCallback(() => {
    setUserScale(null);
  }, []);

  // ── Wheel handler: Ctrl+wheel to zoom (cursor-anchored), wheel to pan ──
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const isZoom = e.ctrlKey || e.metaKey;
      if (!isZoom && Math.abs(e.deltaX) < 0.01 && Math.abs(e.deltaY) < 0.01) return;

      e.preventDefault();

      if (isZoom) {
        // Zoom anchored to cursor
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Canvas point under cursor (in canvas space)
        const canvasX = (mouseX - panOffset.x) / scale;
        const canvasY = (mouseY - panOffset.y) / scale;

        // Find next zoom level
        const nextScale = e.deltaY < 0
          ? ZOOM_LEVELS.find((z) => z > scale) ?? scale
          : [...ZOOM_LEVELS].reverse().find((z) => z < scale) ?? scale;

        // Only zoom if it actually changed
        if (nextScale !== scale) {
          setUserScale(nextScale);
          // Adjust pan so the canvas point stays under cursor
          setPanOffset({
            x: mouseX - canvasX * nextScale,
            y: mouseY - canvasY * nextScale,
          });
        }
      } else {
        // Pan without Ctrl — clamp to keep canvas visible
        const margin = 80;
        const vw = el.clientWidth;
        const vh = el.clientHeight;
        const cw = viewport.width * scale;
        const ch = (viewport.height ?? 900) * scale;
        setPanOffset((prev) => ({
          x: Math.max(margin - cw, Math.min(vw - margin, prev.x - e.deltaX)),
          y: Math.max(margin - ch, Math.min(vh - margin, prev.y - e.deltaY)),
        }));
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [scale, panOffset, viewport.width, viewport.height]);

  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const editingNodeId = state.editor.editingNodeId;
  const editingPropKey = state.editor.editingPropKey;
  const selectedNodeId = selectedNodeIds[0] ?? null;

  // ── Shared hooks ─────────────────────────────────────────────────────────────

  const NOOP_SNAP_ENGINE = useMemo(
    () =>
      new SnapEngine({
        gridSize: 8,
        snapEnabled: false,
        snapToGrid: false,
        snapToComponents: false,
        threshold: 0,
      }),
    [],
  );

  const { selectionRect, currentRotation } = useSelectionRect({
    selectedNodeIds,
    zoom: scale,
    panOffset,
    nodes: state.document.nodes,
    canvasFrameRef,
    breakpoint,
  });

  const { setResizing } = useResizeGesture({
    zoom: scale,
    breakpoint,
    showGrid: false,
    gridSize: 8,
    snapEngine: NOOP_SNAP_ENGINE,
    nodes: state.document.nodes,
    canvasFrameRef,
    dispatch,
  });

  const { startRotate } = useRotateGesture({ breakpoint, dispatch });

  // ── getNodeRect: screen-space, relative to outerRef ──────────────────────
  const getNodeRect = useCallback((nodeId: string): Rect | null => {
    const outer = outerRef.current;
    if (!outer) return null;
    const el = outer.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return null;
    return getRelativeRect(el, outer);
  }, []);

  // ── Middle-mouse drag to pan ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        // Middle mouse button
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          pointer: { x: e.clientX, y: e.clientY },
          offset: { ...panOffset },
        };
      }
    },
    [panOffset],
  );

  // Attach to window so pan is not broken when pointer leaves the container
  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: MouseEvent) => {
      if (!panStartRef.current) return;
      const rawX = panStartRef.current.offset.x + (e.clientX - panStartRef.current.pointer.x);
      const rawY = panStartRef.current.offset.y + (e.clientY - panStartRef.current.pointer.y);
      const clamped = clampPan(rawX, rawY);
      setPanOffset(clamped);
    };
    const onUp = () => {
      setIsPanning(false);
      panStartRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning, clampPan]);

  // ── Click → select ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (editingNodeId) return;
      // Ignore resize/rotation handles — use the correct attribute names from EditorOverlay
      if ((e.target as HTMLElement).closest("[data-resize-handle],[data-rotation-handle]")) return;
      let el = e.target as HTMLElement | null;
      while (el && el !== canvasFrameRef.current) {
        const id = el.getAttribute("data-node-id");
        if (id) { select(id); return; }
        el = el.parentElement;
      }
      clearSelection();
    },
    [editingNodeId, select, clearSelection],
  );

  // ── Double-click → enter richtext edit ───────────────────────────────────
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      let el = e.target as HTMLElement | null;
      while (el && el !== canvasFrameRef.current) {
        const id = el.getAttribute("data-node-id");
        if (id) {
          const node = state.document.nodes[id];
          if (!node) return;
          const def = builder.registry.getComponent(node.type);
          const editableProp = def?.propSchema.find(
            (p: { type: string }) => p.type === "richtext" || p.type === "string",
          );
          if (editableProp) {
            dispatch({ type: "ENTER_TEXT_EDIT", payload: { nodeId: id, propKey: editableProp.key } });
          }
          return;
        }
        el = el.parentElement;
      }
    },
    [state.document.nodes, builder.registry, dispatch],
  );

  // ── Commit richtext ───────────────────────────────────────────────────────
  const handleHTMLCommit = useCallback(
    (html: string) => {
      if (!editingNodeId || !editingPropKey) return;
      dispatch({
        type: "EXIT_TEXT_EDIT",
        payload: { nodeId: editingNodeId, propKey: editingPropKey, content: html },
      });
    },
    [editingNodeId, editingPropKey, dispatch],
  );

  const handleInlineExit = useCallback(() => {
    dispatch({ type: "EXIT_TEXT_EDIT", payload: {} });
  }, [dispatch]);

  const editingNode = editingNodeId ? state.document.nodes[editingNodeId] : null;
  const initialHTML =
    editingNode && editingPropKey ? String(editingNode.props[editingPropKey] ?? "") : "";

  // ── Bridge handlers for SelectionOverlay → gesture hooks ─────────────────

  const handleResizeStart = useCallback(
    (handle: ResizeHandleType, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectionRect || !selectedNodeIds[0]) return;
      setResizing({
        handle,
        nodeId: selectedNodeIds[0],
        startPoint: { x: e.clientX, y: e.clientY },
        startRect: selectionRect,
        gestureGroupId: crypto.randomUUID(),
      });
    },
    [selectionRect, selectedNodeIds, setResizing],
  );

  const handleRotateStart = useCallback(
    (e: React.MouseEvent) => {
      const nodeId = selectedNodeIds[0];
      if (!nodeId || !canvasFrameRef.current) return;
      const el = canvasFrameRef.current.querySelector(
        `[data-node-id="${nodeId}"]`,
      ) as HTMLElement | null;
      if (!el) return;
      startRotate({
        nodeId,
        clientX: e.clientX,
        clientY: e.clientY,
        elementRect: el.getBoundingClientRect(),
        currentRotation,
        gestureGroupId: crypto.randomUUID(),
      });
    },
    [selectedNodeIds, currentRotation, startRotate],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Breakpoint toolbar */}
      <div className="flex items-center justify-between px-3 h-10 border-b bg-background shrink-0 pointer-events-auto">
        <span className="text-xs text-muted-foreground truncate max-w-40">
          {state.document.name}
        </span>
        <TooltipProvider>
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            {DEFAULT_BREAKPOINTS.map(({ breakpoint: bp, label }) => {
              const Icon = BREAKPOINT_ICONS[bp];
              return (
                <Tooltip key={bp}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setBreakpoint(bp)}
                      className={
                        "flex items-center px-2.5 py-1 rounded text-xs transition-colors " +
                        (breakpoint === bp
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground")
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
        <div className="flex items-center gap-0.5">
          <button
            onClick={zoomOut}
            disabled={scale <= ZOOM_LEVELS[0]}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom out (Ctrl+scroll)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={zoomFit}
            className="px-1.5 h-6 rounded text-[10px] tabular-nums text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-w-10 text-center"
            title="Reset to fit"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= (ZOOM_LEVELS[ZOOM_LEVELS.length - 1] ?? scale)}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom in (Ctrl+scroll)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          {userScale !== null && (
            <button
              onClick={zoomFit}
              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Fit to window"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={outerRef}
        className={`flex-1 overflow-hidden bg-canvas-bg relative${isPanning ? " cursor-grabbing" : ""}`}
        onMouseDown={handleMouseDown}
      >
        {/* Scaled artboard — SelectionOverlay lives here so canvas-space coords are correct */}
        <div
          ref={canvasContainerRef}
          style={{
            width: viewport.width,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <div
            ref={canvasFrameRef}
            style={{
              width: viewport.width,
              minHeight: 120,
              backgroundColor: "#ffffff",
              borderRadius: 4,
              boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
              overflow: "visible",
              position: "relative",
            }}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
          >
            <NodeRenderer nodeId={state.document.rootNodeId} mode="editor" />
          </div>

          {/* Selection overlay — inside scaled div so canvas-space coords map correctly */}
          {selectedNodeId && !editingNodeId && selectionRect && (
            <SelectionOverlay
              selection={{
                selectedIds: [selectedNodeId],
                boundingBox: selectionRect,
                isRubberBanding: false,
                rubberBandRect: null,
              }}
              zoom={scale}
              rotation={currentRotation}
              onResizeStart={handleResizeStart}
              onRotateStart={handleRotateStart}
              onDoubleClick={handleDoubleClick}
            />
          )}
        </div>

        {/* Contextual toolbar */}
        {selectedNodeId && !editingNodeId && selectionRect && (
          <PresetContextualToolbar
            nodeId={selectedNodeId}
            document={state.document}
            dispatch={dispatch}
            getRect={getNodeRect}
          />
        )}

        {/* Inline richtext editor */}
        {editingNodeId && editingPropKey && (
          <PresetInlineEditor
            nodeId={editingNodeId}
            initialContent={initialHTML}
            canvasFrameRef={canvasFrameRef}
            outerRef={outerRef}
            zoom={scale}
            onCommit={handleHTMLCommit}
            onExit={handleInlineExit}
          />
        )}
      </div>
    </div>
  );
}
