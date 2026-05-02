import React, { useState } from "react";
import type { BuilderNode, Breakpoint, ComponentDefinition } from "@ui-builder/builder-core";
import { resolveStyle, resolveProps } from "@ui-builder/builder-core";
import {
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Label,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Badge,
} from "@ui-builder/ui";
import { Settings2, Paintbrush, Sparkles, Database } from "lucide-react";
import { PropControl } from "./prop-controls/PropControl";
import { CollapsibleSection } from "./ui/CollapsibleSection";
import { StyleSections } from "./style-controls/StyleSections";

export interface PropSchemaEditorProps {
  definition: ComponentDefinition | null;
  node: BuilderNode | null;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
  breakpoint?: Breakpoint;
}

// ── Animation presets ─────────────────────────────────────────────────────

const ANIMATION_PRESETS = [
  { value: "none", label: "None" },
  { value: "fadeIn", label: "Fade In" },
  { value: "fadeOut", label: "Fade Out" },
  { value: "slideInLeft", label: "Slide In Left" },
  { value: "slideInRight", label: "Slide In Right" },
  { value: "slideInUp", label: "Slide In Up" },
  { value: "slideInDown", label: "Slide In Down" },
  { value: "bounceIn", label: "Bounce In" },
  { value: "zoomIn", label: "Zoom In" },
  { value: "zoomOut", label: "Zoom Out" },
  { value: "rotateIn", label: "Rotate In" },
  { value: "pulse", label: "Pulse" },
  { value: "shake", label: "Shake" },
  { value: "flash", label: "Flash" },
  { value: "swing", label: "Swing" },
  { value: "tada", label: "Tada" },
];

