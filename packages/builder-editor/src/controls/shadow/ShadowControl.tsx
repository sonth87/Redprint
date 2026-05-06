import React, { useCallback, useMemo, useState } from "react";
import { Slider, cn } from "@ui-builder/ui";
import { AnglePicker } from "./AnglePicker";
import { SHADOW_PRESETS } from "@ui-builder/shared";
import { ColorSwatch } from "../color/ColorSwatch";
import {
  parseShadow,
  serializeShadow,
  parseDropShadow,
  serializeDropShadow,
  type ShadowParams,
} from "./shadowUtils";

type ShadowMode = "outside" | "inside" | "filter";

interface ShadowControlProps {
  /** CSS box-shadow value */
  value: string | undefined;
  onChange: (css: string | undefined) => void;
  /** CSS filter drop-shadow value — when provided, enables the Filter mode option */
  filterValue?: string | undefined;
  onFilterChange?: (css: string | undefined) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <div className="flex items-center gap-0.5 bg-muted/50 rounded px-1.5 py-0.5 border border-border/40">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
            className="w-8 text-right text-[11px] bg-transparent outline-none cursor-text"
          />
          <span className="text-[10px] text-muted-foreground">{unit}</span>
        </div>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? min)}
        className="h-1"
      />
    </div>
  );
}

export const ShadowControl: React.FC<ShadowControlProps> = ({
  value,
  onChange,
  filterValue,
  onFilterChange,
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Detect current mode from active values
  const mode: ShadowMode = useMemo(() => {
    if (filterValue && filterValue !== "none" && filterValue !== "") return "filter";
    if (value && value !== "none" && value !== "") {
      return parseShadow(value).inset ? "inside" : "outside";
    }
    return "outside";
  }, [value, filterValue]);

  const isActive = (value && value !== "none" && value !== "") ||
    (filterValue && filterValue !== "none" && filterValue !== "");

  // Parse params from whichever mode is active
  const params = useMemo(() => {
    if (mode === "filter") return parseDropShadow(filterValue);
    return parseShadow(value);
  }, [mode, value, filterValue]);

  const update = useCallback(
    (partial: Partial<ShadowParams>) => {
      const next = { ...params, ...partial };
      if (mode === "filter") {
        onFilterChange?.(serializeDropShadow(next));
      } else {
        onChange(serializeShadow({ ...next, inset: mode === "inside" }));
      }
    },
    [params, mode, onChange, onFilterChange],
  );

  const handlePreset = (boxShadow: string) => {
    if (boxShadow === "none") {
      onChange(undefined);
      onFilterChange?.(undefined);
    } else {
      // Apply preset as box-shadow outside mode
      onChange(boxShadow);
      onFilterChange?.(undefined);
    }
  };

  const handleModeChange = (newMode: ShadowMode) => {
    if (newMode === mode) return;
    // Migrate current params to new mode
    if (newMode === "filter") {
      onFilterChange?.(serializeDropShadow({ ...params, inset: false }));
      onChange(undefined);
    } else if (newMode === "inside") {
      onChange(serializeShadow({ ...params, inset: true }));
      onFilterChange?.(undefined);
    } else {
      onChange(serializeShadow({ ...params, inset: false }));
      onFilterChange?.(undefined);
    }
  };

  const activePreset = useMemo(() => {
    if (!isActive) return "none";
    return SHADOW_PRESETS.find((p) => p.boxShadow === value)?.value ?? "custom";
  }, [value, isActive]);

  const showFilterMode = !!onFilterChange;

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-4 p-2">
        {SHADOW_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePreset(preset.boxShadow)}
            title={preset.label}
            className={cn(
              "flex flex-col items-center gap-1 p-1 rounded transition-all text-center",
              activePreset === preset.value
                ? "ring-1 ring-primary/20 ring-offset-1 bg-primary/5"
                : "ring-1 ring-transparent hover:ring-border hover:bg-accent/50",
            )}
          >
            <div
              className="w-12 h-12 rounded-sm bg-muted flex-shrink-0"
              style={{
                boxShadow: preset.boxShadow === "none" ? undefined : preset.boxShadow,
                background: "#e5e7eb",
              }}
            />
            <span className="text-[9px] text-muted-foreground leading-none truncate w-full">{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Advanced */}
      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{advancedOpen ? "▾" : "▸"}</span>
          <span>Advanced</span>
        </button>
        {advancedOpen && (
          <div className="flex flex-col gap-3 pt-2 mt-2 border-t border-border/50">
            {/* Mode toggle — Outside / Inside / Filter */}
            <div className="flex rounded overflow-hidden border border-border/60 self-start text-[11px]">
              <button
                type="button"
                onClick={() => handleModeChange("outside")}
                className={cn(
                  "px-3 py-1 transition-colors",
                  mode === "outside"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent/50 text-muted-foreground",
                )}
              >
                Outside
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("inside")}
                className={cn(
                  "px-3 py-1 transition-colors border-l border-border/60",
                  mode === "inside"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent/50 text-muted-foreground",
                )}
              >
                Inside
              </button>
              {showFilterMode && (
                <button
                  type="button"
                  onClick={() => handleModeChange("filter")}
                  className={cn(
                    "px-3 py-1 transition-colors border-l border-border/60",
                    mode === "filter"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent/50 text-muted-foreground",
                  )}
                >
                  Filter
                </button>
              )}
            </div>

            {/* Sliders + angle */}
            <div className="flex items-start gap-3" onPointerDown={(e) => e.stopPropagation()}>
              <AnglePicker value={params.angle} onChange={(deg) => update({ angle: deg })} className="flex-shrink-0" />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <SliderRow label="Distance (px)" value={params.distance} min={0} max={100} unit="px" onChange={(v) => update({ distance: v })} />
                {mode !== "filter" && (
                  <SliderRow label="Size (px)" value={params.size} min={-20} max={100} unit="px" onChange={(v) => update({ size: v })} />
                )}
                <SliderRow label="Blur" value={params.blur} min={0} max={100} unit="px" onChange={(v) => update({ blur: v })} />
                <div className="flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Opacity & color</span>
                    <ColorSwatch
                      value={params.color}
                      onChange={(c) => update({ color: c })}
                      label="Shadow color"
                      size="md"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[params.opacity]}
                        onValueChange={([v]) => update({ opacity: v })}
                        className="h-1"
                      />
                    </div>
                    <div className="flex items-center gap-0.5 bg-muted/50 rounded px-1.5 py-0.5 border border-border/40">
                      <input
                        type="number"
                        value={params.opacity}
                        min={0}
                        max={100}
                        onChange={(e) => update({ opacity: Math.min(100, Math.max(0, Number(e.target.value))) })}
                        className="w-8 text-right text-[11px] bg-transparent outline-none cursor-text"
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
