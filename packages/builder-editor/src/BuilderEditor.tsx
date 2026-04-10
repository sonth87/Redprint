import React, { useMemo, useRef } from "react";
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
  resolveProps,
  type BuilderAPI,
  type BuilderConfig,
  type CanvasMode,
  type ComponentDefinition,
  type GroupRegistry,
  type PaletteCatalog,
} from "@ui-builder/builder-core";
import {
  TRANSITION_FAST_CSS,
  TRANSITION_MID_CSS,
} from "@ui-builder/shared";
import { Monitor, Smartphone, LocateFixed } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@ui-builder/ui";

import { CanvasRoot } from "./canvas/CanvasRoot";
import {
  SelectionOverlay,
  SnapGuides,
  HoverOutline,
  DistanceGuides,
  LiveDimensionsDisplay,
} from "./overlay/EditorOverlay";
import { SectionOverlay } from "./overlay/SectionOverlay";
import { SectionToolbar } from "./overlay/SectionToolbar";
import { EditorToolbar } from "./toolbar/EditorToolbar";
import { ComponentPalette } from "./panels/left/ComponentPalette";
import { FloatingPalette } from "./panels/left/FloatingPalette";
import { AddElementsPanel } from "./panels/left/AddElementsPanel";
import { TextEditToolbar } from "./toolbar/TextEditToolbar";
import { InlineTextEditor } from "./canvas/InlineTextEditor";
import { LayerTree } from "./panels/bottom/LayerTree";
import { PropertyPanel } from "./panels/right/PropertyPanel";
import { PageSettings } from "./panels/right/PageSettings";
import { FloatingPanel } from "./panels/FloatingPanel";
import { ContextualToolbar } from "./toolbar/ContextualToolbar";
import { MultiSelectToolbar } from "./toolbar/MultiSelectToolbar";
import { DeleteConfirmDialog } from "./panels/DeleteConfirmDialog";
import { AIAssistant } from "./ai/AIAssistant";
import { AIConfigPanel } from "./ai/AIConfig";
import { buildAIContext } from "./ai/buildAIContext";
import { AIConfigProvider } from "./ai/AIConfigContext";
import { FigmaImportDialog } from "./figma/FigmaImportDialog";
import { ArtboardLabel } from "./canvas/ArtboardLabel";
import { FlowDropPlaceholderLayer } from "./canvas/FlowDropPlaceholderLayer";
import { initI18n, type SupportedLocale } from "./i18n";
import { useTranslation } from "react-i18next";

import { useViewport } from "./hooks/useViewport";
import { useResizeGesture } from "./hooks/useResizeGesture";
import { useRubberBand } from "./hooks/useRubberBand";
import { useMoveGesture } from "./hooks/useMoveGesture";
import { useRotateGesture } from "./hooks/useRotateGesture";
import { useSelectionRect } from "./hooks/useSelectionRect";
import { useHoverRect } from "./hooks/useHoverRect";
import { useDimensionCapture } from "./hooks/useDimensionCapture";
import { useDragHandlers } from "./hooks/useDragHandlers";
import { useClickToAdd } from "./hooks/useClickToAdd";
import { usePointerDown } from "./hooks/usePointerDown";
import { useZIndexHandlers } from "./hooks/useZIndexHandlers";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useSectionResize } from "./hooks/useSectionResize";
import { useZoomFromCenter } from "./hooks/useZoomFromCenter";

// ── New extracted hooks ───────────────────────────────────────────────────
import { usePaletteState } from "./hooks/usePaletteState";
import { useLayersPanel } from "./hooks/useLayersPanel";
import { useAIConfig } from "./hooks/useAIConfig";
import { useCanvasDimensions } from "./hooks/useCanvasDimensions";
import { useAutoFitCanvas } from "./hooks/useAutoFitCanvas";
import { useInlineTextEdit } from "./hooks/useInlineTextEdit";
import { useDeleteConfirm } from "./hooks/useDeleteConfirm";
import { useMobileFrame } from "./hooks/useMobileFrame";
import { useNodeHandlers } from "./hooks/useNodeHandlers";
import { useDragHandleGesture } from "./hooks/useDragHandleGesture";
import { useRubberBandSelect } from "./hooks/useRubberBandSelect";
import { useCanvasActions } from "./hooks/useCanvasActions";

