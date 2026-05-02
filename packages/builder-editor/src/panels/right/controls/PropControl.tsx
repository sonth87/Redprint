import React from "react";
import { Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider, Switch } from "@ui-builder/ui";
import type { PropSchema } from "@ui-builder/builder-core";
import { NumericPropertyInput } from "./NumericPropertyInput";
import { ImagePropControl } from "./ImagePropControl";
import { ColorSwatch } from "../../../controls/color/ColorSwatch";

export function PropControl({
  schema,
  value,
  onChange,
}: {
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (schema.type) {
    case "string":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          {schema.multiline ? (
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              value={String(value ?? "")}
              placeholder={schema.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <Input
              className="h-7 text-xs"
              value={String(value ?? "")}
              placeholder={schema.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </div>
      );

    case "number": {
      const val = value ?? schema.default ?? 0;
      const unit = schema.unit ?? "";
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          <NumericPropertyInput
            value={`${val}${unit}`}
            onChange={(v) => {
              const num = parseFloat(v);
              if (!isNaN(num)) onChange(num);
            }}
            units={schema.unit !== undefined ? [schema.unit] : [""]}
            min={schema.min}
            max={schema.max}
            step={schema.step ?? 1}
          />
        </div>
      );
    }

    case "boolean":
      return (
        <div className="flex items-center justify-between">
          <Label className="text-xs">{schema.label}</Label>
          <Switch
            checked={Boolean(value ?? schema.default ?? false)}
            onCheckedChange={onChange}
          />
        </div>
      );

    case "select":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          <Select
            value={String(value ?? schema.default ?? "")}
            onValueChange={onChange}
          >
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

    case "slider":
      return (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{schema.label}</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Number(value ?? schema.default ?? schema.min)}
            </span>
          </div>
          <Slider
            min={schema.min}
            max={schema.max}
            step={schema.step ?? 1}
            value={[Number(value ?? schema.default ?? schema.min)]}
            onValueChange={([v]) => onChange(v)}
          />
        </div>
      );

    case "color":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          <div className="flex items-center gap-2">
            <ColorSwatch
              value={String(value ?? schema.default ?? "")}
              onChange={(v) => onChange(v)}
            />
            <Input
              className="h-7 text-xs flex-1 font-mono uppercase"
              value={String(value ?? schema.default ?? "")}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
      );

    case "image":
      return <ImagePropControl schema={schema as Extract<PropSchema, { type: "image" }>} value={value} onChange={onChange} />;

    default:
      return (
        <div className="text-xs text-muted-foreground">
          {(schema as { label?: string }).label ?? schema.key}: <span className="italic">Unsupported control ({schema.type})</span>
        </div>
      );
  }
}
