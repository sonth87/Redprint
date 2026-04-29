/**
 * ImageFramePanel — tabbed panel for applying frame styles to Image nodes.
 *
 * Rendered inside a Popover triggered from the ContextualToolbar "Frame Design" button.
 * Five tabs:
 *   - Frame   → border presets (dispatches UPDATE_STYLE with border/borderRadius)
 *   - Shadow  → box-shadow presets (dispatches UPDATE_STYLE with boxShadow)
 *   - Shape   → clip-path / borderRadius shapes (dispatches UPDATE_STYLE)
 *   - Border  → manual border controls: radius, width, color, style
 *   - Special → decorative effects: tape, polaroid, vintage (dispatches UPDATE_PROPS with frameStyle)
 *
 * All preset data lives in @ui-builder/shared (imageFrames.ts) so it can be
 * consumed by both the editor and builder-components renderers.
 */
import React from "react";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { StyleConfig } from "@ui-builder/builder-core";
import { cn } from "@ui-builder/ui";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Slider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
  Label,
} from "@ui-builder/ui";
import {
  FRAME_PRESETS,
  SHADOW_PRESETS,
  SHAPE_PRESETS,
  SPECIAL_PRESETS,
  type FramePreset,
  type ShadowPreset,
  type ShapePreset,
  type SpecialPreset,
  type SpecialFrameStyle,
} from "@ui-builder/shared";
import { ShadowControl } from "../controls/shadow/ShadowControl";
import { ColorSwatch } from "../controls/color/ColorSwatch";

// ── Props ──────────────────────────────────────────────────────────────────

interface ImageFramePanelProps {
  node: BuilderNode;
  onStyleChange: (style: Partial<StyleConfig>) => void;
  onPropChange: (props: Record<string, unknown>) => void;
}

// ── Swatch helpers ────────────────────────────────────────────────────────

/** Small preview box used for Frame and Shadow tabs */
function PreviewBox({ style, selected, onClick, label }: {
  style: React.CSSProperties;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-1 rounded transition-all focus:outline-none",
        selected
          ? "ring-2 ring-primary ring-offset-1 bg-primary/5"
          : "ring-1 ring-transparent hover:ring-border hover:bg-accent/50",
      )}
    >
      <div
        style={{ background: "#d1d5db", width: 48, height: 36, ...style }}
        className="rounded-sm flex-shrink-0"
      />
      <span className="text-[9px] text-muted-foreground leading-none truncate w-full text-center">
        {label}
      </span>
    </button>
  );
}

/** Shape swatch — shows the clip-path or borderRadius on a colored box */
function ShapeBox({ preset, selected, onClick }: {
  preset: ShapePreset;
  selected: boolean;
  onClick: () => void;
}) {
  const shapeStyle: React.CSSProperties = {
    background: "#6366f1",
    width: 40,
    height: 40,
    clipPath: preset.clipPath,
    borderRadius: preset.clipPath ? undefined : (preset.borderRadius ?? "0px"),
  };

  return (
    <button
      type="button"
      title={preset.label}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-1.5 rounded transition-all focus:outline-none",
        selected
          ? "ring-2 ring-primary ring-offset-1 bg-primary/5"
          : "ring-1 ring-transparent hover:ring-border hover:bg-accent/50",
      )}
    >
      <div style={shapeStyle} className="flex-shrink-0" />
      <span className="text-[9px] text-muted-foreground leading-none truncate w-full text-center">
        {preset.label}
      </span>
    </button>
  );
}

