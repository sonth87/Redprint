import React from "react";
import { ScrollArea, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Slider } from "@ui-builder/ui";
import { useTranslation } from "react-i18next";
import type { BuilderNode, Breakpoint, ComponentDefinition } from "@ui-builder/builder-core";
import { resolveStyle, resolveProps } from "@ui-builder/builder-core";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import { PropControl, PropGroupControl } from "../controls/PropControl";
import { SizeSection } from "../sections/SizeSection";
import { SpacingSection } from "../sections/SpacingSection";
import { TypographySection } from "../sections/TypographySection";
import { BackgroundSection } from "../sections/BackgroundSection";
import { BorderSection } from "../sections/BorderSection";
import { LayoutSection } from "../sections/LayoutSection";
import { ShadowSection } from "../sections/ShadowSection";
import { FilterSection } from "../sections/FilterSection";
import { TransformSection } from "../sections/TransformSection";
import { VisualSection } from "../sections/VisualSection";
import { getPlugin } from "../property-panel.registry";
import type { StyleSection } from "../property-panel.types";

const ANIMATION_PRESETS = [
  { value: "none",        label: "None" },
  { value: "fadeIn",      label: "Fade In" },
  { value: "fadeOut",     label: "Fade Out" },
  { value: "slideInLeft", label: "Slide In ←" },
  { value: "slideInRight",label: "Slide In →" },
  { value: "slideInUp",   label: "Slide In ↑" },
  { value: "slideInDown", label: "Slide In ↓" },
  { value: "bounceIn",    label: "Bounce In" },
  { value: "zoomIn",      label: "Zoom In" },
  { value: "zoomOut",     label: "Zoom Out" },
  { value: "pulse",       label: "Pulse" },
  { value: "shake",       label: "Shake" },
];

const EASING_OPTIONS = [
  { value: "ease",          label: "Ease" },
  { value: "ease-in",       label: "Ease In" },
  { value: "ease-out",      label: "Ease Out" },
  { value: "ease-in-out",   label: "Ease In Out" },
  { value: "linear",        label: "Linear" },
  { value: "cubic-bezier(0.4, 0, 0.2, 1)", label: "Smooth" },
];

interface DesignTabProps {
  node: BuilderNode;
  definition: ComponentDefinition;
  breakpoint: Breakpoint;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
  onSpacingHover?: (type: "padding" | "margin" | null) => void;
}

export function DesignTab({
  node,
  definition,
  breakpoint,
  onPropChange,
  onStyleChange,
  onSpacingHover,
}: DesignTabProps) {
  const { t } = useTranslation();

  const style = resolveStyle(
    node.style,
    node.responsiveStyle ?? {},
    breakpoint,
  ) as Record<string, unknown>;

  const resolvedProps = resolveProps(node.props, node.responsiveProps, breakpoint);

  const plugin = getPlugin(node.type);
  const hidden = new Set<StyleSection>(plugin?.hideSections ?? []);

  const ctx = { node, definition, style, resolvedProps, onPropChange, onStyleChange };

  const Before = plugin?.designSectionsBefore;
  const After = plugin?.designSectionsAfter;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-0">
        {/* ── Component-specific props (from propSchema) ── */}
        {definition.propSchema.length > 0 && (
          <CollapsibleSection title={t("propertyPanel.properties")}>
            <div className="space-y-3">
              {definition.propSchema.map((schema) => {
                if (schema.type === "group") {
                  return (
                    <PropGroupControl
                      key={schema.key}
                      schema={schema}
                      values={resolvedProps}
                      onPropChange={onPropChange}
                    />
                  );
                }
                return (
                  <PropControl
                    key={schema.key}
                    schema={schema}
                    value={resolvedProps[schema.key]}
                    onChange={(val) => onPropChange(schema.key, val)}
                  />
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* ── Plugin-injected sections (before generics) ── */}
        {Before && <Before {...ctx} />}

        {/* ── Generic style sections ── */}
        {!hidden.has("size")       && <SizeSection style={style} onStyleChange={onStyleChange} />}
        {!hidden.has("spacing")    && <SpacingSection style={style} onStyleChange={onStyleChange} onSpacingHover={onSpacingHover} />}
        {!hidden.has("layout")     && <LayoutSection style={style} onStyleChange={onStyleChange} />}
        {!hidden.has("typography") && <TypographySection style={style} onStyleChange={onStyleChange} />}
        {!hidden.has("background") && <BackgroundSection style={style} onStyleChange={onStyleChange} />}
        {!hidden.has("border")     && <BorderSection style={style} onStyleChange={onStyleChange} />}
        {!hidden.has("shadow")     && <ShadowSection style={style} onStyleChange={onStyleChange} />}
        {!hidden.has("filter")     && <FilterSection style={style} onStyleChange={onStyleChange} />}
        {!hidden.has("transform")  && <TransformSection style={style} onStyleChange={onStyleChange} />}
        {!hidden.has("visual")     && <VisualSection style={style} onStyleChange={onStyleChange} />}

        {/* ── Plugin-injected sections (after generics) ── */}
        {After && <After {...ctx} />}

        {/* ── Animation (merged from old Effects tab) ── */}
        <CollapsibleSection title="Animation" defaultOpen={false}>
          <div className="space-y-3">
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Preset</Label>
              <Select
                value={String(node.props._animation ?? "none")}
                onValueChange={(v) => onPropChange("_animation", v === "none" ? undefined : v)}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANIMATION_PRESETS.map((a) => (
                    <SelectItem key={a.value} value={a.value} className="text-xs">
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!!node.props._animation && String(node.props._animation) !== "none" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Duration (ms)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={Number(node.props._animationDuration ?? 300)}
                    min={0}
                    max={5000}
                    step={50}
                    onChange={(e) =>
                      onPropChange("_animationDuration", parseFloat(e.target.value))
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Delay (ms)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={Number(node.props._animationDelay ?? 0)}
                    min={0}
                    max={5000}
                    step={50}
                    onChange={(e) => onPropChange("_animationDelay", parseFloat(e.target.value))}
                  />
                </div>
                <div className="grid gap-1 col-span-2">
                  <Label className="text-[10px] text-muted-foreground">Easing</Label>
                  <Select
                    value={String(node.props._animationEasing ?? "ease")}
                    onValueChange={(v) => onPropChange("_animationEasing", v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EASING_OPTIONS.map((e) => (
                        <SelectItem key={e.value} value={e.value} className="text-xs">
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </ScrollArea>
  );
}
