import React, { useState } from "react";
import { Label, Slider } from "@ui-builder/ui";
import { Plus, X } from "lucide-react";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import { AnglePicker } from "../controls/AnglePicker";
import type { FilterItem } from "../property-panel.types";

interface FilterSectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
}

const FILTER_CONFIGS: Record<
  string,
  { label: string; min: number; max: number; step: number; unit: string; icon: string; default: number }
> = {
  blur:        { label: "Blur",       min: 0, max: 30,  step: 0.5, unit: "px",  icon: "💧", default: 4 },
  brightness:  { label: "Brightness", min: 0, max: 3,   step: 0.05,unit: "",    icon: "☀️", default: 1.2 },
  contrast:    { label: "Contrast",   min: 0, max: 3,   step: 0.05,unit: "",    icon: "◑",  default: 1.2 },
  saturate:    { label: "Saturate",   min: 0, max: 3,   step: 0.05,unit: "",    icon: "🎨", default: 1.5 },
  grayscale:   { label: "Grayscale",  min: 0, max: 1,   step: 0.05,unit: "",    icon: "▨",  default: 1 },
  sepia:       { label: "Sepia",      min: 0, max: 1,   step: 0.05,unit: "",    icon: "🟤", default: 0.5 },
  "hue-rotate":{ label: "Hue Rotate", min: 0, max: 360, step: 1,   unit: "deg", icon: "🌈", default: 90 },
};

const FILTER_NAMES = Object.keys(FILTER_CONFIGS);

function parseFilters(css: string): FilterItem[] {
  const result: FilterItem[] = [];
  if (!css || css === "none") return result;
  const regex = /([\w-]+)\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(css)) !== null) {
    const name = m[1] ?? "";
    const rawVal = m[2] ?? "0";
    if (name && FILTER_CONFIGS[name]) {
      result.push({ name, value: parseFloat(rawVal) });
    }
  }
  return result;
}

function buildFilterString(items: FilterItem[]): string {
  if (items.length === 0) return "";
  return items
    .map((item) => {
      const cfg = FILTER_CONFIGS[item.name];
      return `${item.name}(${item.value}${cfg?.unit ?? ""})`;
    })
    .join(" ");
}

export function FilterSection({ style, onStyleChange }: FilterSectionProps) {
  const [filters, setFilters] = useState<FilterItem[]>(() =>
    parseFilters(String(style.filter ?? "")),
  );

  const apply = (next: FilterItem[]) => {
    setFilters(next);
    onStyleChange("filter", buildFilterString(next) || undefined);
  };

  const addFilter = (name: string) => {
    if (filters.some((f) => f.name === name)) return;
    const cfg = FILTER_CONFIGS[name];
    apply([...filters, { name, value: cfg?.default ?? 1 }]);
  };

  const removeFilter = (name: string) => {
    apply(filters.filter((f) => f.name !== name));
  };

  const updateFilter = (name: string, value: number) => {
    apply(filters.map((f) => (f.name === name ? { ...f, value } : f)));
  };

  const unusedFilters = FILTER_NAMES.filter((n) => !filters.some((f) => f.name === n));

  const actions = (
    <div className="relative group/add">
      <button
        type="button"
        title="Add filter"
        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Plus className="h-3 w-3" />
      </button>
      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-md py-1 w-32 hidden group-hover/add:block">
        {unusedFilters.map((name) => {
          const cfg = FILTER_CONFIGS[name];
          if (!cfg) return null;
          return (
            <button
              key={name}
              type="button"
              className="w-full text-left px-2 py-1 text-xs hover:bg-muted flex items-center gap-1.5"
              onClick={() => addFilter(name)}
            >
              <span>{cfg.icon}</span>
              {cfg.label}
            </button>
          );
        })}
        {unusedFilters.length === 0 && (
          <p className="px-2 py-1 text-[10px] text-muted-foreground">All filters added</p>
        )}
      </div>
    </div>
  );

  return (
    <CollapsibleSection title="Filters" defaultOpen={false} actions={actions}>
      {filters.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-1">
          No filters. Click + to add.
        </p>
      ) : (
        <div className="space-y-3">
          {filters.map((filter) => {
            const cfg = FILTER_CONFIGS[filter.name];
            if (!cfg) return null;

            // Special case: hue-rotate → angle picker
            if (filter.name === "hue-rotate") {
              return (
                <div key={filter.name} className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span>{cfg.icon}</span> {cfg.label}
                    </Label>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => removeFilter(filter.name)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center">
                    <AnglePicker
                      value={filter.value}
                      onChange={(v) => updateFilter(filter.name, v)}
                      size={48}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={filter.name} className="grid gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span>{cfg.icon}</span> {cfg.label}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {filter.value}
                      {cfg.unit}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => removeFilter(filter.name)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <Slider
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={[filter.value]}
                  onValueChange={([v]) => updateFilter(filter.name, v ?? 0)}
                />
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
}
