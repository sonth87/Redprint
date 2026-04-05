import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type GroupRegistry,
  CMD_ENTER_TEXT_EDIT,
  CMD_EXIT_TEXT_EDIT,
} from "@ui-builder/builder-core";
import type { Editor as TiptapEditor } from "@tiptap/react";
import {
  MIN_ZOOM,
  FIT_TO_SCREEN_PADDING,
  CANVAS_CENTER_OFFSET,
  VERTICAL_CENTER_DIVISOR,
  DEFAULT_SECTION_HEIGHT_PX,
  TRANSITION_FAST_CSS,
  TRANSITION_MID_CSS,
} from "@ui-builder/shared";
import { Monitor, Smartphone, GripVertical } from "lucide-react";
import { CanvasRoot } from "./canvas/CanvasRoot";
import { SelectionOverlay, SnapGuides, CanvasHelperLines, HoverOutline, DistanceGuides, LiveDimensionsDisplay } from "./overlay/EditorOverlay";
import { SectionOverlay } from "./overlay/SectionOverlay";
import { SectionToolbar } from "./overlay/SectionToolbar";
import { EditorToolbar } from "./toolbar/EditorToolbar";
import { ComponentPalette } from "./panels/left/ComponentPalette";
import { TextEditToolbar } from "./toolbar/TextEditToolbar";
import { InlineTextEditor } from "./canvas/InlineTextEditor";
import { LayerTree } from "./panels/bottom/LayerTree";
import { PropertyPanel } from "./panels/right/PropertyPanel";
import { PageSettings } from "./panels/right/PageSettings";
import { cn } from "@ui-builder/ui";
import { FloatingPanel } from "./panels/FloatingPanel";
import { ContextualToolbar } from "./toolbar/ContextualToolbar";
import { SnapEngine } from "./snap/SnapEngine";
import { v4 as uuidv4 } from "uuid";
import {
  DEFAULT_COMPONENTS_PANEL_POS,
  DEFAULT_LAYERS_PANEL_POS,
  DEFAULT_PROPERTIES_PANEL_POS,
} from "./constants";

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
import { useSectionResize } from "./hooks/useSectionResize";
import { AIAssistant } from "./ai/AIAssistant";
import { AIConfigPanel } from "./ai/AIConfig";
import { buildAIContext } from "./ai/buildAIContext";
import { AIConfigProvider } from "./ai/AIConfigContext";
import type { AIConfig } from "./ai/types";

// ── Inner editor (must be inside BuilderProvider) ─────────────────────────

