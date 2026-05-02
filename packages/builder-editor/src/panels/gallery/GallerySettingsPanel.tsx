/**
 * GallerySettingsPanel — FloatingPanel content for configuring a GalleryPro node.
 *
 * Rendered inside FloatingPanel (same pattern as ImageFramePanel).
 * Three tabs:
 *   Layout   → visual layout mode picker (uses LayoutModeCard from LayoutMiniPreview)
 *   Settings → layout-specific controls (columns, gap, aspect ratio, autoplay, etc.)
 *   Design   → image fit, border radius
 */
import React from "react";
import type { BuilderNode } from "@ui-builder/builder-core";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
  ScrollArea, Label, Slider, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@ui-builder/ui";
import {
  GALLERY_LAYOUT_MODES,
  type GalleryLayoutMode,
} from "@ui-builder/shared";
import { LayoutModeCard } from "./LayoutMiniPreview";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GallerySettingsPanelProps {
  node: BuilderNode;
  onPropChange: (props: Record<string, unknown>) => void;
}

// ── GalleryLayoutSettings (Settings tab) ─────────────────────────────────────

function GalleryLayoutSettings({ layoutMode, node, onPropChange }: {
  layoutMode: GalleryLayoutMode;
  node: BuilderNode;
  onPropChange: (props: Record<string, unknown>) => void;
}) {
  const p = node.props;

  const needsColumns = ["grid", "masonry", "honeycomb", "bricks", "collage", "freestyle"].includes(layoutMode);
  const needsAspect  = ["grid", "collage", "bricks", "slider"].includes(layoutMode);
  const needsCarousel = ["slider", "slideshow", "carousel-3d"].includes(layoutMode);

  return (
    <div className="p-3 space-y-3">
      {needsColumns && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Columns</Label>
            <span className="text-[10px] font-medium">{Number(p["columns"] ?? 3)}</span>
          </div>
          <Slider
            min={1} max={6} step={1}
            value={[Number(p["columns"] ?? 3)]}
            onValueChange={(vals) => onPropChange({ columns: vals[0] })}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground">Gap</Label>
          <span className="text-[10px] font-medium">{Number(p["gap"] ?? 12)}px</span>
        </div>
        <Slider
          min={0} max={60} step={2}
          value={[Number(p["gap"] ?? 12)]}
          onValueChange={(vals) => onPropChange({ gap: vals[0] })}
        />
      </div>

      {needsAspect && (
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Aspect Ratio</Label>
          <Select value={String(p["aspectRatio"] ?? "1/1")} onValueChange={(v) => onPropChange({ aspectRatio: v })}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[["1/1","1:1 Square"],["4/3","4:3"],["16/9","16:9"],["3/4","3:4 Portrait"],["2/1","2:1 Wide"]].map(([v, l]) => (
                <SelectItem key={v} value={v!} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {needsCarousel && (
        <>
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Auto Play</Label>
            <Switch
              checked={Boolean(p["autoPlay"])}
              onCheckedChange={(v) => onPropChange({ autoPlay: v })}
              className="scale-75"
            />
          </div>
          {Boolean(p["autoPlay"]) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Speed</Label>
                <span className="text-[10px] font-medium">{Number(p["autoPlaySpeed"] ?? 3000) / 1000}s</span>
              </div>
              <Slider
                min={1000} max={10000} step={500}
                value={[Number(p["autoPlaySpeed"] ?? 3000)]}
                onValueChange={(vals) => onPropChange({ autoPlaySpeed: vals[0] })}
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Loop</Label>
            <Switch
              checked={p["loop"] !== false}
              onCheckedChange={(v) => onPropChange({ loop: v })}
              className="scale-75"
            />
          </div>
          {layoutMode !== "carousel-3d" && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Show Arrows</Label>
                <Switch
                  checked={p["showArrows"] !== false}
                  onCheckedChange={(v) => onPropChange({ showArrows: v })}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Show Dots</Label>
                <Switch
                  checked={p["showDots"] !== false}
                  onCheckedChange={(v) => onPropChange({ showDots: v })}
                  className="scale-75"
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── GalleryDesignSettings (Design tab) ───────────────────────────────────────

function GalleryDesignSettings({ node, onPropChange }: { node: BuilderNode; onPropChange: (props: Record<string, unknown>) => void }) {
  const p = node.props;
  return (
    <div className="p-3 space-y-3">
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Image Fit</Label>
        <Select value={String(p["imageFit"] ?? "cover")} onValueChange={(v) => onPropChange({ imageFit: v })}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover" className="text-xs">Cover (crop to fill)</SelectItem>
            <SelectItem value="contain" className="text-xs">Contain (letterbox)</SelectItem>
            <SelectItem value="fill" className="text-xs">Fill (stretch)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground">Border Radius</Label>
          <span className="text-[10px] font-medium">{Number(p["borderRadius"] ?? 4)}px</span>
        </div>
        <Slider
          min={0} max={32} step={1}
          value={[Number(p["borderRadius"] ?? 4)]}
          onValueChange={(vals) => onPropChange({ borderRadius: vals[0] })}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GallerySettingsPanel({ node, onPropChange }: GallerySettingsPanelProps) {
  const layoutMode = (node.props["layoutMode"] as GalleryLayoutMode) ?? "grid";
  const standardModes = GALLERY_LAYOUT_MODES.filter((m) => m.group === "standard");
  const creativeModes = GALLERY_LAYOUT_MODES.filter((m) => m.group === "creative");

  return (
    <Tabs defaultValue="layout" className="w-full">
      <TabsList className="grid grid-cols-3 w-full rounded-none border-b h-8 bg-transparent">
        <TabsTrigger value="layout" className="text-xs h-full rounded-none">Layout</TabsTrigger>
        <TabsTrigger value="settings" className="text-xs h-full rounded-none">Settings</TabsTrigger>
        <TabsTrigger value="design" className="text-xs h-full rounded-none">Design</TabsTrigger>
      </TabsList>

      <TabsContent value="layout" className="m-0">
        <ScrollArea className="h-[420px]">
          <div className="p-2 space-y-3">
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">Standard</p>
              <div className="grid grid-cols-2 gap-1.5">
                {standardModes.map((mode) => (
                  <LayoutModeCard
                    key={mode.value}
                    mode={mode}
                    selected={layoutMode === mode.value}
                    onClick={() => onPropChange({ layoutMode: mode.value })}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">Creative</p>
              <div className="grid grid-cols-2 gap-1.5">
                {creativeModes.map((mode) => (
                  <LayoutModeCard
                    key={mode.value}
                    mode={mode}
                    selected={layoutMode === mode.value}
                    onClick={() => onPropChange({ layoutMode: mode.value })}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="settings" className="m-0">
        <ScrollArea className="h-[420px]">
          <GalleryLayoutSettings layoutMode={layoutMode} node={node} onPropChange={onPropChange} />
        </ScrollArea>
      </TabsContent>

      <TabsContent value="design" className="m-0">
        <ScrollArea className="h-[420px]">
          <GalleryDesignSettings node={node} onPropChange={onPropChange} />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
