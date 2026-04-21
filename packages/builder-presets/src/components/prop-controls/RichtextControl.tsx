import React from "react";
import type { PropSchema } from "@ui-builder/builder-core";
import { Label } from "@ui-builder/ui";
import { RichtextEditor } from "../ui/RichtextEditor";

type RichtextSchema = Extract<PropSchema, { type: "richtext" }>;

interface RichtextControlProps {
  schema: RichtextSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function RichtextControl({ schema, value, onChange }: RichtextControlProps) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{schema.label}</Label>
      <RichtextEditor
        value={String(value ?? "")}
        onChange={onChange}
        placeholder="Enter content..."
        minHeight="120px"
      />
    </div>
  );
}
