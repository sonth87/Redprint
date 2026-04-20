import React from "react";
import type { PropSchema } from "@ui-builder/builder-core";
import { Label } from "@ui-builder/ui";

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
      <textarea
        className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={String(value ?? "")}
        placeholder="<p>HTML content...</p>"
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[10px] text-muted-foreground">Accepts raw HTML</p>
    </div>
  );
}
