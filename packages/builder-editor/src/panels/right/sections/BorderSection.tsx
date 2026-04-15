import React from "react";
import { Label } from "@ui-builder/ui";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import { ColorInput } from "../controls/ColorInput";
import { NumericPropertyInput } from "../controls/NumericPropertyInput";
import { BorderStylePicker } from "../controls/BorderStylePicker";

interface BorderSectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
}

export function BorderSection({ style, onStyleChange }: BorderSectionProps) {
  return (
    <CollapsibleSection title="Border" defaultOpen={false}>
      <div className="space-y-2.5">
        {/* Visual border style selector */}
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Style</Label>
          <BorderStylePicker
            value={String(style.borderStyle ?? "none")}
            onChange={(v) => onStyleChange("borderStyle", v === "none" ? undefined : v)}
          />
        </div>

        {!!style.borderStyle && String(style.borderStyle) !== "none" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Width</Label>
                <NumericPropertyInput
                  value={String(style.borderWidth ?? "")}
                  placeholder="1"
                  min={0}
                  onChange={(val) => onStyleChange("borderWidth", val || undefined)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Radius</Label>
                <NumericPropertyInput
                  value={String(style.borderRadius ?? "")}
                  placeholder="0"
                  units={["px", "%"]}
                  min={0}
                  onChange={(val) => onStyleChange("borderRadius", val || undefined)}
                />
              </div>
            </div>

            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Color</Label>
              <ColorInput
                value={String(style.borderColor ?? "")}
                onChange={(v) => onStyleChange("borderColor", v || undefined)}
              />
            </div>
          </>
        )}

        {/* Standalone radius (even with no border) */}
        {(!style.borderStyle || String(style.borderStyle) === "none") && (
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Corner radius</Label>
            <NumericPropertyInput
              value={String(style.borderRadius ?? "")}
              placeholder="0"
              units={["px", "%"]}
              min={0}
              onChange={(val) => onStyleChange("borderRadius", val || undefined)}
            />
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
