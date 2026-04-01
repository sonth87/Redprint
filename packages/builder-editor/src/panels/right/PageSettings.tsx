/**
 * PageSettings — shown in the right panel when no component is selected.
 *
 * Allows editing document-level settings: canvas config, variables, metadata.
 */
import React, { memo, useState } from "react";
import { ScrollArea, Label, Input, Switch, Slider, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator } from "@ui-builder/ui";
import type { BuilderDocument, CanvasConfig } from "@ui-builder/builder-core";
import { FileText, Grid3X3, Ruler, Settings2, ChevronDown, ChevronRight } from "lucide-react";

export interface PageSettingsProps {
  document: BuilderDocument;
  onCanvasConfigChange: (key: keyof CanvasConfig, value: unknown) => void;
  onDocumentMetaChange?: (key: string, value: unknown) => void;
}

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {Icon && <Icon className="h-3 w-3" />}
        {title}
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

export const PageSettings = memo(function PageSettings({
  document: doc,
  onCanvasConfigChange,
  onDocumentMetaChange,
}: PageSettingsProps) {
  const config = doc.canvasConfig;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b">
        <p className="text-xs font-semibold">Page Settings</p>
        <p className="text-[10px] text-muted-foreground truncate">{doc.name}</p>
      </div>

      <ScrollArea className="flex-1">
        {/* Document info */}
        <CollapsibleSection title="Document" icon={FileText}>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Name</Label>
              <Input
                className="h-7 text-xs"
                value={doc.name}
                onChange={(e) => onDocumentMetaChange?.("name", e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Description</Label>
              <textarea
                className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                value={doc.description ?? ""}
                placeholder="Page description..."
                onChange={(e) => onDocumentMetaChange?.("description", e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Schema Version</Label>
              <Input
                className="h-7 text-xs font-mono"
                value={doc.schemaVersion}
                readOnly
                disabled
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Canvas config */}
        <CollapsibleSection title="Canvas" icon={Grid3X3}>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Width (px)</Label>
              <Input
                type="number"
                className="h-7 text-xs"
                value={config.width ?? ""}
                placeholder="Fluid"
                onChange={(e) =>
                  onCanvasConfigChange("width", e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[10px] text-muted-foreground">Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-7 w-10 rounded border border-input bg-background cursor-pointer"
                  value={config.backgroundColor ?? "#ffffff"}
                  onChange={(e) => onCanvasConfigChange("backgroundColor", e.target.value)}
                />
                <Input
                  className="h-7 text-xs flex-1 font-mono"
                  value={config.backgroundColor ?? "#ffffff"}
                  onChange={(e) => onCanvasConfigChange("backgroundColor", e.target.value)}
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Grid & Snap */}
        <CollapsibleSection title="Grid & Snap" icon={Ruler}>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Grid</Label>
              <Switch
                checked={config.showGrid}
                onCheckedChange={(v) => onCanvasConfigChange("showGrid", v)}
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Grid Size</Label>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {config.gridSize}px
                </span>
              </div>
              <Slider
                min={4}
                max={64}
                step={4}
                value={[config.gridSize]}
                onValueChange={([v]) => onCanvasConfigChange("gridSize", v)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label className="text-xs">Snap Enabled</Label>
              <Switch
                checked={config.snapEnabled}
                onCheckedChange={(v) => onCanvasConfigChange("snapEnabled", v)}
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Snap Threshold</Label>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {config.snapThreshold}px
                </span>
              </div>
              <Slider
                min={2}
                max={20}
                step={1}
                value={[config.snapThreshold]}
                onValueChange={([v]) => onCanvasConfigChange("snapThreshold", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Snap to Grid</Label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {config.showGrid ? "ON" : "OFF"}
                </span>
                <span className="text-[10px] text-muted-foreground opacity-60">(Auto)</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Snap to Components</Label>
              <Switch
                checked={config.snapToComponents}
                onCheckedChange={(v) => onCanvasConfigChange("snapToComponents", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show Ruler</Label>
              <Switch
                checked={config.rulerEnabled}
                onCheckedChange={(v) => onCanvasConfigChange("rulerEnabled", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Helper Lines</Label>
              <Switch
                checked={config.showHelperLines}
                onCheckedChange={(v) => onCanvasConfigChange("showHelperLines", v)}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Variables */}
        <CollapsibleSection title="Variables" icon={Settings2} defaultOpen={false}>
          <div className="space-y-2">
            {Object.keys(doc.variables ?? {}).length === 0 ? (
              <p className="text-xs text-muted-foreground">No variables defined.</p>
            ) : (
              Object.entries(doc.variables ?? {}).map(([key, varDef]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[10px] text-muted-foreground truncate flex-1">{key}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {String(varDef.defaultValue ?? "—")}
                  </span>
                </div>
              ))
            )}
          </div>
        </CollapsibleSection>
      </ScrollArea>
    </div>
  );
});