function EditorInner({ groupRegistry }: { groupRegistry?: GroupRegistry }) {
  const { builder, state, dispatch } = useBuilder();
  const { selectedNodeIds, select, clearSelection } = useSelection();
  const { document } = useDocument();
  const { breakpoint, setBreakpoint } = useBreakpoint();
  const { undo, redo, canUndo, canRedo } = useHistory();

  const canvasMode: CanvasMode = state.editor.canvasMode ?? "single";

  // ── Inline text edit state ────────────────────────────────────────────────
  const editingNodeId  = state.editor.editingNodeId  ?? null;
  const editingPropKey = state.editor.editingPropKey ?? null;
  const [tiptapEditor, setTiptapEditor] = useState<TiptapEditor | null>(null);
  /** Live canvas-space rect updated by InlineTextEditor's ResizeObserver */
  const [editingOverrideRect, setEditingOverrideRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Clear overrides when exiting text edit mode
  useEffect(() => {
    if (!editingNodeId) {
      setTiptapEditor(null);
      setEditingOverrideRect(null);
    }
  }, [editingNodeId]);

  // ── AI assistant state ────────────────────────────────────────────────────
  const [aiOpen, setAiOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    try {
      const stored = localStorage.getItem("ui-builder:ai-config");
      if (stored) return JSON.parse(stored) as AIConfig;
    } catch {
      // ignore
    }
    return { provider: "openai", apiKey: "", model: "gpt-4o-mini", temperature: 0.7, maxTokens: 2048 };
  });

  const handleAIConfigChange = useCallback((config: AIConfig) => {
    setAiConfig(config);
    try {
      localStorage.setItem("ui-builder:ai-config", JSON.stringify(config));
    } catch {
      // ignore storage errors
    }
  }, []);

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

  // Sections drive canvas height: sum of each section's minHeight, fallback to config
  const sectionNodes = useMemo(
    () =>
      Object.values(document.nodes)
        .filter((n) => n.parentId === document.rootNodeId && n.type === "Section")
        .sort((a, b) => a.order - b.order),
    [document.nodes, document.rootNodeId],
  );
  const sectionsTotalHeight = useMemo(() => {
    if (sectionNodes.length === 0) return 0;
    return sectionNodes.reduce((sum, n) => {
      const h = typeof n.props.minHeight === "number" ? n.props.minHeight : DEFAULT_SECTION_HEIGHT_PX;
      return sum + h;
    }, 0);
  }, [sectionNodes]);
  const canvasMinHeight =
    sectionsTotalHeight > 0
      ? sectionsTotalHeight
      : breakpoint === "desktop"
        ? (document.canvasConfig.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height)
        : (DEVICE_VIEWPORT_PRESETS[breakpoint]?.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height);

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
      const fitZoom = Math.min((containerWidth - FIT_TO_SCREEN_PADDING) / canvasWidth, 1);
      const actualZoom = Math.max(MIN_ZOOM, parseFloat(fitZoom.toFixed(2)));
      setZoom(actualZoom);
      const centeredX = Math.max(CANVAS_CENTER_OFFSET, (containerWidth - canvasWidth * actualZoom) / 2);
      const centeredY = Math.max(CANVAS_CENTER_OFFSET, (containerHeight - canvasMinHeight * actualZoom) / VERTICAL_CENTER_DIVISOR);
      setPanOffset({ x: centeredX, y: centeredY });
    }
  // setZoom/setPanOffset are stable useState setters — adding them satisfies exhaustive-deps
  }, [breakpoint, canvasWidth, canvasMinHeight, canvasMode, clearSelection, setZoom, setPanOffset]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedNodeId = selectedNodeIds[0] ?? null;
  const selectedNode = selectedNodeId ? (document.nodes[selectedNodeId] ?? null) : null;
  const registry = builder?.registry;
  const selectedDefinition =
    selectedNode && registry ? (registry.getComponent(selectedNode.type) ?? null) : null;
  const allComponents: ComponentDefinition[] = registry ? registry.listComponents() : [];
  const aiContext = useMemo(() => buildAIContext(state, allComponents), [state, allComponents]);

  // ── Snap engine ──────────────────────────────────────────────────────────
  const snapEngine = useMemo(
    () =>
      new SnapEngine({
        gridSize: document.canvasConfig.gridSize,
        snapEnabled: showGrid,
        snapToGrid: showGrid,
        snapToComponents: document.canvasConfig.snapToComponents,
        threshold: document.canvasConfig.snapThreshold,
        canvasWidth,
        canvasHeight: canvasMinHeight,
      }),
    [document.canvasConfig, showGrid, canvasWidth, canvasMinHeight],
  );

  // ── Gesture hooks ────────────────────────────────────────────────────────
  const {
    setResizing,
    snapGuides: resizeSnapGuides,
    distanceGuides: resizeDistanceGuides,
    liveDimensions: resizeLiveDimensions,
  } = useResizeGesture({
    zoom,
    breakpoint,
    showGrid,
    gridSize: document.canvasConfig.gridSize,
    snapEngine,
    nodes: document.nodes,
    canvasFrameRef,
    activeFrameRef,
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
    distanceGuides: moveDistanceGuides,
    liveDimensions: moveLiveDimensions,
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
  const distanceGuides = moving ? moveDistanceGuides : resizeDistanceGuides;
  const liveDimensions = moving ? moveLiveDimensions : resizeLiveDimensions;

  const { rotating, startRotate } = useRotateGesture({ breakpoint, dispatch });

  // ── Section resize ───────────────────────────────────────────────────────
  const { sectionResizing, startSectionResize } = useSectionResize({
    zoom,
    showGrid,
    gridSize: document.canvasConfig.gridSize,
    breakpoint,
    dispatch,
  });

  // ── DOM observation hooks ────────────────────────────────────────────────
  const { selectionRect: selectionRectRaw, currentRotation } = useSelectionRect({
    selectedNodeIds,
    zoom,
    panOffset,
    nodes: document.nodes,
    canvasFrameRef,
    nodeQueryRef: activeFrameRef,
  });

  // While inline editing, use the live rect from ResizeObserver so handles
  // track content-height changes; otherwise use the normal computed rect.
  const selectionRect = editingNodeId
    ? (editingOverrideRect ?? selectionRectRaw)
    : selectionRectRaw;

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

  // ── Inline text edit handlers ────────────────────────────────────────────
  const handleInlineCommit = useCallback(
    (html: string) => {
      if (!editingNodeId || !editingPropKey) return;
      dispatch({
        type: "UPDATE_PROPS",
        payload: { nodeId: editingNodeId, props: { [editingPropKey]: html } },
        description: `Update ${editingPropKey}`,
      });
    },
    [editingNodeId, editingPropKey, dispatch],
  );

  const handleInlineExit = useCallback(() => {
    setTiptapEditor(null);
    dispatch({
      type: CMD_EXIT_TEXT_EDIT,
      payload: {},
      description: "Exit text edit",
    });
  }, [dispatch]);

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (editingNodeId) return; // already editing
      const target = e.target as HTMLElement;
      const el = target.closest("[data-node-id]") as HTMLElement | null;
      if (!el) return;
      const nodeId = el.dataset.nodeId!;
      const node = document.nodes[nodeId];
      if (!node) return;
      const def = registry?.getComponent(node.type);
      if (!def?.capabilities.inlineEditable) return;
      const richtextProp = def.propSchema.find((p) => p.type === "richtext");
      if (!richtextProp) return;
      e.stopPropagation();
      dispatch({
        type: CMD_ENTER_TEXT_EDIT,
        payload: { nodeId, propKey: richtextProp.key },
        description: "Enter text edit",
      });
    },
    [editingNodeId, document.nodes, registry, dispatch],
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

  // ── Section helpers ──────────────────────────────────────────────────────
  const selectedSectionNode =
    selectedNodeId && document.nodes[selectedNodeId]?.type === "Section"
      ? document.nodes[selectedNodeId]
      : null;

  const handleAddSection = useCallback(
    (afterOrder: number) => {
      const newId = uuidv4();
      dispatch({
        type: "ADD_NODE",
        payload: {
          nodeId: newId,
          parentId: document.rootNodeId,
          componentType: "Section",
          props: { minHeight: DEFAULT_SECTION_HEIGHT_PX },
          style: {
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minHeight: "400px",
            position: "relative",
            backgroundColor: "#ffffff",
          },
          insertIndex: afterOrder + 1,
        },
        description: "Add section",
      });
    },
    [dispatch, document.rootNodeId],
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
    <AIConfigProvider config={aiConfig}>
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
        onAIOpen={() => setAiOpen(true)}
      />

      <FloatingPanel id="components" title="Components" defaultPosition={DEFAULT_COMPONENTS_PANEL_POS}>
        <div className="h-[40vh] min-h-[300px] overflow-hidden">
          <ComponentPalette components={allComponents} onDragStart={handleDragStart} groupRegistry={groupRegistry} />
        </div>
      </FloatingPanel>

      <FloatingPanel
        id="layers"
        title="Layers"
        defaultPosition={DEFAULT_LAYERS_PANEL_POS}
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
        defaultPosition={DEFAULT_PROPERTIES_PANEL_POS}
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
            <div className="flex flex-col h-full">
              <PageSettings document={document} onCanvasConfigChange={handleCanvasConfigChange} />
              <div className="border-t shrink-0">
                <AIConfigPanel config={aiConfig} onChange={handleAIConfigChange} />
              </div>
            </div>
          )}
        </div>
      </FloatingPanel>

      {/* AI Assistant dialog */}
      <AIAssistant
        open={aiOpen}
        onOpenChange={setAiOpen}
        config={aiConfig}
        onConfigChange={handleAIConfigChange}
        context={aiContext}
      />

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
              gap: canvasMode === "dual" ? 240 : 0,
            }}
          >
            {/* ── Desktop frame (primary in single; always left in dual) ─── */}
            <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
              {canvasMode === "dual" ? (
                <BreakpointOverrideProvider breakpoint="desktop">
                  <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      marginBottom: 8,
                      fontSize: 11,
                      color: "hsl(var(--muted-foreground))",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      userSelect: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
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
                      transition: `box-shadow ${TRANSITION_FAST_CSS} ease`,
                    }}
                    onPointerDown={(e) => {
                      setBreakpoint("desktop");
                      handlePointerDown(e);
                    }}
                    onDoubleClick={handleCanvasDoubleClick}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[1200px] -translate-x-1/2 border-x border-dashed border-blue-400/20" />
                    <NodeRenderer nodeId={document.rootNodeId} />
                    <SectionOverlay
                      nodes={document.nodes}
                      rootNodeId={document.rootNodeId}
                      zoom={zoom}
                      panOffset={panOffset}
                      canvasFrameRef={canvasFrameRef}
                      onAddSection={handleAddSection}
                      onResizeStart={(nodeId, clientY, currentHeightPx, gid) =>
                        startSectionResize(nodeId, clientY, currentHeightPx, gid)
                      }
                      isResizing={sectionResizing !== null}
                    />
                  </div>
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
                    transition: `width ${TRANSITION_MID_CSS} ease, min-height ${TRANSITION_MID_CSS} ease, box-shadow ${TRANSITION_FAST_CSS} ease`,
                  }}
                  onPointerDown={handlePointerDown}
                  onDoubleClick={handleCanvasDoubleClick}
                  onMouseOver={handleMouseOver}
                  onMouseOut={handleMouseOut}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[1200px] -translate-x-1/2 border-x border-dashed border-blue-400/20" />
                  <NodeRenderer nodeId={document.rootNodeId} />
                  <SectionOverlay
                    nodes={document.nodes}
                    rootNodeId={document.rootNodeId}
                    zoom={zoom}
                    panOffset={panOffset}
                    canvasFrameRef={canvasFrameRef}
                    onAddSection={handleAddSection}
                    onResizeStart={(nodeId, clientY, currentHeightPx, gid) =>
                      startSectionResize(nodeId, clientY, currentHeightPx, gid)
                    }
                    isResizing={sectionResizing !== null}
                  />
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
                <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    marginBottom: 8,
                    fontSize: 11,
                    color: "hsl(var(--muted-foreground))",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    userSelect: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
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
                      transition: `box-shadow ${TRANSITION_FAST_CSS} ease`,
                    }}
                    onPointerDown={(e) => {
                      setBreakpoint("mobile");
                      handlePointerDown(e);
                    }}
                    onDoubleClick={handleCanvasDoubleClick}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <NodeRenderer nodeId={document.rootNodeId} mode="editor" />
                    <SectionOverlay
                      nodes={document.nodes}
                      rootNodeId={document.rootNodeId}
                      zoom={zoom}
                      panOffset={panOffset}
                      canvasFrameRef={mobileFrameRef}
                      onAddSection={handleAddSection}
                      onResizeStart={(nodeId, clientY, currentHeightPx, gid) =>
                        startSectionResize(nodeId, clientY, currentHeightPx, gid)
                      }
                      isResizing={sectionResizing !== null}
                    />
                  </div>
                </BreakpointOverrideProvider>
                </div>
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
            isSection={!!selectedSectionNode}
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
            guides={document.canvasConfig.showHelperLines ? snapGuides : []}
            canvasWidth={canvasWidth}
            canvasHeight={canvasMinHeight}
            helperLineColor={document.canvasConfig.helperLineColor}
          />
          <DistanceGuides guides={distanceGuides} zoom={zoom} />
          {selectionRect && liveDimensions && (
            <LiveDimensionsDisplay
              bounds={selectionRect}
              dimensions={liveDimensions}
              zoom={zoom}
            />
          )}

          {/* Section overlays are now rendered inside each frame div */}

        </CanvasRoot>

        {/* ── Section toolbar: left-side action bar for selected section (screen-space) ── */}
        {selectedSectionNode && (
          <SectionToolbar
            node={selectedSectionNode}
            sectionNodes={sectionNodes}
            zoom={zoom}
            panOffset={panOffset}
            canvasFrameRef={canvasFrameRef}
            dispatch={dispatch}
            newNodeId={uuidv4}
            canvasMode={canvasMode}
            activeBreakpoint={breakpoint}
            desktopFrameWidth={document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width}
            mobileFramePos={mobileFramePos}
          />
        )}

        {selectedNodeId && selectionRect && !selectedSectionNode && !editingNodeId && (
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

        {/* ── Inline text editor + toolbar ─────────────────────────────── */}
        {editingNodeId && editingPropKey && (() => {
          const editingNode = document.nodes[editingNodeId];
          const editingDef = editingNode && registry ? registry.getComponent(editingNode.type) : null;
          const richtextSchema = editingDef?.propSchema.find(
            (p) => p.type === "richtext" && p.key === editingPropKey,
          );
          const toolbarConfig =
            richtextSchema && richtextSchema.type === "richtext"
              ? richtextSchema.toolbar
              : undefined;
          const initialContent = editingNode
            ? String(editingNode.props[editingPropKey] ?? "")
            : "";

          return (
            <>
              <InlineTextEditor
                nodeId={editingNodeId}
                initialContent={initialContent}
                toolbarConfig={toolbarConfig}
                canvasFrameRef={canvasFrameRef}
                zoom={zoom}
                panOffset={panOffset}
                onCommit={handleInlineCommit}
                onExit={handleInlineExit}
                onEditorReady={(ed) => setTiptapEditor(ed)}
                onBoundsChange={setEditingOverrideRect}
              />
              {selectionRect && (
                <TextEditToolbar
                  editor={tiptapEditor}
                  toolbarConfig={toolbarConfig}
                  rect={selectionRect}
                  zoom={zoom}
                  panOffset={panOffset}
                  onExit={handleInlineExit}
                />
              )}
            </>
          );
        })()}

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
    </AIConfigProvider>
  );
}

// ── Public BuilderEditor ──────────────────────────────────────────────────

export interface BuilderEditorProps {
  builder?: BuilderAPI;
  config?: BuilderConfig;
  className?: string;
  /** Optional GroupRegistry for 2-level component palette (Group → SubGroup → component) */
  groupRegistry?: GroupRegistry;
}

export function BuilderEditor({ builder, config, className, groupRegistry }: BuilderEditorProps) {
  return (
    <BuilderProvider builder={builder} config={config}>
      <div className={cn("h-full w-full", className)}>
        <EditorInner groupRegistry={groupRegistry} />
      </div>
    </BuilderProvider>
  );
}
