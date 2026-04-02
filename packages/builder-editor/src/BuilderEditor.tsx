import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  BuilderProvider,
  useBuilder,
  useSelection,
  useDocument,
  useBreakpoint,
  useHistory,
  NodeRenderer,
} from "@ui-builder/builder-react";
import type { BuilderAPI, BuilderConfig, ComponentDefinition, BuilderNode } from "@ui-builder/builder-core";
import type { EditorTool, SnapGuide, ResizeHandleType } from "./types";
import type { Point, Rect } from "@ui-builder/shared";
import { snapToGrid } from "@ui-builder/shared";
import { CanvasRoot } from "./canvas/CanvasRoot";
import {
  SelectionOverlay,
  SnapGuides,
  HoverOutline,
} from "./overlay/EditorOverlay";
import { EditorToolbar } from "./toolbar/EditorToolbar";
import { ComponentPalette } from "./panels/left/ComponentPalette";
import { LayerTree } from "./panels/bottom/LayerTree";
import { PropertyPanel } from "./panels/right/PropertyPanel";
import { cn } from "@ui-builder/ui";
import { FloatingPanel } from "./panels/FloatingPanel";
import { ContextualToolbar } from "./toolbar/ContextualToolbar";
import { SnapEngine } from "./snap/SnapEngine";
import { v4 as uuidv4 } from "uuid";

// ── Inner editor (must be inside BuilderProvider) ─────────────────────────

