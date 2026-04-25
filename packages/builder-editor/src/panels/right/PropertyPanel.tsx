import React, { memo, useState, useCallback, useMemo, useContext, createContext } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent, ScrollArea, Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider, Switch, Separator, Badge, cn } from "@ui-builder/ui";
import type { Asset, BuilderNode, Breakpoint, ComponentDefinition, PropSchema, InteractionConfig, InteractionTrigger, InteractionAction } from "@ui-builder/builder-core";
import { ImageFilterPicker } from "../ImageFilterPicker";
import { resolveStyle, resolveProps } from "@ui-builder/builder-core";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Paintbrush,
  Zap,
  Sparkles,
  Database,
  Settings2,
  EyeOff,
  X,
  ImageIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

// ── Media context — lets ImageControl open MediaManager from inside PropControl ──
interface MediaContextValue {
  assets: Asset[];
  onOpenMediaManager: (onSelect: (asset: Asset) => void) => void;
}
const MediaContext = createContext<MediaContextValue>({
  assets: [],
  onOpenMediaManager: () => {},
});

export interface PropertyPanelProps {
  selectedNode: BuilderNode | null;
  definition: ComponentDefinition | null;
  breakpoint?: Breakpoint;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
  onInteractionsChange?: (interactions: InteractionConfig[]) => void;
  /** Asset list from AssetProvider — used by image/video controls */
  assets?: Asset[];
  /** Callback to open MediaManager and get selected asset back */
  onOpenMediaManager?: (onSelect: (asset: Asset) => void) => void;
}

/**
 * A specialized input for numeric values with a fixed or selectable CSS unit.
 * Features:
 * - Click unit label to cycle units (with safe value capping for %).
 * - Click and drag horizontally to scrub (increment/decrement) the value.
 */
