import React from "react";
import type { PropSchema } from "@ui-builder/builder-core";
import { Switch, Label } from "@ui-builder/ui";

type BooleanSchema = Extract<PropSchema, { type: "boolean" }>;

interface BooleanControlProps {
  schema: BooleanSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function BooleanControl({ schema, value, onChange }: BooleanControlProps) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{schema.label}</Label>
      <Switch
        checked={Boolean(value ?? schema.default ?? false)}
        onCheckedChange={onChange}
      />
    </div>
  );
}
