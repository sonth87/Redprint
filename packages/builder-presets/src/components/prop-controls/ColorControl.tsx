import React from "react";
import type { PropSchema } from "@ui-builder/builder-core";
import { Input, Label } from "@ui-builder/ui";

type ColorSchema = Extract<PropSchema, { type: "color" }>;

interface ColorControlProps {
  schema: ColorSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function ColorControl({ schema, value, onChange }: ColorControlProps) {
  const hex = String(value ?? schema.default ?? "#000000");
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{schema.label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-7 w-10 rounded border border-input bg-background cursor-pointer p-0.5 shrink-0"
          value={hex.startsWith("#") ? hex : "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
        <Input
          className="h-7 text-xs flex-1 font-mono"
          value={hex}
          placeholder="#000000"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
