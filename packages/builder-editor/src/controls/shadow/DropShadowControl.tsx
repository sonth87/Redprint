import React, { useCallback, useMemo, useState } from "react";
import { Slider, cn } from "@ui-builder/ui";
import { AnglePicker } from "./AnglePicker";
import { DROP_SHADOW_PRESETS } from "@ui-builder/shared";
import { ColorSwatch } from "../color/ColorSwatch";
import { parseDropShadow, serializeDropShadow, type ShadowParams } from "./shadowUtils";

interface DropShadowControlProps {
  value: string | undefined;
  onChange: (css: string | undefined) => void;
}

// Small transparent star SVG as data URI — shows shape-following drop-shadow behavior
const STAR_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpolygon points='20,4 24.9,14.5 36.6,15.5 27.5,23.4 30.5,35.1 20,28.8 9.5,35.1 12.5,23.4 3.4,15.5 15.1,14.5' fill='%23374151'/%3E%3C/svg%3E";

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

export const DropShadowControl: React.FC<DropShadowControlProps> = ({ value, onChange }) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isActive = !!value && value !== "none";
  const params = useMemo(() => parseDropShadow(value), [value]);

  const update = useCallback(
    (partial: Partial<ShadowParams>) => {
      const next = { ...params, ...partial };
      onChange(serializeDropShadow(next));
    },
    [params, onChange],
  );

  const handlePreset = (dropShadow: string) => {
    if (dropShadow === "none") {
      onChange(undefined);
    } else {
      onChange(dropShadow);
    }
  };

  const activePreset = useMemo(() => {
    if (!isActive) return "none";
    return DROP_SHADOW_PRESETS.find((p) => p.dropShadow === value)?.value ?? "custom";
  }, [value, isActive]);

  return (
    <div className="flex flex-col gap-3">
      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-4">
        {DROP_SHADOW_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePreset(preset.dropShadow)}
            title={preset.label}
            className={cn(
              "flex flex-col items-center gap-1 p-1 rounded transition-all text-center",
              activePreset === preset.value
                ? "ring-1 ring-primary/20 ring-offset-1 bg-primary/5"
                : "ring-1 ring-transparent hover:ring-border hover:bg-accent/50",
            )}
          >
            <div className="w-12 h-12 rounded-sm flex-shrink-0 flex items-center justify-center bg-muted/60">
              <img
                src={STAR_SVG}
                alt=""
                draggable={false}
                style={{
                  width: 28,
                  height: 28,
                  filter: preset.dropShadow === "none" ? undefined : preset.dropShadow,
                }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground leading-none truncate w-full">{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Advanced section — only when a shadow is active */}
      {isActive && (
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
              <div className="flex items-start gap-3" onPointerDown={(e) => e.stopPropagation()}>
                <AnglePicker value={params.angle} onChange={(deg) => update({ angle: deg })} className="flex-shrink-0" />
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <SliderRow label="Distance (px)" value={params.distance} min={0} max={100} unit="px" onChange={(v) => update({ distance: v })} />
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
      )}
    </div>
  );
};
