import React from "react";
import type { PropSchema } from "@ui-builder/builder-core";
import { Input, Label, Textarea } from "@ui-builder/ui";

type StringSchema = Extract<PropSchema, { type: "string" }>;

interface StringControlProps {
  schema: StringSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function StringControl({ schema, value, onChange }: StringControlProps) {
  const str = String(value ?? schema.default ?? "");
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{schema.label}</Label>
      {schema.multiline ? (
        <Textarea
          className="min-h-[60px] text-xs resize-vertical"
          value={str}
          placeholder={schema.placeholder}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        />
      ) : (
        <Input
          className="h-7 text-xs"
          value={str}
          placeholder={schema.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
