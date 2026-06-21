import React from "react";
import { Copy, Eye, EyeOff, Layers, MousePointer2, Pencil, Trash2, X } from "lucide-react";
import { NodeRenderer } from "@ui-builder/builder-react";
import type { PopupDefinition } from "@ui-builder/builder-core";
import { cn } from "@ui-builder/ui";
import type { ResizeHandleType } from "../types";
import { PopupPreviewController } from "./PopupPreviewController";
import { usePopupPreviewLifecycle } from "./usePopupPreviewLifecycle";

// Keyframes mirror the runtime renderer (rb-popup-*) so editor preview animations
// match production exactly. Injected only while a popup is being edited.
const PREVIEW_KEYFRAMES = `
@keyframes rb-popup-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes rb-popup-scale { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: scale(1) } }
@keyframes rb-popup-slide-up { from { opacity: 0; transform: translateY(32px) } to { opacity: 1; transform: translateY(0) } }
@keyframes rb-popup-slide-down { from { opacity: 0; transform: translateY(-32px) } to { opacity: 1; transform: translateY(0) } }
@keyframes rb-popup-slide-left { from { opacity: 0; transform: translateX(32px) } to { opacity: 1; transform: translateX(0) } }
@keyframes rb-popup-slide-right { from { opacity: 0; transform: translateX(-32px) } to { opacity: 1; transform: translateX(0) } }
@keyframes rb-popup-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes rb-popup-scale-out { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(.96) } }
@keyframes rb-popup-slide-up-out { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(32px) } }
@keyframes rb-popup-slide-down-out { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(-32px) } }
@keyframes rb-popup-slide-left-out { from { opacity: 1; transform: translateX(0) } to { opacity: 0; transform: translateX(32px) } }
@keyframes rb-popup-slide-right-out { from { opacity: 1; transform: translateX(0) } to { opacity: 0; transform: translateX(-32px) } }
`;

function getPreviewAnimation(popup: PopupDefinition, lifecycle: string): string | undefined {
  if (popup.animation.enter === "none") return undefined;
  if (lifecycle === "closing") {
    const exit = popup.animation.exit ?? popup.animation.enter;
    if (exit === "none") return undefined;
    return `rb-popup-${exit}-out ${popup.animation.durationMs}ms ${popup.animation.easing ?? "ease"} both`;
  }
  if (lifecycle === "opening") {
    return `rb-popup-${popup.animation.enter} ${popup.animation.durationMs}ms ${popup.animation.easing ?? "ease"} both`;
  }
  return undefined;
}

export interface PopupEditorSurfaceProps {
  popup: PopupDefinition | null;
  popupFrameRef: React.RefObject<HTMLDivElement | null>;
  frameEventHandlers: React.HTMLAttributes<HTMLDivElement>;
  selectionMode: "shell" | "content" | null;
  previewMode: boolean;
  onSelectShell: () => void;
  onSelectContent: () => void;
  onExit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  onTogglePreview: () => void;
  onResizeStart: (handle: ResizeHandleType, event: React.MouseEvent) => void;
  onDragStart: (event: React.PointerEvent) => void;
}

