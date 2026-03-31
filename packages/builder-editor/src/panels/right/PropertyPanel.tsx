import React, { memo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent, ScrollArea, Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider, Switch } from "@ui-builder/ui";
import type { BuilderNode, ComponentDefinition, PropSchema } from "@ui-builder/builder-core";

export interface PropertyPanelProps {
  selectedNode: BuilderNode | null;
  definition: ComponentDefinition | null;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
}

/**
 * Renders a single prop control based on its PropSchema.
 */
function PropControl({
  schema,
  value,
  onChange,
}: {
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (schema.type) {
    case "string":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          {schema.multiline ? (
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              value={String(value ?? "")}
              placeholder={schema.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <Input
              className="h-7 text-xs"
              value={String(value ?? "")}
              placeholder={schema.placeholder}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </div>
      );

    case "number":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              className="h-7 text-xs"
              value={Number(value ?? schema.default ?? 0)}
              min={schema.min}
              max={schema.max}
              step={schema.step ?? 1}
              onChange={(e) => onChange(parseFloat(e.target.value))}
            />
            {schema.unit && (
              <span className="text-xs text-muted-foreground">{schema.unit}</span>
            )}
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between">
          <Label className="text-xs">{schema.label}</Label>
          <Switch
            checked={Boolean(value ?? schema.default ?? false)}
            onCheckedChange={onChange}
          />
        </div>
      );

    case "select":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          <Select
            value={String(value ?? schema.default ?? "")}
            onValueChange={onChange}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schema.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "slider":
      return (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{schema.label}</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {Number(value ?? schema.default ?? schema.min)}
            </span>
          </div>
          <Slider
            min={schema.min}
            max={schema.max}
            step={schema.step ?? 1}
            value={[Number(value ?? schema.default ?? schema.min)]}
            onValueChange={([v]) => onChange(v)}
          />
        </div>
      );

    case "color":
      return (
        <div className="grid gap-1.5">
          <Label className="text-xs">{schema.label}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-7 w-10 rounded border border-input bg-background cursor-pointer"
              value={String(value ?? schema.default ?? "#000000")}
              onChange={(e) => onChange(e.target.value)}
            />
            <Input
              className="h-7 text-xs flex-1 font-mono"
              value={String(value ?? schema.default ?? "")}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="text-xs text-muted-foreground">
          {schema.label}: <span className="italic">Unsupported control ({schema.type})</span>
        </div>
      );
  }
}

/**
 * PropertyPanel — right panel displaying selected node's editable properties.
 *
 * Tabs: Properties | Style | Interactions
 */
export const PropertyPanel = memo(function PropertyPanel({
  selectedNode,
  definition,
  onPropChange,
  onStyleChange,
}: PropertyPanelProps) {
  if (!selectedNode || !definition) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2">
        <p>Select a component to edit its properties.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Node type header */}
      <div className="px-3 py-2 border-b">
        <p className="text-xs font-semibold truncate">{selectedNode.name ?? definition.name}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{selectedNode.type}</p>
      </div>

      <Tabs defaultValue="props" className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-2 mt-2 h-8 grid grid-cols-3">
          <TabsTrigger value="props" className="text-xs">Props</TabsTrigger>
          <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
        </TabsList>

        {/* Props tab */}
        <TabsContent value="props" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {definition.propSchema.length === 0 && (
                <p className="text-xs text-muted-foreground">No configurable properties.</p>
              )}
              {definition.propSchema.map((schema) => {
                if (schema.type === "group") {
                  return (
                    <div key={schema.key} className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {schema.label}
                      </p>
                      {schema.children.map((child) => (
                        <PropControl
                          key={child.key}
                          schema={child}
                          value={selectedNode.props[child.key]}
                          onChange={(val) => onPropChange(child.key, val)}
                        />
                      ))}
                    </div>
                  );
                }
                return (
                  <PropControl
                    key={schema.key}
                    schema={schema}
                    value={selectedNode.props[schema.key]}
                    onChange={(val) => onPropChange(schema.key, val)}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Style tab */}
        <TabsContent value="style" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Size</p>
                <div className="grid grid-cols-2 gap-2">
                  {["width", "height", "minWidth", "maxWidth"].map((key) => (
                    <div key={key} className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground capitalize">{key}</Label>
                      <Input
                        className="h-7 text-xs"
                        value={String((selectedNode.style as Record<string, unknown>)[key] ?? "")}
                        placeholder="auto"
                        onChange={(e) => onStyleChange(key, e.target.value || undefined)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Typography</p>
                <div className="grid grid-cols-2 gap-2">
                  {["fontSize", "fontWeight", "lineHeight", "letterSpacing"].map((key) => (
                    <div key={key} className="grid gap-1">
                      <Label className="text-[10px] text-muted-foreground capitalize">{key}</Label>
                      <Input
                        className="h-7 text-xs"
                        value={String((selectedNode.style as Record<string, unknown>)[key] ?? "")}
                        onChange={(e) => onStyleChange(key, e.target.value || undefined)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Events tab */}
        <TabsContent value="events" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              <p className="text-xs text-muted-foreground">
                {selectedNode.interactions.length === 0
                  ? "No interactions configured."
                  : `${selectedNode.interactions.length} interaction(s) configured.`}
              </p>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
});
