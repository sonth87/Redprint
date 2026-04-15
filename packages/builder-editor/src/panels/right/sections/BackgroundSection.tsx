import React from "react";
import { Label, Input } from "@ui-builder/ui";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import { ColorInput } from "../controls/ColorInput";

interface BackgroundSectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
}

export function BackgroundSection({ style, onStyleChange }: BackgroundSectionProps) {
  return (
    <CollapsibleSection title="Background" defaultOpen={false}>
      <div className="space-y-2.5">
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Color</Label>
          <ColorInput
            value={String(style.backgroundColor ?? "")}
            onChange={(v) => onStyleChange("backgroundColor", v || undefined)}
          />
        </div>

        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Image / Gradient</Label>
          <Input
            className="h-7 text-xs font-mono"
            value={String(style.backgroundImage ?? "")}
            placeholder="url(...) or linear-gradient(...)"
            onChange={(e) => onStyleChange("backgroundImage", e.target.value || undefined)}
          />
        </div>

        {!!style.backgroundImage && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Size</Label>
                <Input
                  className="h-7 text-xs"
                  value={String(style.backgroundSize ?? "")}
                  placeholder="cover"
                  onChange={(e) => onStyleChange("backgroundSize", e.target.value || undefined)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Position</Label>
                <Input
                  className="h-7 text-xs"
                  value={String(style.backgroundPosition ?? "")}
                  placeholder="center"
                  onChange={(e) =>
                    onStyleChange("backgroundPosition", e.target.value || undefined)
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
