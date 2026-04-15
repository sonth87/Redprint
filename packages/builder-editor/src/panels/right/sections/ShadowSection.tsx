import React, { useState, useCallback } from "react";
import { Label, Switch, Slider } from "@ui-builder/ui";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import { ColorInput } from "../controls/ColorInput";
import { AnglePicker } from "../controls/AnglePicker";
import type { ShadowComponents } from "../property-panel.types";

interface ShadowSectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
}

function parseShadow(css: string): ShadowComponents {
  if (!css || css === "none")
    return { x: 0, y: 0, blur: 10, spread: 0, color: "rgba(0,0,0,0.25)", inset: false };
  const inset = /\binset\b/.test(css);
  const cleaned = css.replace(/\binset\b/, "").trim();
  // Extract color: rgba(), rgb(), #hex, or named color — try to find rgba first
  const rgbaMatch = cleaned.match(/rgba?\([^)]+\)/);
  const hexMatch = cleaned.match(/#[0-9a-fA-F]{3,8}\b/);
  const color = rgbaMatch?.[0] ?? hexMatch?.[0] ?? "rgba(0,0,0,0.25)";
  const withoutColor = cleaned.replace(color, "").trim();
  const nums = withoutColor.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const [x = 0, y = 0, blur = 10, spread = 0] = nums.map(Number);
  return { x, y, blur, spread, color, inset };
}

function buildShadow({ x, y, blur, spread, color, inset }: ShadowComponents): string {
  return `${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

/** Convert (x, y) offset → (angle in degrees 0=top, distance) */
function toAngleDist(x: number, y: number) {
  const dist = Math.round(Math.sqrt(x * x + y * y));
  let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
  if (angle < 0) angle += 360;
  return { angle: Math.round(angle) % 360, dist };
}

/** Convert (angle in degrees 0=top, distance) → (x, y) */
function fromAngleDist(angle: number, dist: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: Math.round(dist * Math.cos(rad)),
    y: Math.round(dist * Math.sin(rad)),
  };
}

export function ShadowSection({ style, onStyleChange }: ShadowSectionProps) {
  const shadow = parseShadow(String(style.boxShadow ?? ""));
  const { angle, dist } = toAngleDist(shadow.x, shadow.y);

  const update = useCallback(
    (patch: Partial<ShadowComponents>) => {
      const next = { ...shadow, ...patch };
      onStyleChange("boxShadow", buildShadow(next));
    },
    [shadow, onStyleChange],
  );

  const handleAngleChange = (newAngle: number) => {
    const { x, y } = fromAngleDist(newAngle, dist);
    update({ x, y });
  };

  const handleDistChange = (newDist: number) => {
    const { x, y } = fromAngleDist(angle, newDist);
    update({ x, y });
  };

  return (
    <CollapsibleSection title="Shadow" defaultOpen={false}>
      <div className="space-y-3">
        {/* Color */}
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Color</Label>
          <ColorInput value={shadow.color} onChange={(v) => update({ color: v })} />
        </div>

        {/* Angle picker + distance */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <Label className="text-[10px] text-muted-foreground">Direction</Label>
            <AnglePicker value={angle} onChange={handleAngleChange} size={48} />
          </div>
          <div className="flex-1 space-y-2.5 pt-4">
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Distance</Label>
                <span className="text-[10px] tabular-nums text-muted-foreground">{dist}px</span>
              </div>
              <Slider
                min={0}
                max={60}
                step={1}
                value={[dist]}
                onValueChange={([v]) => handleDistChange(v ?? 0)}
              />
            </div>
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Blur</Label>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {shadow.blur}px
                </span>
              </div>
              <Slider
                min={0}
                max={80}
                step={1}
                value={[shadow.blur]}
                onValueChange={([v]) => update({ blur: v ?? 0 })}
              />
            </div>
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Spread</Label>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {shadow.spread}px
                </span>
              </div>
              <Slider
                min={-20}
                max={40}
                step={1}
                value={[shadow.spread]}
                onValueChange={([v]) => update({ spread: v ?? 0 })}
              />
            </div>
          </div>
        </div>

        {/* Inner shadow toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Inner shadow</Label>
          <Switch
            checked={shadow.inset}
            onCheckedChange={(v) => update({ inset: v })}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}
