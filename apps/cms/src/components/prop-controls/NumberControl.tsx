import React from "react";
import type { PropSchema } from "@ui-builder/builder-core";
import { Input, Label } from "@ui-builder/ui";

type NumberSchema = Extract<PropSchema, { type: "number" }>;

interface NumberControlProps {
  schema: NumberSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function NumberControl({ schema, value, onChange }: NumberControlProps) {
  const num = Number(value ?? schema.default ?? 0);
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{schema.label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          className="h-7 text-xs"
          value={num}
          min={schema.min}
          max={schema.max}
          step={schema.step ?? 1}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        {schema.unit && (
          <span className="text-xs text-muted-foreground shrink-0">{schema.unit}</span>
        )}
      </div>
    </div>
  );
}
