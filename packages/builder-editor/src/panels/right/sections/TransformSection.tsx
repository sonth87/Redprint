import React, { useState, useCallback } from "react";
import { Label, Slider, Separator } from "@ui-builder/ui";
import { NumericPropertyInput } from "../controls/NumericPropertyInput";
import { AnglePicker } from "../controls/AnglePicker";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import { RotateCw, Scaling, MoveHorizontal, MoveVertical } from "lucide-react";
import type { TransformComponents } from "../property-panel.types";

interface TransformSectionProps {
  style: Record<string, unknown>;
  onStyleChange: (key: string, value: unknown) => void;
}

function cap(m: RegExpMatchArray | null, i = 1): string {
  return m?.[i] ?? "0";
}

function parseTransform(css: string): TransformComponents {
  const result: TransformComponents = {
    rotate: 0,
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0,
  };
  if (!css || css === "none") return result;
  const rotate = css.match(/rotate\(\s*(-?[\d.]+)deg\s*\)/);
  if (rotate) result.rotate = parseFloat(cap(rotate));
  const scale = css.match(/scale\(\s*(-?[\d.]+)\s*\)/);
  if (scale) { const s = parseFloat(cap(scale)); result.scaleX = s; result.scaleY = s; }
  const scaleX = css.match(/scaleX\(\s*(-?[\d.]+)\s*\)/);
  if (scaleX) result.scaleX = parseFloat(cap(scaleX));
  const scaleY = css.match(/scaleY\(\s*(-?[\d.]+)\s*\)/);
  if (scaleY) result.scaleY = parseFloat(cap(scaleY));
  const tx = css.match(/translateX\(\s*(-?[\d.]+)px\s*\)/);
  if (tx) result.translateX = parseFloat(cap(tx));
  const ty = css.match(/translateY\(\s*(-?[\d.]+)px\s*\)/);
  if (ty) result.translateY = parseFloat(cap(ty));
  return result;
}

function buildTransform(t: TransformComponents): string {
  const parts: string[] = [];
  if (t.rotate !== 0) parts.push(`rotate(${t.rotate}deg)`);
  if (t.scaleX !== 1 && t.scaleX === t.scaleY) parts.push(`scale(${t.scaleX})`);
  else {
    if (t.scaleX !== 1) parts.push(`scaleX(${t.scaleX})`);
    if (t.scaleY !== 1) parts.push(`scaleY(${t.scaleY})`);
  }
  if (t.translateX !== 0) parts.push(`translateX(${t.translateX}px)`);
  if (t.translateY !== 0) parts.push(`translateY(${t.translateY}px)`);
  return parts.length ? parts.join(" ") : "none";
}

export function TransformSection({ style, onStyleChange }: TransformSectionProps) {
  const t = parseTransform(String(style.transform ?? ""));

  const update = useCallback(
    (patch: Partial<TransformComponents>) => {
      const next = { ...t, ...patch };
      const css = buildTransform(next);
      onStyleChange("transform", css === "none" ? undefined : css);
    },
    [t, onStyleChange],
  );

  return (
    <CollapsibleSection title="Transform" defaultOpen={false}>
      <div className="space-y-3">
        {/* Rotate — angle picker */}
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <RotateCw className="h-3 w-3" /> Rotate
            </Label>
            <AnglePicker
              value={((t.rotate % 360) + 360) % 360}
              onChange={(v) => {
                // Map 0-360 back, preserving negative angles
                update({ rotate: v });
              }}
              size={48}
            />
          </div>
          <div className="flex-1 space-y-2.5 pt-4">
            {/* Scale */}
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Scaling className="h-3 w-3" /> Scale
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="grid gap-0.5">
                  <span className="text-[9px] text-muted-foreground text-center">X</span>
                  <NumericPropertyInput
                    value={String(t.scaleX)}
                    placeholder="1"
                    units={[""]}
                    onChange={(v) => update({ scaleX: parseFloat(v) || 1 })}
                  />
                </div>
                <div className="grid gap-0.5">
                  <span className="text-[9px] text-muted-foreground text-center">Y</span>
                  <NumericPropertyInput
                    value={String(t.scaleY)}
                    placeholder="1"
                    units={[""]}
                    onChange={(v) => update({ scaleY: parseFloat(v) || 1 })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Translate */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MoveHorizontal className="h-3 w-3" /> Move X
            </Label>
            <NumericPropertyInput
              value={t.translateX !== 0 ? `${t.translateX}px` : ""}
              placeholder="0"
              onChange={(v) => update({ translateX: parseFloat(v) || 0 })}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MoveVertical className="h-3 w-3" /> Move Y
            </Label>
            <NumericPropertyInput
              value={t.translateY !== 0 ? `${t.translateY}px` : ""}
              placeholder="0"
              onChange={(v) => update({ translateY: parseFloat(v) || 0 })}
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