import {
  DEFAULT_COMPONENTS_PANEL_POS,
  DEFAULT_PROPERTIES_PANEL_POS,
  DUAL_GAP_PX,
} from "./constants";



// ── Inner editor (must be inside BuilderProvider) ─────────────────────────

function EditorInner({
  groupRegistry,
  paletteCatalog,
  locale,
}: {
  groupRegistry?: GroupRegistry;
  paletteCatalog?: PaletteCatalog;
  locale?: string;
}) {
  const { t } = useTranslation();
  const { builder, state, dispatch } = useBuilder();
  const { selectedNodeIds, select, clearSelection } = useSelection();
  const { document } = useDocument();
  const { breakpoint, setBreakpoint } = useBreakpoint();
  const { undo, redo, canUndo, canRedo } = useHistory();

  const canvasMode: CanvasMode = state.editor.canvasMode ?? "single";
  const editingNodeId  = state.editor.editingNodeId  ?? null;
  const editingPropKey = state.editor.editingPropKey ?? null;

  // ── Panel state ──────────────────────────────────────────────────────────
  const { paletteMode, activePaletteGroupId, setActivePaletteGroupId, handleGroupSelect, handlePaletteClose } =
    usePaletteState();
  const { layersOpen, layersPanelPos, handleLayersToggle } = useLayersPanel();
  const { aiOpen, setAiOpen, aiConfig, handleAIConfigChange } = useAIConfig();
  const [figmaOpen, setFigmaOpen] = React.useState(false);

  // ── Canvas geometry ──────────────────────────────────────────────────────
  const { canvasWidth, canvasMinHeight, sectionNodes } = useCanvasDimensions({ document, breakpoint });

  // ── Viewport (zoom / pan / tool) ─────────────────────────────────────────
  const { zoom, setZoom, panOffset, setPanOffset, activeTool, setActiveTool, showGrid, toggleGrid } = useViewport();

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasFrameRef     = useRef<HTMLDivElement>(null);
  const mobileFrameRef     = useRef<HTMLDivElement>(null);
  const activeFrameRef = useRef<HTMLDivElement | null>(null);
  activeFrameRef.current =
    canvasMode === "dual" && breakpoint === "mobile" && mobileFrameRef.current
      ? mobileFrameRef.current
      : canvasFrameRef.current;

  const desktopWidth = document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width;
  const mobileWidth = DEVICE_VIEWPORT_PRESETS.mobile.width;
  const mobileHeight = DEVICE_VIEWPORT_PRESETS.mobile.height;
  
  const { mobileFramePos, handleMobileFrameGripDown } = useMobileFrame({ zoom });

  const boundingWidth = canvasMode === "dual" 
    ? desktopWidth + DUAL_GAP_PX + mobileWidth + Math.max(0, mobileFramePos.x)
    : canvasWidth;

  const actualDesktopHeight = canvasFrameRef.current?.offsetHeight ?? canvasMinHeight;
  const actualMobileHeight = mobileFrameRef.current?.offsetHeight ?? mobileHeight;

  const boundingHeight = canvasMode === "dual"
    ? Math.max(actualDesktopHeight, actualMobileHeight + Math.max(0, mobileFramePos.y))
    : actualDesktopHeight;

  const { handleFitToScreen, isCanvasInViewport } = useAutoFitCanvas({
    breakpoint, canvasMode, canvasWidth, canvasMinHeight,
    boundingWidth, boundingHeight,
    canvasContainerRef, clearSelection, setZoom, setPanOffset, zoom, panOffset,
  });

  // ── Zoom from canvas center ──────────────────────────────────────────────
  const { handleZoomInFromCenter, handleZoomOutFromCenter } = useZoomFromCenter({
    canvasContainerRef, zoom, panOffset, setZoom, setPanOffset,
  });

  // ── Derived selection ────────────────────────────────────────────────────
  const selectedNodeId     = selectedNodeIds[0] ?? null;
  const selectedNode       = selectedNodeId ? (document.nodes[selectedNodeId] ?? null) : null;
  const registry           = builder?.registry;
  const selectedDefinition = selectedNode && registry ? (registry.getComponent(selectedNode.type) ?? null) : null;
  const allComponents: ComponentDefinition[] = useMemo(() => registry ? registry.listComponents() : [], [registry]);

  const {
    snapEngine,
    getContainerConfig,
    handleAddSection,
    toggleCanvasMode,
  } = useCanvasActions({
    document, allComponents, registry, canvasMode, canvasWidth, canvasMinHeight, showGrid, dispatch,
  });

  const { handleRubberBandSelect } = useRubberBandSelect({
    document, zoom, selectedNodeIds, select, clearSelection, canvasFrameRef,
  });

  const selectedSectionNode =
    selectedNodeId && document.nodes[selectedNodeId]?.type === "Section"
      ? document.nodes[selectedNodeId]
      : null;
  const currentSectionChildIds = selectedSectionNode
    ? Object.values(document.nodes)
        .filter((n) => n.parentId === selectedSectionNode.id)
        .map((n) => n.id)
    : [];

  const aiContext = useMemo(
    () => buildAIContext(state, allComponents, {
      includePageContext: aiConfig.includePageContext,
      paletteCatalog: paletteCatalog ?? undefined,
    }),
    [state, allComponents, aiConfig.includePageContext, paletteCatalog],
  );

  // ── Snap engine (now handled by hook) ────────────────────────────────────


  // ── Gesture hooks ────────────────────────────────────────────────────────
  const { setResizing, snapGuides: resizeSnapGuides, distanceGuides: resizeDistanceGuides, liveDimensions: resizeLiveDimensions } =
    useResizeGesture({ zoom, breakpoint, showGrid, gridSize: document.canvasConfig.gridSize, snapEngine, nodes: document.nodes, canvasFrameRef, activeFrameRef, dispatch });

  const { rubberBanding, setRubberBanding, rubberBandRect } = useRubberBand({ zoom, canvasFrameRef, onSelectionEnd: handleRubberBandSelect });

  const { moving, setMoving, dragStartedRef, snapGuides: moveSnapGuides, distanceGuides: moveDistanceGuides, liveDimensions: moveLiveDimensions, flowDragOffset, flowDropTarget } =
    useMoveGesture({ zoom, breakpoint, snapEnabled: showGrid, snapEngine, nodes: document.nodes, canvasFrameRef, activeFrameRef, dispatch, rootNodeId: document.rootNodeId, getContainerConfig });

  const { rotating, startRotate } = useRotateGesture({ breakpoint, dispatch });
  const { sectionResizing, startSectionResize } = useSectionResize({ zoom, showGrid, gridSize: document.canvasConfig.gridSize, breakpoint, dispatch });

  const snapGuides     = moving ? moveSnapGuides     : resizeSnapGuides;
  const distanceGuides = moving ? moveDistanceGuides : resizeDistanceGuides;
  const liveDimensions = moving ? moveLiveDimensions : resizeLiveDimensions;

  // ── Overlay hooks ────────────────────────────────────────────────────────
  const { selectionRect: selectionRectRaw, currentRotation } = useSelectionRect({
    selectedNodeIds, zoom, panOffset, nodes: document.nodes, canvasFrameRef, breakpoint, nodeQueryRef: activeFrameRef,
  });


  const { hoverRect, handleMouseOver, handleMouseOut } = useHoverRect({
    selectedNodeIds, rootNodeId: document.rootNodeId, zoom, panOffset, nodes: document.nodes, canvasFrameRef, nodeQueryRef: activeFrameRef,
  });

  useDimensionCapture({ nodes: document.nodes, breakpoint, canvasFrameRef, dispatch });

  // ── Interaction hooks ────────────────────────────────────────────────────
  const { handleDragStart, handlePaletteDragStart, handleDrop, handleDragOver, handleDragEnter } =
    useDragHandlers({ rootNodeId: document.rootNodeId, zoom, canvasFrameRef, dispatch, nodes: document.nodes, getContainerConfig, onAfterDrop: handlePaletteClose });

  const { addItem: handlePaletteItemClick } = useClickToAdd({ rootNodeId: document.rootNodeId, zoom, panOffset, canvasContainerRef, dispatch, onAfterAdd: handlePaletteClose });

  const { handlePointerDown } = usePointerDown({
    activeTool, zoom, rootNodeId: document.rootNodeId, nodes: document.nodes, canvasFrameRef, activeFrameRef,
    dragStartedRef, dispatch, clearSelection, setMoving, setRubberBanding, selectedNodeIds,
  });

  const { onMoveUp, onMoveDown } = useZIndexHandlers({ selectedNodeId, nodes: document.nodes, dispatch });

  // ── Node mutation handlers ────────────────────────────────────────────────
  const { handleToggleHidden, handleToggleLocked, handlePropChange, handleStyleChange, handleCanvasConfigChange } =
    useNodeHandlers({ selectedNodeId, breakpoint, dispatch, nodes: document.nodes });

  // ── Inline text editing ──────────────────────────────────────────────────
  const { tiptapEditor, setTiptapEditor, editingOverrideRect, setEditingOverrideRect, handleInlineCommit, handleInlineExit, handleCanvasDoubleClick } =
    useInlineTextEdit({ editingNodeId, editingPropKey, nodes: document.nodes, registry, dispatch, breakpoint });

  const selectionRectBase = editingNodeId ? (editingOverrideRect ?? selectionRectRaw) : selectionRectRaw;
  const selectionRect     = selectionRectBase && flowDragOffset
    ? { ...selectionRectBase, x: selectionRectBase.x + flowDragOffset.x, y: selectionRectBase.y + flowDragOffset.y }
    : selectionRectBase;

  // ── Delete with confirmation ──────────────────────────────────────────────
  const { deleteConfirmNodeId, setDeleteConfirmNodeId, deleteConfirmChildCount, handleDeleteNode, handleDeleteNodes, executeConfirmedDelete } =
    useDeleteConfirm({ nodes: document.nodes, rootNodeId: document.rootNodeId, sectionNodes, registry, dispatch });

  // ── Drag handle gesture ───────────────────────────────────────────────────
  const { handleDragHandlePointerDown } = useDragHandleGesture({
    selectedNodeId, selectedNodeIds, nodes: document.nodes, zoom, activeFrameRef, canvasFrameRef, dragStartedRef, setMoving,
  });

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useKeyboardShortcuts({
    selectedNodeIds, rootNodeId: document.rootNodeId, nodes: document.nodes, clipboard: state.editor.clipboard,
    breakpoint, editingNodeId, canvasContainerRef, dispatch, clearSelection, undo, redo, setBreakpoint, 
    onDeleteNode: handleDeleteNode, onDeleteNodes: handleDeleteNodes,
  });

  const canvasConfigParams = useMemo(
    () => ({ ...document.canvasConfig, showGrid, snapEnabled: showGrid }),
    [document.canvasConfig, showGrid],
  );

  const frameEventHandlers = {
    onDoubleClick: handleCanvasDoubleClick,
    onMouseOver: handleMouseOver,
    onMouseOut: handleMouseOut,
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  } as const;

  const sharedSectionOverlayProps = {
    nodes: document.nodes,
    rootNodeId: document.rootNodeId,
    zoom,
    panOffset,
    onAddSection: handleAddSection,
    onResizeStart: (nodeId: string, clientY: number, currentHeightPx: number, gid: string) =>
      startSectionResize(nodeId, clientY, currentHeightPx, gid),
    isResizing: sectionResizing !== null,
    onSelect: (nodeId: string) => select([nodeId]),
  } as const;

  // ── Render ────────────────────────────────────────────────────────────────
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
          breakpoint={breakpoint} zoom={zoom} showGrid={showGrid} canUndo={canUndo} canRedo={canRedo}
          activeTool={activeTool} canvasMode={canvasMode}
          onBreakpointChange={setBreakpoint} onZoomChange={setZoom} onZoomInFromCenter={handleZoomInFromCenter} onZoomOutFromCenter={handleZoomOutFromCenter} onGridToggle={toggleGrid}
          onUndo={undo} onRedo={redo}
          onToolChange={(tool) => { setActiveTool(tool); if (tool === "pan") clearSelection(); }}
          onCanvasModeToggle={toggleCanvasMode} onFitToScreen={handleFitToScreen}
          onAIOpen={() => setAiOpen(true)}
          onFigmaOpen={() => setFigmaOpen(true)}
        />

        {/* Palette */}
        {paletteCatalog && paletteMode === "floating" && (
          <FloatingPalette
            catalog={paletteCatalog} activeGroupId={activePaletteGroupId}
            onGroupSelect={handleGroupSelect} locale={locale}
            layersOpen={layersOpen} onLayersToggle={handleLayersToggle}
          />
        )}
        {paletteCatalog && paletteMode === "docked" && (
          <AddElementsPanel
            catalog={paletteCatalog} activeGroupId={activePaletteGroupId}
            onGroupChange={setActivePaletteGroupId} onClose={handlePaletteClose}
            onItemDragStart={handlePaletteDragStart} onItemClick={handlePaletteItemClick} locale={locale}
          />
        )}
        {!paletteCatalog && (
          <FloatingPanel id="components" title="Components" defaultPosition={DEFAULT_COMPONENTS_PANEL_POS}>
            <div className="h-[40vh] min-h-[300px] overflow-hidden">
              <ComponentPalette components={allComponents} onDragStart={handleDragStart} groupRegistry={groupRegistry} />
            </div>
          </FloatingPanel>
        )}

        {/* Layers */}
        {layersOpen && (
          <FloatingPanel id="layers" title="Layers" defaultPosition={layersPanelPos} onClose={handleLayersToggle}>
            <div className="h-[30vh] min-h-[250px] overflow-hidden">
              <LayerTree document={document} selectedIds={selectedNodeIds} onSelect={select}
                onToggleHidden={handleToggleHidden} onToggleLocked={handleToggleLocked} />
            </div>
          </FloatingPanel>
        )}

        {/* Properties / Page settings */}
        <FloatingPanel id="properties" title={selectedNode ? "Properties" : "Page Settings"} defaultPosition={DEFAULT_PROPERTIES_PANEL_POS}>
          <div className="flex h-[75vh] max-h-[800px] min-h-[500px] flex-col overflow-hidden">
            {selectedNode ? (
              <PropertyPanel selectedNode={selectedNode} definition={selectedDefinition} breakpoint={breakpoint}
                onPropChange={handlePropChange} onStyleChange={handleStyleChange} />
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

        <AIAssistant open={aiOpen} onOpenChange={setAiOpen} config={aiConfig} onConfigChange={handleAIConfigChange} context={aiContext} />
        <FigmaImportDialog open={figmaOpen} onOpenChange={setFigmaOpen} />

        {/* Canvas area */}
        <div className="bg-muted/20 absolute inset-0 z-0 overflow-hidden">
          <CanvasRoot canvasConfig={canvasConfigParams} zoom={zoom} panOffset={panOffset}
            onZoomChange={setZoom} onPanOffsetChange={setPanOffset} activeTool={activeTool} className="h-full w-full"
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              // Ignore clicks on floating panels, resize handles, or other interactive overlays
              if (
                target.closest("[data-floating-panel]") ||
                target.closest("[data-resize-handle]") ||
                target.closest("[data-rotation-handle]")
              ) return;
              
              handlePointerDown(e);
            }}
          >

            <div style={{ display: "flex", alignItems: "flex-start", gap: canvasMode === "dual" ? DUAL_GAP_PX : 0 }}>

              {/* Desktop frame */}
              <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                {canvasMode === "dual" ? (
                  <BreakpointOverrideProvider breakpoint="desktop">
                    <div style={{ position: "relative" }}>
                      <ArtboardLabel
                        icon={<Monitor size={11} />} label="Desktop"
                        width={document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width}
                        isActive={breakpoint === "desktop"} onClick={() => setBreakpoint("desktop")}
                      />
                      <div
                        ref={canvasFrameRef}
                        style={{
                          width: document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width,
                          minHeight: document.canvasConfig.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height,
                          backgroundColor: document.canvasConfig.backgroundColor ?? "#ffffff",
                          position: "relative",
                          boxShadow: breakpoint === "desktop"
                            ? "0 4px 24px rgba(0,0,0,0.12), 0 0 0 2px hsl(221.2 83.2% 53.3%)"
                            : "0 4px 24px rgba(0,0,0,0.12)",
                          borderRadius: 4,
                          transition: `box-shadow ${TRANSITION_FAST_CSS} ease`,
                        }}
                        onPointerDown={(e) => { setBreakpoint("desktop"); handlePointerDown(e); }}
                        {...frameEventHandlers}
                      >
                        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[1200px] -translate-x-1/2 border-x border-dashed border-blue-400/20" />
                        <NodeRenderer nodeId={document.rootNodeId} />
                        <SectionOverlay {...sharedSectionOverlayProps} canvasFrameRef={canvasFrameRef} />
                      </div>
                    </div>
                  </BreakpointOverrideProvider>
                ) : (
                  <div
                    ref={canvasFrameRef}
                    style={{
                      width: canvasWidth, minHeight: canvasMinHeight,
                      backgroundColor: document.canvasConfig.backgroundColor ?? "#ffffff",
                      position: "relative", boxShadow: "0 4px 24px rgba(0,0,0,0.12)", borderRadius: 4,
                      transition: `width ${TRANSITION_MID_CSS} ease, min-height ${TRANSITION_MID_CSS} ease, box-shadow ${TRANSITION_FAST_CSS} ease`,
                    }}
                    onPointerDown={handlePointerDown}
                    {...frameEventHandlers}
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[1200px] -translate-x-1/2 border-x border-dashed border-blue-400/20" />
                    <NodeRenderer nodeId={document.rootNodeId} />
                    <SectionOverlay {...sharedSectionOverlayProps} canvasFrameRef={canvasFrameRef} />
                  </div>
                )}
              </div>

              {/* Mobile frame (dual mode only) */}
              {canvasMode === "dual" && (
                <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, position: "relative", top: mobileFramePos.y, left: mobileFramePos.x }}>
                  <div style={{ position: "relative" }}>
                    <ArtboardLabel
                      icon={<Smartphone size={11} />} label="Mobile"
                      width={DEVICE_VIEWPORT_PRESETS.mobile.width}
                      isActive={breakpoint === "mobile"} onClick={() => setBreakpoint("mobile")}
                      gripProps={{ onMouseDown: handleMobileFrameGripDown }}
                    />
                    <BreakpointOverrideProvider breakpoint="mobile">
                      <div
                        ref={mobileFrameRef}
                        style={{
                          width: DEVICE_VIEWPORT_PRESETS.mobile.width,
                          minHeight: DEVICE_VIEWPORT_PRESETS.mobile.height,
                          backgroundColor: document.canvasConfig.backgroundColor ?? "#ffffff",
                          position: "relative",
                          boxShadow: breakpoint === "mobile"
                            ? "0 4px 24px rgba(0,0,0,0.12), 0 0 0 2px hsl(221.2 83.2% 53.3%)"
                            : "0 4px 24px rgba(0,0,0,0.12)",
                          borderRadius: 4, transition: `box-shadow ${TRANSITION_FAST_CSS} ease`,
                        }}
                        onPointerDown={(e) => { setBreakpoint("mobile"); handlePointerDown(e); }}
                        onDoubleClick={handleCanvasDoubleClick} onMouseOver={handleMouseOver} onMouseOut={handleMouseOut}
                        onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDrop={handleDrop}
                      >
                        <NodeRenderer nodeId={document.rootNodeId} mode="editor" />
                        <SectionOverlay {...sharedSectionOverlayProps} canvasFrameRef={mobileFrameRef} />
                      </div>
                    </BreakpointOverrideProvider>
                  </div>
                </div>
              )}
            </div>

            {/* Overlays */}
            <SelectionOverlay
              selection={{ selectedIds: selectedNodeIds, boundingBox: selectionRect, isRubberBanding: !!rubberBanding, rubberBandRect }}
              zoom={zoom} rotation={currentRotation} isSection={!!selectedSectionNode}
              onResizeStart={(handle, e) => {
                if (!selectionRect || !selectedNodeId) return;
                setResizing({
                  handle, nodeId: selectedNodeId,
                  startPoint: { x: e.clientX, y: e.clientY },
                  startRect: { ...selectionRect },
                  gestureGroupId: uuidv4(),
                });
              }}
              onRotateStart={(e) => {
                if (!selectionRect || !selectedNodeId) return;
                const queryRoot = activeFrameRef.current ?? canvasFrameRef.current;
                if (!queryRoot) return;
                const el = queryRoot.querySelector(`[data-node-id="${selectedNodeId}"]`) as HTMLElement;
                if (!el) return;
                startRotate({
                  nodeId: selectedNodeId, clientX: e.clientX, clientY: e.clientY,
                  elementRect: el.getBoundingClientRect(), currentRotation, gestureGroupId: uuidv4(),
                });
              }}
            />

            {hoverRect && <HoverOutline rect={hoverRect} zoom={zoom} />}

            <SnapGuides
              guides={document.canvasConfig.showHelperLines ? snapGuides : []}
              canvasWidth={canvasWidth} canvasHeight={canvasMinHeight}
              helperLineColor={document.canvasConfig.helperLineColor}
            />
            <DistanceGuides guides={distanceGuides} zoom={zoom} />
            {selectionRect && liveDimensions && (
              <LiveDimensionsDisplay bounds={selectionRect} dimensions={liveDimensions} zoom={zoom} />
            )}

            <FlowDropPlaceholderLayer
              flowDropTarget={flowDropTarget} moving={moving}
              activeFrameRef={activeFrameRef} canvasFrameRef={canvasFrameRef}
              nodes={document.nodes} zoom={zoom}
            />
          </CanvasRoot>

          {/* Section toolbar (screen-space) */}
          {selectedSectionNode && (
            <SectionToolbar
              node={selectedSectionNode} sectionNodes={sectionNodes} zoom={zoom} panOffset={panOffset}
              canvasFrameRef={canvasFrameRef} canvasContainerRef={canvasContainerRef} dispatch={dispatch} newNodeId={uuidv4}
              canvasMode={canvasMode} activeBreakpoint={breakpoint}
              desktopFrameWidth={document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width}
              mobileFramePos={mobileFramePos} onDelete={handleDeleteNode}
              aiConfig={aiConfig} undo={undo}
              currentChildIds={currentSectionChildIds}
              availableComponentTypes={allComponents.map((c) => c.type)}
            />
          )}

          {selectedNodeIds.length === 1 && selectionRect && !selectedSectionNode && !editingNodeId && (
            <ContextualToolbar
              nodeId={selectedNodeIds[0]!} rect={selectionRect} zoom={zoom} panOffset={panOffset}
              onDelete={() => handleDeleteNode(selectedNodeIds[0]!)}
              onDuplicate={() => dispatch({
                type: "DUPLICATE_NODE",
                payload: { nodeId: selectedNodeIds[0]!, offset: { x: 20, y: 20 }, newNodeId: uuidv4() },
                description: "Duplicate",
              })}
              onMoveUp={onMoveUp} onMoveDown={onMoveDown}
              onDragHandlePointerDown={handleDragHandlePointerDown}
            />
          )}

          {selectedNodeIds.length > 1 && selectionRect && !editingNodeId && (
            <MultiSelectToolbar
              count={selectedNodeIds.length}
              rect={selectionRect}
              zoom={zoom}
              panOffset={panOffset}
              onDelete={() => handleDeleteNodes(selectedNodeIds)}
              onDuplicate={() => {
                const newNodeIds = selectedNodeIds.map(() => uuidv4());
                dispatch({
                  type: "DUPLICATE_NODES",
                  payload: { nodeIds: selectedNodeIds, offset: { x: 20, y: 20 }, newNodeIds },
                  description: `Duplicate ${selectedNodeIds.length} nodes`,
                });
              }}
              onDragHandlePointerDown={handleDragHandlePointerDown}
            />
          )}

          {/* Inline text editor + toolbar */}
          {editingNodeId && editingPropKey && (() => {
            const editingNode    = document.nodes[editingNodeId];
            const editingDef     = editingNode && registry ? registry.getComponent(editingNode.type) : null;
            const richtextSchema = editingDef?.propSchema.find((p) => p.type === "richtext" && p.key === editingPropKey);
            const toolbarConfig  = richtextSchema?.type === "richtext" ? richtextSchema.toolbar : undefined;
            const resolvedProps  = editingNode ? resolveProps(editingNode.props, editingNode.responsiveProps, breakpoint) : {};
            const initialContent = editingNode ? String(resolvedProps[editingPropKey] ?? "") : "";
            return (
              <>
                <InlineTextEditor
                  nodeId={editingNodeId} initialContent={initialContent} toolbarConfig={toolbarConfig}
                  canvasFrameRef={activeFrameRef} canvasContainerRef={canvasContainerRef}
                  zoom={zoom} panOffset={panOffset}
                  onCommit={handleInlineCommit} onExit={handleInlineExit}
                  onEditorReady={(ed) => setTiptapEditor(ed)} onBoundsChange={setEditingOverrideRect}
                />
                {selectionRect && (
                  <TextEditToolbar editor={tiptapEditor} toolbarConfig={toolbarConfig} rect={selectionRect}
                    zoom={zoom} panOffset={panOffset} onExit={handleInlineExit} />
                )}
              </>
            );
          })()}

          {/* Rotation readout */}
          {rotating !== null && selectionRect && (
            <div
              className="bg-background/90 pointer-events-none absolute z-50 rounded border px-2 py-0.5 font-mono text-xs"
              style={{
                left: (selectionRect.x + selectionRect.width  / 2) * zoom + panOffset.x - 20,
                top:  (selectionRect.y + selectionRect.height)     * zoom + panOffset.y + 28,
              }}
            >
              {currentRotation}&#176;
            </div>
          )}

          {/* Return-to-canvas button */}
          {!isCanvasInViewport && (
            <button
              onClick={handleFitToScreen}
              className="absolute bottom-[4.5rem] left-1/2 z-40 -translate-x-1/2
                         flex items-center gap-1.5 rounded-full
                         bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground
                         shadow-lg ring-1 ring-primary/20
                         hover:bg-primary/90 active:scale-95 transition-all"
            >
              <LocateFixed size={14} />
              {t("toolbar.returnToCanvas")}
            </button>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        nodeId={deleteConfirmNodeId}
        childCount={deleteConfirmChildCount}
        onConfirm={executeConfirmedDelete}
        onCancel={() => setDeleteConfirmNodeId(null)}
      />
    </AIConfigProvider>
  );
}

