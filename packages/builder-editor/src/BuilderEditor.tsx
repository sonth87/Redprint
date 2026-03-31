import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { BuilderProvider, useBuilder, useSelection, useDocument, useBreakpoint, useHistory, NodeRenderer } from "@ui-builder/builder-react";
import type { BuilderAPI, BuilderConfig, ComponentDefinition, EditorTool } from "@ui-builder/builder-core";
import type { Point, Rect } from "@ui-builder/shared";
import { CanvasRoot } from "./canvas/CanvasRoot";
import { SelectionOverlay, SnapGuides, HoverOutline } from "./overlay/EditorOverlay";
import { EditorToolbar } from "./toolbar/EditorToolbar";
import { ComponentPalette } from "./panels/left/ComponentPalette";
import { LayerTree } from "./panels/bottom/LayerTree";
import { PropertyPanel } from "./panels/right/PropertyPanel";
import { cn } from "@ui-builder/ui";
import { FloatingPanel } from "./panels/FloatingPanel";
import { ContextualToolbar } from "./toolbar/ContextualToolbar";

// ── Inner editor (must be inside BuilderProvider) ─────────────────────────

function EditorInner() {
  const { builder, state, dispatch } = useBuilder();
  const { selectedNodeIds, select, clearSelection } = useSelection();
  const { document } = useDocument();
  const { breakpoint, setBreakpoint } = useBreakpoint();
  const { undo, redo } = useHistory();

  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 32, y: 32 });
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [showGrid, setShowGrid] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<Rect | null>(null);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState<{
    handle: string;
    nodeId: string;
    startPoint: Point;
    startRect: Rect;
  } | null>(null);
  const [rubberBanding, setRubberBanding] = useState<{
    startPoint: Point;
    currentPoint: Point;
  } | null>(null);
  const [moving, setMoving] = useState<{
    nodeId: string;
    startPoint: Point;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // Derive selected node and definition
  const selectedNodeId = selectedNodeIds[0] ?? null;
  const selectedNode = selectedNodeId ? (document.nodes[selectedNodeId] ?? null) : null;
  const registry = builder?.registry;
  const selectedDefinition = selectedNode && registry
    ? (registry.getComponent(selectedNode.type) ?? null)
    : null;
  const allComponents: ComponentDefinition[] = registry ? registry.listComponents() : [];

  const toggleGrid = useCallback(() => setShowGrid((v) => !v), []);

  const handlePropChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return;
      dispatch({
        type: "UPDATE_PROPS",
        payload: { nodeId: selectedNodeId, props: { [key]: value } },
        description: `Set ${key}`,
      });
    },
    [selectedNodeId, dispatch],
  );

  const handleStyleChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return;
      dispatch({
        type: "UPDATE_STYLE",
        payload: { nodeId: selectedNodeId, style: { [key]: value }, breakpoint },
        description: `Set style.${key}`,
      });
    },
    [selectedNodeId, breakpoint, dispatch],
  );

  const handleDragStart = useCallback((componentType: string, e: React.DragEvent) => {
    e.dataTransfer?.setData("application/builder-component-type", componentType);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Attempt selection
    const target = e.target as HTMLElement;
    const nodeEl = target.closest("[data-node-id]");
    if (nodeEl) {
      const id = nodeEl.getAttribute("data-node-id");
      if (id) {
        if (id === selectedNodeIds[0]) {
          // Clicked on already selected node, start moving
          const style = document.nodes[id]?.style || {};
          const left = parseInt(String(style.left || 0)) || 0;
          const top = parseInt(String(style.top || 0)) || 0;
          setMoving({
            nodeId: id,
            startPoint: { x: e.clientX / zoom, y: e.clientY / zoom },
            startLeft: left,
            startTop: top,
          });
        } else {
          // @ts-expect-error type override
          select([id]);
        }
        return;
      }
    }
    // Background click -> Start rubber band
    clearSelection();
    if (canvasFrameRef.current) {
      const rect = canvasFrameRef.current.getBoundingClientRect();
      const pt = { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
      setRubberBanding({ startPoint: pt, currentPoint: pt });
    }
  }, [select, clearSelection, zoom, document.nodes, selectedNodeIds]);

  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest("[data-node-id]");
    if (nodeEl) {
      const id = nodeEl.getAttribute("data-node-id");
      if (id && id !== selectedNodeIds[0]) {
        setHoveredNodeId(id);
        return;
      }
    }
    setHoveredNodeId(null);
  }, [selectedNodeIds]);

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    // If we leave the canvas completely
    const target = e.relatedTarget as HTMLElement;
    if (!target?.closest("[data-node-id]")) {
      setHoveredNodeId(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    let componentType = "";
    try {
      const data = JSON.parse(e.dataTransfer?.getData("text/plain") || "{}");
      componentType = data.type;
    } catch {
      componentType = e.dataTransfer?.getData("application/builder-component-type") || "";
    }
    
    if (!componentType) return;

    // Find closest exact target or fallback to root
    const targetEl = (e.target as HTMLElement).closest("[data-node-id]");
    const parentId = targetEl?.getAttribute("data-node-id") ?? document.rootNodeId;

    dispatch({
      type: "ADD_NODE",
      payload: { parentId, componentType },
      description: `Add ${componentType}`,
    });
  }, [document.rootNodeId, dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleToggleHidden = useCallback(
    (nodeId: string) => {
      const node = document.nodes[nodeId];
      if (!node) return;
      dispatch({
        type: node.hidden ? "SHOW_NODE" : "HIDE_NODE",
        payload: { nodeId },
        description: node.hidden ? "Show node" : "Hide node",
      });
    },
    [document, dispatch],
  );

  const handleToggleLocked = useCallback(
    (nodeId: string) => {
      const node = document.nodes[nodeId];
      if (!node) return;
      dispatch({
        type: node.locked ? "UNLOCK_NODE" : "LOCK_NODE",
        payload: { nodeId },
        description: node.locked ? "Unlock node" : "Lock node",
      });
    },
    [document, dispatch],
  );

  useEffect(() => {
    if (selectedNodeIds.length === 0 || !canvasFrameRef.current) {
      setSelectionRect(null);
      return;
    }
    const id = selectedNodeIds[0];
    const el = canvasFrameRef.current.querySelector(`[data-node-id="${id}"]`) as HTMLElement;
    if (!el) {
      setSelectionRect(null);
      return;
    }
    const frameRect = canvasFrameRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setSelectionRect({
      x: (elRect.left - frameRect.left) / zoom,
      y: (elRect.top - frameRect.top) / zoom,
      width: elRect.width / zoom,
      height: elRect.height / zoom,
    });
  }, [selectedNodeIds, zoom, panOffset, document]);

  useEffect(() => {
    if (!hoveredNodeId || !canvasFrameRef.current) {
      setHoverRect(null);
      return;
    }
    const el = canvasFrameRef.current.querySelector(`[data-node-id="${hoveredNodeId}"]`) as HTMLElement;
    if (!el) {
      setHoverRect(null);
      return;
    }
    const frameRect = canvasFrameRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setHoverRect({
      x: (elRect.left - frameRect.left) / zoom,
      y: (elRect.top - frameRect.top) / zoom,
      width: elRect.width / zoom,
      height: elRect.height / zoom,
    });
  }, [hoveredNodeId, zoom, panOffset, document]);

  useEffect(() => {
    if (!resizing) return;
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizing.startPoint.x) / zoom;
      const dy = (e.clientY - resizing.startPoint.y) / zoom;
      let { width, height } = resizing.startRect;
      
      if (resizing.handle.includes("e")) width += dx;
      if (resizing.handle.includes("w")) width -= dx;
      if (resizing.handle.includes("s")) height += dy;
      if (resizing.handle.includes("n")) height -= dy;

      width = Math.max(10, Math.round(width));
      height = Math.max(10, Math.round(height));
      
      dispatch({
        type: "UPDATE_STYLE",
        payload: { nodeId: resizing.nodeId, style: { width: `${width}px`, height: `${height}px` }, breakpoint },
        description: "Resize node",
      });
    };
    const handleGlobalMouseUp = () => setResizing(null);
    
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [resizing, zoom, breakpoint, dispatch]);

  // Handle Rubber Banding updates
  useEffect(() => {
    if (!rubberBanding) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (canvasFrameRef.current) {
        const rect = canvasFrameRef.current.getBoundingClientRect();
        const pt = { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
        setRubberBanding((prev) => prev ? { ...prev, currentPoint: pt } : null);
      }
    };

    const handleGlobalMouseUp = () => {
      setRubberBanding(null);
      // NOTE: In a full impl, we would loop over all DOM nodes and select those that intersect rubberBanding rect.
    };
    
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [rubberBanding, zoom]);

  // Handle Note Moving updates
  useEffect(() => {
    if (!moving) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX / zoom) - moving.startPoint.x;
      const dy = (e.clientY / zoom) - moving.startPoint.y;
      
      const newLeft = Math.round(moving.startLeft + dx);
      const newTop = Math.round(moving.startTop + dy);
      
      dispatch({
        type: "UPDATE_STYLE",
        payload: { 
          nodeId: moving.nodeId, 
          style: { 
            position: "absolute",
            left: `${newLeft}px`, 
            top: `${newTop}px` 
          }, 
          breakpoint 
        },
        description: "Move node",
      });
    };

    const handleGlobalMouseUp = () => setMoving(null);
    
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [moving, zoom, breakpoint, dispatch]);

  const canvasConfigParams = useMemo(() => ({
    ...document.canvasConfig,
    showGrid,
  }), [document.canvasConfig, showGrid]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-background relative">
      {/* Global Top Toolbar float */}
      <EditorToolbar
        breakpoint={breakpoint}
        zoom={zoom}
        showGrid={showGrid}
        canUndo
        canRedo
        activeTool={activeTool}
        onBreakpointChange={setBreakpoint}
        onZoomChange={setZoom}
        onGridToggle={toggleGrid}
        onUndo={undo}
        onRedo={redo}
        onToolChange={setActiveTool}
      />

      {/* Floating Panels */}
      <FloatingPanel id="components" title="Components" defaultPosition={{ x: 16, y: 64 }}>
        <div className="h-[40vh] min-h-[300px] overflow-hidden">
          <ComponentPalette
            components={allComponents}
            onDragStart={handleDragStart}
          />
        </div>
      </FloatingPanel>

      <FloatingPanel id="layers" title="Layers" defaultPosition={{ x: 16, y: 480 }} defaultExpanded={false}>
        <div className="h-[30vh] min-h-[250px] overflow-hidden">
          <LayerTree
            document={document}
            selectedIds={selectedNodeIds}
            onSelect={select}
            onToggleHidden={handleToggleHidden}
            onToggleLocked={handleToggleLocked}
          />
        </div>
      </FloatingPanel>

      <FloatingPanel id="properties" title="Properties" defaultPosition={{ right: 16, y: 64 }}>
        <div className="h-[75vh] min-h-[500px] max-h-[800px] overflow-hidden flex flex-col">
          <PropertyPanel
            selectedNode={selectedNode}
            definition={selectedDefinition}
            onPropChange={handlePropChange}
            onStyleChange={handleStyleChange}
          />
        </div>
      </FloatingPanel>

      {/* Main Canvas Viewport */}
      <div className="flex flex-col overflow-hidden bg-muted/20 absolute inset-0 z-0">
        <CanvasRoot
          canvasConfig={canvasConfigParams}
          zoom={zoom}
          panOffset={panOffset}
          onZoomChange={setZoom}
          onPanOffsetChange={setPanOffset}
        >
          {/* Canvas device frame */}
          <div
            ref={canvasFrameRef}
            style={{
              width: document.canvasConfig.width,
              minHeight: document.canvasConfig.height,
              backgroundColor: document.canvasConfig.backgroundColor ?? "#ffffff",
              position: "relative",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              borderRadius: 4,
            }}
            onPointerDown={handlePointerDown}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Helper lines for container boundaries (e.g. 1200px max width body) */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1200px] border-x border-dashed border-blue-400/20 pointer-events-none z-0" />
            
            <NodeRenderer
              nodeId={document.rootNodeId}
            />
          </div>

          {/* Overlays (selection, snap, hover) */}
          <SelectionOverlay
            selection={{
              selectedIds: selectedNodeIds,
              boundingBox: selectionRect,
              isRubberBanding: !!rubberBanding,
              rubberBandRect: rubberBanding ? {
                x: Math.min(rubberBanding.startPoint.x, rubberBanding.currentPoint.x),
                y: Math.min(rubberBanding.startPoint.y, rubberBanding.currentPoint.y),
                width: Math.abs(rubberBanding.currentPoint.x - rubberBanding.startPoint.x),
                height: Math.abs(rubberBanding.currentPoint.y - rubberBanding.startPoint.y),
              } : null,
            }}
            zoom={zoom}
            onResizeStart={(handle, e) => {
              if (!selectionRect || !selectedNodeId) return;
              setResizing({
                handle,
                nodeId: selectedNodeId,
                startPoint: { x: e.clientX, y: e.clientY },
                startRect: { ...selectionRect },
              });
            }}
          />

          {hoverRect && <HoverOutline rect={hoverRect} zoom={zoom} />}

          <SnapGuides
            guides={[]}
            canvasWidth={document.canvasConfig.width ?? 1280}
            canvasHeight={document.canvasConfig.height ?? 800}
          />
        </CanvasRoot>

        {/* Contextual Toolbar (Quick actions) */}
        {selectedNodeId && selectionRect && (
          <ContextualToolbar
            nodeId={selectedNodeId}
            rect={selectionRect}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  );
}

// ── Public BuilderEditor ──────────────────────────────────────────────────

export interface BuilderEditorProps {
  /** Pre-created builder instance, or pass config to auto-create */
  builder?: BuilderAPI;
  config?: BuilderConfig;
  className?: string;
}

/**
 * BuilderEditor — the full visual editor React component.
 *
 * Composes:
 * - BuilderProvider (state)
 * - EditorToolbar (breakpoints, zoom, undo/redo, grid)
 * - CanvasRoot (zoom/pan, SVG grid)
 * - ComponentPalette (components panel)
 * - PropertyPanel (props/style/events)
 * - LayerTree (node hierarchy)
 * - EditorOverlay (selection, snap, hover)
 *
 * @example
 * <BuilderEditor config={{ document: { name: 'My Page' } }} />
 */
export function BuilderEditor({ builder, config, className }: BuilderEditorProps) {
  return (
    <BuilderProvider builder={builder} config={config}>
      <div className={cn("h-full w-full", className)}>
        <EditorInner />
      </div>
    </BuilderProvider>
  );
}