function EditorInner() {
  const { builder, state, dispatch } = useBuilder();
  const { selectedNodeIds, select, clearSelection } = useSelection();
  const { document } = useDocument();
  const { breakpoint, setBreakpoint } = useBreakpoint();
  const { undo, redo, canUndo, canRedo } = useHistory();

  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 32, y: 32 });
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<Rect | null>(null);
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const [resizing, setResizing] = useState<{
    handle: ResizeHandleType;
    nodeId: string;
    startPoint: Point;
    startRect: Rect;
    gestureGroupId: string;
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
    gestureGroupId: string;
  } | null>(null);

  const [rotating, setRotating] = useState<{
    nodeId: string;
    centerX: number;
    centerY: number;
    startAngle: number;
    initialRotation: number;
    gestureGroupId: string;
  } | null>(null);

  // Derive selected node and definition
  const selectedNodeId = selectedNodeIds[0] ?? null;
  const selectedNode = selectedNodeId ? (document.nodes[selectedNodeId] ?? null) : null;
  const registry = builder?.registry;
  const selectedDefinition = selectedNode && registry ? (registry.getComponent(selectedNode.type) ?? null) : null;
  const allComponents: ComponentDefinition[] = registry ? registry.listComponents() : [];

  const toggleGrid = useCallback(() => setShowGrid((v) => !v), []);
  const toggleSnap = useCallback(() => setSnapEnabled((v) => !v), []);

  // ── Snap engine ─────────────────────────────────────────────────────────
  const snapEngine = useMemo(
    () =>
      new SnapEngine({
        gridSize: document.canvasConfig.gridSize,
        snapEnabled,
        snapToGrid: showGrid, // Automatically enable grid snapping when grid is shown
        snapToComponents: document.canvasConfig.snapToComponents,
        threshold: document.canvasConfig.snapThreshold,
      }),
    [document.canvasConfig, snapEnabled, showGrid],
  );

  // ── Property change handlers ────────────────────────────────────────────
  const handlePropChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return;
      dispatch({ type: "UPDATE_PROPS", payload: { nodeId: selectedNodeId, props: { [key]: value } }, description: `Set ${key}` });
    },
    [selectedNodeId, dispatch],
  );

  const handleStyleChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return;
      dispatch({ type: "UPDATE_STYLE", payload: { nodeId: selectedNodeId, style: { [key]: value } as never, breakpoint }, description: `Set style.${key}` });
    },
    [selectedNodeId, breakpoint, dispatch],
  );

  // ── Drag from palette ────────────────────────────────────────────────────
  const handleDragStart = useCallback((componentType: string, e: React.DragEvent) => {
    e.dataTransfer?.setData("application/builder-component-type", componentType);
  }, []);

  // ── Selection + move ────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // Only left-click: middle-click is reserved for canvas pan
      if (activeTool === "pan") return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-resize-handle]") || target.closest("[data-rotation-handle]")) return;

      const nodeEl = target.closest("[data-node-id]");
      if (nodeEl) {
        const id = nodeEl.getAttribute("data-node-id");
        if (id && id !== document.rootNodeId) {
          const node = document.nodes[id];
          if (node?.locked) return;

          // Select the node (addToSelection honours Shift+click multi-select)
          dispatch({ type: "SELECT_NODE", payload: { nodeId: id, addToSelection: e.shiftKey }, description: "Select" });

          // Immediately start a move gesture so a single pointer-down+move moves the node
          const style = document.nodes[id]?.style || {};
          const left = parseFloat(String(style.left ?? "0")) || 0;
          const top = parseFloat(String(style.top ?? "0")) || 0;
          setMoving({ nodeId: id, startPoint: { x: e.clientX, y: e.clientY }, startLeft: left, startTop: top, gestureGroupId: uuidv4() });
          return;
        }
      }
      // Background click → clear selection + rubber band
      clearSelection();
      if (canvasFrameRef.current) {
        const rect = canvasFrameRef.current.getBoundingClientRect();
        const pt = { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
        setRubberBanding({ startPoint: pt, currentPoint: pt });
      }
    },
    [activeTool, dispatch, clearSelection, zoom, document.nodes, document.rootNodeId],
  );

  // ── Hover ────────────────────────────────────────────────────────────────
  const handleMouseOver = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest("[data-node-id]");
      if (nodeEl) {
        const id = nodeEl.getAttribute("data-node-id");
        if (id && id !== selectedNodeIds[0] && id !== document.rootNodeId) {
          setHoveredNodeId(id);
          return;
        }
      }
      setHoveredNodeId(null);
    },
    [selectedNodeIds, document.rootNodeId],
  );

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    const target = e.relatedTarget as HTMLElement;
    if (!target?.closest("[data-node-id]")) setHoveredNodeId(null);
  }, []);

  // ── Drop from palette ────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); // prevent the event from firing on both inner canvas AND outer container
      let componentType = "";
      try {
        const data = JSON.parse(e.dataTransfer?.getData("text/plain") || "{}");
        componentType = data.type;
      } catch {
        componentType = e.dataTransfer?.getData("application/builder-component-type") || "";
      }
      if (!componentType) return;

      const targetEl = (e.target as HTMLElement).closest("[data-node-id]");
      const parentId = targetEl?.getAttribute("data-node-id") ?? document.rootNodeId;

      let position: Point | undefined;
      if (canvasFrameRef.current) {
        const frameRect = canvasFrameRef.current.getBoundingClientRect();
        position = { x: Math.round((e.clientX - frameRect.left) / zoom), y: Math.round((e.clientY - frameRect.top) / zoom) };
      }

      const nodeId = uuidv4();
      dispatch({ type: "ADD_NODE", payload: { nodeId, parentId, componentType, position }, description: `Add ${componentType}` });
    },
    [document.rootNodeId, dispatch, zoom],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; }, []);
  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);

  // ── Layer tree handlers ──────────────────────────────────────────────────
  const handleToggleHidden = useCallback(
    (nodeId: string) => {
      const node = document.nodes[nodeId];
      if (!node) return;
      dispatch({ type: node.hidden ? "SHOW_NODE" : "HIDE_NODE", payload: { nodeId }, description: node.hidden ? "Show" : "Hide" });
    },
    [document, dispatch],
  );

  const handleToggleLocked = useCallback(
    (nodeId: string) => {
      const node = document.nodes[nodeId];
      if (!node) return;
      dispatch({ type: node.locked ? "UNLOCK_NODE" : "LOCK_NODE", payload: { nodeId }, description: node.locked ? "Unlock" : "Lock" });
    },
    [document, dispatch],
  );

  // ── Selection rect from DOM ──────────────────────────────────────────────
  useEffect(() => {
    if (selectedNodeIds.length === 0 || !canvasFrameRef.current) {
      setSelectionRect(null); return;
    }
    const id = selectedNodeIds[0]!;
    const el = canvasFrameRef.current.querySelector(
      `[data-node-id="${id}"]`
    ) as HTMLElement;
    if (!el) { setSelectionRect(null); return; }

    const frameRect = canvasFrameRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Center trong viewport (ổn định bất kể rotation)
    const cxViewport = (elRect.left + elRect.right) / 2;
    const cyViewport = (elRect.top + elRect.bottom) / 2;
    // Chuyển về canvas space
    const cxCanvas = (cxViewport - frameRect.left) / zoom;
    const cyCanvas = (cyViewport - frameRect.top) / zoom;

    // offsetWidth/offsetHeight là pre-rotation CSS dimensions
    setSelectionRect({
      x: cxCanvas - el.offsetWidth / 2,
      y: cyCanvas - el.offsetHeight / 2,
      width: el.offsetWidth,
      height: el.offsetHeight,
    });
  }, [selectedNodeIds, zoom, panOffset, document.nodes]);

  // ── Hover rect from DOM ─────────────────────────────────────────────────
  useEffect(() => {
    if (!hoveredNodeId || !canvasFrameRef.current) { setHoverRect(null); return; }
    const el = canvasFrameRef.current.querySelector(`[data-node-id="${hoveredNodeId}"]`) as HTMLElement;
    if (!el) { setHoverRect(null); return; }
    const frameRect = canvasFrameRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setHoverRect({
      x: (elRect.left - frameRect.left) / zoom,
      y: (elRect.top - frameRect.top) / zoom,
      width: elRect.width / zoom,
      height: elRect.height / zoom,
    });
  }, [hoveredNodeId, zoom, panOffset, document.nodes]);

  // ── Resize ───────────────────────────────────────────────────────────────
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
      
      // Apply grid snapping to width and height when grid snapping is enabled
      if (showGrid) {
        width = snapToGrid(width, document.canvasConfig.gridSize);
        height = snapToGrid(height, document.canvasConfig.gridSize);
      }
      
      dispatch({ type: "UPDATE_STYLE", payload: { nodeId: resizing.nodeId, style: { width: `${width}px`, height: `${height}px` }, breakpoint }, groupId: resizing.gestureGroupId, description: "Resize" });
    };
    const handleGlobalMouseUp = () => { setResizing(null); setSnapGuides([]); };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => { window.removeEventListener("mousemove", handleGlobalMouseMove); window.removeEventListener("mouseup", handleGlobalMouseUp); };
  }, [resizing, zoom, breakpoint, dispatch, showGrid, document.canvasConfig.gridSize]);

  // ── Rubber band ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rubberBanding) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!canvasFrameRef.current) return;
      const rect = canvasFrameRef.current.getBoundingClientRect();
      const pt = { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
      setRubberBanding((prev) => prev ? { ...prev, currentPoint: pt } : null);
    };
    const handleGlobalMouseUp = () => setRubberBanding(null);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => { window.removeEventListener("mousemove", handleGlobalMouseMove); window.removeEventListener("mouseup", handleGlobalMouseUp); };
  }, [rubberBanding, zoom]);

  // ── Move with snap ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!moving) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - moving.startPoint.x;
      const dy = e.clientY - moving.startPoint.y;
      const rawLeft = moving.startLeft + dx / zoom;
      const rawTop = moving.startTop + dy / zoom;

      let finalLeft = Math.round(rawLeft);
      let finalTop = Math.round(rawTop);
      let guides: SnapGuide[] = [];

      if (snapEnabled && canvasFrameRef.current) {
        const nodeEl = canvasFrameRef.current.querySelector(`[data-node-id="${moving.nodeId}"]`) as HTMLElement;
        if (nodeEl) {
          const w = nodeEl.offsetWidth;
          const h = nodeEl.offsetHeight;
          const movingRect: Rect = { x: rawLeft, y: rawTop, width: w, height: h };
          const siblings: Rect[] = [];
          const node = document.nodes[moving.nodeId];
          if (node?.parentId && canvasFrameRef.current) {
            for (const n of Object.values(document.nodes) as BuilderNode[]) {
              if (n.parentId === node.parentId && n.id !== moving.nodeId) {
                const el = canvasFrameRef.current.querySelector(`[data-node-id="${n.id}"]`) as HTMLElement;
                if (el) {
                  const fr = canvasFrameRef.current.getBoundingClientRect();
                  const er = el.getBoundingClientRect();
                  siblings.push({ x: (er.left - fr.left) / zoom, y: (er.top - fr.top) / zoom, width: er.width / zoom, height: er.height / zoom });
                }
              }
            }
          }
          const result = snapEngine.snap(movingRect, siblings);
          guides = result.guides;
          finalLeft = Math.round(result.snappedPoint.x);
          finalTop = Math.round(result.snappedPoint.y);
        }
      }

      setSnapGuides(guides);
      dispatch({ type: "UPDATE_STYLE", payload: { nodeId: moving.nodeId, style: { position: "absolute", left: `${finalLeft}px`, top: `${finalTop}px` }, breakpoint }, groupId: moving.gestureGroupId, description: "Move" });
    };
    const handleGlobalMouseUp = () => { setMoving(null); setSnapGuides([]); };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => { window.removeEventListener("mousemove", handleGlobalMouseMove); window.removeEventListener("mouseup", handleGlobalMouseUp); };
  }, [moving, zoom, breakpoint, dispatch, snapEnabled, snapEngine, document.nodes]);

  // ── Rotate ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rotating) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - rotating.centerX;
      const dy = e.clientY - rotating.centerY;
      const currentAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const rotation = Math.round(rotating.initialRotation + (currentAngle - rotating.startAngle));
      dispatch({ type: "UPDATE_STYLE", payload: { nodeId: rotating.nodeId, style: { transform: `rotate(${rotation}deg)` }, breakpoint }, groupId: rotating.gestureGroupId, description: "Rotate" });
    };
    const handleGlobalMouseUp = () => setRotating(null);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => { window.removeEventListener("mousemove", handleGlobalMouseMove); window.removeEventListener("mouseup", handleGlobalMouseUp); };
  }, [rotating, dispatch, breakpoint]);

  // ── Keyboard shortcuts (canvas-focused) ───────────────────────────────────
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }

      if (ctrl && e.key === "c" && selectedNodeId) {
        e.preventDefault();
        const snapshot = collectSubtree(selectedNodeId, document.nodes);
        dispatch({ type: "SET_CLIPBOARD", payload: { data: { nodeIds: [selectedNodeId], operation: "copy", snapshot } }, description: "Copy" });
        return;
      }
      if (ctrl && e.key === "v") {
        e.preventDefault();
        const clipboard = state.editor.clipboard;
        if (!clipboard) return;
        for (const nodeId of clipboard.nodeIds) {
          const src = clipboard.snapshot[nodeId];
          if (!src) continue;
          dispatch({ type: "ADD_NODE", payload: { nodeId: uuidv4(), parentId: src.parentId ?? document.rootNodeId, componentType: src.type, props: src.props, style: src.style }, description: "Paste" });
        }
        return;
      }
      if (ctrl && e.key === "d" && selectedNodeId) {
        e.preventDefault();
        dispatch({ type: "DUPLICATE_NODE", payload: { nodeId: selectedNodeId, offset: { x: 20, y: 20 }, newNodeId: uuidv4() }, description: "Duplicate" });
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId && selectedNodeId !== document.rootNodeId) {
        const active = globalThis.document?.activeElement;
        if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || (active as HTMLElement)?.contentEditable === "true") return;
        e.preventDefault();
        dispatch({ type: "REMOVE_NODE", payload: { nodeId: selectedNodeId }, description: "Delete" });
        return;
      }
      if (e.key === "Escape") { clearSelection(); return; }

      if (selectedNodeId && !ctrl) {
        const step = e.shiftKey ? 10 : 1;
        let dx = 0; let dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          const node = document.nodes[selectedNodeId];
          if (!node) return;
          const left = parseFloat(String(node.style.left ?? "0")) || 0;
          const top = parseFloat(String(node.style.top ?? "0")) || 0;
          dispatch({ type: "UPDATE_STYLE", payload: { nodeId: selectedNodeId, style: { position: "absolute", left: `${left + dx}px`, top: `${top + dy}px` }, breakpoint }, description: "Nudge" });
        }
      }
    };
    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, document.nodes, document.rootNodeId, state.editor.clipboard, undo, redo, dispatch, clearSelection, breakpoint]);

  const canvasConfigParams = useMemo(() => ({ ...document.canvasConfig, showGrid, snapEnabled }), [document.canvasConfig, showGrid, snapEnabled]);

  const currentRotation = useMemo(() => {
    if (!selectedNode?.style.transform) return 0;
    const match = selectedNode.style.transform.match(/rotate\(([-\d.]+)deg\)/);
    return match ? parseFloat(match[1]!) : 0;
  }, [selectedNode?.style.transform]);

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden bg-background relative"
      ref={canvasContainerRef}
      tabIndex={0}
      style={{ outline: "none" }}
      // Outer drop zone so drag-from-palette works even when cursor is over a FloatingPanel (fixed z-40)
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <EditorToolbar
        breakpoint={breakpoint}
        zoom={zoom}
        showGrid={showGrid}
        snapEnabled={snapEnabled}
        canUndo={canUndo}
        canRedo={canRedo}
        activeTool={activeTool}
        onBreakpointChange={setBreakpoint}
        onZoomChange={setZoom}
        onGridToggle={toggleGrid}
        onSnapToggle={toggleSnap}
        onUndo={undo}
        onRedo={redo}
        onToolChange={(tool) => setActiveTool(tool)}
      />

      <FloatingPanel id="components" title="Components" defaultPosition={{ x: 16, y: 64 }}>
        <div className="h-[40vh] min-h-[300px] overflow-hidden">
          <ComponentPalette components={allComponents} onDragStart={handleDragStart} />
        </div>
      </FloatingPanel>

      <FloatingPanel id="layers" title="Layers" defaultPosition={{ x: 16, y: 480 }} defaultExpanded={false}>
        <div className="h-[30vh] min-h-[250px] overflow-hidden">
          <LayerTree document={document} selectedIds={selectedNodeIds} onSelect={select} onToggleHidden={handleToggleHidden} onToggleLocked={handleToggleLocked} />
        </div>
      </FloatingPanel>

      <FloatingPanel id="properties" title="Properties" defaultPosition={{ right: 16, y: 64 }}>
        <div className="h-[75vh] min-h-[500px] max-h-[800px] overflow-hidden flex flex-col">
          <PropertyPanel selectedNode={selectedNode} definition={selectedDefinition} onPropChange={handlePropChange} onStyleChange={handleStyleChange} />
        </div>
      </FloatingPanel>

      <div className="flex flex-col overflow-hidden bg-muted/20 absolute inset-0 z-0">
        <CanvasRoot canvasConfig={canvasConfigParams} zoom={zoom} panOffset={panOffset} onZoomChange={setZoom} onPanOffsetChange={setPanOffset}>
          <div
            ref={canvasFrameRef}
            style={{ width: document.canvasConfig.width ?? 1280, minHeight: document.canvasConfig.height ?? 800, backgroundColor: document.canvasConfig.backgroundColor ?? "#ffffff", position: "relative", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", borderRadius: 4 }}
            onPointerDown={handlePointerDown}
            onMouseOver={handleMouseOver}
            onMouseOut={handleMouseOut}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1200px] border-x border-dashed border-blue-400/20 pointer-events-none z-0" />
            <NodeRenderer nodeId={document.rootNodeId} />
          </div>

          <SelectionOverlay
            selection={{ selectedIds: selectedNodeIds, boundingBox: selectionRect, isRubberBanding: !!rubberBanding, rubberBandRect: rubberBanding ? { x: Math.min(rubberBanding.startPoint.x, rubberBanding.currentPoint.x), y: Math.min(rubberBanding.startPoint.y, rubberBanding.currentPoint.y), width: Math.abs(rubberBanding.currentPoint.x - rubberBanding.startPoint.x), height: Math.abs(rubberBanding.currentPoint.y - rubberBanding.startPoint.y) } : null }}
            zoom={zoom}
            rotation={currentRotation}
            onResizeStart={(handle, e) => {
              if (!selectionRect || !selectedNodeId) return;
              setResizing({ handle, nodeId: selectedNodeId, startPoint: { x: e.clientX, y: e.clientY }, startRect: { ...selectionRect }, gestureGroupId: uuidv4() });
            }}
            onRotateStart={(e) => {
              if (!selectionRect || !selectedNodeId) return;
              const cx = (selectionRect.x + selectionRect.width / 2) * zoom;
              const cy = (selectionRect.y + selectionRect.height / 2) * zoom;
              const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
              setRotating({ nodeId: selectedNodeId, centerX: cx, centerY: cy, startAngle, initialRotation: currentRotation, gestureGroupId: uuidv4() });
            }}
          />

          {hoverRect && <HoverOutline rect={hoverRect} zoom={zoom} />}
          <SnapGuides guides={snapGuides} canvasWidth={document.canvasConfig.width ?? 1280} canvasHeight={document.canvasConfig.height ?? 800} />
        </CanvasRoot>

        {selectedNodeId && selectionRect && (
          <ContextualToolbar
            nodeId={selectedNodeId}
            rect={selectionRect}
            zoom={zoom}
            panOffset={panOffset}
            onDelete={() => dispatch({ type: "REMOVE_NODE", payload: { nodeId: selectedNodeId }, description: "Delete" })}
            onDuplicate={() => dispatch({ type: "DUPLICATE_NODE", payload: { nodeId: selectedNodeId, offset: { x: 20, y: 20 }, newNodeId: uuidv4() }, description: "Duplicate" })}
            onMoveUp={() => {
              const n = document.nodes[selectedNodeId];
              if (!n) return;
              // Sort siblings by effective zIndex, normalize, then swap up
              const siblings = Object.values(document.nodes)
                .filter((s) => s.parentId === n.parentId)
                .sort((a, b) => Number(a.style.zIndex ?? 0) - Number(b.style.zIndex ?? 0));
              const pos = siblings.findIndex((s) => s.id === selectedNodeId);
              if (pos >= siblings.length - 1) return; // already on top
              const above = siblings[pos + 1];
              // Normalize all siblings to sequential zIndex then swap
              siblings.forEach((s, i) => {
                const newZ = i === pos ? pos + 1 : i === pos + 1 ? pos : i;
                dispatch({ type: "UPDATE_STYLE", payload: { nodeId: s.id, style: { zIndex: newZ } }, description: "Move up" });
              });
            }}
            onMoveDown={() => {
              const n = document.nodes[selectedNodeId];
              if (!n) return;
              // Sort siblings by effective zIndex, normalize, then swap down
              const siblings = Object.values(document.nodes)
                .filter((s) => s.parentId === n.parentId)
                .sort((a, b) => Number(a.style.zIndex ?? 0) - Number(b.style.zIndex ?? 0));
              const pos = siblings.findIndex((s) => s.id === selectedNodeId);
              if (pos <= 0) return; // already at bottom
              // Normalize all siblings to sequential zIndex then swap
              siblings.forEach((s, i) => {
                const newZ = i === pos ? pos - 1 : i === pos - 1 ? pos : i;
                dispatch({ type: "UPDATE_STYLE", payload: { nodeId: s.id, style: { zIndex: newZ } }, description: "Move down" });
              });
            }}
            onDragHandlePointerDown={(e) => {
              e.stopPropagation();
              const n = document.nodes[selectedNodeId];
              if (!n || n.locked) return;
              const style = n.style || {};
              const left = parseFloat(String(style.left ?? "0")) || 0;
              const top = parseFloat(String(style.top ?? "0")) || 0;
              setMoving({ nodeId: selectedNodeId, startPoint: { x: e.clientX, y: e.clientY }, startLeft: left, startTop: top, gestureGroupId: uuidv4() });
            }}
          />
        )}

        {rotating !== null && selectionRect && (
          <div className="absolute z-50 bg-background/90 border rounded px-2 py-0.5 text-xs font-mono pointer-events-none" style={{ left: (selectionRect.x + selectionRect.width / 2) * zoom + panOffset.x - 20, top: (selectionRect.y + selectionRect.height) * zoom + panOffset.y + 28 }}>
            {currentRotation}°
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper: collect subtree ────────────────────────────────────────────────
function collectSubtree(
  rootId: string,
  nodes: Record<string, BuilderNode>,
): Record<string, BuilderNode> {
  const result: Record<string, BuilderNode> = {};
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodes[id];
    if (node) {
      result[id] = node;
      for (const n of Object.values(nodes)) {
        if (n.parentId === id) queue.push(n.id);
      }
    }
  }
  return result;
}

// ── Public BuilderEditor ──────────────────────────────────────────────────

export interface BuilderEditorProps {
  builder?: BuilderAPI;
  config?: BuilderConfig;
  className?: string;
}

export function BuilderEditor({ builder, config, className }: BuilderEditorProps) {
  return (
    <BuilderProvider builder={builder} config={config}>
      <div className={cn("h-full w-full", className)}>
        <EditorInner />
      </div>
    </BuilderProvider>
  );
}
