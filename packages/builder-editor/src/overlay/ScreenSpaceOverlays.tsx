import React from "react";
import { LocateFixed } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  resolveProps,
  type Breakpoint,
  type BuilderDocument,
  type BuilderNode,
  type CanvasMode,
  type ComponentRegistry,
  type PopupDefinition,
} from "@ui-builder/builder-core";
import { type Point } from "@ui-builder/shared";
import { SpacingOverlay } from "./SpacingOverlay";
import { SectionToolbar } from "./SectionToolbar";
import { ContextualToolbar } from "../toolbar/ContextualToolbar";
import { MultiSelectToolbar } from "../toolbar/MultiSelectToolbar";
import { InlineTextEditor } from "../canvas/InlineTextEditor";
import { TextEditToolbar } from "../toolbar/TextEditToolbar";

export interface ScreenSpaceOverlaysProps {
  popupPreviewOpen: boolean;
  spacingRects: any;
  selectedNodeIds: string[];
  selectedSectionNode: BuilderNode | null;
  sectionNodes: BuilderNode[];
  activePopup: PopupDefinition | null;
  selectionRect: any;
  zoom: number;
  panOffset: Point;
  editingNodeId: string | null;
  editingPropKey: string | null;
  document: BuilderDocument;
  registry: ComponentRegistry | undefined;
  breakpoint: Breakpoint;
  activeFrameRef: React.RefObject<HTMLDivElement | null>;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  rotating: any;
  currentRotation: number;
  resizing: any;
  isCanvasInViewport: boolean;
  tiptapEditor: any;
  setTiptapEditor: (ed: any) => void;
  setEditingOverrideRect: (rect: any) => void;
  onInlineCommit: (content: string) => void;
  onInlineExit: () => void;
  onFitToScreen: () => void;

  // SectionToolbar props
  dispatch: (action: any) => void;
  newNodeId: () => string;
  canvasMode?: CanvasMode;
  desktopFrameWidth?: number;
  mobileFramePos?: Point;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteNodes?: (nodeIds: string[]) => void;
  onDuplicateSingleNode: () => void;
  onDuplicateMultiNodes: () => void;
  aiConfig?: any;
  undo?: () => void;
  currentSectionChildIds?: string[];
  availableComponentTypes?: string[];

  // ContextualToolbar props
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragHandlePointerDown: (e: React.PointerEvent) => void;
  onOpenMediaManagerForProp?: (propKey: string) => void;
  onOpenGalleryManager?: () => void;
}

