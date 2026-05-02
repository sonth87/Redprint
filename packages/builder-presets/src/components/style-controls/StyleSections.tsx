import React from "react";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
} from "@ui-builder/ui";
import { CollapsibleSection } from "../ui/CollapsibleSection";
import { NumericInput } from "./NumericInput";

export interface StyleSectionsProps {
  style: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function sv(style: Record<string, unknown>, key: string): string {
  const v = style[key];
  return v !== undefined && v !== null ? String(v) : "";
}

export function StyleSections({ style, onChange }: StyleSectionsProps) {
  return (
    <>
      {/* ── Size ────────────────────────────────────────────────────── */}
      <CollapsibleSection title="Size">
        <div className="grid grid-cols-2 gap-2">
          {(["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"] as const).map(
            (key) => (
              <div key={key} className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground capitalize">{key}</Label>
                <NumericInput
                  value={sv(style, key)}
                  placeholder="auto"
                  units={["width", "maxWidth", "height", "maxHeight"].includes(key) ? ["px", "%"] : ["px"]}
                  onChange={(val) => onChange(key, val || undefined)}
                />
              </div>
            ),
          )}
        </div>
      </CollapsibleSection>

      {/* ── Spacing ─────────────────────────────────────────────────── */}
      <CollapsibleSection title="Spacing">
        <div className="grid grid-cols-2 gap-2">
          {(["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const).map(
            (key) => (
              <div key={key} className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground capitalize">
                  {key === "padding" ? "All" : key.replace("padding", "").toLowerCase()}
                </Label>
                <NumericInput
                  value={sv(style, key)}
                  placeholder="0"
                  onChange={(val) => onChange(key, val || undefined)}
                />
              </div>
            ),
          )}
        </div>
        <Separator className="my-2" />
        <div className="grid grid-cols-2 gap-2">
          {(["margin", "marginTop", "marginRight", "marginBottom", "marginLeft"] as const).map(
            (key) => (
              <div key={key} className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground capitalize">
                  {key === "margin" ? "All" : key.replace("margin", "").toLowerCase()}
                </Label>
                <NumericInput
                  value={sv(style, key)}
                  placeholder="0"
                  onChange={(val) => onChange(key, val || undefined)}
                />
              </div>
            ),
          )}
        </div>
      </CollapsibleSection>

      {/* ── Typography ──────────────────────────────────────────────── */}
      <CollapsibleSection title="Typography">
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Font Family</Label>
            <Input
              className="h-7 text-xs"
              value={sv(style, "fontFamily")}
              placeholder="inherit"
              onChange={(e) => onChange("fontFamily", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Font Size</Label>
            <NumericInput
              value={sv(style, "fontSize")}
              placeholder="16px"
              onChange={(val) => onChange("fontSize", val || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Font Weight</Label>
            <Select
              value={sv(style, "fontWeight")}
              onValueChange={(v) => onChange("fontWeight", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Weight" />
              </SelectTrigger>
              <SelectContent>
                {["100", "200", "300", "400", "500", "600", "700", "800", "900"].map((w) => (
                  <SelectItem key={w} value={w} className="text-xs">
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Line Height</Label>
            <Input
              className="h-7 text-xs"
              value={sv(style, "lineHeight")}
              placeholder="1.5"
              onChange={(e) => onChange("lineHeight", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Letter Spacing</Label>
            <NumericInput
              value={sv(style, "letterSpacing")}
              placeholder="0"
              onChange={(val) => onChange("letterSpacing", val || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Text Align</Label>
            <Select
              value={sv(style, "textAlign")}
              onValueChange={(v) => onChange("textAlign", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Align" />
              </SelectTrigger>
              <SelectContent>
                {["left", "center", "right", "justify"].map((a) => (
                  <SelectItem key={a} value={a} className="text-xs capitalize">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-1.5 mt-2">
          <Label className="text-[10px] text-muted-foreground">Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-7 w-10 rounded border border-input bg-background cursor-pointer"
              value={sv(style, "color") || "#000000"}
              onChange={(e) => onChange("color", e.target.value)}
            />
            <Input
              className="h-7 text-xs flex-1 font-mono"
              value={sv(style, "color")}
              onChange={(e) => onChange("color", e.target.value)}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Background ──────────────────────────────────────────────── */}
      <CollapsibleSection title="Background" defaultOpen={false}>
        <div className="grid gap-1.5">
          <Label className="text-[10px] text-muted-foreground">Background Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-7 w-10 rounded border border-input bg-background cursor-pointer"
              value={sv(style, "backgroundColor") || "#ffffff"}
              onChange={(e) => onChange("backgroundColor", e.target.value)}
            />
            <Input
              className="h-7 text-xs flex-1 font-mono"
              value={sv(style, "backgroundColor")}
              onChange={(e) => onChange("backgroundColor", e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Background Image</Label>
          <Input
            className="h-7 text-xs"
            value={sv(style, "backgroundImage")}
            placeholder="url(...) or gradient"
            onChange={(e) => onChange("backgroundImage", e.target.value || undefined)}
          />
        </div>
      </CollapsibleSection>

      {/* ── Border ──────────────────────────────────────────────────── */}
      <CollapsibleSection title="Border" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Width</Label>
            <NumericInput
              value={sv(style, "borderWidth")}
              placeholder="0"
              onChange={(val) => onChange("borderWidth", val || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Style</Label>
            <Select
              value={sv(style, "borderStyle")}
              onValueChange={(v) => onChange("borderStyle", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                {["none", "solid", "dashed", "dotted", "double"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Radius</Label>
            <NumericInput
              value={sv(style, "borderRadius")}
              placeholder="0"
              onChange={(val) => onChange("borderRadius", val || undefined)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[10px] text-muted-foreground">Color</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                className="h-7 w-8 rounded border border-input bg-background cursor-pointer shrink-0"
                value={sv(style, "borderColor") || "#000000"}
                onChange={(e) => onChange("borderColor", e.target.value)}
              />
              <Input
                className="h-7 text-xs flex-1 font-mono"
                value={sv(style, "borderColor")}
                onChange={(e) => onChange("borderColor", e.target.value)}
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Shadow ──────────────────────────────────────────────────── */}
      <CollapsibleSection title="Shadow" defaultOpen={false}>
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Box Shadow</Label>
          <Input
            className="h-7 text-xs font-mono"
            value={sv(style, "boxShadow")}
            placeholder="0 0 10px rgba(0,0,0,0.1)"
            onChange={(e) => onChange("boxShadow", e.target.value || undefined)}
          />
        </div>
      </CollapsibleSection>

      {/* ── Layout ──────────────────────────────────────────────────── */}
      <CollapsibleSection title="Layout" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Display</Label>
            <Select
              value={sv(style, "display")}
              onValueChange={(v) => onChange("display", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Display" />
              </SelectTrigger>
              <SelectContent>
                {["block", "flex", "grid", "inline-block", "inline", "none"].map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Position</Label>
            <Select
              value={sv(style, "position")}
              onValueChange={(v) => onChange("position", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                {["static", "relative", "absolute", "fixed", "sticky"].map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Overflow</Label>
            <Select
              value={sv(style, "overflow")}
              onValueChange={(v) => onChange("overflow", v || undefined)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Overflow" />
              </SelectTrigger>
              <SelectContent>
                {["visible", "hidden", "scroll", "auto"].map((o) => (
                  <SelectItem key={o} value={o} className="text-xs">
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Z-Index</Label>
            <NumericInput
              value={sv(style, "zIndex")}
              placeholder="auto"
              units={[""]}
              onChange={(val) => onChange("zIndex", val || undefined)}
            />
          </div>
        </div>

        {/* Flex subsection */}
        {(style.display === "flex" || style.display === "inline-flex") && (
          <>
            <Separator className="my-2" />
            <p className="text-[10px] font-semibold text-muted-foreground">Flex</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Direction</Label>
                <Select
                  value={sv(style, "flexDirection")}
                  onValueChange={(v) => onChange("flexDirection", v || undefined)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="row" />
                  </SelectTrigger>
                  <SelectContent>
                    {["row", "row-reverse", "column", "column-reverse"].map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Wrap</Label>
                <Select
                  value={sv(style, "flexWrap")}
                  onValueChange={(v) => onChange("flexWrap", v || undefined)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="nowrap" />
                  </SelectTrigger>
                  <SelectContent>
                    {["nowrap", "wrap", "wrap-reverse"].map((w) => (
                      <SelectItem key={w} value={w} className="text-xs">
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Justify</Label>
                <Select
                  value={sv(style, "justifyContent")}
                  onValueChange={(v) => onChange("justifyContent", v || undefined)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="start" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "flex-start",
                      "flex-end",
                      "center",
                      "space-between",
                      "space-around",
                      "space-evenly",
                    ].map((j) => (
                      <SelectItem key={j} value={j} className="text-xs">
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Align Items</Label>
                <Select
                  value={sv(style, "alignItems")}
                  onValueChange={(v) => onChange("alignItems", v || undefined)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="stretch" />
                  </SelectTrigger>
                  <SelectContent>
                    {["flex-start", "flex-end", "center", "stretch", "baseline"].map((a) => (
                      <SelectItem key={a} value={a} className="text-xs">
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1 col-span-2">
                <Label className="text-[10px] text-muted-foreground">Gap</Label>
                <NumericInput
                  value={sv(style, "gap")}
                  placeholder="0"
                  onChange={(val) => onChange("gap", val || undefined)}
                />
              </div>
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* ── Visual ──────────────────────────────────────────────────── */}
      <CollapsibleSection title="Visual" defaultOpen={false}>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Opacity</Label>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {Math.round((Number(style.opacity ?? 1)) * 100)}%
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[Number(style.opacity ?? 1)]}
            onValueChange={([v]) => onChange("opacity", String(v))}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Filter</Label>
          <Input
            className="h-7 text-xs font-mono"
            value={sv(style, "filter")}
            placeholder="blur(0px)"
            onChange={(e) => onChange("filter", e.target.value || undefined)}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Backdrop Filter</Label>
          <Input
            className="h-7 text-xs font-mono"
            value={sv(style, "backdropFilter")}
            placeholder="blur(0px)"
            onChange={(e) => onChange("backdropFilter", e.target.value || undefined)}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Mix Blend Mode</Label>
          <Select
            value={sv(style, "mixBlendMode")}
            onValueChange={(v) => onChange("mixBlendMode", v || undefined)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="normal" />
            </SelectTrigger>
            <SelectContent>
              {[
                "normal",
                "multiply",
                "screen",
                "overlay",
                "darken",
                "lighten",
                "color-dodge",
                "color-burn",
                "hard-light",
                "soft-light",
                "difference",
                "exclusion",
              ].map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleSection>

      {/* ── Transform ───────────────────────────────────────────────── */}
      <CollapsibleSection title="Transform" defaultOpen={false}>
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Transform</Label>
          <Input
            className="h-7 text-xs font-mono"
            value={sv(style, "transform")}
            placeholder="rotate(0deg) scale(1)"
            onChange={(e) => onChange("transform", e.target.value || undefined)}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Transition</Label>
          <Input
            className="h-7 text-xs font-mono"
            value={sv(style, "transition")}
            placeholder="all 0.3s ease"
            onChange={(e) => onChange("transition", e.target.value || undefined)}
          />
        </div>
      </CollapsibleSection>
    </>
  );
}
