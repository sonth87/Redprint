import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Breakpoint } from "@ui-builder/builder-core";
import { DEFAULT_BREAKPOINTS, DEVICE_VIEWPORT_PRESETS } from "@ui-builder/builder-core";
import { useBuilder, useSelection, NodeRenderer } from "@ui-builder/builder-react";
import { InlineTextEditor, TextEditToolbar } from "@ui-builder/builder-editor";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui-builder/ui";
import { Monitor, Tablet, Smartphone, Copy, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { Editor } from "@tiptap/react";

const BREAKPOINT_ICONS: Record<Breakpoint, React.ElementType> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

/** Rect of a DOM element relative to a reference element, in screen pixels. */
function getRelativeRect(
  el: HTMLElement,
  ref: HTMLElement,
): { x: number; y: number; width: number; height: number } {
  const er = el.getBoundingClientRect();
  const rr = ref.getBoundingClientRect();
  return {
    x: er.left - rr.left,
    y: er.top - rr.top,
    width: er.width,
    height: er.height,
  };
}

export function InteractiveCanvas() {
  const { state, dispatch, builder } = useBuilder();
  const { selectedNodeIds, select, clearSelection } = useSelection();

  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const viewport = DEVICE_VIEWPORT_PRESETS[breakpoint];

  // Scale-to-fit
  const outerRef = useRef<HTMLDivElement>(null);   // outer container (not scaled, position:relative)
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

  const canvasFrameRef = useRef<HTMLDivElement>(null);   // artboard (inside scaled div)
  const canvasContainerRef = useRef<HTMLDivElement>(null); // scaled wrapper

  const editingNodeId = state.editor.editingNodeId;
  const editingPropKey = state.editor.editingPropKey;
  const selectedNodeId = selectedNodeIds[0] ?? null;

  // Tiptap editor instance (for TextEditToolbar)
  const [tiptapEditor, setTiptapEditor] = useState<Editor | null>(null);

  // Rect of a node relative to the outer container (used for toolbar positioning)
  const getNodeRect = useCallback((nodeId: string) => {
    const outer = outerRef.current;
    if (!outer) return null;
    const el = outer.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return null;
    return getRelativeRect(el, outer);
  }, []);

  // Click → select node
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (editingNodeId) return;
    let el = e.target as HTMLElement | null;
    while (el && el !== canvasFrameRef.current) {
      const id = el.getAttribute("data-node-id");
      if (id) { select(id); return; }
      el = el.parentElement;
    }
    clearSelection();
  }, [editingNodeId, select, clearSelection]);

  // Double-click → enter inline text edit
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    let el = e.target as HTMLElement | null;
    while (el && el !== canvasFrameRef.current) {
      const id = el.getAttribute("data-node-id");
      if (id) {
        const node = state.document.nodes[id];
        if (!node) return;
        const def = builder.registry.getComponent(node.type);
        const editableProp = def?.propSchema.find(
          (p: { type: string; key: string }) => p.type === "richtext" || p.type === "string",
        );
        if (editableProp) {
          dispatch({ type: "ENTER_TEXT_EDIT", payload: { nodeId: id, propKey: editableProp.key } });
        }
        return;
      }
      el = el.parentElement;
    }
  }, [state.document.nodes, builder.registry, dispatch]);

  const handleInlineCommit = useCallback((html: string) => {
    if (!editingNodeId || !editingPropKey) return;
    dispatch({
      type: "EXIT_TEXT_EDIT",
      payload: { nodeId: editingNodeId, propKey: editingPropKey, content: html },
    });
    setTiptapEditor(null);
  }, [editingNodeId, editingPropKey, dispatch]);

  const handleInlineExit = useCallback(() => {
    dispatch({ type: "EXIT_TEXT_EDIT", payload: {} });
    setTiptapEditor(null);
  }, [dispatch]);

  const editingNode = editingNodeId ? state.document.nodes[editingNodeId] : null;
  const initialContent = editingNode && editingPropKey
    ? String(editingNode.props[editingPropKey] ?? "")
    : "";

  // Editing node rect for TextEditToolbar (relative to outerRef, zoom=1)
  const [editingRect, setEditingRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!editingNodeId) { setEditingRect(null); return; }
    setEditingRect(getNodeRect(editingNodeId));
  }, [editingNodeId, getNodeRect]);

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

      {/* Canvas area — position:relative so absolute overlays are anchored here */}
      <div
        ref={outerRef}
        className="flex-1 overflow-auto bg-canvas-bg flex items-center justify-center p-8 relative"
      >
        {/* Scaled artboard wrapper */}
        <div
          ref={canvasContainerRef}
          style={{
            width: viewport.width,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            flexShrink: 0,
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
        </div>

        {/* Overlays — rendered outside scaled div, positioned via getBoundingClientRect */}
        {selectedNodeId && !editingNodeId && (
          <SelectionBorder nodeId={selectedNodeId} outerRef={outerRef} getRect={getNodeRect} />
        )}

        {selectedNodeId && !editingNodeId && (
          <CmsContextualToolbar
            nodeId={selectedNodeId}
            document={state.document}
            dispatch={dispatch}
            getRect={getNodeRect}
          />
        )}

        {editingNodeId && editingPropKey && canvasFrameRef.current && (
          <InlineTextEditor
            nodeId={editingNodeId}
            initialContent={initialContent}
            canvasFrameRef={canvasFrameRef}
            canvasContainerRef={canvasContainerRef}
            zoom={scale}
            panOffset={{ x: 0, y: 0 }}
            onCommit={handleInlineCommit}
            onExit={handleInlineExit}
            onEditorReady={setTiptapEditor}
            onBoundsChange={(r) => setEditingRect({ x: r.x, y: r.y, width: r.width, height: r.height })}
          />
        )}

        {editingNodeId && tiptapEditor && editingRect && (
          <TextEditToolbar
            editor={tiptapEditor}
            rect={editingRect}
            zoom={1}
            panOffset={{ x: 0, y: 0 }}
            onExit={handleInlineExit}
          />
        )}
      </div>
    </div>
  );
}

