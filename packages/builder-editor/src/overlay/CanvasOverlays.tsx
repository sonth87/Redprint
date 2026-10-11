import React from "react";
import type { BuilderDocument, BuilderNode, PopupDefinition } from "@ui-builder/builder-core";
import {
  SelectionOverlay,
  SnapGuides,
  HoverOutline,
  DistanceGuides,
  LiveDimensionsDisplay,
} from "./EditorOverlay";
import type { ResizeHandleType } from "../types";
import { FlowDropPlaceholderLayer } from "../canvas/FlowDropPlaceholderLayer";

export interface CanvasOverlaysProps {
  popupPreviewOpen: boolean;
  selectedNodeIds: string[];
  selectionRect: any;
  rubberBanding: any;
  rubberBandRect: any;
  zoom: number;
  currentRotation: number;
  isSection: boolean;
  activePopup: PopupDefinition | null;
  onDoubleClick: (e: React.MouseEvent) => void;
  onResizeStart: (handle: ResizeHandleType, e: React.MouseEvent) => void;
  onRotateStart: (e: React.MouseEvent) => void;
  hoverRect: any;
  showHelperLines: boolean;
  snapGuides: any[];
  guideCanvasWidth: number;
  guideCanvasHeight: number;
  helperLineColor?: string;
  distanceGuides: any[];
  liveDimensions: any;
  flowDropTarget: any;
  moving: any;
  paletteFlowDropTarget: any;
  activeFrameRef: React.RefObject<HTMLDivElement | null>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  nodes: Record<string, BuilderNode>;
}

export function CanvasOverlays({
  popupPreviewOpen,
  selectedNodeIds,
  selectionRect,
  rubberBanding,
  rubberBandRect,
  zoom,
  currentRotation,
  isSection,
  activePopup,
  onDoubleClick,
  onResizeStart,
  onRotateStart,
  hoverRect,
  showHelperLines,
  snapGuides,
  guideCanvasWidth,
  guideCanvasHeight,
  helperLineColor,
  distanceGuides,
  liveDimensions,
  flowDropTarget,
  moving,
  paletteFlowDropTarget,
  activeFrameRef,
  canvasFrameRef,
  nodes,
}: CanvasOverlaysProps) {
  return (
    <>
      <SelectionOverlay
        selection={{
          selectedIds: popupPreviewOpen ? [] : selectedNodeIds,
          boundingBox: popupPreviewOpen ? null : selectionRect,
          isRubberBanding: !popupPreviewOpen && !!rubberBanding,
          rubberBandRect,
        }}
        zoom={zoom}
        rotation={currentRotation}
        isSection={isSection}
        zIndex={activePopup ? 180 : undefined}
        onDoubleClick={onDoubleClick}
        onResizeStart={onResizeStart}
        onRotateStart={onRotateStart}
      />

      {!popupPreviewOpen && hoverRect && (
        <HoverOutline rect={hoverRect} zoom={zoom} zIndex={activePopup ? 170 : undefined} />
      )}

      <SnapGuides
        guides={showHelperLines ? snapGuides : []}
        canvasWidth={guideCanvasWidth}
        canvasHeight={guideCanvasHeight}
        helperLineColor={helperLineColor}
      />

      <DistanceGuides guides={distanceGuides} zoom={zoom} />

      {!popupPreviewOpen && selectionRect && liveDimensions && (
        <LiveDimensionsDisplay
          bounds={selectionRect}
          dimensions={liveDimensions}
          zoom={zoom}
          zIndex={activePopup ? 190 : undefined}
        />
      )}

      <FlowDropPlaceholderLayer
        flowDropTarget={flowDropTarget}
        moving={moving}
        activeFrameRef={activeFrameRef}
        canvasFrameRef={canvasFrameRef}
        nodes={nodes}
        zoom={zoom}
      />

      {/* Palette drag overlay — shows drop position when dragging from AddElements panel */}
      <FlowDropPlaceholderLayer
        flowDropTarget={paletteFlowDropTarget}
        moving={null}
        activeFrameRef={activeFrameRef}
        canvasFrameRef={canvasFrameRef}
        nodes={nodes}
        zoom={zoom}
      />
    </>
  );
}
