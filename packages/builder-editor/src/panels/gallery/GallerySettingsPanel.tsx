/**
 * GallerySettingsPanel — FloatingPanel content for configuring a GalleryPro node.
 *
 * Two tabs:
 *   Layout → visual layout mode picker split into Gallery / Carousel sections
 *   Design → all controls: columns, gap, aspect ratio, auto play, image fit, border radius
 */
import React from "react";
import { useTranslation } from "react-i18next";
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

// ── Constants ─────────────────────────────────────────────────────────────────

const CAROUSEL_MODES: GalleryLayoutMode[] = ["slider", "slideshow", "thumbnails", "carousel-3d"];
const ASPECT_RATIO_OPTIONS = ["1/1", "4/3", "16/9", "3/4", "2/1"] as const;

// ── GalleryDesignControls ─────────────────────────────────────────────────────

function GalleryDesignControls({
  layoutMode,
  node,
  onPropChange,
}: {
  layoutMode: GalleryLayoutMode;
  node: BuilderNode;
  onPropChange: (props: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation();
  const p = node.props;

  const isCarousel = CAROUSEL_MODES.includes(layoutMode);
  const needsColumns = !isCarousel && ["grid", "masonry", "honeycomb", "bricks", "collage", "freestyle"].includes(layoutMode);
  const needsAspect = ["grid", "collage", "bricks", "slider", "slideshow"].includes(layoutMode);

  return (
    <div className="p-3 space-y-4">
      {/* ── Gallery section ── */}
      {(needsColumns || needsAspect) && (
        <div className="space-y-3">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("galleryPanel.sections.gallery")}
          </p>

          {needsColumns && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.columns")}</Label>
                <span className="text-[10px] font-medium">{Number(p["columns"] ?? 3)}</span>
              </div>
              <Slider
                min={1} max={6} step={1}
                value={[Number(p["columns"] ?? 3)]}
                onValueChange={(vals) => onPropChange({ columns: vals[0] })}
              />
            </div>
          )}

          {needsAspect && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.aspectRatio")}</Label>
              <Select
                value={String(p["aspectRatio"] ?? "1/1")}
                onValueChange={(v) => onPropChange({ aspectRatio: v })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIO_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v} className="text-xs">
                      {t(`galleryPanel.design.aspectRatioOptions.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* ── Carousel section ── */}
      {isCarousel && (
        <div className="space-y-3">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("galleryPanel.sections.carousel")}
          </p>

          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.autoPlay")}</Label>
            <Switch
              checked={Boolean(p["autoPlay"])}
              onCheckedChange={(v) => onPropChange({ autoPlay: v })}
              className="scale-75"
            />
          </div>

          {Boolean(p["autoPlay"]) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.speed")}</Label>
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
            <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.loop")}</Label>
            <Switch
              checked={p["loop"] !== false}
              onCheckedChange={(v) => onPropChange({ loop: v })}
              className="scale-75"
            />
          </div>

          {layoutMode !== "carousel-3d" && layoutMode !== "thumbnails" && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.arrows")}</Label>
                <Switch
                  checked={p["showArrows"] !== false}
                  onCheckedChange={(v) => onPropChange({ showArrows: v })}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.dots")}</Label>
                <Switch
                  checked={p["showDots"] !== false}
                  onCheckedChange={(v) => onPropChange({ showDots: v })}
                  className="scale-75"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Divider ── */}
      {(needsColumns || needsAspect || isCarousel) && (
        <div className="border-t border-border/50" />
      )}

      {/* ── Common design ── */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.gap")}</Label>
            <span className="text-[10px] font-medium">{Number(p["gap"] ?? 12)}px</span>
          </div>
          <Slider
            min={0} max={60} step={2}
            value={[Number(p["gap"] ?? 12)]}
            onValueChange={(vals) => onPropChange({ gap: vals[0] })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.imageFit")}</Label>
          <Select
            value={String(p["imageFit"] ?? "cover")}
            onValueChange={(v) => onPropChange({ imageFit: v })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["cover", "contain", "fill"] as const).map((v) => (
                <SelectItem key={v} value={v} className="text-xs">
                  {t(`galleryPanel.design.imageFitOptions.${v}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">{t("galleryPanel.design.borderRadius")}</Label>
            <span className="text-[10px] font-medium">{Number(p["borderRadius"] ?? 4)}px</span>
          </div>
          <Slider
            min={0} max={32} step={1}
            value={[Number(p["borderRadius"] ?? 4)]}
            onValueChange={(vals) => onPropChange({ borderRadius: vals[0] })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GallerySettingsPanel({ node, onPropChange }: GallerySettingsPanelProps) {
  const { t } = useTranslation();
  const layoutMode = (node.props["layoutMode"] as GalleryLayoutMode) ?? "grid";

  const galleryModes = GALLERY_LAYOUT_MODES.filter((m) => !CAROUSEL_MODES.includes(m.value));
  const carouselModes = GALLERY_LAYOUT_MODES.filter((m) => CAROUSEL_MODES.includes(m.value));

  return (
    <Tabs defaultValue="layout" className="w-full">
      <TabsList className="grid grid-cols-2 w-full rounded-none border-b h-8 bg-transparent">
        <TabsTrigger value="layout" className="text-xs h-full rounded-none">
          {t("galleryPanel.tabs.layout")}
        </TabsTrigger>
        <TabsTrigger value="design" className="text-xs h-full rounded-none">
          {t("galleryPanel.tabs.design")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="layout" className="m-0">
        <ScrollArea className="h-[420px]">
          <div className="p-2 space-y-3">
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
                {t("galleryPanel.sections.gallery")}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {galleryModes.map((mode) => (
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
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
                {t("galleryPanel.sections.carousel")}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {carouselModes.map((mode) => (
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

      <TabsContent value="design" className="m-0">
        <ScrollArea className="h-[420px]">
          <GalleryDesignControls layoutMode={layoutMode} node={node} onPropChange={onPropChange} />
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

