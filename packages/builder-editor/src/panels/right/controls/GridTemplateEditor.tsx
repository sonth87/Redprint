import React, { useState, useMemo, useCallback } from "react";
import { Label, cn } from "@ui-builder/ui";
import { Plus, X } from "lucide-react";

const TRACK_PRESETS = ["1fr", "2fr", "auto", "200px", "100px", "150px", "300px"];
const MAX_TRACKS = 12;

/** Parse a CSS grid template string into an array of track tokens. */
function parseTemplate(tpl: string): string[] {
  const s = tpl.trim();
  if (!s) return ["1fr"];
  return s.split(/\s+/).filter(Boolean);
}

/** Compute a rough proportional width (0–1) for each track token for the preview bar. */
function trackToFlex(token: string): number {
  if (token.endsWith("fr")) return parseFloat(token) || 1;
  if (token === "auto") return 1;
  const px = parseFloat(token);
  return isNaN(px) ? 1 : Math.max(px / 100, 0.3);
}

/** Tiny inline preset dropdown rendered as an absolute-positioned panel. */
function PresetMenu({
  value,
  onSelect,
  children,
}: {
  value: string;
  onSelect: (v: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div onClick={() => setOpen((v) => !v)}>{children}</div>
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-md p-1 min-w-[80px]">
            {TRACK_PRESETS.map((preset) => (
              <button
                key={preset}
                className={cn(
                  "w-full text-left px-2 py-1 text-[10px] font-mono rounded hover:bg-muted transition-colors",
                  preset === value && "text-primary font-semibold",
                )}
                onClick={() => { onSelect(preset); setOpen(false); }}
              >
                {preset}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Single editable track chip with preset popover on click. */
function TrackChip({
  value,
  canRemove,
  onChange,
  onRemove,
}: {
  value: string;
  canRemove: boolean;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    onChange(draft.trim() || "1fr");
  };

  return (
    <div className="relative flex items-center">
      {editing ? (
        <input
          autoFocus
          className="h-6 w-16 rounded border border-primary bg-background px-1.5 text-[10px] font-mono outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(value); setEditing(false); }
          }}
        />
      ) : (
        <div className="flex items-center gap-0.5 h-6 pl-2 pr-1 rounded border border-border bg-muted/50 hover:border-primary/60 hover:bg-muted transition-colors group">
          {/* Click label area → open preset menu or inline edit */}
          <PresetMenu value={value} onSelect={onChange}>
            <span
              className="text-[10px] font-mono cursor-pointer select-none min-w-[24px] text-center"
              onDoubleClick={() => { setDraft(value); setEditing(true); }}
              title="Click for presets · Double-click to edit"
            >
              {value}
            </span>
          </PresetMenu>
          {canRemove && (
            <button
              className="ml-0.5 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              title="Remove column"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * GridTemplateEditor — visual chip-based editor for CSS grid-template-columns.
 * - Each track = editable chip with preset popover
 * - [+] adds a track (max 12)
 * - [×] on each chip removes it (min 1)
 * - Mini preview bar shows proportional column widths
 * - Syncs back: `columns` count, `customTemplate` string, `columnTemplate` = "custom"
 */
export function GridTemplateEditor({
  customTemplate,
  onColumnsChange,
  onCustomTemplateChange,
  onColumnTemplateChange,
}: {
  columns: number;
  customTemplate: string;
  onColumnsChange: (n: number) => void;
  onCustomTemplateChange: (s: string) => void;
  onColumnTemplateChange: (s: string) => void;
}) {
  const tracks = useMemo(() => parseTemplate(customTemplate), [customTemplate]);

  const commit = useCallback((newTracks: string[]) => {
    const str = newTracks.join(" ");
    onCustomTemplateChange(str);
    onColumnsChange(newTracks.length);
    onColumnTemplateChange("custom");
  }, [onCustomTemplateChange, onColumnsChange, onColumnTemplateChange]);

  const updateTrack = useCallback((idx: number, val: string) => {
    const next = [...tracks];
    next[idx] = val || "1fr";
    commit(next);
  }, [tracks, commit]);

  const addTrack = useCallback(() => {
    if (tracks.length >= MAX_TRACKS) return;
    commit([...tracks, "1fr"]);
  }, [tracks, commit]);

  const removeTrack = useCallback((idx: number) => {
    if (tracks.length <= 1) return;
    const next = tracks.filter((_, i) => i !== idx);
    commit(next);
  }, [tracks, commit]);

  const totalFlex = tracks.reduce((sum, t) => sum + trackToFlex(t), 0);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Columns</Label>
        <span className="text-[10px] text-muted-foreground">{tracks.length} / {MAX_TRACKS}</span>
      </div>

      {/* Track chips */}
      <div className="flex flex-wrap gap-1.5">
        {tracks.map((track, idx) => (
          <TrackChip
            key={idx}
            value={track}
            canRemove={tracks.length > 1}
            onChange={(v) => updateTrack(idx, v)}
            onRemove={() => removeTrack(idx)}
          />
        ))}
        {tracks.length < MAX_TRACKS && (
          <button
            className="h-6 px-2 rounded border border-dashed border-muted-foreground/40 text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-0.5"
            onClick={addTrack}
            title="Add column"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Mini preview bar */}
      <div className="h-5 rounded overflow-hidden flex border border-border/60" title={tracks.join(" ")}>
        {tracks.map((track, idx) => (
          <div
            key={idx}
            style={{ flex: trackToFlex(track) / totalFlex }}
            className={cn(
              "h-full border-r last:border-r-0 border-border/60 flex items-center justify-center",
              idx % 2 === 0 ? "bg-primary/10" : "bg-primary/20",
            )}
          >
            <span className="text-[8px] text-muted-foreground truncate px-0.5 leading-none">{track}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