export function PopupEditorSurface({
  popup,
  popupFrameRef,
  frameEventHandlers,
  selectionMode,
  previewMode,
  onSelectShell,
  onSelectContent,
  onExit,
  onDuplicate,
  onDelete,
  onToggleEnabled,
  onTogglePreview,
  onResizeStart,
  onDragStart,
}: PopupEditorSurfaceProps) {
  // Share the runtime lifecycle state machine so preview matches production.
  const { lifecycle, requestClose, replay, reset } = usePopupPreviewLifecycle(previewMode, popup, onTogglePreview);

  React.useEffect(() => {
    if (!previewMode || !popup?.behavior.closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose, popup?.behavior.closeOnEscape, previewMode]);

  if (!popup) return null;

  const shell = getEditorPopupShellStyle(popup);
  const handles = getPopupResizeHandles(popup);
  const isShellSelected = selectionMode === "shell";
  const previewAnimation = previewMode ? getPreviewAnimation(popup, lifecycle) : undefined;

  return (
    <div
      className="absolute inset-0 z-[120] flex"
      style={{ alignItems: shell.alignItems, justifyContent: shell.justifyContent, padding: shell.wrapperPadding }}
    >
      {previewMode && <style>{PREVIEW_KEYFRAMES}</style>}
      {popup.behavior.backdrop.enabled && (
        <div
          className="absolute inset-0"
          style={{
            background: popup.behavior.backdrop.color,
            opacity: popup.behavior.backdrop.opacity,
            backdropFilter: popup.behavior.backdrop.blur ? `blur(${popup.behavior.backdrop.blur})` : undefined,
            animation:
              previewMode && popup.animation.enter !== "none"
                ? `${lifecycle === "closing" ? "rb-popup-fade-out" : "rb-popup-fade"} ${popup.animation.durationMs}ms ${popup.animation.easing ?? "ease"} both`
                : undefined,
          }}
          onMouseDown={(event) => {
            if (!previewMode) return;
            if (popup.behavior.closeOnBackdropClick) {
              event.stopPropagation();
              requestClose();
            }
          }}
        />
      )}
      <div
        className={cn(
          "relative z-10 overflow-visible shadow-2xl",
          !previewMode && "ring-2",
          !previewMode && isShellSelected ? "ring-primary/80" : "ring-primary/45",
        )}
        style={{ ...shell.surface, animation: previewAnimation }}
        onMouseDown={(event) => {
          if (previewMode) return;
          if (event.target === event.currentTarget) onSelectShell();
        }}
      >
        <div
          ref={popupFrameRef}
          className="relative h-full min-h-inherit w-full overflow-auto"
          style={{ minHeight: shell.surface.minHeight }}
          {...(!previewMode ? frameEventHandlers : {})}
        >
          <NodeRenderer nodeId={popup.rootNodeId} mode="editor" />
        </div>

        {previewMode ? (
          <>
            <PopupPreviewController
              popup={popup}
              lifecycle={lifecycle}
              onOpen={replay}
              onClose={requestClose}
              onReset={reset}
              onExitPreview={onTogglePreview}
            />
            {popup.behavior.showCloseButton && (
              <button
                type="button"
                className="absolute right-2 top-2 z-[210] flex h-8 w-8 items-center justify-center rounded-full border bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
                title="Close preview popup"
                onClick={(event) => {
                  event.stopPropagation();
                  requestClose();
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="pointer-events-none absolute inset-0 z-[190] rounded-[inherit] outline outline-2 outline-primary/70">
            <PopupShellToolbar
              popup={popup}
              onSelectShell={onSelectShell}
              onSelectContent={onSelectContent}
              onExit={onExit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onToggleEnabled={onToggleEnabled}
              onTogglePreview={onTogglePreview}
              onDragStart={onDragStart}
            />
            {handles.map((handle) => (
              <PopupShellResizeHandle key={handle} handle={handle} onResizeStart={onResizeStart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PopupShellToolbar({
  popup,
  onSelectShell,
  onSelectContent,
  onExit,
  onDuplicate,
  onDelete,
  onToggleEnabled,
  onTogglePreview,
  onDragStart,
}: {
  popup: PopupDefinition;
  onSelectShell: () => void;
  onSelectContent: () => void;
  onExit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  onTogglePreview: () => void;
  onDragStart: (event: React.PointerEvent) => void;
}) {
  const draggable = popup.kind === "modal" && popup.kindConfig.kind === "modal" && popup.kindConfig.draggable;
  return (
    <div className="pointer-events-auto absolute left-0 top-0 flex -translate-y-[calc(100%+8px)] items-center gap-1 rounded-md border bg-background/95 px-1.5 py-1 text-[11px] shadow-md backdrop-blur">
      <button
        type="button"
        className={cn(
          "flex max-w-[190px] items-center gap-1.5 truncate rounded px-1.5 py-1 font-semibold text-foreground hover:bg-muted",
          draggable && "cursor-grab active:cursor-grabbing",
        )}
        title={draggable ? "Drag popup" : "Select popup shell"}
        onPointerDown={draggable ? onDragStart : undefined}
        onClick={(event) => {
          event.stopPropagation();
          onSelectShell();
        }}
      >
        <Layers className="h-3.5 w-3.5 text-primary" />
        <span className="truncate">{popup.name}</span>
      </button>
      <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        {popup.kind} · {popup.placement}
      </span>
      <ToolbarButton title="Edit popup content" onClick={onSelectContent}>
        <MousePointer2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title={popup.enabled ? "Disable popup" : "Enable popup"} onClick={onToggleEnabled}>
        {popup.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </ToolbarButton>
      <ToolbarButton title="Preview popup" onClick={onTogglePreview}>
        <Pencil className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Duplicate popup" onClick={onDuplicate}>
        <Copy className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Delete popup" onClick={onDelete} destructive>
        <Trash2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Exit popup edit" onClick={onExit}>
        <X className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  destructive,
  children,
}: {
  title: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
      )}
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function PopupShellResizeHandle({
  handle,
  onResizeStart,
}: {
  handle: ResizeHandleType;
  onResizeStart: (handle: ResizeHandleType, event: React.MouseEvent) => void;
}) {
  const positions: Record<ResizeHandleType, React.CSSProperties> = {
    n: { top: 0, left: "50%", transform: "translate(-50%, -50%)", cursor: "ns-resize" },
    s: { bottom: 0, left: "50%", transform: "translate(-50%, 50%)", cursor: "ns-resize" },
    e: { right: 0, top: "50%", transform: "translate(50%, -50%)", cursor: "ew-resize" },
    w: { left: 0, top: "50%", transform: "translate(-50%, -50%)", cursor: "ew-resize" },
    ne: { right: 0, top: 0, transform: "translate(50%, -50%)", cursor: "nesw-resize" },
    nw: { left: 0, top: 0, transform: "translate(-50%, -50%)", cursor: "nwse-resize" },
    se: { right: 0, bottom: 0, transform: "translate(50%, 50%)", cursor: "nwse-resize" },
    sw: { left: 0, bottom: 0, transform: "translate(-50%, 50%)", cursor: "nesw-resize" },
  };
  return (
    <div
      data-popup-resize-handle
      className="pointer-events-auto absolute h-3 w-3 rounded-sm border border-primary bg-background shadow-sm"
      style={positions[handle]}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onResizeStart(handle, event);
      }}
    />
  );
}

function getPopupResizeHandles(popup: PopupDefinition): ResizeHandleType[] {
  if (popup.kind === "fullscreen") return [];
  if (popup.kind === "drawer") return [popup.placement === "left" ? "e" : "w"];
  if (popup.kind === "bottomSheet") return ["n"];
  if (popup.kind === "bar") return [popup.placement === "top" ? "s" : "n"];
  return popup.kindConfig.kind === "modal" && popup.kindConfig.resizable === false ? [] : ["e", "s", "se"];
}

export function getEditorPopupShellStyle(popup: PopupDefinition): {
  alignItems: React.CSSProperties["alignItems"];
  justifyContent: React.CSSProperties["justifyContent"];
  wrapperPadding: string;
  surface: React.CSSProperties;
} {
  const base: React.CSSProperties = {
    background: "#ffffff",
    color: "#111827",
    maxWidth: "calc(100% - 32px)",
    maxHeight: "calc(100% - 32px)",
    minWidth: 280,
  };
  if (popup.kind === "drawer") {
    const config = popup.kindConfig.kind === "drawer" ? popup.kindConfig : undefined;
    return {
      alignItems: "stretch",
      justifyContent: popup.placement === "left" ? "flex-start" : "flex-end",
      wrapperPadding: "0",
      surface: { ...base, width: config?.width ?? "420px", height: "100%", maxHeight: "100%", maxWidth: config?.maxWidth ?? "86%" },
    };
  }
  if (popup.kind === "bottomSheet") {
    const config = popup.kindConfig.kind === "bottomSheet" ? popup.kindConfig : undefined;
    return {
      alignItems: "flex-end",
      justifyContent: "center",
      wrapperPadding: "0",
      surface: { ...base, width: "100%", height: config?.initialHeight ?? "45%", maxHeight: config?.maxHeight ?? "92%", borderRadius: "18px 18px 0 0" },
    };
  }
  if (popup.kind === "bar") {
    const config = popup.kindConfig.kind === "bar" ? popup.kindConfig : undefined;
    return {
      alignItems: popup.placement === "top" ? "flex-start" : "flex-end",
      justifyContent: "center",
      wrapperPadding: "0",
      surface: { ...base, width: "100%", minHeight: config?.height ?? "72px", maxHeight: "40%", borderRadius: 0 },
    };
  }
  if (popup.kind === "fullscreen") {
    return {
      alignItems: "stretch",
      justifyContent: "stretch",
      wrapperPadding: "0",
      surface: { ...base, width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%" },
    };
  }
  const config = popup.kindConfig.kind === "modal" ? popup.kindConfig : undefined;
  const offsetX = config?.offsetX ?? 0;
  const offsetY = config?.offsetY ?? 0;
  return {
    alignItems: "center",
    justifyContent: "center",
    wrapperPadding: "16px",
    surface: {
      ...base,
      width: config?.width,
      height: config?.height,
      maxWidth: config?.maxWidth ?? "640px",
      maxHeight: config?.maxHeight ?? "90%",
      borderRadius: 16,
      transform: offsetX !== 0 || offsetY !== 0 ? `translate(${offsetX}px, ${offsetY}px)` : undefined,
    },
  };
}