const EASING_OPTIONS = [
  { value: "ease", label: "Ease" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In Out" },
  { value: "linear", label: "Linear" },
  { value: "cubic-bezier(0.4, 0, 0.2, 1)", label: "Smooth" },
];

// ── Main component ────────────────────────────────────────────────────────

export function PropSchemaEditor({
  definition,
  node,
  onPropChange,
  onStyleChange,
  breakpoint,
}: PropSchemaEditorProps) {
  if (!definition || !node) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-4">
        <Settings2 className="text-muted-foreground/40 h-8 w-8" />
        <p className="text-center text-xs">Select a node to edit its properties</p>
      </div>
    );
  }

  const activeBp = breakpoint ?? "desktop";
  const resolvedStyle = resolveStyle(node.style, node.responsiveStyle ?? {}, activeBp) as Record<
    string,
    unknown
  >;
  const resolvedPropsMap = resolveProps(node.props, node.responsiveProps, activeBp);

  return (
    <div className="flex h-full flex-col">
      {/* Node type header */}
      <div className="shrink-0 border-b px-3 py-1.5">
        <p className="text-[10px] font-semibold">{definition.name}</p>
        <p className="text-muted-foreground font-mono text-[9px]">{definition.type}</p>
      </div>

      <Tabs defaultValue="design" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList
          className="mx-2 mt-1.5 grid h-10 shrink-0 grid-cols-4"
          style={{ height: "48px", gridTemplateColumns: "repeat(4,1fr)" }}
        >
          <TabsTrigger
            value="design"
            className="flex flex-col items-center gap-0.5 px-1 text-[9px]"
          >
            <Paintbrush className="h-3 w-3 shrink-0" />
            <span>Design</span>
          </TabsTrigger>
          <TabsTrigger
            value="effects"
            className="flex flex-col items-center gap-0.5 px-1 text-[9px]"
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>Effects</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex flex-col items-center gap-0.5 px-1 text-[9px]">
            <Database className="h-3 w-3 shrink-0" />
            <span>Data</span>
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex flex-col items-center gap-0.5 px-1 text-[9px]"
          >
            <Settings2 className="h-3 w-3 shrink-0" />
            <span>Advanced</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Design tab ─────────────────────────────────────────────── */}
        <TabsContent value="design" className="mt-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 min-h-0">
            {definition.propSchema.length > 0 && (
              <CollapsibleSection title="Properties">
                <div className="space-y-3">
                  {definition.propSchema.map((schema) => (
                    <PropControl
                      key={schema.key}
                      schema={schema}
                      value={resolvedPropsMap[schema.key]}
                      onChange={(val) => onPropChange(schema.key, val)}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}
            <StyleSections style={resolvedStyle} onChange={onStyleChange} />
          </ScrollArea>
        </TabsContent>

        {/* ── Effects tab ────────────────────────────────────────────── */}
        <TabsContent value="effects" className="mt-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 min-h-0 w-full">
            <CollapsibleSection title="Animation">
              <div className="grid gap-1.5">
                <Label className="text-muted-foreground text-[10px]">Preset</Label>
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
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">Duration (ms)</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={Number(node.props._animationDuration ?? 300)}
                    min={0}
                    max={5000}
                    step={50}
                    onChange={(e) => onPropChange("_animationDuration", parseFloat(e.target.value))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">Delay (ms)</Label>
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
              </div>
              <div className="grid gap-1">
                <Label className="text-muted-foreground text-[10px]">Easing</Label>
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
            </CollapsibleSection>

            <CollapsibleSection title="Hover Effect" defaultOpen={false}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">Hover Transform</Label>
                  <Input
                    className="h-7 font-mono text-xs"
                    value={String(node.props._hoverTransform ?? "")}
                    placeholder="scale(1.05)"
                    onChange={(e) => onPropChange("_hoverTransform", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">Hover Opacity</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String(node.props._hoverOpacity ?? "")}
                    placeholder="1"
                    onChange={(e) => onPropChange("_hoverOpacity", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">Hover Shadow</Label>
                  <Input
                    className="h-7 font-mono text-xs"
                    value={String(node.props._hoverShadow ?? "")}
                    placeholder="0 4px 12px rgba(0,0,0,0.15)"
                    onChange={(e) => onPropChange("_hoverShadow", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">Transition</Label>
                  <Input
                    className="h-7 font-mono text-xs"
                    value={String(resolvedStyle.transition ?? "")}
                    placeholder="all 0.3s ease"
                    onChange={(e) => onStyleChange("transition", e.target.value || undefined)}
                  />
                </div>
              </div>
            </CollapsibleSection>
          </ScrollArea>
        </TabsContent>

        {/* ── Data tab ───────────────────────────────────────────────── */}
        <TabsContent value="data" className="mt-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 min-h-0">
            <CollapsibleSection title="Repeater">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Repeat Data</Label>
                  <Switch
                    checked={Boolean(node.props._repeaterEnabled)}
                    onCheckedChange={(v) => onPropChange("_repeaterEnabled", v)}
                  />
                </div>
                {Boolean(node.props._repeaterEnabled) && (
                  <div className="grid gap-1">
                    <Label className="text-muted-foreground text-[10px]">Data Key</Label>
                    <Input
                      className="h-7 font-mono text-xs"
                      value={String(node.props._repeaterKey ?? "")}
                      placeholder="items"
                      onChange={(e) => onPropChange("_repeaterKey", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Conditional Visibility" defaultOpen={false}>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Conditional</Label>
                  <Switch
                    checked={Boolean(node.props._conditionalVisibility)}
                    onCheckedChange={(v) => onPropChange("_conditionalVisibility", v)}
                  />
                </div>
                {Boolean(node.props._conditionalVisibility) && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-muted-foreground text-[10px]">Variable</Label>
                      <Input
                        className="h-7 font-mono text-xs"
                        value={String(node.props._conditionVariable ?? "")}
                        placeholder="isLoggedIn"
                        onChange={(e) => onPropChange("_conditionVariable", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-muted-foreground text-[10px]">Operator</Label>
                      <Select
                        value={String(node.props._conditionOperator ?? "eq")}
                        onValueChange={(v) => onPropChange("_conditionOperator", v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "eq",
                            "neq",
                            "gt",
                            "lt",
                            "gte",
                            "lte",
                            "truthy",
                            "falsy",
                            "contains",
                          ].map((op) => (
                            <SelectItem key={op} value={op} className="text-xs">
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-muted-foreground text-[10px]">Value</Label>
                      <Input
                        className="h-7 text-xs"
                        value={String(node.props._conditionValue ?? "")}
                        placeholder="true"
                        onChange={(e) => onPropChange("_conditionValue", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>
          </ScrollArea>
        </TabsContent>

        {/* ── Advanced tab ───────────────────────────────────────────── */}
        <TabsContent value="advanced" className="mt-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 min-h-0">
            <CollapsibleSection title="Identity">
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">Name</Label>
                  <Input
                    className="h-7 text-xs"
                    value={node.name ?? ""}
                    placeholder="Component name"
                    onChange={(e) => onPropChange("__name", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">Node ID</Label>
                  <Input className="h-7 font-mono text-xs" value={node.id} readOnly disabled />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="CSS & Attributes" defaultOpen={false}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">CSS Class</Label>
                  <Input
                    className="h-7 font-mono text-xs"
                    value={String(node.props._cssClass ?? "")}
                    placeholder="my-class another-class"
                    onChange={(e) => onPropChange("_cssClass", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">
                    Custom Attributes (JSON)
                  </Label>
                  <Textarea
                    className="font-mono text-xs min-h-[120px] resize-none"
                    value={String(node.props._customAttributes ?? "{}")}
                    placeholder='{"data-testid": "my-component"}'
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onPropChange("_customAttributes", e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Accessibility" defaultOpen={false}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">ARIA Role</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String(node.props._ariaRole ?? "")}
                    placeholder="button"
                    onChange={(e) => onPropChange("_ariaRole", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">ARIA Label</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String(node.props._ariaLabel ?? "")}
                    placeholder="Accessible label"
                    onChange={(e) => onPropChange("_ariaLabel", e.target.value || undefined)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground text-[10px]">Tab Index</Label>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={String(node.props._tabIndex ?? "")}
                    placeholder="0"
                    onChange={(e) =>
                      onPropChange(
                        "_tabIndex",
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Tooltip" defaultOpen={false}>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Show Tooltip</Label>
                  <Switch
                    checked={Boolean(node.props._tooltipEnabled)}
                    onCheckedChange={(v) => onPropChange("_tooltipEnabled", v)}
                  />
                </div>
                {Boolean(node.props._tooltipEnabled) && (
                  <>
                    <div className="grid gap-1">
                      <Label className="text-muted-foreground text-[10px]">Text</Label>
                      <Input
                        className="h-7 text-xs"
                        value={String(node.props._tooltipText ?? "")}
                        placeholder="Tooltip text..."
                        onChange={(e) => onPropChange("_tooltipText", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-muted-foreground text-[10px]">Position</Label>
                      <Select
                        value={String(node.props._tooltipPosition ?? "top")}
                        onValueChange={(v) => onPropChange("_tooltipPosition", v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["top", "right", "bottom", "left"].map((p) => (
                            <SelectItem key={p} value={p} className="text-xs capitalize">
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Metadata" defaultOpen={false}>
              <div className="text-muted-foreground grid gap-1 text-xs">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-mono text-[10px]">
                    {node.metadata?.createdAt
                      ? new Date(node.metadata.createdAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span className="font-mono text-[10px]">
                    {node.metadata?.updatedAt
                      ? new Date(node.metadata.updatedAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
                {node.metadata?.tags && node.metadata.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {node.metadata.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[9px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