export function ScreenSpaceOverlays({
  popupPreviewOpen,
  spacingRects,
  selectedNodeIds,
  selectedSectionNode,
  sectionNodes,
  activePopup,
  selectionRect,
  zoom,
  panOffset,
  editingNodeId,
  editingPropKey,
  document,
  registry,
  breakpoint,
  activeFrameRef,
  canvasContainerRef,
  rotating,
  currentRotation,
  resizing,
  isCanvasInViewport,
  tiptapEditor,
  setTiptapEditor,
  setEditingOverrideRect,
  onInlineCommit,
  onInlineExit,
  onFitToScreen,
  dispatch,
  newNodeId,
  canvasMode,
  desktopFrameWidth,
  mobileFramePos,
  onDeleteNode,
  onDeleteNodes,
  onDuplicateSingleNode,
  onDuplicateMultiNodes,
  aiConfig,
  undo,
  currentSectionChildIds,
  availableComponentTypes,
  onMoveUp,
  onMoveDown,
  onDragHandlePointerDown,
  onOpenMediaManagerForProp,
  onOpenGalleryManager,
}: ScreenSpaceOverlaysProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Spacing overlay (screen-space, outside CanvasRoot to avoid double-scaling) */}
      {!popupPreviewOpen && spacingRects && selectedNodeIds.length === 1 && !selectedSectionNode && (
        <SpacingOverlay spacingRects={spacingRects} zIndexBase={activePopup ? 172 : undefined} />
      )}

      {/* Section toolbar (screen-space) */}
      {!popupPreviewOpen && selectedSectionNode && (
        <SectionToolbar
          node={selectedSectionNode}
          sectionNodes={sectionNodes}
          zoom={zoom}
          panOffset={panOffset}
          canvasFrameRef={activeFrameRef}
          canvasContainerRef={canvasContainerRef}
          dispatch={dispatch}
          newNodeId={newNodeId}
          canvasMode={canvasMode}
          activeBreakpoint={breakpoint}
          desktopFrameWidth={desktopFrameWidth}
          mobileFramePos={mobileFramePos}
          onDelete={onDeleteNode}
          aiConfig={aiConfig}
          undo={undo}
          currentChildIds={currentSectionChildIds}
          availableComponentTypes={availableComponentTypes}
        />
      )}

      {/* Contextual quick toolbar (single select only, hidden for section nodes) */}
      {!popupPreviewOpen && selectedNodeIds.length === 1 && selectionRect && !selectedSectionNode && !editingNodeId && (
        <ContextualToolbar
          nodeId={selectedNodeIds[0]!}
          rect={selectionRect}
          zoom={zoom}
          panOffset={panOffset}
          zIndex={activePopup ? 220 : undefined}
          onDelete={() => selectedNodeIds[0] && onDeleteNode?.(selectedNodeIds[0])}
          onDuplicate={onDuplicateSingleNode}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDragHandlePointerDown={onDragHandlePointerDown}
          onOpenMediaManager={onOpenMediaManagerForProp as any}
          onOpenGalleryManager={onOpenGalleryManager}
        />
      )}

      {/* Multi-select toolbar */}
      {!popupPreviewOpen && selectedNodeIds.length > 1 && selectionRect && !editingNodeId && (
        <MultiSelectToolbar
          count={selectedNodeIds.length}
          rect={selectionRect}
          zoom={zoom}
          panOffset={panOffset}
          zIndex={activePopup ? 220 : undefined}
          onDelete={() => onDeleteNodes?.(selectedNodeIds)}
          onDuplicate={onDuplicateMultiNodes}
          onDragHandlePointerDown={onDragHandlePointerDown}
        />
      )}

      {/* Inline text editor + toolbar */}
      {editingNodeId && editingPropKey && (() => {
        const editingNode = document.nodes[editingNodeId];
        const editingDef = editingNode && registry ? registry.getComponent(editingNode.type) : null;
        const richtextSchema = editingDef?.propSchema.find((p) => p.type === "richtext" && p.key === editingPropKey);
        const toolbarConfig = richtextSchema?.type === "richtext" ? richtextSchema.toolbar : undefined;
        const resolvedProps = editingNode ? resolveProps(editingNode.props, editingNode.responsiveProps, breakpoint) : {};
        const initialContent = editingNode ? String(resolvedProps[editingPropKey] ?? "") : "";
        return (
          <>
            <InlineTextEditor
              nodeId={editingNodeId}
              initialContent={initialContent}
              toolbarConfig={toolbarConfig}
              canvasFrameRef={activeFrameRef}
              canvasContainerRef={canvasContainerRef}
              zoom={zoom}
              panOffset={panOffset}
              onCommit={onInlineCommit}
              onExit={onInlineExit}
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
                onExit={onInlineExit}
              />
            )}
          </>
        );
      })()}

      {/* Rotation readout */}
      {rotating !== null && selectionRect && (
        <div
          className="bg-background/90 pointer-events-none absolute z-50 rounded border px-2 py-0.5 font-mono text-xs"
          style={{
            left: (selectionRect.x + selectionRect.width / 2) * zoom + panOffset.x - 20,
            top: (selectionRect.y + selectionRect.height) * zoom + panOffset.y + 28,
          }}
        >
          {currentRotation}&#176;
        </div>
      )}

      {/* Shift-to-lock-ratio hint — shown while dragging a corner handle */}
      {resizing && resizing.handle.length === 2 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-background/90 border px-3 py-1.5 font-mono text-xs text-muted-foreground shadow-sm">
          Hold <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">Shift</kbd> to lock ratio
        </div>
      )}

      {/* Return-to-canvas button */}
      {!isCanvasInViewport && (
        <button
          onClick={onFitToScreen}
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
    </>
  );
}