/** Special effect card — larger card with description */
function SpecialCard({ preset, selected, onClick }: {
  preset: SpecialPreset;
  selected: boolean;
  onClick: () => void;
}) {
  // Mini visual preview per effect type
  const previewContent = (() => {
    if (preset.value === "tape") {
      return (
        <div className="relative w-full h-10 bg-gray-300 rounded-sm overflow-visible">
          {/* Tape strips */}
          {[{ top: "-5px", left: "8px", rotate: "-18deg" }, { top: "-5px", right: "8px", rotate: "18deg" }].map((t, i) => (
            <div key={i} style={{ position: "absolute", width: 18, height: 7, background: "rgba(215,205,165,0.85)", transform: `rotate(${t.rotate})`, ...t }} />
          ))}
        </div>
      );
    }
    if (preset.value === "polaroid") {
      return (
        <div className="w-full bg-white flex flex-col items-center" style={{ padding: "4px 4px 14px", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", transform: "rotate(-1deg)" }}>
          <div className="w-full h-8 bg-gray-300" />
        </div>
      );
    }
    if (preset.value === "vintage") {
      return (
        <div className="w-full h-10 bg-gray-300" style={{ border: "4px solid #d4b896", outline: "1px solid #a08060", outlineOffset: "-6px" }} />
      );
    }
    return <div className="w-full h-10 bg-gray-300 rounded-sm" />;
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 p-2 rounded border cursor-pointer hover:bg-accent transition-colors text-left focus:outline-none",
        selected ? "ring-2 ring-primary ring-offset-1 border-primary bg-primary/5" : "border-border hover:border-primary/40",
      )}
    >
      {previewContent}
      <div>
        <p className="text-[10px] font-medium leading-none">{preset.label}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">{preset.description}</p>
      </div>
    </button>
  );
}

// ── Border shorthand parser ───────────────────────────────────────────────

/**
 * Parses a CSS border shorthand (e.g. "2px solid #000000") into longhands.
 * Used to keep Frame presets and the Border tab in sync: Frame presets use
 * the CSS border shorthand, but the Border tab reads individual properties.
 */
function parseBorderShorthand(border?: string): { borderWidth: string; borderStyle: string; borderColor: string } {
  if (!border || border === "none") {
    return { borderWidth: "0px", borderStyle: "none", borderColor: "#000000" };
  }
  const parts = border.trim().split(/\s+/);
  return {
    borderWidth: parts[0] ?? "0px",
    borderStyle: parts[1] ?? "none",
    borderColor: parts[2] ?? "#000000",
  };
}

// ── Main Component ────────────────────────────────────────────────────────

export function ImageFramePanel({ node, onStyleChange, onPropChange }: ImageFramePanelProps) {
  const style = (node.style ?? {}) as Partial<StyleConfig>;
  const currentFrameStyle = String(node.props.frameStyle ?? "none") as SpecialFrameStyle;

  // Backward-compat: nodes saved before longhand migration may have style.border shorthand.
  const legacyParsed = parseBorderShorthand(style.border as string | undefined);

  // ── Border tab local read helpers ────────────────────────────────────────
  const borderRadiusVal = parseInt(String(style.borderRadius ?? "0"), 10) || 0;
  const borderWidthVal  = parseInt(String(style.borderWidth  ?? legacyParsed.borderWidth),  10) || 0;
  const borderColorVal  = String(style.borderColor  ?? legacyParsed.borderColor);
  const borderStyleVal  = String(style.borderStyle  ?? legacyParsed.borderStyle);

  // ── Frame tab: detect current selection (matches against individual properties) ──
  const currentFramePreset = FRAME_PRESETS.find((p) => {
    if (p.value === "none") {
      return (!style.borderStyle || style.borderStyle === "none") &&
             (!style.borderWidth || style.borderWidth === "0px") &&
             (!style.border      || style.border === "none");
    }
    const { borderWidth, borderStyle, borderColor } = parseBorderShorthand(p.style.border);
    return (
      style.borderWidth === borderWidth &&
      style.borderStyle === borderStyle &&
      style.borderColor === borderColor &&
      style.borderRadius === p.style.borderRadius
    );
  })?.value ?? "none";

  // ── Shadow tab: detect current selection ────────────────────────────────
  const currentShadow = SHADOW_PRESETS.find((p) => {
    if (p.value === "none") return !style.boxShadow || style.boxShadow === "none";
    return style.boxShadow === p.boxShadow;
  })?.value ?? "none";

  // ── Shape tab: detect current selection ─────────────────────────────────
  const currentShape = SHAPE_PRESETS.find((p) => {
    if (p.value === "none") return !style.clipPath && (!style.borderRadius || style.borderRadius === "0px");
    if (p.clipPath) return style.clipPath === p.clipPath;
    return style.borderRadius === p.borderRadius;
  })?.value ?? "none";

  return (
    <Tabs defaultValue="frame" className="w-full">
      <TabsList className="grid grid-cols-5 w-full rounded-none border-b h-8">
        <TabsTrigger value="frame"   className="text-[10px] px-1 h-7">Frame</TabsTrigger>
        <TabsTrigger value="shadow"  className="text-[10px] px-1 h-7">Shadow</TabsTrigger>
        <TabsTrigger value="shape"   className="text-[10px] px-1 h-7">Shape</TabsTrigger>
        <TabsTrigger value="border"  className="text-[10px] px-1 h-7">Border</TabsTrigger>
        <TabsTrigger value="special" className="text-[10px] px-1 h-7">Special</TabsTrigger>
      </TabsList>

      {/* ── Frame Tab ── */}
      <TabsContent value="frame" className="mt-0">
        <ScrollArea>
          <div className="grid grid-cols-3 gap-1 p-2">
            {FRAME_PRESETS.map((preset: FramePreset) => (
              <PreviewBox
                key={preset.value}
                label={preset.label}
                selected={currentFramePreset === preset.value}
                style={{
                  border: preset.style.border,
                  borderRadius: preset.style.borderRadius,
                }}
                onClick={() => {
                  const { borderWidth, borderStyle, borderColor } = parseBorderShorthand(preset.style.border);
                  onStyleChange({
                    border: "",
                    borderWidth,
                    borderStyle,
                    borderColor,
                    borderRadius: preset.style.borderRadius,
                  });
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ── Shadow Tab ── */}
      <TabsContent value="shadow" className="mt-0">
        <ShadowControl
          value={style.boxShadow as string | undefined}
          onChange={(css) => onStyleChange({ boxShadow: css })}
        />
      </TabsContent>

      {/* ── Shape Tab ── */}
      <TabsContent value="shape" className="mt-0">
        <ScrollArea>
          <div className="grid grid-cols-3 gap-1 p-2">
            {SHAPE_PRESETS.map((preset: ShapePreset) => (
              <ShapeBox
                key={preset.value}
                preset={preset}
                selected={currentShape === preset.value}
                onClick={() => onStyleChange({
                  clipPath: preset.clipPath ?? "",
                  borderRadius: preset.clipPath ? "" : (preset.borderRadius ?? "0px"),
                })}
              />
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ── Border Tab ── */}
      <TabsContent value="border" className="mt-0">
        <div className="p-3 space-y-4">
          {/* Border Radius */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] text-muted-foreground">Corner Radius</Label>
              <span className="text-[10px] text-muted-foreground">{borderRadiusVal}px</span>
            </div>
            <Slider
              min={0} max={100} step={1}
              value={[borderRadiusVal]}
              onValueChange={([v]) => onStyleChange({ borderRadius: `${v}px` })}
            />
          </div>

          {/* Border Width */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] text-muted-foreground">Border Width</Label>
              <span className="text-[10px] text-muted-foreground">{borderWidthVal}px</span>
            </div>
            <Slider
              min={0} max={20} step={1}
              value={[borderWidthVal]}
              onValueChange={([v]) => onStyleChange({ borderWidth: `${v}px` })}
            />
          </div>

          {/* Border Color */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Border Color</Label>
            <div className="flex items-center gap-2">
              <ColorSwatch
                value={borderColorVal}
                onChange={(c) => onStyleChange({ borderColor: c })}
                label="Border color"
              />
              <span className="text-[10px] font-mono text-muted-foreground">{borderColorVal}</span>
            </div>
          </div>

          {/* Border Style */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Border Style</Label>
            <Select
              value={borderStyleVal}
              onValueChange={(v) => onStyleChange({ borderStyle: v })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
                <SelectItem value="double">Double</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      {/* ── Special Tab ── */}
      <TabsContent value="special" className="mt-0">
        <ScrollArea>
          <div className="grid grid-cols-2 gap-2 p-2">
            {SPECIAL_PRESETS.map((preset: SpecialPreset) => (
              <SpecialCard
                key={preset.value}
                preset={preset}
                selected={currentFrameStyle === preset.value}
                onClick={() => {
                  onPropChange({ frameStyle: preset.value });
                  // CSS-only specials also inject their container styles
                  if (!preset.requiresCustomMarkup && preset.cssStyle) {
                    onStyleChange(preset.cssStyle as Partial<StyleConfig>);
                  }
                  // Clearing special resets injected CSS styles
                  if (preset.value === "none") {
                    onStyleChange({
                      background: "",
                      padding: "",
                      transform: "",
                    } as Partial<StyleConfig>);
                  }
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
