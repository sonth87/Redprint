import React from "react";
import { Monitor, Smartphone, LayoutTemplate, Sparkles } from "lucide-react";
import {
  BreakpointOverrideProvider,
  NodeRenderer,
} from "@ui-builder/builder-react";
import {
  DEVICE_VIEWPORT_PRESETS,
  type Breakpoint,
  type BuilderDocument,
  type BuilderNode,
  type CanvasMode,
  type PopupDefinition,
} from "@ui-builder/builder-core";
import { TRANSITION_FAST_CSS, TRANSITION_MID_CSS } from "@ui-builder/shared";
import { ArtboardLabel } from "./ArtboardLabel";
import { SectionOverlay } from "../overlay/SectionOverlay";
import { PopupEditorSurface } from "../popups/PopupEditorSurface";
import { type MobileFrameGuide } from "../hooks/useMobileFrame";
import { DUAL_GAP_PX } from "../constants";
import { useTranslation } from "react-i18next";

export interface ArtboardContainerProps {
  canvasMode: CanvasMode;
  mobileFrameGuides: MobileFrameGuide[];
  mobileWidth: number;
  mobileFramePos: { x: number; y: number };
  breakpoint: Breakpoint;
  setBreakpoint: (b: Breakpoint) => void;
  zoom: number;
  document: BuilderDocument;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  mobileFrameRef: React.RefObject<HTMLDivElement | null>;
  popupFrameRef: React.RefObject<HTMLDivElement | null>;
  activePopup: PopupDefinition | null;
  activePopupSelection: "shell" | "content" | null;
  popupPreviewOpen: boolean;
  sharedSectionOverlayProps: any;
  frameEventHandlers: Record<string, any>;
  onPointerDown: (e: React.PointerEvent) => void;
  onMobileFrameGripDown: (e: React.PointerEvent) => void;
  canvasWidth: number | string;
  canvasMinHeight: number | string;
  sectionNodes: BuilderNode[];
  onSelectPopupShell: () => void;
  onSelectPopupContent: () => void;
  onEditPopup: (id: string | null) => void;
  onDuplicatePopup: (id: string) => void;
  onDeletePopup: (id: string) => void;
  onTogglePopupEnabled: (id: string, enabled: boolean) => void;
  onTogglePopupPreview: () => void;
  onPopupShellResizeStart: any;
  onPopupShellDragStart: any;
  onOpenPageGenerator: () => void;
  onCanvasDoubleClick: (e: React.MouseEvent) => void;
  onMouseOver: (e: React.MouseEvent) => void;
  onMouseOut: (e: React.MouseEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function ArtboardContainer({
  canvasMode,
  mobileFrameGuides,
  mobileWidth,
  mobileFramePos,
  breakpoint,
  setBreakpoint,
  zoom,
  document,
  canvasFrameRef,
  mobileFrameRef,
  popupFrameRef,
  activePopup,
  activePopupSelection,
  popupPreviewOpen,
  sharedSectionOverlayProps,
  frameEventHandlers,
  onPointerDown,
  onMobileFrameGripDown,
  canvasWidth,
  canvasMinHeight,
  sectionNodes,
  onSelectPopupShell,
  onSelectPopupContent,
  onEditPopup,
  onDuplicatePopup,
  onDeletePopup,
  onTogglePopupEnabled,
  onTogglePopupPreview,
  onPopupShellResizeStart,
  onPopupShellDragStart,
  onOpenPageGenerator,
  onCanvasDoubleClick,
  onMouseOver,
  onMouseOut,
  onDragEnter,
  onDragOver,
  onDrop,
}: ArtboardContainerProps) {
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: canvasMode === "dual" ? DUAL_GAP_PX : 0 }}>
      {/* Desktop frame */}
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, position: "relative" }}>
        {canvasMode === "dual" &&
          mobileFrameGuides.map((guide, i) => (
            <div
              key={i}
              className="pointer-events-none absolute z-50"
              style={
                guide.type === "vertical"
                  ? { left: guide.position, top: 0, bottom: 0, width: 2, backgroundColor: "#dc2626" }
                  : { top: guide.position, left: 0, right: -(DUAL_GAP_PX + mobileWidth), height: 2, backgroundColor: "#dc2626" }
              }
            />
          ))}
        {canvasMode === "dual" ? (
          <BreakpointOverrideProvider breakpoint="desktop">
            <div style={{ position: "relative" }}>
              <ArtboardLabel
                icon={<Monitor size={13} />}
                label="Desktop"
                width={document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width}
                isActive={breakpoint === "desktop"}
                onClick={() => setBreakpoint("desktop")}
                zoom={zoom}
              />
              <div
                ref={canvasFrameRef}
                style={{
                  width: document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width,
                  minHeight: document.canvasConfig.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height,
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
                  onPointerDown(e);
                  e.stopPropagation();
                }}
                {...frameEventHandlers}
              >
                <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[1200px] -translate-x-1/2 border-x border-dashed border-blue-400/20" />
                <div style={{ opacity: activePopup ? 0.42 : 1, pointerEvents: activePopup ? "none" : undefined }}>
                  <NodeRenderer nodeId={document.rootNodeId} />
                  {!activePopup && <SectionOverlay {...sharedSectionOverlayProps} canvasFrameRef={canvasFrameRef} />}
                </div>
                <PopupEditorSurface
                  popup={activePopup}
                  popupFrameRef={popupFrameRef}
                  frameEventHandlers={frameEventHandlers}
                  selectionMode={activePopupSelection}
                  previewMode={popupPreviewOpen}
                  onSelectShell={onSelectPopupShell}
                  onSelectContent={onSelectPopupContent}
                  onExit={() => onEditPopup(null)}
                  onDuplicate={() => activePopup && onDuplicatePopup(activePopup.id)}
                  onDelete={() => activePopup && onDeletePopup(activePopup.id)}
                  onToggleEnabled={() => activePopup && onTogglePopupEnabled(activePopup.id, !activePopup.enabled)}
                  onTogglePreview={onTogglePopupPreview}
                  onResizeStart={onPopupShellResizeStart}
                  onDragStart={onPopupShellDragStart}
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
            onPointerDown={(e) => {
              onPointerDown(e);
              e.stopPropagation();
            }}
            {...frameEventHandlers}
          >
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-[1200px] -translate-x-1/2 border-x border-dashed border-blue-400/20" />
            <div style={{ opacity: activePopup ? 0.42 : 1, pointerEvents: activePopup ? "none" : undefined }}>
              <NodeRenderer nodeId={document.rootNodeId} />
              {!activePopup && <SectionOverlay {...sharedSectionOverlayProps} canvasFrameRef={canvasFrameRef} />}
            </div>
            <PopupEditorSurface
              popup={activePopup}
              popupFrameRef={popupFrameRef}
              frameEventHandlers={frameEventHandlers}
              selectionMode={activePopupSelection}
              previewMode={popupPreviewOpen}
              onSelectShell={onSelectPopupShell}
              onSelectContent={onSelectPopupContent}
              onExit={() => onEditPopup(null)}
              onDuplicate={() => activePopup && onDuplicatePopup(activePopup.id)}
              onDelete={() => activePopup && onDeletePopup(activePopup.id)}
              onToggleEnabled={() => activePopup && onTogglePopupEnabled(activePopup.id, !activePopup.enabled)}
              onTogglePreview={onTogglePopupPreview}
              onResizeStart={onPopupShellResizeStart}
              onDragStart={onPopupShellDragStart}
            />
            {sectionNodes.length === 0 && !activePopup && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="pointer-events-auto flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-background/70 px-10 py-8 text-center backdrop-blur-sm shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <LayoutTemplate className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t("canvas.empty")}</p>
                    <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
                      {t("canvas.emptyHint")}
                    </p>
                  </div>
                  <button
                    onClick={onOpenPageGenerator}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95 transition-all"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t("canvas.generateWithAI")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile frame (dual mode only) */}
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
            <ArtboardLabel
              icon={<Smartphone size={13} />}
              label="Mobile"
              width={DEVICE_VIEWPORT_PRESETS.mobile.width}
              isActive={breakpoint === "mobile"}
              onClick={() => setBreakpoint("mobile")}
              gripProps={{ onPointerDown: onMobileFrameGripDown }}
              zoom={zoom}
            />
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
                  onPointerDown(e);
                  e.stopPropagation();
                }}
                onDoubleClick={onCanvasDoubleClick}
                onMouseOver={onMouseOver}
                onMouseOut={onMouseOut}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDrop={onDrop}
              >
                <div style={{ opacity: activePopup ? 0.42 : 1, pointerEvents: activePopup ? "none" : undefined }}>
                  <NodeRenderer nodeId={document.rootNodeId} mode="editor" />
                  {!activePopup && <SectionOverlay {...sharedSectionOverlayProps} canvasFrameRef={mobileFrameRef} />}
                </div>
                <PopupEditorSurface
                  popup={activePopup}
                  popupFrameRef={popupFrameRef}
                  frameEventHandlers={frameEventHandlers}
                  selectionMode={activePopupSelection}
                  previewMode={popupPreviewOpen}
                  onSelectShell={onSelectPopupShell}
                  onSelectContent={onSelectPopupContent}
                  onExit={() => onEditPopup(null)}
                  onDuplicate={() => activePopup && onDuplicatePopup(activePopup.id)}
                  onDelete={() => activePopup && onDeletePopup(activePopup.id)}
                  onToggleEnabled={() => activePopup && onTogglePopupEnabled(activePopup.id, !activePopup.enabled)}
                  onTogglePreview={onTogglePopupPreview}
                  onResizeStart={onPopupShellResizeStart}
                  onDragStart={onPopupShellDragStart}
                />
              </div>
            </BreakpointOverrideProvider>
          </div>
        </div>
      )}
    </div>
  );
}
