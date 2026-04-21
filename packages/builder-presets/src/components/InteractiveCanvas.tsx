import React, { useRef, useEffect, useCallback, useState } from "react";
import type { Breakpoint } from "@ui-builder/builder-core";
import { DEFAULT_BREAKPOINTS, DEVICE_VIEWPORT_PRESETS } from "@ui-builder/builder-core";
import { useBuilder, useSelection, useBreakpoint, NodeRenderer } from "@ui-builder/builder-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui-builder/ui";
import { Monitor, Tablet, Smartphone, Copy, Trash2, ArrowUp, ArrowDown, RotateCw } from "lucide-react";
import { InlineRichtextEditor } from "./InlineRichtextEditor";

const BREAKPOINT_ICONS: Record<Breakpoint, React.ElementType> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface Rect { x: number; y: number; width: number; height: number }

interface ResizingState {
  handle: ResizeHandle;
  nodeId: string;
  startMouseX: number;
  startMouseY: number;
  startRect: Rect;
  groupId: string;
}

interface RotatingState {
  nodeId: string;
  centerX: number; // viewport px
  centerY: number;
  startAngle: number;
  initialRotation: number;
  groupId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRelativeRect(el: HTMLElement, ref: HTMLElement): Rect {
  const er = el.getBoundingClientRect();
  const rr = ref.getBoundingClientRect();
  return { x: er.left - rr.left, y: er.top - rr.top, width: er.width, height: er.height };
}

function parseRotation(transform: string): number {
  const m = transform.match(/rotate\(([-\d.]+)deg\)/);
  return m?.[1] ? parseFloat(m[1]) : 0;
}

function randomId() {
  return Math.random().toString(36).slice(2);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InteractiveCanvas() {
  const { state, dispatch, builder } = useBuilder();
  const { selectedNodeIds, select, clearSelection } = useSelection();
  const { breakpoint, setBreakpoint } = useBreakpoint();
  const viewport = DEVICE_VIEWPORT_PRESETS[breakpoint];

  // Scale-to-fit
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setScale(Math.min(1, (entry.contentRect.width - 64) / viewport.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewport.width]);

  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const editingNodeId = state.editor.editingNodeId;
  const editingPropKey = state.editor.editingPropKey;
  const selectedNodeId = selectedNodeIds[0] ?? null;

  // Gesture state
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [rotating, setRotating] = useState<RotatingState | null>(null);
  // Live rect for the selection overlay while resizing
  const [liveRect, setLiveRect] = useState<Rect | null>(null);

  // ── getNodeRect: screen-space, relative to outerRef ──────────────────────
  const getNodeRect = useCallback((nodeId: string): Rect | null => {
    const outer = outerRef.current;
    if (!outer) return null;
    const el = outer.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return null;
    return getRelativeRect(el, outer);
  }, []);

  // ── Click → select ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (editingNodeId) return;
    // Don't intercept resize/rotate handles
    if ((e.target as HTMLElement).closest("[data-resize-handle],[data-rotate-handle]")) return;
    let el = e.target as HTMLElement | null;
    while (el && el !== canvasFrameRef.current) {
      const id = el.getAttribute("data-node-id");
      if (id) { select(id); return; }
      el = el.parentElement;
    }
    clearSelection();
  }, [editingNodeId, select, clearSelection]);