// ─── Selection border ─────────────────────────────────────────────────────────

function SelectionBorder({
  nodeId,
  outerRef,
  getRect,
}: {
  nodeId: string;
  outerRef: React.RefObject<HTMLDivElement | null>;
  getRect: (id: string) => { x: number; y: number; width: number; height: number } | null;
}) {
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    setRect(getRect(nodeId));
  }, [nodeId, getRect, outerRef]);

  if (!rect) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        outline: "2px solid #3b82f6",
        outlineOffset: 1,
        pointerEvents: "none",
        zIndex: 40,
      }}
    />
  );
}

// ─── Contextual toolbar (no section toolbar) ──────────────────────────────────

function CmsContextualToolbar({
  nodeId,
  document,
  dispatch,
  getRect,
}: {
  nodeId: string;
  document: { nodes: Record<string, { id: string; type: string; parentId: string | null; order: number }>; rootNodeId: string };
  dispatch: (cmd: { type: string; payload: unknown }) => void;
  getRect: (id: string) => { x: number; y: number; width: number; height: number } | null;
}) {
  const node = document.nodes[nodeId];
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    setRect(getRect(nodeId));
  }, [nodeId, getRect]);

  if (!node || !rect) return null;

  // No toolbar for Section nodes
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
      style={{ position: "absolute", left, top, transform: "translateX(-50%)", zIndex: 50 }}
      className="flex items-center gap-0.5 bg-background/95 backdrop-blur-sm border shadow-md rounded-md p-0.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ToolbarBtn
        icon={<ArrowUp className="h-3.5 w-3.5" />}
        label="Move up"
        disabled={!canMoveUp}
        onClick={() => dispatch({ type: "REORDER_NODE", payload: { nodeId, insertIndex: sibIdx - 1 } })}
      />
      <ToolbarBtn
        icon={<ArrowDown className="h-3.5 w-3.5" />}
        label="Move down"
        disabled={!canMoveDown}
        onClick={() => dispatch({ type: "REORDER_NODE", payload: { nodeId, insertIndex: sibIdx + 1 } })}
      />
      <div className="w-px h-4 bg-border mx-0.5" />
      <ToolbarBtn
        icon={<Copy className="h-3.5 w-3.5" />}
        label="Duplicate"
        onClick={() => dispatch({ type: "DUPLICATE_NODE", payload: { nodeId } })}
      />
      {!isRoot && (
        <ToolbarBtn
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Delete"
          danger
          onClick={() => dispatch({ type: "REMOVE_NODE", payload: { nodeId } })}
        />
      )}
    </div>
  );
}

function ToolbarBtn({
  icon, label, onClick, disabled, danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
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
