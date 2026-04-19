import React from "react";
import type { StyleConfig } from "@ui-builder/builder-core";
import { Input, Label } from "@ui-builder/ui";

const STYLE_FIELDS: Array<{
  key: keyof StyleConfig;
  label: string;
  placeholder: string;
}> = [
  { key: "width",           label: "Width",            placeholder: "auto / 200px / 100%" },
  { key: "height",          label: "Height",           placeholder: "auto / 100px" },
  { key: "padding",         label: "Padding",          placeholder: "8px / 8px 16px" },
  { key: "margin",          label: "Margin",           placeholder: "0 / auto" },
  { key: "backgroundColor", label: "Background Color", placeholder: "#ffffff" },
  { key: "color",           label: "Text Color",       placeholder: "#111827" },
  { key: "fontSize",        label: "Font Size",        placeholder: "16px" },
  { key: "fontWeight",      label: "Font Weight",      placeholder: "400 / bold" },
  { key: "borderRadius",    label: "Border Radius",    placeholder: "4px / 50%" },
  { key: "border",          label: "Border",           placeholder: "1px solid #ccc" },
  { key: "opacity",         label: "Opacity",          placeholder: "1" },
  { key: "gap",             label: "Gap",              placeholder: "8px" },
];

interface StyleEditorProps {
  style: Partial<StyleConfig>;
  onChange: (key: string, value: unknown) => void;
}

export function StyleEditor({ style, onChange }: StyleEditorProps) {
  return (
    <div className="space-y-3">
      {STYLE_FIELDS.map(({ key, label, placeholder }) => {
        const raw = (style as Record<string, unknown>)[key];
        const display = raw !== undefined && raw !== null ? String(raw) : "";
        return (
          <div key={key} className="grid gap-1.5">
            <Label className="text-xs">{label}</Label>
            <Input
              className="h-7 text-xs"
              value={display}
              placeholder={placeholder}
              onChange={(e) => onChange(key, e.target.value || undefined)}
            />
          </div>
        );
      })}
    </div>
  );
}
