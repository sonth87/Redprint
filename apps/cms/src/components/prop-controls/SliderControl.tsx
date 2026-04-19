import React from "react";
import type { PropSchema } from "@ui-builder/builder-core";
import { Slider, Label } from "@ui-builder/ui";

type SliderSchema = Extract<PropSchema, { type: "slider" }>;

interface SliderControlProps {
  schema: SliderSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function SliderControl({ schema, value, onChange }: SliderControlProps) {
  const num = Number(value ?? schema.default ?? schema.min);
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{schema.label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{num}</span>
      </div>
      <Slider
        min={schema.min}
        max={schema.max}
        step={schema.step ?? 1}
        value={[num]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
