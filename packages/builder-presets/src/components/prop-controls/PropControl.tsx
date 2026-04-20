import React from "react";
import type { PropSchema } from "@ui-builder/builder-core";
import { StringControl } from "./StringControl";
import { NumberControl } from "./NumberControl";
import { BooleanControl } from "./BooleanControl";
import { SelectControl } from "./SelectControl";
import { ColorControl } from "./ColorControl";
import { SliderControl } from "./SliderControl";
import { RichtextControl } from "./RichtextControl";
import { Label } from "@ui-builder/ui";

interface PropControlProps {
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function PropControl({ schema, value, onChange }: PropControlProps) {
  switch (schema.type) {
    case "string":
      return <StringControl schema={schema} value={value} onChange={onChange} />;
    case "number":
      return <NumberControl schema={schema} value={value} onChange={onChange} />;
    case "boolean":
      return <BooleanControl schema={schema} value={value} onChange={onChange} />;
    case "select":
      return <SelectControl schema={schema} value={value} onChange={onChange} />;
    case "color":
      return <ColorControl schema={schema} value={value} onChange={onChange} />;
    case "slider":
      return <SliderControl schema={schema} value={value} onChange={onChange} />;
    case "richtext":
      return <RichtextControl schema={schema} value={value} onChange={onChange} />;
    case "group": {
      const groupValue = (value ?? {}) as Record<string, unknown>;
      return (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {schema.label}
          </p>
          {schema.children.map((child) => (
            <PropControl
              key={child.key}
              schema={child}
              value={groupValue[child.key]}
              onChange={(v) =>
                onChange({ ...groupValue, [child.key]: v })
              }
            />
          ))}
        </div>
      );
    }
    default:
      return (
        <div className="grid gap-1">
          <Label className="text-xs">{schema.label}</Label>
          <span className="text-[10px] italic text-muted-foreground/60">
            ({schema.type} — not editable in preview)
          </span>
        </div>
      );
  }
}
