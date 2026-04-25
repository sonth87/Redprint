import React, { useCallback, useMemo } from "react";
import CircularSlider from "@fseehawer/react-circular-slider";
import { Slider, Switch, Label, cn } from "@ui-builder/ui";
import { SHADOW_PRESETS } from "@ui-builder/shared";
import { ColorSwatch } from "../color/ColorSwatch";
import { parseShadow, serializeShadow, type ShadowParams } from "./shadowUtils";

interface ShadowControlProps {
  value: string | undefined;
  onChange: (css: string) => void;
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

export const ShadowControl: React.FC<ShadowControlProps> = ({ value, onChange }) => {
  const params = useMemo(() => parseShadow(value), [value]);

  const update = useCallback(
    (partial: Partial<ShadowParams>) => {
      const next = { ...params, ...partial };
      onChange(serializeShadow(next));
    },
    [params, onChange],
  );

  const handleToggle = (checked: boolean) => {
    update({ enabled: checked });
  };

  const handlePreset = (boxShadow: string) => {
    onChange(boxShadow);
  };

  // Detect which preset is active
  const activePreset = SHADOW_PRESETS.find((p) => {
    if (p.value === "none") return !params.enabled;
    return p.boxShadow === value;
  })?.value ?? (params.enabled ? "custom" : "none");

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-xs">Apply shadow</Label>
        <Switch checked={params.enabled} onCheckedChange={handleToggle} />
      </div>

      {/* Preset grid */}
      <div className="grid grid-cols-4 gap-1">
        {SHADOW_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePreset(preset.boxShadow)}
            title={preset.label}
            className={cn(
              "flex flex-col items-center gap-1 p-1 rounded transition-all text-center",
              (activePreset === preset.value || (preset.value === "none" && !params.enabled))
                ? "ring-2 ring-primary ring-offset-1 bg-primary/5"
                : "ring-1 ring-transparent hover:ring-border hover:bg-accent/50",
            )}
          >
            <div
              className="w-10 h-7 rounded-sm bg-muted flex-shrink-0"
              style={{
                boxShadow: preset.boxShadow === "none" ? undefined : preset.boxShadow,
                background: "#e5e7eb",
              }}
            />
            <span className="text-[9px] text-muted-foreground leading-none truncate w-full">{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Custom controls — only when shadow is enabled */}
      {params.enabled && (
        <div className="flex flex-col gap-3 pt-2 border-t border-border/50">
          {/* Angle dial */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Angle</span>
            <div className="flex items-center gap-3" onPointerDown={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0">
                <CircularSlider
                  min={0}
                  max={359}
                  value={params.angle}
                  width={80}
                  knobColor="#3b82f6"
                  knobSize={14}
                  progressColorFrom="#3b82f6"
                  progressColorTo="#3b82f6"
                  progressSize={4}
                  trackColor="#e5e7eb"
                  trackSize={4}
                  hideLabelValue
                  onChange={(v) => update({ angle: Number(v) })}
                />
              </div>
              <div className="flex items-center gap-0.5 bg-muted/50 rounded px-1.5 py-0.5 border border-border/40">
                <input
                  type="number"
                  value={params.angle}
                  min={0}
                  max={359}
                  onChange={(e) => update({ angle: ((Number(e.target.value) % 360) + 360) % 360 })}
                  className="w-8 text-right text-[11px] bg-transparent outline-none cursor-text"
                />
                <span className="text-[10px] text-muted-foreground">°</span>
              </div>
            </div>
          </div>

          <SliderRow label="Distance (px)" value={params.distance} min={0} max={100} unit="px" onChange={(v) => update({ distance: v })} />
          <SliderRow label="Size (px)" value={params.size} min={-20} max={100} unit="px" onChange={(v) => update({ size: v })} />
          <SliderRow label="Blur" value={params.blur} min={0} max={100} unit="px" onChange={(v) => update({ blur: v })} />

          {/* Opacity & color */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Opacity & color</span>
            <div className="flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
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
              <ColorSwatch
                value={params.color}
                onChange={(c) => update({ color: c })}
                label="Shadow color"
                size="md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
