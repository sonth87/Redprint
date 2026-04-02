import React, { useCallback, useMemo, useRef } from "react";
import {
  BuilderProvider,
  useBuilder,
  useSelection,
  useDocument,
  useBreakpoint,
  useHistory,
  NodeRenderer,
} from "@ui-builder/builder-react";
import type { BuilderAPI, BuilderConfig, CanvasConfig, ComponentDefinition } from "@ui-builder/builder-core";
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
import { PageSettings } from "./panels/right/PageSettings";
import { cn } from "@ui-builder/ui";
import { FloatingPanel } from "./panels/FloatingPanel";
import { ContextualToolbar } from "./toolbar/ContextualToolbar";
import { SnapEngine } from "./snap/SnapEngine";
import { v4 as uuidv4 } from "uuid";

import { useViewport } from "./hooks/useViewport";
import { useResizeGesture } from "./hooks/useResizeGesture";
import { useRubberBand } from "./hooks/useRubberBand";
import { useMoveGesture } from "./hooks/useMoveGesture";
import { useRotateGesture } from "./hooks/useRotateGesture";
import { useSelectionRect } from "./hooks/useSelectionRect";
import { useHoverRect } from "./hooks/useHoverRect";
import { useDimensionCapture } from "./hooks/useDimensionCapture";
import { useDragHandlers } from "./hooks/useDragHandlers";
import { usePointerDown } from "./hooks/usePointerDown";
import { useZIndexHandlers } from "./hooks/useZIndexHandlers";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

// ── Inner editor (must be inside BuilderProvider) ─────────────────────────

