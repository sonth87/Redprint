import React from "react";
import { Label, Slider } from "@ui-builder/ui";
import { Eye } from "lucide-react";
import { CollapsibleSection } from "../controls/CollapsibleSection";

interface VisualSectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
}

export function VisualSection({ style, onStyleChange }: VisualSectionProps) {
  const opacity = Number(style.opacity ?? 1);

  return (
    <CollapsibleSection title="Visibility" defaultOpen={false}>
      <div className="space-y-3">
        {/* Opacity slider */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" /> Opacity
            </Label>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          {/* Visual opacity bar */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px",
                borderRadius: 4,
              }}
            />
            <Slider
              className="relative"
              min={0}
              max={1}
              step={0.01}
              value={[opacity]}
              onValueChange={([v]) => onStyleChange("opacity", v === 1 ? undefined : String(v))}
            />
          </div>
        </div>

        {/* Overflow */}
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Overflow</Label>
          <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
            {[
              { value: "visible", label: "Visible" },
              { value: "hidden",  label: "Clip" },
              { value: "scroll",  label: "Scroll" },
              { value: "auto",    label: "Auto" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                title={opt.label}
                className={[
                  "flex-1 flex items-center justify-center h-6 rounded text-[10px] font-medium transition-colors",
                  style.overflow === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                ].join(" ")}
                onClick={() =>
                  onStyleChange("overflow", opt.value === "visible" ? undefined : opt.value)
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* CSS Transition */}
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Transition</Label>
          <input
            className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={String(style.transition ?? "")}
            placeholder="all 0.3s ease"
            onChange={(e) => onStyleChange("transition", e.target.value || undefined)}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}