  // ── Double-click → enter richtext edit ───────────────────────────────────
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
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
  }, [state.document.nodes, builder.registry, dispatch]);

  // ── Commit richtext ───────────────────────────────────────────────────────
  const handleHTMLCommit = useCallback((html: string) => {
    if (!editingNodeId || !editingPropKey) return;
    dispatch({ type: "EXIT_TEXT_EDIT", payload: { nodeId: editingNodeId, propKey: editingPropKey, content: html } });
  }, [editingNodeId, editingPropKey, dispatch]);

  const handleInlineExit = useCallback(() => {
    dispatch({ type: "EXIT_TEXT_EDIT", payload: {} });
  }, [dispatch]);

  const editingNode = editingNodeId ? state.document.nodes[editingNodeId] : null;
  const initialHTML = editingNode && editingPropKey ? String(editingNode.props[editingPropKey] ?? "") : "";

  // ── Resize gesture ────────────────────────────────────────────────────────
  const handleResizeStart = useCallback((handle: ResizeHandle, e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = getNodeRect(nodeId);
    if (!rect) return;
    setResizing({
      handle,
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startRect: { ...rect },
      groupId: randomId(),
    });
    setLiveRect(rect);
  }, [getNodeRect]);

  useEffect(() => {
    if (!resizing) return;

    const onMouseMove = (e: MouseEvent) => {
      const rawDx = (e.clientX - resizing.startMouseX) / scale;
      const rawDy = (e.clientY - resizing.startMouseY) / scale;
      let { x, y, width, height } = resizing.startRect;
      // startRect is in scaled screen pixels; convert to canvas-space
      x /= scale; y /= scale; width /= scale; height /= scale;

      let newX = x, newY = y;
      const h = resizing.handle;
      if (h.includes("e")) width = Math.max(10, Math.round(width + rawDx));
      if (h.includes("w")) { width = Math.max(10, Math.round(width - rawDx)); newX = Math.round(x + rawDx); }
      if (h.includes("s")) height = Math.max(10, Math.round(height + rawDy));
      if (h.includes("n")) { height = Math.max(10, Math.round(height - rawDy)); newY = Math.round(y + rawDy); }

      // Update live overlay rect (screen-space)
      setLiveRect({ x: newX * scale, y: newY * scale, width: width * scale, height: height * scale });

      const style: Record<string, string> = { width: `${width}px`, height: `${height}px` };
      if (h.includes("w")) style.left = `${newX}px`;
      if (h.includes("n")) style.top = `${newY}px`;

      dispatch({ type: "UPDATE_STYLE", payload: { nodeId: resizing.nodeId, style, breakpoint }, groupId: resizing.groupId, description: "Resize" });
    };

    const onMouseUp = () => {
      setResizing(null);
      setLiveRect(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizing, scale, breakpoint, dispatch]);

  // ── Rotate gesture ────────────────────────────────────────────────────────
  const handleRotateStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const outer = outerRef.current;
    if (!outer) return;
    const el = outer.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;
    const elRect = el.getBoundingClientRect();
    const cx = (elRect.left + elRect.right) / 2;
    const cy = (elRect.top + elRect.bottom) / 2;
    const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    const node = state.document.nodes[nodeId];
    const currentRotation = parseRotation(String(node?.style?.transform ?? ""));
    setRotating({ nodeId, centerX: cx, centerY: cy, startAngle, initialRotation: currentRotation, groupId: randomId() });
  }, [state.document.nodes]);

  useEffect(() => {
    if (!rotating) return;

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - rotating.centerX;
      const dy = e.clientY - rotating.centerY;
      const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      let delta = currentAngle - rotating.startAngle;
      if (Math.abs(rotating.initialRotation) < 15) delta *= 0.25;
      const rotation = Math.round(rotating.initialRotation + delta);
      dispatch({
        type: "UPDATE_STYLE",
        payload: { nodeId: rotating.nodeId, style: { transform: `rotate(${rotation}deg)` }, breakpoint },
        groupId: rotating.groupId,
        description: "Rotate",
      });
    };

    const onMouseUp = () => setRotating(null);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [rotating, breakpoint, dispatch]);

  // ── Derive selection rect and rotation ───────────────────────────────────
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const [selectionRotation, setSelectionRotation] = useState(0);

  useEffect(() => {
    if (!selectedNodeId || editingNodeId) { setSelectionRect(null); return; }
    const outer = outerRef.current;
    if (!outer) return;
    const el = outer.querySelector(`[data-node-id="${selectedNodeId}"]`) as HTMLElement | null;
    if (!el) { setSelectionRect(null); return; }
    setSelectionRect(getRelativeRect(el, outer));
    const computed = window.getComputedStyle(el);
    setSelectionRotation(parseRotation(computed.transform));
  }, [selectedNodeId, editingNodeId, state.document]);

  // While resizing, use live rect
  const displayRect = liveRect ?? selectionRect;

  return (
    <div className="flex flex-col h-full">
      {/* Breakpoint toolbar */}
      <div className="flex items-center justify-between px-3 h-10 border-b bg-background shrink-0">
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
        <span className="text-[10px] text-muted-foreground tabular-nums w-25 text-right">
          {viewport.width} × {viewport.height}
          {scale < 1 && <span className="ml-1 opacity-60">{Math.round(scale * 100)}%</span>}
        </span>
      </div>

      {/* Canvas area */}
      <div
        ref={outerRef}
        className="flex-1 overflow-auto bg-canvas-bg flex items-center justify-center p-8 relative"
        style={{ cursor: rotating ? "crosshair" : undefined }}
      >
        {/* Scaled artboard */}
        <div
          ref={canvasContainerRef}
          style={{ width: viewport.width, transform: `scale(${scale})`, transformOrigin: "center center", flexShrink: 0 }}
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
        </div>

        {/* Selection overlay with resize + rotate handles */}
        {selectedNodeId && !editingNodeId && displayRect && (
          <SelectionOverlay
            nodeId={selectedNodeId}
            rect={displayRect}
            rotation={selectionRotation}
            zoom={scale}
            onResizeStart={(handle, e) => handleResizeStart(handle, e, selectedNodeId)}
            onRotateStart={(e) => handleRotateStart(e, selectedNodeId)}
          />
        )}

        {/* Contextual toolbar */}
        {selectedNodeId && !editingNodeId && selectionRect && (
          <CmsContextualToolbar
            nodeId={selectedNodeId}
            document={state.document}
            dispatch={dispatch}
            getRect={getNodeRect}
          />
        )}

        {/* Richtext inline editor */}
        {editingNodeId && editingPropKey && (
          <InlineRichtextEditor
            nodeId={editingNodeId}
            initialContent={initialHTML}
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

// ─── Selection overlay (resize + rotate handles) ──────────────────────────────

const HANDLE_POSITIONS: Record<ResizeHandle, { top: string; left: string; transform: string; cursor: string }> = {
  n:  { top: "0%",   left: "50%",  transform: "translate(-50%,-50%)", cursor: "n-resize"  },
  s:  { top: "100%", left: "50%",  transform: "translate(-50%,-50%)", cursor: "s-resize"  },
  e:  { top: "50%",  left: "100%", transform: "translate(-50%,-50%)", cursor: "e-resize"  },
  w:  { top: "50%",  left: "0%",   transform: "translate(-50%,-50%)", cursor: "w-resize"  },
  ne: { top: "0%",   left: "100%", transform: "translate(-50%,-50%)", cursor: "ne-resize" },
  nw: { top: "0%",   left: "0%",   transform: "translate(-50%,-50%)", cursor: "nw-resize" },
  se: { top: "100%", left: "100%", transform: "translate(-50%,-50%)", cursor: "se-resize" },
  sw: { top: "100%", left: "0%",   transform: "translate(-50%,-50%)", cursor: "sw-resize" },
};

function SelectionOverlay({
  nodeId: _nodeId,
  rect,
  rotation,
  zoom,
  onResizeStart,
  onRotateStart,
}: {
  nodeId: string;
  rect: Rect;
  rotation: number;
  zoom: number;
  onResizeStart: (handle: ResizeHandle, e: React.MouseEvent) => void;
  onRotateStart: (e: React.MouseEvent) => void;
}) {
  const borderWidth = Math.max(1, 2 / zoom);
  const handleSize = Math.max(6, 8 / zoom);
  const rotateOffset = 20 / zoom;

  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        pointerEvents: "none",
        zIndex: 50,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      {/* Border */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          outline: `${borderWidth}px solid #3b82f6`,
          outlineOffset: 1,
        }}
      />

      {/* Resize handles */}
      {(Object.keys(HANDLE_POSITIONS) as ResizeHandle[]).map((h) => {
        const pos = HANDLE_POSITIONS[h];
        return (
          <div
            key={h}
            data-resize-handle
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(h, e); }}
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              transform: pos.transform,
              width: handleSize,
              height: handleSize,
              backgroundColor: "#fff",
              border: `${borderWidth}px solid #3b82f6`,
              borderRadius: 2,
              cursor: pos.cursor,
              pointerEvents: "auto",
              zIndex: 51,
              boxSizing: "border-box",
            }}
          />
        );
      })}

      {/* Rotate handle */}
      <div
        data-rotate-handle
        title="Rotate"
        onMouseDown={(e) => { e.stopPropagation(); onRotateStart(e); }}
        style={{
          position: "absolute",
          bottom: -rotateOffset - handleSize,
          left: "50%",
          transform: "translateX(-50%)",
          width: handleSize + 2,
          height: handleSize + 2,
          backgroundColor: "#fff",
          border: `${borderWidth}px solid #3b82f6`,
          borderRadius: "50%",
          cursor: "crosshair",
          pointerEvents: "auto",
          zIndex: 51,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RotateCw style={{ width: handleSize * 0.7, height: handleSize * 0.7, color: "#3b82f6", pointerEvents: "none" }} />
      </div>

      {/* Connector line from border to rotate handle */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1,
        height: rotateOffset,
        backgroundColor: "#3b82f6",
        opacity: 0.5,
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ─── Contextual toolbar ───────────────────────────────────────────────────────

function CmsContextualToolbar({
  nodeId,
  document,
  dispatch,
  getRect,
}: {
  nodeId: string;
  document: { nodes: Record<string, { id: string; type: string; parentId: string | null; order: number }>; rootNodeId: string };
  dispatch: (cmd: { type: string; payload: unknown }) => void;
  getRect: (id: string) => Rect | null;
}) {
  const node = document.nodes[nodeId];
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    setRect(getRect(nodeId));
  }, [nodeId, getRect]);

  if (!node || !rect) return null;
  if (node.type === "Section") return null;

  const isRoot = nodeId === document.rootNodeId;
  const siblings = node.parentId
    ? Object.values(document.nodes)
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.order - b.order)
    : [];
  const sibIdx = siblings.findIndex((n) => n.id === nodeId);
  const canMoveUp = sibIdx > 0;
  const canMoveDown = sibIdx < siblings.length - 1;

  const TOOLBAR_H = 34;
  const top = rect.y > TOOLBAR_H + 8 ? rect.y - TOOLBAR_H - 6 : rect.y + rect.height + 6;
  const left = Math.max(0, rect.x + rect.width / 2);

  return (
    <div
      style={{ position: "absolute", left, top, transform: "translateX(-50%)", zIndex: 55 }}
      className="flex items-center gap-0.5 bg-background/95 backdrop-blur-sm border shadow-md rounded-md p-0.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ToolbarBtn icon={<ArrowUp className="h-3.5 w-3.5" />} label="Move up" disabled={!canMoveUp}
        onClick={() => dispatch({ type: "REORDER_NODE", payload: { nodeId, insertIndex: sibIdx - 1 } })} />
      <ToolbarBtn icon={<ArrowDown className="h-3.5 w-3.5" />} label="Move down" disabled={!canMoveDown}
        onClick={() => dispatch({ type: "REORDER_NODE", payload: { nodeId, insertIndex: sibIdx + 1 } })} />
      <div className="w-px h-4 bg-border mx-0.5" />
      <ToolbarBtn icon={<Copy className="h-3.5 w-3.5" />} label="Duplicate"
        onClick={() => dispatch({ type: "DUPLICATE_NODE", payload: { nodeId } })} />
      {!isRoot && (
        <ToolbarBtn icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" danger
          onClick={() => dispatch({ type: "REMOVE_NODE", payload: { nodeId } })} />
      )}
    </div>
  );
}

function ToolbarBtn({ icon, label, onClick, disabled, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={
              "w-7 h-7 flex items-center justify-center rounded transition-colors " +
              (disabled
                ? "opacity-30 cursor-not-allowed text-muted-foreground"
                : danger
                ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted")
            }
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
