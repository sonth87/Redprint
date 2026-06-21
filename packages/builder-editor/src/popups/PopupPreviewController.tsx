import React from "react";
import { Eye, Play, RotateCcw, Square, X } from "lucide-react";
import type { PopupDefinition, PopupLifecycleState } from "@ui-builder/builder-core";

export interface PopupPreviewControllerProps {
  popup: PopupDefinition;
  lifecycle: PopupLifecycleState;
  onOpen: () => void;
  onClose: () => void;
  onReset: () => void;
  onExitPreview: () => void;
}

const LIFECYCLE_LABEL: Record<PopupLifecycleState, string> = {
  opening: "opening",
  open: "open",
  closing: "closing",
  closed: "closed",
};

function triggerLabel(popup: PopupDefinition): string {
  switch (popup.autoTrigger.type) {
    case "pageLoad":
      return `pageLoad${popup.autoTrigger.delayMs ? ` +${popup.autoTrigger.delayMs}ms` : ""}`;
    case "scrollDepth":
      return `scroll ${popup.autoTrigger.percent}%`;
    case "sectionVisible":
      return "sectionVisible";
    default:
      return "manual";
  }
}

function ruleSummary(popup: PopupDefinition): string {
  const r = popup.rules;
  const parts: string[] = [];
  if (r.showOncePerSession) parts.push("once/session");
  if (r.showOnceEveryDays) parts.push(`every ${r.showOnceEveryDays}d`);
  if (r.maxShows) parts.push(`max ${r.maxShows}`);
  if (r.devices?.length) parts.push(r.devices.join("/"));
  return parts.length ? parts.join(" · ") : "no rules";
}

/**
 * Editor preview debug strip: drive lifecycle, inspect state, and read the
 * active trigger/rule config without leaving the editor. Editor-only — never
 * mutates the document.
 */
export function PopupPreviewController({
  popup,
  lifecycle,
  onOpen,
  onClose,
  onReset,
  onExitPreview,
}: PopupPreviewControllerProps) {
  const isMounted = lifecycle === "opening" || lifecycle === "open";
  return (
    <div className="pointer-events-auto absolute left-0 top-0 z-[210] flex -translate-y-[calc(100%+8px)] items-center gap-1 rounded-md border bg-background/95 px-2 py-1 text-[11px] shadow-md backdrop-blur">
      <Eye className="h-3.5 w-3.5 text-primary" />
      <span className="font-semibold text-foreground">Preview</span>
      <span
        className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        title="Lifecycle state"
      >
        {LIFECYCLE_LABEL[lifecycle]}
      </span>
      <span
        className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        title="Active trigger · frequency rules"
      >
        {triggerLabel(popup)} · {ruleSummary(popup)}
      </span>
      {(popup.goals?.length || popup.variants?.length || popup.experiment?.enabled) && (
        <span
          className="rounded border border-primary/40 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] text-primary"
          title="V4 analytics · experiment config"
        >
          {popup.goals?.length ? `${popup.goals.length} goal${popup.goals.length > 1 ? "s" : ""}` : ""}
          {popup.goals?.length && (popup.variants?.length || popup.experiment?.enabled) ? " · " : ""}
          {popup.variants?.length ? `${popup.variants.length} variant${popup.variants.length > 1 ? "s" : ""}` : ""}
          {popup.experiment?.enabled ? ` (${popup.experiment.assignment})` : ""}
        </span>
      )}
      <span className="mx-0.5 h-4 w-px bg-border" />
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
        title="Open (replay enter)"
        disabled={isMounted}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <Play className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted disabled:opacity-40"
        title="Close (play exit)"
        disabled={!isMounted}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <Square className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
        title="Reset runtime state"
        onClick={(event) => {
          event.stopPropagation();
          onReset();
        }}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
        title="Exit popup preview"
        onClick={(event) => {
          event.stopPropagation();
          onExitPreview();
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
