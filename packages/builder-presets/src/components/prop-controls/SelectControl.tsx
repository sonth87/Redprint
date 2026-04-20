import React from "react";
import type { PropSchema } from "@ui-builder/builder-core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from "@ui-builder/ui";

type SelectSchema = Extract<PropSchema, { type: "select" }>;

interface SelectControlProps {
  schema: SelectSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function SelectControl({ schema, value, onChange }: SelectControlProps) {
  const current = String(value ?? schema.default ?? "");
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{schema.label}</Label>
      <Select value={current} onValueChange={onChange}>
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
}