function EditorInner() {
  const { builder, state, dispatch } = useBuilder();
  const { selectedNodeIds, select, clearSelection } = useSelection();
  const { document } = useDocument();
  const { breakpoint, setBreakpoint } = useBreakpoint();
  const { undo, redo, canUndo, canRedo } = useHistory();

  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── Viewport ─────────────────────────────────────────────────────────────
  const {
    zoom, setZoom,
    panOffset, setPanOffset,
    activeTool, setActiveTool,
    showGrid, toggleGrid,
  } = useViewport();

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedNodeId = selectedNodeIds[0] ?? null;
  const selectedNode = selectedNodeId ? (document.nodes[selectedNodeId] ?? null) : null;
  const registry = builder?.registry;
  const selectedDefinition = selectedNode && registry ? (registry.getComponent(selectedNode.type) ?? null) : null;
  const allComponents: ComponentDefinition[] = registry ? registry.listComponents() : [];

  // ── Snap engine ──────────────────────────────────────────────────────────
  const snapEngine = useMemo(
    () =>
      new SnapEngine({
        gridSize: document.canvasConfig.gridSize,
        snapEnabled: showGrid,
        snapToGrid: showGrid,
        snapToComponents: document.canvasConfig.snapToComponents,
        threshold: document.canvasConfig.snapThreshold,
      }),
    [document.canvasConfig, showGrid],
  );

  // ── Gesture hooks ────────────────────────────────────────────────────────
  const {
    setResizing,
    snapGuides: resizeSnapGuides,
  } = useResizeGesture({
    zoom, breakpoint,
    showGrid, gridSize: document.canvasConfig.gridSize,
    dispatch,
  });

  const {
    rubberBanding, setRubberBanding,
    rubberBandRect,
  } = useRubberBand({ zoom, canvasFrameRef });

  const {
    moving, setMoving,
    dragStartedRef,
    snapGuides: moveSnapGuides,
  } = useMoveGesture({
    zoom, breakpoint,
    snapEnabled: showGrid, snapEngine,
    nodes: document.nodes,
    canvasFrameRef,
    dispatch,
  });

  const snapGuides = moving ? moveSnapGuides : resizeSnapGuides;

  const { rotating, startRotate } = useRotateGesture({ breakpoint, dispatch });

  // ── DOM observation hooks ────────────────────────────────────────────────
  const { selectionRect, currentRotation } = useSelectionRect({
    selectedNodeIds,
    zoom,
    panOffset,
    nodes: document.nodes,
    canvasFrameRef,
  });

  const { hoverRect, handleMouseOver, handleMouseOut } = useHoverRect({
    selectedNodeIds,
    rootNodeId: document.rootNodeId,
    zoom,
    panOffset,
    nodes: document.nodes,
    canvasFrameRef,
  });

  useDimensionCapture({
    nodes: document.nodes,
    breakpoint,
    canvasFrameRef,
    dispatch,
  });

  // ── Interaction handlers ─────────────────────────────────────────────────
  const { handleDragStart, handleDrop, handleDragOver, handleDragEnter } = useDragHandlers({
    rootNodeId: document.rootNodeId,
    zoom,
    canvasFrameRef,
    dispatch,
  });

  const { handlePointerDown } = usePointerDown({
    activeTool, zoom,
    rootNodeId: document.rootNodeId,
    nodes: document.nodes,
    canvasFrameRef,
    dragStartedRef,
    dispatch,
    clearSelection,
    setMoving,
    setRubberBanding,
  });

  const handleCanvasConfigChange = useCallback(
    (key: keyof CanvasConfig, value: unknown) => {
      dispatch({
        type: "UPDATE_CANVAS_CONFIG",
        payload: { config: { [key]: value } },
        description: "Update page settings",
      });
    },
    [dispatch],
  );

  const { onMoveUp, onMoveDown } = useZIndexHandlers({
    selectedNodeId,
    nodes: document.nodes,
    dispatch,
  });

  useKeyboardShortcuts({
    selectedNodeId,
    rootNodeId: document.rootNodeId,
    nodes: document.nodes,
    clipboard: state.editor.clipboard,
    breakpoint,
    canvasContainerRef,
    dispatch,
    clearSelection,
    undo,
    redo,
  });

  // ── Layer tree handlers ─────────────────────────────────────────────────
  const handleToggleHidden = useCallback(
    (nodeId: string) => {
      const node = document.nodes[nodeId];
      if (!node) return;
      dispatch({
        type: node.hidden ? "SHOW_NODE" : "HIDE_NODE",
        payload: { nodeId },
        description: node.hidden ? "Show" : "Hide",
      });
    },
    [document.nodes, dispatch],
  );

  const handleToggleLocked = useCallback(
    (nodeId: string) => {
      const node = document.nodes[nodeId];
      if (!node) return;
      dispatch({
        type: node.locked ? "UNLOCK_NODE" : "LOCK_NODE",
        payload: { nodeId },
        description: node.locked ? "Unlock" : "Lock",
      });
    },
    [document.nodes, dispatch],
  );

  // ── Property change handlers ─────────────────────────────────────────────
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
        payload: { nodeId: selectedNodeId, style: { [key]: value } as never, breakpoint },
        description: `Set style.${key}`,
      });
    },
    [selectedNodeId, breakpoint, dispatch],
  );

  // ── Drag handle from ContextualToolbar ──────────────────────────────────
  const handleDragHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!selectedNodeId) return;
      e.stopPropagation();
      const n = document.nodes[selectedNodeId];
      if (!n || n.locked) return;
      const style = n.style || {};
      let startLeft: number;
      let startTop: number;
      if (style.position === "absolute") {
        startLeft = parseFloat(String(style.left ?? "0")) || 0;
        startTop = parseFloat(String(style.top ?? "0")) || 0;
      } else if (canvasFrameRef.current) {
        const el = canvasFrameRef.current.querySelector(
          `[data-node-id="${selectedNodeId}"]`
        ) as HTMLElement;
        if (el) {
          const frameRect = canvasFrameRef.current.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          startLeft = (elRect.left - frameRect.left) / zoom;
          startTop = (elRect.top - frameRect.top) / zoom;
        } else {
          startLeft = 0;
          startTop = 0;
        }
      } else {
        startLeft = 0;
        startTop = 0;
      }
      const el = canvasFrameRef.current?.querySelector(
        `[data-node-id="${selectedNodeId}"]`
      ) as HTMLElement | null;
      dragStartedRef.current = false;
      setMoving({
        nodeId: selectedNodeId,
        startPoint: { x: e.clientX, y: e.clientY },
        startLeft,
        startTop,
        startWidth: el?.offsetWidth,
        startHeight: el?.offsetHeight,
        wasAbsolute: style.position === "absolute",
        gestureGroupId: uuidv4(),
      });
    },
    [selectedNodeId, document.nodes, zoom, canvasFrameRef, dragStartedRef, setMoving],
  );

  const canvasConfigParams = useMemo(
    () => ({ ...document.canvasConfig, showGrid, snapEnabled: showGrid }),
    [document.canvasConfig, showGrid],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden bg-background relative"
      ref={canvasContainerRef}
      tabIndex={0}
      style={{ outline: "none" }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <EditorToolbar
        breakpoint={breakpoint}
        zoom={zoom}
        showGrid={showGrid}
        canUndo={canUndo}
        canRedo={canRedo}
        activeTool={activeTool}
        onBreakpointChange={setBreakpoint}
        onZoomChange={setZoom}
        onGridToggle={toggleGrid}
        onUndo={undo}
        onRedo={redo}
        onToolChange={(tool) => {
          setActiveTool(tool);
          if (tool === "pan") {
            clearSelection();
          }
        }}
      />

      <FloatingPanel id="components" title="Components" defaultPosition={{ x: 16, y: 64 }}>
        <div className="h-[40vh] min-h-[300px] overflow-hidden">
          <ComponentPalette components={allComponents} onDragStart={handleDragStart} />
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

      <FloatingPanel id="properties" title={selectedNode ? "Properties" : "Page Settings"} defaultPosition={{ right: 16, y: 64 }}>
        <div className="h-[75vh] min-h-[500px] max-h-[800px] overflow-hidden flex flex-col">
          {selectedNode ? (
            <PropertyPanel
              selectedNode={selectedNode}
              definition={selectedDefinition}
              onPropChange={handlePropChange}
              onStyleChange={handleStyleChange}
            />
          ) : (
            <PageSettings
              document={document}
              onCanvasConfigChange={handleCanvasConfigChange}
            />
          )}
        </div>
      </FloatingPanel>

      <div
        className="flex flex-col overflow-hidden bg-muted/20 absolute inset-0 z-0"
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            canvasFrameRef.current?.contains(target) ||
            target.closest("[data-resize-handle]") ||
            target.closest("[data-rotation-handle]")
          ) return;
          clearSelection();
        }}
      >
        <CanvasRoot
          canvasConfig={canvasConfigParams}
          zoom={zoom}
          panOffset={panOffset}
          onZoomChange={setZoom}
          onPanOffsetChange={setPanOffset}
          activeTool={activeTool}
        >
          <div
            ref={canvasFrameRef}
            style={{
              width: document.canvasConfig.width ?? 1280,
              minHeight: document.canvasConfig.height ?? 800,
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
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1200px] border-x border-dashed border-blue-400/20 pointer-events-none z-0" />
            <NodeRenderer nodeId={document.rootNodeId} />
          </div>

          <SelectionOverlay
            selection={{
              selectedIds: selectedNodeIds,
              boundingBox: selectionRect,
              isRubberBanding: !!rubberBanding,
              rubberBandRect,
            }}
            zoom={zoom}
            rotation={currentRotation}
            onResizeStart={(handle, e) => {
              if (!selectionRect || !selectedNodeId) return;
              setResizing({
                handle,
                nodeId: selectedNodeId,
                startPoint: { x: e.clientX, y: e.clientY },
                startRect: { ...selectionRect },
                gestureGroupId: uuidv4(),
              });
            }}
            onRotateStart={(e) => {
              if (!selectionRect || !selectedNodeId || !canvasFrameRef.current) return;
              const el = canvasFrameRef.current.querySelector(
                `[data-node-id="${selectedNodeId}"]`
              ) as HTMLElement;
              if (!el) return;
              startRotate({
                nodeId: selectedNodeId,
                clientX: e.clientX,
                clientY: e.clientY,
                elementRect: el.getBoundingClientRect(),
                currentRotation,
                gestureGroupId: uuidv4(),
              });
            }}
          />

          {hoverRect && <HoverOutline rect={hoverRect} zoom={zoom} />}
          <SnapGuides
            guides={snapGuides}
            canvasWidth={document.canvasConfig.width ?? 1280}
            canvasHeight={document.canvasConfig.height ?? 800}
          />
        </CanvasRoot>

        {selectedNodeId && selectionRect && (
          <ContextualToolbar
            nodeId={selectedNodeId}
            rect={selectionRect}
            zoom={zoom}
            panOffset={panOffset}
            onDelete={() =>
              dispatch({
                type: "REMOVE_NODE",
                payload: { nodeId: selectedNodeId },
                description: "Delete",
              })
            }
            onDuplicate={() =>
              dispatch({
                type: "DUPLICATE_NODE",
                payload: {
                  nodeId: selectedNodeId,
                  offset: { x: 20, y: 20 },
                  newNodeId: uuidv4(),
                },
                description: "Duplicate",
              })
            }
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDragHandlePointerDown={handleDragHandlePointerDown}
          />
        )}

        {rotating !== null && selectionRect && (
          <div
            className="absolute z-50 bg-background/90 border rounded px-2 py-0.5 text-xs font-mono pointer-events-none"
            style={{
              left: (selectionRect.x + selectionRect.width / 2) * zoom + panOffset.x - 20,
              top: (selectionRect.y + selectionRect.height) * zoom + panOffset.y + 28,
            }}
          >
            {currentRotation}°
          </div>
        )}
      </div>
    </div>
  );
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