// ── Public BuilderEditor ───────────────────────────────────────────────────

export interface BuilderEditorProps {
  builder?: BuilderAPI;
  config?: BuilderConfig;
  className?: string;
  /** Optional GroupRegistry for 2-level component palette (Group -> SubGroup -> component) */
  groupRegistry?: GroupRegistry;
  /**
   * Optional palette catalog (JSON-driven "Add Elements" panel).
   * When provided, replaces the legacy ComponentPalette with the new Wix-style palette.
   */
  paletteCatalog?: PaletteCatalog;
  /** Locale for i18n (e.g., "en", "vi") */
  locale?: SupportedLocale | string;
  /** Additional i18n resources to merge with built-in translations */
  i18nResources?: Record<string, { translation: Record<string, unknown> }>;
  /** Key separator for i18n. Default: "." Set to false to disable nesting. */
  i18nKeySeparator?: string | false;
}

export function BuilderEditor({
  builder, config, className, groupRegistry, paletteCatalog, locale, i18nResources, i18nKeySeparator,
}: BuilderEditorProps) {
  React.useEffect(() => {
    if (locale || i18nResources || i18nKeySeparator !== undefined) {
      initI18n({ language: locale, resources: i18nResources, keySeparator: i18nKeySeparator });
    }
  }, [locale, i18nResources, i18nKeySeparator]);

  return (
    <BuilderProvider builder={builder} config={config}>
      <div className={cn("h-full w-full", className)}>
        <EditorInner groupRegistry={groupRegistry} paletteCatalog={paletteCatalog} locale={locale} />
      </div>
    </BuilderProvider>
  );
}