function NumericPropertyInput({
  value,
  onChange,
  placeholder = "0",
  units = ["px"],
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  units?: string[];
}) {
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  
  // Ensure units is non-empty with fallback
  const safeUnits = (units && units.length > 0) ? units : ["px"];
  
  // Parsing: detect current unit and numeric value
  const isAuto = value === "auto";
  const currentUnit = safeUnits.find(u => String(value).endsWith(u)) || safeUnits[0]!;
  const numPart = isAuto ? "" : String(value || "").replace(new RegExp(`${currentUnit}$`), "");

  const handleNumChange = (newVal: string) => {
    if (newVal === "" || newVal === "auto") {
      onChange(newVal);
      return;
    }
    if (!/^[-+]?[0-9]*\.?[0-9]*$/.test(newVal)) return;
    onChange(newVal + currentUnit);
  };

  const toggleUnit = () => {
    if (safeUnits.length <= 1 || isAuto) return;
    const currentIndex = safeUnits.indexOf(currentUnit);
    const nextUnit = safeUnits[(currentIndex + 1) % safeUnits.length]!;
    
    let nextNum = parseFloat(numPart) || 0;
    
    // Method 1: Safe Defaults
    // If switching to %, ensure the value isn't absurdly large (max 100%)
    if (nextUnit === "%" && nextNum > 100) {
      nextNum = 100;
    } else if (nextUnit === "px" && currentUnit === "%" && nextNum === 100) {
      // If switching from 100% to px, maybe default to a common size or let it be
      // For now, just keep the number as per user's "Method 1" request
    }

    onChange(nextNum + nextUnit);
  };

  // Scrubbing Logic
  const onMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (isAuto || e.button !== 0) return; // Only left click
    
    const startX = e.clientX;
    const startVal = parseFloat(numPart) || 0;
    let hasMoved = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (Math.abs(deltaX) > 3) {
        hasMoved = true;
        setIsScrubbing(true);
        
        // Adjust step based on modifiers
        let step = 1;
        if (moveEvent.shiftKey) step = 10;
        if (moveEvent.altKey) step = 0.1;
        
        const newVal = startVal + (deltaX * step);
        // Round to 1 decimal place if using alt, else integer
        const formattedVal = step < 1 ? Math.round(newVal * 10) / 10 : Math.round(newVal);
        
        onChange(formattedVal + currentUnit);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setTimeout(() => setIsScrubbing(false), 0);
      
      if (hasMoved) {
        // Prevent click events if we actually dragged
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [numPart, currentUnit, isAuto, onChange]);

  return (
    <div className="relative flex items-center group">
      <Input
        className={cn(
          "h-7 text-xs pr-8 focus-visible:ring-1",
          !isAuto && "cursor-ew-resize select-none focus:cursor-text",
          isScrubbing && "cursor-ew-resize pointer-events-none"
        )}
        value={numPart}
        placeholder={isAuto ? "auto" : placeholder}
        onMouseDown={onMouseDown}
        onChange={(e) => handleNumChange(e.target.value)}
      />
      {!isAuto && (
        <span 
          className={cn(
            "absolute right-2.5 text-[10px] font-medium text-muted-foreground/60 select-none cursor-default",
            safeUnits.length > 1 && "cursor-pointer hover:text-primary hover:bg-muted px-1 rounded transition-colors"
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleUnit();
          }}
          title={safeUnits.length > 1 ? `Click to switch unit (${safeUnits.join('/')})` : undefined}
        >
          {currentUnit}
        </span>
      )}
    </div>
  );
}

// ── Grid Template Editor ─────────────────────────────────────────────────

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

/**
 * GridTemplateEditor — visual chip-based editor for CSS grid-template-columns.
 * - Each track = editable chip with preset popover
 * - [+] adds a track (max 12)
 * - [×] on each chip removes it (min 1)
 * - Mini preview bar shows proportional column widths
 * - Syncs back: `columns` count, `customTemplate` string, `columnTemplate` = "custom"
 */
function GridTemplateEditor({
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

/**
 * Renders a single prop control based on its PropSchema.
 */
function PropControl({
  schema,
  value,
  onChange,
}: {
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (schema.type) {
    case "string":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          {schema.multiline ? (
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              value={String(value ?? "")}
              placeholder={schema.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <Input
              className="h-7 text-xs"
              value={String(value ?? "")}
              placeholder={schema.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </div>
      );

    case "number":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              className="h-7 text-xs"
              value={Number(value ?? schema.default ?? 0)}
              min={schema.min}
              max={schema.max}
              step={schema.step ?? 1}
              onChange={(e) => onChange(parseFloat(e.target.value))}
            />
            {schema.unit && (
              <span className="text-xs text-muted-foreground">{schema.unit}</span>
            )}
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between">
          <Label className="text-xs">{schema.label}</Label>
          <Switch
            checked={Boolean(value ?? schema.default ?? false)}
            onCheckedChange={onChange}
          />
        </div>
      );

    case "select":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          <Select
            value={String(value ?? schema.default ?? "")}
            onValueChange={onChange}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schema.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "slider":
      return (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{schema.label}</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Number(value ?? schema.default ?? schema.min)}
            </span>
          </div>
          <Slider
            min={schema.min}
            max={schema.max}
            step={schema.step ?? 1}
            value={[Number(value ?? schema.default ?? schema.min)]}
            onValueChange={([v]) => onChange(v)}
          />
        </div>
      );

    case "color":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-7 w-10 rounded border border-input bg-background cursor-pointer"
              value={String(value ?? schema.default ?? "#000000")}
              onChange={(e) => onChange(e.target.value)}
            />
            <Input
              className="h-7 text-xs flex-1 font-mono"
              value={String(value ?? schema.default ?? "")}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
      );

    case "image":
      return <ImagePropControl schema={schema} value={value} onChange={onChange} />;

    default:
      return (
        <div className="text-xs text-muted-foreground">
          {schema.label}: <span className="italic">Unsupported control ({schema.type})</span>
        </div>
      );
  }
}

// ── Image prop control ────────────────────────────────────────────────────
function ImagePropControl({
  schema,
  value,
  onChange,
}: {
  schema: Extract<PropSchema, { type: "image" }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { assets, onOpenMediaManager } = useContext(MediaContext);
  const src = String(value ?? "");

  const handleOpen = () => {
    onOpenMediaManager((asset) => onChange(asset.url));
  };

  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{schema.label}</Label>
      {/* Thumbnail preview */}
      <div
        className="relative w-full h-24 rounded-md border border-border overflow-hidden bg-muted cursor-pointer group"
        onClick={handleOpen}
      >
        {src ? (
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageIcon className="h-6 w-6 opacity-40" />
            <span className="text-[10px]">No image</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">Change Image</span>
        </div>
      </div>
      {/* URL fallback input */}
      <Input
        className="h-7 text-xs font-mono"
        placeholder="https://… or click above"
        value={src}
        onChange={(e) => onChange(e.target.value)}
      />
      {assets.length > 0 && (
        <p className="text-[10px] text-muted-foreground">{assets.length} asset{assets.length !== 1 ? "s" : ""} in library</p>
      )}
    </div>
  );
}

// ── Collapsible section ──────────────────────────────────────────────────

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex items-center gap-1 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

// ── Interaction editor row ───────────────────────────────────────────────

function InteractionRow({
  interaction,
  index,
  onChange,
  onRemove,
}: {
  interaction: InteractionConfig;
  index: number;
  onChange: (updated: InteractionConfig) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const triggerOptions: { value: InteractionTrigger; label: string }[] = useMemo(
    () => [
      { value: "click", label: t("events.click") },
      { value: "dblclick", label: t("events.dblclick") },
      { value: "hover", label: t("events.hover") },
      { value: "mouseenter", label: t("events.mouseenter") },
      { value: "mouseleave", label: t("events.mouseleave") },
      { value: "focus", label: t("events.focus") },
      { value: "blur", label: t("events.blur") },
      { value: "submit", label: t("events.submit") },
      { value: "change", label: t("events.change") },
      { value: "mount", label: t("events.mount") },
      { value: "unmount", label: t("events.unmount") },
      { value: "scroll", label: t("events.scroll") },
    ],
    [t],
  );
  const actionTypeOptions = useMemo(
    () => [
      { value: "navigate", label: t("events.navigate") },
      { value: "toggleVisibility", label: t("events.toggleVisibility") },
      { value: "setState", label: t("events.setState") },
      { value: "showModal", label: t("events.showModal") },
      { value: "hideModal", label: t("events.hideModal") },
      { value: "scrollTo", label: t("events.scrollTo") },
      { value: "addClass", label: t("events.addClass") },
      { value: "removeClass", label: t("events.removeClass") },
      { value: "emit", label: t("events.emitEvent") },
      { value: "triggerApi", label: t("events.apiCall") },
      { value: "custom", label: t("events.custom") },
    ],
    [t],
  );
  return (
    <div className="rounded-md border p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground">
          #{index + 1}
        </span>
        <button
          className="text-muted-foreground hover:text-destructive transition-colors"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("events.trigger")}</Label>
          <Select
            value={interaction.trigger}
            onValueChange={(val) =>
              onChange({ ...interaction, trigger: val as InteractionTrigger })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {triggerOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("events.action")}</Label>
          <Select
            value={interaction.actions[0]?.type ?? "navigate"}
            onValueChange={(val) => {
              const action = { type: val } as InteractionAction;
              onChange({ ...interaction, actions: [action] });
            }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actionTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action-specific fields */}
      {interaction.actions[0]?.type === "navigate" && (
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("events.url")}</Label>
          <Input
            className="h-7 text-xs"
            placeholder="https://..."
            value={(interaction.actions[0] as { url?: string }).url ?? ""}
            onChange={(e) =>
              onChange({
                ...interaction,
                actions: [{ type: "navigate" as const, url: e.target.value }],
              })
            }
          />
        </div>
      )}

      {(interaction.actions[0]?.type === "toggleVisibility" ||
        interaction.actions[0]?.type === "showModal" ||
        interaction.actions[0]?.type === "hideModal" ||
        interaction.actions[0]?.type === "scrollTo") && (
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("events.targetId")}</Label>
          <Input
            className="h-7 text-xs font-mono"
            placeholder="node-id"
            value={(interaction.actions[0] as { targetId?: string }).targetId ?? ""}
            onChange={(e) => {
              const action = interaction.actions[0];
              const actionType = action?.type as "toggleVisibility" | "showModal" | "hideModal" | "scrollTo";
              onChange({
                ...interaction,
                actions: [{ type: actionType, targetId: e.target.value }],
              });
            }}
          />
        </div>
      )}

      {interaction.actions[0]?.type === "setState" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">{t("events.key")}</Label>
            <Input
              className="h-7 text-xs"
              placeholder="key"
              value={(interaction.actions[0] as { key?: string }).key ?? ""}
              onChange={(e) => {
                const action = interaction.actions[0] as { type: "setState"; key: string; value: unknown };
                onChange({
                  ...interaction,
                  actions: [{ type: "setState" as const, key: e.target.value, value: action?.value ?? "" }],
                });
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">{t("events.value")}</Label>
            <Input
              className="h-7 text-xs"
              placeholder="value"
              value={String((interaction.actions[0] as { value?: unknown }).value ?? "")}
              onChange={(e) => {
                const action = interaction.actions[0] as { type: "setState"; key: string; value: unknown };
                onChange({
                  ...interaction,
                  actions: [{ type: "setState" as const, key: action?.key ?? "", value: e.target.value }],
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Animation preset options ─────────────────────────────────────────────

const ANIMATION_PRESETS = [
  { value: "none", label: "None" },
  { value: "fadeIn", label: "Fade In" },
  { value: "fadeOut", label: "Fade Out" },
  { value: "slideInLeft", label: "Slide In Left" },
  { value: "slideInRight", label: "Slide In Right" },
  { value: "slideInUp", label: "Slide In Up" },
  { value: "slideInDown", label: "Slide In Down" },
  { value: "bounceIn", label: "Bounce In" },
  { value: "zoomIn", label: "Zoom In" },
  { value: "zoomOut", label: "Zoom Out" },
  { value: "rotateIn", label: "Rotate In" },
  { value: "pulse", label: "Pulse" },
  { value: "shake", label: "Shake" },
  { value: "flash", label: "Flash" },
  { value: "swing", label: "Swing" },
  { value: "tada", label: "Tada" },
];

const EASING_OPTIONS = [
  { value: "ease", label: "Ease" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In Out" },
  { value: "linear", label: "Linear" },
  { value: "cubic-bezier(0.4, 0, 0.2, 1)", label: "Smooth" },
];

// ── Main Property Panel ──────────────────────────────────────────────────

/**
 * PropertyPanel — right panel displaying selected node's editable properties.
 *
 * 5 tabs: Design | Events | Effects | Data | Advanced
 */
export const PropertyPanel = memo(function PropertyPanel({
  selectedNode,
  definition,
  breakpoint,
  onPropChange,
  onStyleChange,
  onInteractionsChange,
  assets = [],
  onOpenMediaManager = () => {},
}: PropertyPanelProps) {
  const { t } = useTranslation();
  const mediaCtx: MediaContextValue = useMemo(
    () => ({ assets, onOpenMediaManager }),
    [assets, onOpenMediaManager],
  );

  if (!selectedNode || !definition) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2 p-4">
        <Settings2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-center">{t("panels.selectComponent")}</p>
      </div>
    );
  }

  const activeBp = breakpoint ?? "desktop";
  const resolvedStyle = resolveStyle(selectedNode.style, selectedNode.responsiveStyle ?? {}, activeBp);
  const resolvedPropsMap = resolveProps(selectedNode.props, selectedNode.responsiveProps, activeBp);
  const style = resolvedStyle as Record<string, unknown>;
  const interactions = selectedNode.interactions ?? [];

  const handleAddInteraction = () => {
    if (!onInteractionsChange) return;
    const newInteraction: InteractionConfig = {
      id: crypto.randomUUID(),
      trigger: "click",
      actions: [{ type: "navigate", url: "" }],
      conditions: [],
    };
    onInteractionsChange([...interactions, newInteraction]);
  };

  const handleUpdateInteraction = (index: number, updated: InteractionConfig) => {
    if (!onInteractionsChange) return;
    const next = [...interactions];
    next[index] = updated;
    onInteractionsChange(next);
  };

  const handleRemoveInteraction = (index: number) => {
    if (!onInteractionsChange) return;
    onInteractionsChange(interactions.filter((_, i) => i !== index));
  };

  return (
    <MediaContext.Provider value={mediaCtx}>
    <div className="flex flex-col h-full">
      {/* Node type header */}
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold truncate">{selectedNode.name ?? definition.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{selectedNode.type}</p>
        </div>
        <div className="flex items-center gap-1">
          {selectedNode.locked && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">{t("propertyPanel.locked")}</Badge>
          )}
          {selectedNode.hidden && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              <EyeOff className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="design" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-2 mt-2 h-12 grid grid-cols-5">
          <TabsTrigger value="design" className="text-[10px] gap-0.5 px-1 flex flex-col">
            <Paintbrush className="h-3 w-3" />
            <span className="hidden sm:inline">{t("propertyPanel.design")}</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="text-[10px] gap-0.5 px-1 flex flex-col">
            <Zap className="h-3 w-3" />
            <span className="hidden sm:inline">{t("propertyPanel.events")}</span>
          </TabsTrigger>
          <TabsTrigger value="effects" className="text-[10px] gap-0.5 px-1 flex flex-col">
            <Sparkles className="h-3 w-3" />
            <span className="hidden sm:inline">{t("propertyPanel.effects")}</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="text-[10px] gap-0.5 px-1 flex flex-col">
            <Database className="h-3 w-3" />
            <span className="hidden sm:inline">{t("propertyPanel.data")}</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-[10px] gap-0.5 px-1 flex flex-col">
            <Settings2 className="h-3 w-3" />
            <span className="hidden sm:inline">{t("propertyPanel.advanced")}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Design tab ───────────────────────────────────────────── */}
        <TabsContent value="design" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            {/* Component props */}
            {definition.propSchema.length > 0 && (
              <CollapsibleSection title={t("propertyPanel.properties")}>
                {/* Grid gets a custom template editor instead of raw columnTemplate/customTemplate controls */}
                {selectedNode.type === "Grid" && (
                  <GridTemplateEditor
                    columns={Number(resolvedPropsMap["columns"] ?? 3)}
                    customTemplate={String(resolvedPropsMap["customTemplate"] ?? "1fr 1fr 1fr")}
                    onColumnsChange={(n) => onPropChange("columns", n)}
                    onCustomTemplateChange={(s) => onPropChange("customTemplate", s)}
                    onColumnTemplateChange={(s) => onPropChange("columnTemplate", s)}
                  />
                )}
                {definition.propSchema.map((schema) => {
                  // Skip columnTemplate, customTemplate, columns for Grid — handled by GridTemplateEditor above
                  if (selectedNode.type === "Grid" && (schema.key === "columnTemplate" || schema.key === "customTemplate" || schema.key === "columns")) {
                    return null;
                  }
                  // Skip filter for Image — rendered as full ImageFilterPicker section below
                  if (selectedNode.type === "Image" && schema.key === "filter") {
                    return null;
                  }
                  if (schema.type === "group") {
                    return (
                      <div key={schema.key} className="space-y-3">
                        <p className="text-[10px] font-semibold text-muted-foreground tracking-wide">
                          {schema.label}
                        </p>
                        {schema.children.map((child) => (
                          <PropControl
                            key={child.key}
                            schema={child}
                            value={resolvedPropsMap[child.key]}
                            onChange={(val) => onPropChange(child.key, val)}
                          />
                        ))}
                      </div>
                    );
                  }
                  return (
                    <PropControl
                      key={schema.key}
                      schema={schema}
                      value={resolvedPropsMap[schema.key]}
                      onChange={(val) => onPropChange(schema.key, val)}
                    />
                  );
                })}
              </CollapsibleSection>
            )}

            {/* Image filter picker — shown only for Image nodes */}
            {selectedNode.type === "Image" && (
              <CollapsibleSection title="Filter" defaultOpen={false}>
                <ImageFilterPicker
                  previewSrc={String(resolvedPropsMap["src"] ?? "")}
                  value={String(resolvedPropsMap["filter"] ?? "none")}
                  onChange={(filter) => onPropChange("filter", filter)}
                />
              </CollapsibleSection>
            )}

            {/* Size */}
            <CollapsibleSection title={t("design.size")}>
              <div className="grid grid-cols-2 gap-2">
                {["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"].map((key) => (
                  <div key={key} className="grid gap-1">
                    <Label className="text-[10px] text-muted-foreground capitalize">{key}</Label>
                    <NumericPropertyInput
                      value={String(style[key] ?? "")}
                      placeholder="auto"
                      units={["width", "maxWidth", "height", "maxHeight"].includes(key) ? ["px", "%"] : ["px"]}
                      onChange={(val) => onStyleChange(key, val || undefined)}
                    />
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Spacing */}
            <CollapsibleSection title={t("design.spacing")}>
              <div className="grid grid-cols-2 gap-2">
                {["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"].map((key) => (
                  <div key={key} className="grid gap-1">
                    <Label className="text-[10px] text-muted-foreground capitalize">
                      {key === "padding" ? "All" : key.replace("padding", "").toLowerCase()}
                    </Label>
                    <NumericPropertyInput
                      value={String(style[key] ?? "")}
                      placeholder="0"
                      onChange={(val) => onStyleChange(key, val || undefined)}
                    />
                  </div>
                ))}
              </div>
              <Separator className="my-2" />
              <div className="grid grid-cols-2 gap-2">
                {["margin", "marginTop", "marginRight", "marginBottom", "marginLeft"].map((key) => (
                  <div key={key} className="grid gap-1">
                    <Label className="text-[10px] text-muted-foreground capitalize">
                      {key === "margin" ? "All" : key.replace("margin", "").toLowerCase()}
                    </Label>
                    <NumericPropertyInput
                      value={String(style[key] ?? "")}
                      placeholder="0"
                      onChange={(val) => onStyleChange(key, val || undefined)}
                    />
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Typography */}
            <CollapsibleSection title={t("design.typography")}>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Font Family</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String(style.fontFamily ?? "")}
                    placeholder="inherit"
                    onChange={(e) => onStyleChange("fontFamily", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Font Size</Label>
                  <NumericPropertyInput
                    value={String(style.fontSize ?? "")}
                    placeholder="16px"
                    onChange={(val) => onStyleChange("fontSize", val || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Font Weight</Label>
                  <Select
                    value={String(style.fontWeight ?? "")}
                    onValueChange={(v) => onStyleChange("fontWeight", v || undefined)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Weight" />
                    </SelectTrigger>
                    <SelectContent>
                      {["100","200","300","400","500","600","700","800","900"].map((w) => (
                        <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Line Height</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String(style.lineHeight ?? "")}
                    placeholder="1.5"
                    onChange={(e) => onStyleChange("lineHeight", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Letter Spacing</Label>
                  <NumericPropertyInput
                    value={String(style.letterSpacing ?? "")}
                    placeholder="0"
                    onChange={(val) => onStyleChange("letterSpacing", val || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Text Align</Label>
                  <Select
                    value={String(style.textAlign ?? "")}
                    onValueChange={(v) => onStyleChange("textAlign", v || undefined)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Align" />
                    </SelectTrigger>
                    <SelectContent>
                      {["left", "center", "right", "justify"].map((a) => (
                        <SelectItem key={a} value={a} className="text-xs capitalize">{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5 mt-2">
                <Label className="text-[10px] text-muted-foreground">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-7 w-10 rounded border border-input bg-background cursor-pointer"
                    value={String(style.color ?? "#000000")}
                    onChange={(e) => onStyleChange("color", e.target.value)}
                  />
                  <Input
                    className="h-7 text-xs flex-1 font-mono"
                    value={String(style.color ?? "")}
                    onChange={(e) => onStyleChange("color", e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Background */}
            <CollapsibleSection title={t("design.background")} defaultOpen={false}>
              <div className="grid gap-1.5">
                <Label className="text-[10px] text-muted-foreground">Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-7 w-10 rounded border border-input bg-background cursor-pointer"
                    value={String(style.backgroundColor ?? "#ffffff")}
                    onChange={(e) => onStyleChange("backgroundColor", e.target.value)}
                  />
                  <Input
                    className="h-7 text-xs flex-1 font-mono"
                    value={String(style.backgroundColor ?? "")}
                    onChange={(e) => onStyleChange("backgroundColor", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Background Image</Label>
                <Input
                  className="h-7 text-xs"
                  value={String(style.backgroundImage ?? "")}
                  placeholder="url(...) or gradient"
                  onChange={(e) => onStyleChange("backgroundImage", e.target.value || undefined)}
                />
              </div>
            </CollapsibleSection>

            {/* Border */}
            <CollapsibleSection title={t("design.border")} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Width</Label>
                  <NumericPropertyInput
                    value={String(style.borderWidth ?? "")}
                    placeholder="0"
                    onChange={(val) => onStyleChange("borderWidth", val || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Style</Label>
                  <Select
                    value={String(style.borderStyle ?? "")}
                    onValueChange={(v) => onStyleChange("borderStyle", v || undefined)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent>
                      {["none","solid","dashed","dotted","double"].map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Radius</Label>
                  <NumericPropertyInput
                    value={String(style.borderRadius ?? "")}
                    placeholder="0"
                    onChange={(val) => onStyleChange("borderRadius", val || undefined)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">Color</Label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      className="h-7 w-8 rounded border border-input bg-background cursor-pointer"
                      value={String(style.borderColor ?? "#000000")}
                      onChange={(e) => onStyleChange("borderColor", e.target.value)}
                    />
                    <Input
                      className="h-7 text-xs flex-1 font-mono"
                      value={String(style.borderColor ?? "")}
                      onChange={(e) => onStyleChange("borderColor", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Shadow & Effects */}
            <CollapsibleSection title={t("design.shadow")} defaultOpen={false}>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Box Shadow</Label>
                <Input
                  className="h-7 text-xs font-mono"
                  value={String(style.boxShadow ?? "")}
                  placeholder="0 0 10px rgba(0,0,0,0.1)"
                  onChange={(e) => onStyleChange("boxShadow", e.target.value || undefined)}
                />
              </div>
            </CollapsibleSection>

            {/* Layout */}
            <CollapsibleSection title={t("design.layout")} defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Display</Label>
                  <Select
                    value={String(style.display ?? "")}
                    onValueChange={(v) => onStyleChange("display", v || undefined)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Display" />
                    </SelectTrigger>
                    <SelectContent>
                      {["block","flex","grid","inline-block","inline","none"].map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Position</Label>
                  <Select
                    value={String(style.position ?? "")}
                    onValueChange={(v) => onStyleChange("position", v || undefined)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {["static","relative","absolute","fixed","sticky"].map((p) => (
                        <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Overflow</Label>
                  <Select
                    value={String(style.overflow ?? "")}
                    onValueChange={(v) => onStyleChange("overflow", v || undefined)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Overflow" />
                    </SelectTrigger>
                    <SelectContent>
                      {["visible","hidden","scroll","auto"].map((o) => (
                        <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Z-Index</Label>
                  <NumericPropertyInput
                    value={String(style.zIndex ?? "")}
                    placeholder="auto"
                    units={[""]}
                    onChange={(val) => onStyleChange("zIndex", val || undefined)}
                  />
                </div>
              </div>

              {/* Flex-specific props */}
              {(style.display === "flex" || style.display === "inline-flex") && (
                <>
                  <Separator className="my-2" />
                  <p className="text-[10px] font-semibold text-muted-foreground">Flex</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground">Direction</Label>
                      <Select
                        value={String(style.flexDirection ?? "")}
                        onValueChange={(v) => onStyleChange("flexDirection", v || undefined)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="row" />
                        </SelectTrigger>
                        <SelectContent>
                          {["row","row-reverse","column","column-reverse"].map((d) => (
                            <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground">Wrap</Label>
                      <Select
                        value={String(style.flexWrap ?? "")}
                        onValueChange={(v) => onStyleChange("flexWrap", v || undefined)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="nowrap" />
                        </SelectTrigger>
                        <SelectContent>
                          {["nowrap","wrap","wrap-reverse"].map((w) => (
                            <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground">Justify</Label>
                      <Select
                        value={String(style.justifyContent ?? "")}
                        onValueChange={(v) => onStyleChange("justifyContent", v || undefined)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="start" />
                        </SelectTrigger>
                        <SelectContent>
                          {["flex-start","flex-end","center","space-between","space-around","space-evenly"].map((j) => (
                            <SelectItem key={j} value={j} className="text-xs">{j}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground">Align Items</Label>
                      <Select
                        value={String(style.alignItems ?? "")}
                        onValueChange={(v) => onStyleChange("alignItems", v || undefined)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="stretch" />
                        </SelectTrigger>
                        <SelectContent>
                          {["flex-start","flex-end","center","stretch","baseline"].map((a) => (
                            <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1 col-span-2">
                      <Label className="text-[10px] text-muted-foreground">Gap</Label>
                      <Input
                        className="h-7 text-xs"
                        value={String(style.gap ?? "")}
                        placeholder="0"
                        onChange={(e) => onStyleChange("gap", e.target.value || undefined)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CollapsibleSection>

            {/* Opacity & Filter */}
            <CollapsibleSection title={t("design.visual")} defaultOpen={false}>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Opacity</Label>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {Math.round((Number(style.opacity ?? 1)) * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[Number(style.opacity ?? 1)]}
                  onValueChange={([v]) => onStyleChange("opacity", String(v))}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Filter</Label>
                <Input
                  className="h-7 text-xs font-mono"
                  value={String(style.filter ?? "")}
                  placeholder="blur(0px)"
                  onChange={(e) => onStyleChange("filter", e.target.value || undefined)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Backdrop Filter</Label>
                <Input
                  className="h-7 text-xs font-mono"
                  value={String(style.backdropFilter ?? "")}
                  placeholder="blur(0px)"
                  onChange={(e) => onStyleChange("backdropFilter", e.target.value || undefined)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Mix Blend Mode</Label>
                <Select
                  value={String(style.mixBlendMode ?? "")}
                  onValueChange={(v) => onStyleChange("mixBlendMode", v || undefined)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="normal" />
                  </SelectTrigger>
                  <SelectContent>
                    {["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","hard-light","soft-light","difference","exclusion"].map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleSection>

            {/* Transform */}
            <CollapsibleSection title={t("design.transform")} defaultOpen={false}>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Transform</Label>
                <Input
                  className="h-7 text-xs font-mono"
                  value={String(style.transform ?? "")}
                  placeholder="rotate(0deg) scale(1)"
                  onChange={(e) => onStyleChange("transform", e.target.value || undefined)}
                />
              </div>
            </CollapsibleSection>
          </ScrollArea>
        </TabsContent>

        {/* ── Events tab ───────────────────────────────────────────── */}
        <TabsContent value="events" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  Interactions ({interactions.length})
                </p>
                <button
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  onClick={handleAddInteraction}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>

              {interactions.length === 0 && (
                <div className="rounded-md border border-dashed p-4 text-center">
                  <Zap className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {t("events.noInteractions")}
                  </p>
                </div>
              )}

              {interactions.map((interaction, i) => (
                <InteractionRow
                  key={i}
                  interaction={interaction}
                  index={i}
                  onChange={(updated) => handleUpdateInteraction(i, updated)}
                  onRemove={() => handleRemoveInteraction(i)}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Effects tab ──────────────────────────────────────────── */}
        <TabsContent value="effects" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <CollapsibleSection title={t("effects.displayAnimation")}>
              <div className="grid gap-1.5">
                <Label className="text-[10px] text-muted-foreground">Animation</Label>
                <Select
                  value={String((selectedNode.props._animation as string) ?? "none")}
                  onValueChange={(v) => onPropChange("_animation", v === "none" ? undefined : v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATION_PRESETS.map((a) => (
                      <SelectItem key={a.value} value={a.value} className="text-xs">
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Duration (ms)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={Number((selectedNode.props._animationDuration as number) ?? 300)}
                    min={0}
                    max={5000}
                    step={50}
                    onChange={(e) => onPropChange("_animationDuration", parseFloat(e.target.value))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Delay (ms)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={Number((selectedNode.props._animationDelay as number) ?? 0)}
                    min={0}
                    max={5000}
                    step={50}
                    onChange={(e) => onPropChange("_animationDelay", parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Easing</Label>
                <Select
                  value={String((selectedNode.props._animationEasing as string) ?? "ease")}
                  onValueChange={(v) => onPropChange("_animationEasing", v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EASING_OPTIONS.map((e) => (
                      <SelectItem key={e.value} value={e.value} className="text-xs">
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={t("effects.hoverEffect")} defaultOpen={false}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Hover Transform</Label>
                  <Input
                    className="h-7 text-xs font-mono"
                    value={String((selectedNode.props._hoverTransform as string) ?? "")}
                    placeholder="scale(1.05)"
                    onChange={(e) => onPropChange("_hoverTransform", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Hover Opacity</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String((selectedNode.props._hoverOpacity as string) ?? "")}
                    placeholder="1"
                    onChange={(e) => onPropChange("_hoverOpacity", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Hover Shadow</Label>
                  <Input
                    className="h-7 text-xs font-mono"
                    value={String((selectedNode.props._hoverShadow as string) ?? "")}
                    placeholder="0 4px 12px rgba(0,0,0,0.15)"
                    onChange={(e) => onPropChange("_hoverShadow", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Transition</Label>
                  <Input
                    className="h-7 text-xs font-mono"
                    value={String(style.transition ?? "")}
                    placeholder="all 0.3s ease"
                    onChange={(e) => onStyleChange("transition", e.target.value || undefined)}
                  />
                </div>
              </div>
            </CollapsibleSection>
          </ScrollArea>
        </TabsContent>

        {/* ── Data tab ─────────────────────────────────────────────── */}
        <TabsContent value="data" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <div className="rounded-md border border-dashed p-4 text-center">
                <Database className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {t("dataTab.description")}
                </p>
              </div>

              <CollapsibleSection title={t("dataTab.repeater")} defaultOpen={false}>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Repeat Data</Label>
                    <Switch
                      checked={Boolean(selectedNode.props._repeaterEnabled)}
                      onCheckedChange={(v) => onPropChange("_repeaterEnabled", v)}
                    />
                  </div>
                  {Boolean(selectedNode.props._repeaterEnabled) && (
                    <div className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground">Data Key</Label>
                      <Input
                        className="h-7 text-xs font-mono"
                        value={String(selectedNode.props._repeaterKey ?? "")}
                        placeholder="items"
                        onChange={(e) => onPropChange("_repeaterKey", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title={t("dataTab.conditionalVisibility")} defaultOpen={false}>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Conditional</Label>
                    <Switch
                      checked={Boolean(selectedNode.props._conditionalVisibility)}
                      onCheckedChange={(v) => onPropChange("_conditionalVisibility", v)}
                    />
                  </div>
                  {Boolean(selectedNode.props._conditionalVisibility) && (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-[10px] text-muted-foreground">Variable</Label>
                        <Input
                          className="h-7 text-xs font-mono"
                          value={String(selectedNode.props._conditionVariable ?? "")}
                          placeholder="isLoggedIn"
                          onChange={(e) => onPropChange("_conditionVariable", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[10px] text-muted-foreground">Operator</Label>
                        <Select
                          value={String(selectedNode.props._conditionOperator ?? "eq")}
                          onValueChange={(v) => onPropChange("_conditionOperator", v)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["eq","neq","gt","lt","gte","lte","truthy","falsy","contains"].map((op) => (
                              <SelectItem key={op} value={op} className="text-xs">{op}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[10px] text-muted-foreground">Value</Label>
                        <Input
                          className="h-7 text-xs"
                          value={String(selectedNode.props._conditionValue ?? "")}
                          placeholder="true"
                          onChange={(e) => onPropChange("_conditionValue", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleSection>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Advanced tab ─────────────────────────────────────────── */}
        <TabsContent value="advanced" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <CollapsibleSection title={t("advancedTab.identity")}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Name</Label>
                  <Input
                    className="h-7 text-xs"
                    value={selectedNode.name ?? ""}
                    placeholder="Component name"
                    onChange={(e) => onPropChange("__name", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Node ID</Label>
                  <Input
                    className="h-7 text-xs font-mono"
                    value={selectedNode.id}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={t("advancedTab.cssClassAttributes")} defaultOpen={false}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">CSS Class</Label>
                  <Input
                    className="h-7 text-xs font-mono"
                    value={String(selectedNode.props._cssClass ?? "")}
                    placeholder="my-class another-class"
                    onChange={(e) => onPropChange("_cssClass", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Custom Attributes (JSON)</Label>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    value={String(selectedNode.props._customAttributes ?? "{}")}
                    placeholder='{"data-testid": "my-component"}'
                    onChange={(e) => onPropChange("_customAttributes", e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={t("advancedTab.seoAccessibility")} defaultOpen={false}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">ARIA Role</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String(selectedNode.props._ariaRole ?? "")}
                    placeholder="button"
                    onChange={(e) => onPropChange("_ariaRole", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">ARIA Label</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String(selectedNode.props._ariaLabel ?? "")}
                    placeholder="Accessible label"
                    onChange={(e) => onPropChange("_ariaLabel", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Tab Index</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={String(selectedNode.props._tabIndex ?? "")}
                    placeholder="0"
                    onChange={(e) => onPropChange("_tabIndex", e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={t("advancedTab.tooltip")} defaultOpen={false}>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Show Tooltip</Label>
                  <Switch
                    checked={Boolean(selectedNode.props._tooltipEnabled)}
                    onCheckedChange={(v) => onPropChange("_tooltipEnabled", v)}
                  />
                </div>
                {Boolean(selectedNode.props._tooltipEnabled) && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground">Text</Label>
                      <Input
                        className="h-7 text-xs"
                        value={String(selectedNode.props._tooltipText ?? "")}
                        placeholder="Tooltip text..."
                        onChange={(e) => onPropChange("_tooltipText", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground">Position</Label>
                      <Select
                        value={String(selectedNode.props._tooltipPosition ?? "top")}
                        onValueChange={(v) => onPropChange("_tooltipPosition", v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["top","right","bottom","left"].map((p) => (
                            <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={t("advancedTab.metadata")} defaultOpen={false}>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-mono text-[10px]">
                    {selectedNode.metadata?.createdAt
                      ? new Date(selectedNode.metadata.createdAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span className="font-mono text-[10px]">
                    {selectedNode.metadata?.updatedAt
                      ? new Date(selectedNode.metadata.updatedAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
                {selectedNode.metadata?.tags && selectedNode.metadata.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {selectedNode.metadata.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[9px]">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
    </MediaContext.Provider>
  );
});
