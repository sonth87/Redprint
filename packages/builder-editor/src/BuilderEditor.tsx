import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BuilderProvider,
  useBuilder,
  useSelection,
  useDocument,
  useBreakpoint,
  useHistory,
  NodeRenderer,
  BreakpointOverrideProvider,
} from "@ui-builder/builder-react";
import {
  DEVICE_VIEWPORT_PRESETS,
  type BuilderAPI,
  type BuilderConfig,
  type CanvasConfig,
  type CanvasMode,
  type ComponentDefinition,
} from "@ui-builder/builder-core";
import { Monitor, Smartphone, GripVertical } from "lucide-react";
import { CanvasRoot } from "./canvas/CanvasRoot";
import { SelectionOverlay, SnapGuides, HoverOutline } from "./overlay/EditorOverlay";
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

  const canvasMode: CanvasMode = state.editor.canvasMode ?? "single";

  const setCanvasMode = useCallback(
    (mode: CanvasMode) => {
      dispatch({
        type: "SET_CANVAS_MODE",
        payload: { canvasMode: mode },
        description: "Toggle canvas mode",
      });
    },
    [dispatch],
  );

  const toggleCanvasMode = useCallback(
    () => setCanvasMode(canvasMode === "dual" ? "single" : "dual"),
    [canvasMode, setCanvasMode],
  );

  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const mobileFrameRef = useRef<HTMLDivElement>(null);
  // Always points to the frame the user is actively editing.
  // Desktop (canvasFrameRef) doubles as the canvas-space coordinate origin for overlays.
  const activeFrameRef = useRef<HTMLDivElement | null>(null);
  activeFrameRef.current =
    canvasMode === "dual" && breakpoint === "mobile" && mobileFrameRef.current
      ? mobileFrameRef.current
      : canvasFrameRef.current;

  // ── Canvas frame dimensions based on active breakpoint ───────────────────
  const canvasWidth =
    breakpoint === "desktop"
      ? (document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width)
      : (DEVICE_VIEWPORT_PRESETS[breakpoint]?.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width);
  const canvasMinHeight =
    breakpoint === "desktop"
      ? (document.canvasConfig.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height)
      : (DEVICE_VIEWPORT_PRESETS[breakpoint]?.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height);

  // Auto-fit zoom when switching to a narrower device
  const prevBreakpointRef = useRef<string>(breakpoint);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (prevBreakpointRef.current === breakpoint) return;
    prevBreakpointRef.current = breakpoint;
    clearSelection();
    // Don't auto-fit in dual mode — both artboards are fixed-size side-by-side
    if (canvasMode === "dual") return;
    if (canvasContainerRef.current) {
      const containerWidth = canvasContainerRef.current.offsetWidth;
      const containerHeight = canvasContainerRef.current.offsetHeight;
      const fitZoom = Math.min((containerWidth - 64) / canvasWidth, 1);
      const actualZoom = Math.max(0.25, parseFloat(fitZoom.toFixed(2)));
      setZoom(actualZoom);
      const centeredX = Math.max(32, (containerWidth - canvasWidth * actualZoom) / 2);
      const centeredY = Math.max(32, (containerHeight - canvasMinHeight * actualZoom) / 4);
      setPanOffset({ x: centeredX, y: centeredY });
    }
  }, [breakpoint, canvasWidth, canvasMinHeight, canvasMode, clearSelection]);

  // ── Viewport ─────────────────────────────────────────────────────────────
  const {
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    activeTool,
    setActiveTool,
    showGrid,
    toggleGrid,
  } = useViewport();

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedNodeId = selectedNodeIds[0] ?? null;
  const selectedNode = selectedNodeId ? (document.nodes[selectedNodeId] ?? null) : null;
  const registry = builder?.registry;
  const selectedDefinition =
    selectedNode && registry ? (registry.getComponent(selectedNode.type) ?? null) : null;
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
  const { setResizing, snapGuides: resizeSnapGuides } = useResizeGesture({
    zoom,
    breakpoint,
    showGrid,
    gridSize: document.canvasConfig.gridSize,
    dispatch,
  });

  const { rubberBanding, setRubberBanding, rubberBandRect } = useRubberBand({
    zoom,
    canvasFrameRef,
  });

  const {
    moving,
    setMoving,
    dragStartedRef,
    snapGuides: moveSnapGuides,
  } = useMoveGesture({
    zoom,
    breakpoint,
    snapEnabled: showGrid,
    snapEngine,
    nodes: document.nodes,
    canvasFrameRef,
    activeFrameRef,
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
    nodeQueryRef: activeFrameRef,
  });

  const { hoverRect, handleMouseOver, handleMouseOut } = useHoverRect({
    selectedNodeIds,
    rootNodeId: document.rootNodeId,
    zoom,
    panOffset,
    nodes: document.nodes,
    canvasFrameRef,
    nodeQueryRef: activeFrameRef,
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
    activeTool,
    zoom,
    rootNodeId: document.rootNodeId,
    nodes: document.nodes,
    canvasFrameRef,
    activeFrameRef,
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
    setBreakpoint,
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
      if (!breakpoint || breakpoint === "desktop") {
        dispatch({
          type: "UPDATE_PROPS",
          payload: { nodeId: selectedNodeId, props: { [key]: value } },
          description: `Set ${key}`,
        });
      } else {
        dispatch({
          type: "UPDATE_RESPONSIVE_PROPS",
          payload: { nodeId: selectedNodeId, breakpoint, props: { [key]: value } },
          description: `Set ${key}`,
        });
      }
    },
    [selectedNodeId, breakpoint, dispatch],
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
      } else if (activeFrameRef.current) {
        const frameEl = activeFrameRef.current;
        const el = frameEl.querySelector(`[data-node-id="${selectedNodeId}"]`) as HTMLElement;
        if (el) {
          const frameRect = frameEl.getBoundingClientRect();
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
      const frameEl = activeFrameRef.current ?? canvasFrameRef.current;
      const el = frameEl?.querySelector(`[data-node-id="${selectedNodeId}"]`) as HTMLElement | null;
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
    [
      selectedNodeId,
      document.nodes,
      zoom,
      activeFrameRef,
      canvasFrameRef,
      dragStartedRef,
      setMoving,
    ],
  );

  const canvasConfigParams = useMemo(
    () => ({ ...document.canvasConfig, showGrid, snapEnabled: showGrid }),
    [document.canvasConfig, showGrid],
  );

  // ── Mobile frame drag offset ─────────────────────────────────────────────
  const [mobileFramePos, setMobileFramePos] = React.useState({ x: 0, y: 0 });
  const handleMobileFrameGripDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = mobileFramePos.x;
      const startPosY = mobileFramePos.y;
      const capturedZoom = zoom;
      const onMove = (ev: MouseEvent) => {
        setMobileFramePos({
          x: startPosX + (ev.clientX - startX) / capturedZoom,
          y: startPosY + (ev.clientY - startY) / capturedZoom,
        });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [mobileFramePos.x, mobileFramePos.y, zoom],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="bg-background relative flex h-full w-full flex-col overflow-hidden"
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
        canvasMode={canvasMode}
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
        onCanvasModeToggle={toggleCanvasMode}
      />

      <FloatingPanel id="components" title="Components" defaultPosition={{ x: 16, y: 64 }}>
        <div className="h-[40vh] min-h-[300px] overflow-hidden">
          <ComponentPalette components={allComponents} onDragStart={handleDragStart} />
        </div>
      </FloatingPanel>

      <FloatingPanel
        id="layers"
        title="Layers"
        defaultPosition={{ x: 16, y: 480 }}
        defaultExpanded={false}
      >
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

      <FloatingPanel
        id="properties"
        title={selectedNode ? "Properties" : "Page Settings"}
        defaultPosition={{ right: 16, y: 64 }}
      >
        <div className="flex h-[75vh] max-h-[800px] min-h-[500px] flex-col overflow-hidden">
          {selectedNode ? (
            <PropertyPanel
              selectedNode={selectedNode}
              definition={selectedDefinition}
              breakpoint={breakpoint}
              onPropChange={handlePropChange}
              onStyleChange={handleStyleChange}
            />
          ) : (
            <PageSettings document={document} onCanvasConfigChange={handleCanvasConfigChange} />
          )}
        </div>
      </FloatingPanel>

      <div
        className="bg-muted/20 absolute inset-0 z-0 overflow-hidden"
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            canvasFrameRef.current?.contains(target) ||
            mobileFrameRef.current?.contains(target) ||
            target.closest("[data-resize-handle]") ||
            target.closest("[data-rotation-handle]")
          )
            return;
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
          className="h-full w-full"
        >
          {/* Both artboards live inside the same transform — share zoom/pan */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: canvasMode === "dual" ? 120 : 0,
            }}
          >
            {/* ── Desktop frame (primary in single; always left in dual) ─── */}
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
              {canvasMode === "dual" ? (
                <BreakpointOverrideProvider breakpoint="desktop">
                  <div
                    style={{
                      marginBottom: 8,
                      fontSize: 11,
                      color: "hsl(var(--muted-foreground))",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      userSelect: "none",
                      cursor: "pointer",
                    }}
                    onClick={() => setBreakpoint("desktop")}
                  >
                    <Monitor size={11} />
                    <span>Desktop</span>
                    <span style={{ opacity: 0.5 }}>
                      · {document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width}px
                    </span>
                    {breakpoint === "desktop" && (
                      <span
                        style={{
                          fontSize: 9,
                          background: "hsl(221.2 83.2% 53.3% / 0.12)",
                          color: "hsl(221.2 83.2% 53.3%)",
                          padding: "1px 5px",
                          borderRadius: 3,
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <div
                    ref={canvasFrameRef}
                    style={{
                      width: document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width,
                      minHeight:
                        document.canvasConfig.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height,
                      backgroundColor: document.canvasConfig.backgroundColor ?? "#ffffff",
                      position: "relative",
                      boxShadow:
                        breakpoint === "desktop"
                          ? "0 4px 24px rgba(0,0,0,0.12), 0 0 0 2px hsl(221.2 83.2% 53.3%)"
                          : "0 4px 24px rgba(0,0,0,0.12)",
                      borderRadius: 4,
                      transition: "box-shadow 0.15s ease",
                    }}
                    onPointerDown={(e) => {
                      setBreakpoint("desktop");
                      handlePointerDown(e);
                    }}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[1200px] -translate-x-1/2 border-x border-dashed border-blue-400/20" />
                    <NodeRenderer nodeId={document.rootNodeId} />
                  </div>
                </BreakpointOverrideProvider>
              ) : (
                <div
                  ref={canvasFrameRef}
                  style={{
                    width: canvasWidth,
                    minHeight: canvasMinHeight,
                    backgroundColor: document.canvasConfig.backgroundColor ?? "#ffffff",
                    position: "relative",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                    borderRadius: 4,
                    transition: "width 0.25s ease, min-height 0.25s ease, box-shadow 0.15s ease",
                  }}
                  onPointerDown={handlePointerDown}
                  onMouseOver={handleMouseOver}
                  onMouseOut={handleMouseOut}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[1200px] -translate-x-1/2 border-x border-dashed border-blue-400/20" />
                  <NodeRenderer nodeId={document.rootNodeId} />
                </div>
              )}
            </div>

            {/* ── Mobile frame (always right, dual mode only) ─── */}
            {canvasMode === "dual" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexShrink: 0,
                  position: "relative",
                  top: mobileFramePos.y,
                  left: mobileFramePos.x,
                }}
              >
                <div
                  style={{
                    marginBottom: 8,
                    fontSize: 11,
                    color: "hsl(var(--muted-foreground))",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    userSelect: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => setBreakpoint("mobile")}
                >
                  <div
                    style={{
                      cursor: "grab",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 2px",
                      marginRight: 2,
                      opacity: 0.5,
                    }}
                    onMouseDown={handleMobileFrameGripDown}
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to reposition"
                    className="duration-200 hover:scale-150"
                  >
                    <GripVertical size={11} />
                  </div>
                  <Smartphone size={11} />
                  <span>Mobile</span>
                  <span style={{ opacity: 0.5 }}>· {DEVICE_VIEWPORT_PRESETS.mobile.width}px</span>
                  {breakpoint === "mobile" && (
                    <span
                      style={{
                        fontSize: 9,
                        background: "hsl(221.2 83.2% 53.3% / 0.12)",
                        color: "hsl(221.2 83.2% 53.3%)",
                        padding: "1px 5px",
                        borderRadius: 3,
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <BreakpointOverrideProvider breakpoint="mobile">
                  <div
                    ref={mobileFrameRef}
                    style={{
                      width: DEVICE_VIEWPORT_PRESETS.mobile.width,
                      minHeight: DEVICE_VIEWPORT_PRESETS.mobile.height,
                      backgroundColor: document.canvasConfig.backgroundColor ?? "#ffffff",
                      position: "relative",
                      boxShadow:
                        breakpoint === "mobile"
                          ? "0 4px 24px rgba(0,0,0,0.12), 0 0 0 2px hsl(221.2 83.2% 53.3%)"
                          : "0 4px 24px rgba(0,0,0,0.12)",
                      borderRadius: 4,
                      transition: "box-shadow 0.15s ease",
                    }}
                    onPointerDown={(e) => {
                      setBreakpoint("mobile");
                      handlePointerDown(e);
                    }}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <NodeRenderer nodeId={document.rootNodeId} mode="editor" />
                  </div>
                </BreakpointOverrideProvider>
              </div>
            )}
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
              if (!selectionRect || !selectedNodeId) return;
              const queryRoot = activeFrameRef.current ?? canvasFrameRef.current;
              if (!queryRoot) return;
              const el = queryRoot.querySelector(
                `[data-node-id="${selectedNodeId}"]`,
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
            canvasWidth={canvasWidth}
            canvasHeight={canvasMinHeight}
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
            className="bg-background/90 pointer-events-none absolute z-50 rounded border px-2 py-0.5 font-mono text-xs"
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
