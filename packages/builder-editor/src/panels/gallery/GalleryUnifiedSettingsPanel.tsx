/**
 * GalleryUnifiedSettingsPanel — panel duy nhất cho tất cả gallery nodes.
 *
 * 2 tabs:
 *   Layout  → visual mode picker (LayoutModeCard grid)
 *   Design  → thay đổi theo layoutMode:
 *               • carousel modes (slider/slideshow/carousel-3d) → CarouselDesign
 *               • gallery modes (còn lại)                       → GalleryDesign
 */
import React from "react";
import type { BuilderNode } from "@ui-builder/builder-core";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
  ScrollArea, Label, Slider, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  cn,
} from "@ui-builder/ui";
import {
  GALLERY_LAYOUT_MODES,
  type GalleryLayoutMode,
  CAROUSEL_PRESETS,
  DEFAULT_CAROUSEL_CONFIG,
  normalizeCarouselConfig,
  mergeCarouselConfig,
  type CarouselConfig,
} from "@ui-builder/shared";
import { LayoutModeCard } from "./LayoutMiniPreview";
import { CarouselPresetCard } from "./CarouselPreviewCard";
import { ColorSwatch } from "../../controls/color/ColorSwatch";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface GalleryUnifiedSettingsPanelProps {
  node: BuilderNode;
  /** Ghi các prop thông thường (layoutMode, columns, gap, …) */
  onPropChange: (props: Record<string, unknown>) => void;
  /** Ghi carouselConfig */
  onConfigChange: (partial: Partial<CarouselConfig>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAROUSEL_MODES = new Set<GalleryLayoutMode>(["slider", "slideshow", "carousel-3d"]);
// Chỉ các slideshow mode mới hiện Slide Style preset (carousel-3d tự xử lý effect riêng)
const SLIDE_STYLE_MODES = new Set<GalleryLayoutMode>(["slider", "slideshow"]);

// ── Carousel Design tab ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b last:border-b-0">
      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1.5">{title}</p>
      <div className="px-3 pb-3 space-y-2.5">{children}</div>
    </div>
  );
}

function Row({ label, children, tooltip }: { label: string; children: React.ReactNode; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 min-h-[22px]">
      <Label className="text-[10px] text-muted-foreground flex-1 shrink-0" title={tooltip}>{label}{tooltip && " ⓘ"}</Label>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Seg({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-md border overflow-hidden">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn("px-2 py-0.5 text-[10px] font-medium transition-colors", value === opt.value ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
        >{opt.label}</button>
      ))}
    </div>
  );
}

function ModuleRow({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between min-h-[22px]">
        <Label className="text-[10px] text-muted-foreground flex-1">{label}</Label>
        <Switch checked={checked} onCheckedChange={onChange} className="scale-75 origin-right" />
      </div>
      {checked && children && <div className="mt-2 ml-2 space-y-2.5">{children}</div>}
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 1, unit = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-muted-foreground">{label}</Label>
        <span className="text-[10px] font-medium">{value}{unit}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={vals => onChange(vals[0] ?? value)} />
    </div>
  );
}

function CarouselDesign({ node, onConfigChange }: { node: BuilderNode; onConfigChange: GalleryUnifiedSettingsPanelProps["onConfigChange"] }) {
  const cc = normalizeCarouselConfig(node.props["carouselConfig"]);

  const set = (partial: Partial<CarouselConfig>) => onConfigChange({ ...partial, presetId: undefined });
  const applyPreset = (preset: (typeof CAROUSEL_PRESETS)[number]) => {
    const merged = mergeCarouselConfig(DEFAULT_CAROUSEL_CONFIG, preset.config);
    onConfigChange({ ...merged, presetId: preset.id });
  };
  const setNav = (partial: Partial<CarouselConfig["navigation"]>) => set({ navigation: { ...cc.navigation, ...partial } });
  const setPag = (partial: Partial<CarouselConfig["pagination"]>) => set({ pagination: { ...cc.pagination, ...partial } });
  const setAuto = (partial: Partial<CarouselConfig["autoplay"]>) => set({ autoplay: { ...cc.autoplay, ...partial } });
  const setCoverflow = (partial: Partial<CarouselConfig["coverflowEffect"]>) => set({ coverflowEffect: { ...cc.coverflowEffect, ...partial } });
  const setCube = (partial: Partial<CarouselConfig["cubeEffect"]>) => set({ cubeEffect: { ...cc.cubeEffect, ...partial } });
  const setCards = (partial: Partial<CarouselConfig["cardsEffect"]>) => set({ cardsEffect: { ...cc.cardsEffect, ...partial } });

  return (
    <div className="pb-4">
      {/* Parameters */}
      <Section title="Parameters">
        <Row label="Direction">
          <Seg
            options={[{ label: "Horizontal", value: "horizontal" }, { label: "Vertical", value: "vertical" }]}
            value={cc.direction}
            onChange={v => set({ direction: v as "horizontal" | "vertical" })}
          />
        </Row>
        <Row label="Slides per view">
          <Select value={String(cc.slidesPerView)} onValueChange={v => set({ slidesPerView: parseFloat(v) })}>
            <SelectTrigger className="h-6 text-[10px] w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["1", "1.2", "1.5", "2", "2.5", "3", "4"].map(v => (
                <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Slides per scroll">
          <Select value={String(cc.slidesPerGroup)} onValueChange={v => set({ slidesPerGroup: parseInt(v) })}>
            <SelectTrigger className="h-6 text-[10px] w-16"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["1", "2", "3"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Grid rows">
          <Select value={String(cc.rows)} onValueChange={v => set({ rows: parseInt(v) })}>
            <SelectTrigger className="h-6 text-[10px] w-16"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["1", "2", "3", "4"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
        <SliderRow label="Space between" value={cc.spaceBetween} min={0} max={80} unit="px" onChange={v => set({ spaceBetween: v })} />
        <Row label="Aspect ratio">
          <Select value={cc.aspectRatio} onValueChange={v => set({ aspectRatio: v })}>
            <SelectTrigger className="h-6 text-[10px] w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[["16/9","16:9"],["4/3","4:3"],["1/1","1:1"],["3/4","3:4"],["21/9","21:9"]].map(([v, l]) => (
                <SelectItem key={v} value={v!} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <SliderRow label="Slide border radius" value={cc.slideRadius} min={0} max={48} unit="px" onChange={v => set({ slideRadius: v })} />
        <Row label="Loop">
          <Seg
            options={[{ label: "Off", value: "off" }, { label: "Loop", value: "loop" }, { label: "Rewind", value: "rewind" }]}
            value={cc.loopMode}
            onChange={v => set({ loopMode: v as "off" | "loop" | "rewind" })}
          />
        </Row>
        <Row label="Centered slides"><Switch checked={cc.centeredSlides} onCheckedChange={v => set({ centeredSlides: v })} className="scale-75 origin-right" /></Row>
        <Row label="Auto height"><Switch checked={cc.autoHeight} onCheckedChange={v => set({ autoHeight: v })} className="scale-75 origin-right" /></Row>
        <Row label="Grab cursor"><Switch checked={cc.grabCursor} onCheckedChange={v => set({ grabCursor: v })} className="scale-75 origin-right" /></Row>
        <Row label="Click to slide"><Switch checked={cc.slideToClickedSlide} onCheckedChange={v => set({ slideToClickedSlide: v })} className="scale-75 origin-right" /></Row>
      </Section>

      {/* Effect */}
      <Section title="Effect">
        <Row label="Effect">
          <Select value={cc.effect} onValueChange={v => set({ effect: v as CarouselConfig["effect"] })}>
            <SelectTrigger className="h-6 text-[10px] w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[["slide","Slide"],["fade","Fade"],["cube","Cube"],["flip","Flip"],["cards","Cards"],["coverflow","Coverflow"],["creative","Creative"]].map(([v, l]) => (
                <SelectItem key={v} value={v!} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <SliderRow label="Transition duration" value={cc.speed} min={100} max={2000} step={50} unit="ms" onChange={v => set({ speed: v })} />
        {cc.effect === "fade" && (
          <Row label="Cross-fade"><Switch checked={cc.fadeCrossFade} onCheckedChange={v => set({ fadeCrossFade: v })} className="scale-75 origin-right" /></Row>
        )}
        {cc.effect === "coverflow" && (<>
          <SliderRow label="Rotate" value={cc.coverflowEffect.rotate} min={0} max={90} onChange={v => setCoverflow({ rotate: v })} />
          <SliderRow label="Depth" value={cc.coverflowEffect.depth} min={0} max={500} onChange={v => setCoverflow({ depth: v })} />
          <SliderRow label="Scale" value={cc.coverflowEffect.scale} min={0.5} max={1.2} step={0.05} onChange={v => setCoverflow({ scale: v })} />
          <SliderRow label="Stretch" value={cc.coverflowEffect.stretch} min={0} max={200} onChange={v => setCoverflow({ stretch: v })} />
          <Row label="Slide shadows"><Switch checked={cc.coverflowEffect.slideShadows} onCheckedChange={v => setCoverflow({ slideShadows: v })} className="scale-75 origin-right" /></Row>
        </>)}
        {cc.effect === "cube" && (<>
          <Row label="Shadow"><Switch checked={cc.cubeEffect.shadow} onCheckedChange={v => setCube({ shadow: v })} className="scale-75 origin-right" /></Row>
          <Row label="Slide shadows"><Switch checked={cc.cubeEffect.slideShadows} onCheckedChange={v => setCube({ slideShadows: v })} className="scale-75 origin-right" /></Row>
        </>)}
        {cc.effect === "flip" && (
          <Row label="Slide shadows"><Switch checked={cc.flipSlideShadows} onCheckedChange={v => set({ flipSlideShadows: v })} className="scale-75 origin-right" /></Row>
        )}
        {cc.effect === "cards" && (<>
          <Row label="Rotate cards"><Switch checked={cc.cardsEffect.rotate} onCheckedChange={v => setCards({ rotate: v })} className="scale-75 origin-right" /></Row>
          <Row label="Slide shadows"><Switch checked={cc.cardsEffect.slideShadows} onCheckedChange={v => setCards({ slideShadows: v })} className="scale-75 origin-right" /></Row>
          <SliderRow label="Offset per slide" value={cc.cardsEffect.perSlideOffset} min={0} max={30} onChange={v => setCards({ perSlideOffset: v })} />
          <SliderRow label="Rotate per slide" value={cc.cardsEffect.perSlideRotate} min={0} max={15} step={0.5} onChange={v => setCards({ perSlideRotate: v })} />
        </>)}
      </Section>

      {/* Navigation */}
      <Section title="Navigation">
        <ModuleRow label="Navigation arrows" checked={cc.navigation.enabled} onChange={v => setNav({ enabled: v })}>
          <Row label="Color">
            <ColorSwatch value={cc.navigation.color} onChange={v => setNav({ color: v })} />
          </Row>
          <Row label="Placement">
            <Seg options={[{ label: "Inside", value: "inside" }, { label: "Outside", value: "outside" }]} value={cc.navigation.placement} onChange={v => setNav({ placement: v as "inside" | "outside" })} />
          </Row>
          <SliderRow label="Size" value={cc.navigation.size} min={24} max={80} unit="px" onChange={v => setNav({ size: v })} />
          <SliderRow label="Offset" value={cc.navigation.offset} min={0} max={40} unit="px" onChange={v => setNav({ offset: v })} />
          <Row label="Hide on click"><Switch checked={cc.navigation.hideOnClick} onCheckedChange={v => setNav({ hideOnClick: v })} className="scale-75 origin-right" /></Row>
        </ModuleRow>
      </Section>

      {/* Pagination */}
      <Section title="Pagination">
        <ModuleRow label="Pagination" checked={cc.pagination.enabled} onChange={v => setPag({ enabled: v })}>
          <Row label="Type">
            <Seg options={[{ label: "Bullets", value: "bullets" }, { label: "Progress", value: "progressbar" }, { label: "1/N", value: "fraction" }]} value={cc.pagination.type} onChange={v => setPag({ type: v as CarouselConfig["pagination"]["type"] })} />
          </Row>
          <Row label="Color">
            <ColorSwatch value={cc.pagination.color} onChange={v => setPag({ color: v })} />
          </Row>
          <Row label="Placement">
            <Seg options={[{ label: "Inside", value: "inside" }, { label: "Outside", value: "outside" }]} value={cc.pagination.placement} onChange={v => setPag({ placement: v as "inside" | "outside" })} />
          </Row>
          <SliderRow label="Offset" value={cc.pagination.offset} min={0} max={40} unit="px" onChange={v => setPag({ offset: v })} />
          <Row label="Hide on click"><Switch checked={cc.pagination.hideOnClick} onCheckedChange={v => setPag({ hideOnClick: v })} className="scale-75 origin-right" /></Row>
          {cc.pagination.type === "bullets" && (<>
            <SliderRow label="Bullet size" value={cc.pagination.bulletSize} min={4} max={24} unit="px" onChange={v => setPag({ bulletSize: v })} />
            <SliderRow label="Bullet gap" value={cc.pagination.bulletGap} min={2} max={24} unit="px" onChange={v => setPag({ bulletGap: v })} />
            <Row label="Dynamic bullets"><Switch checked={cc.pagination.dynamicBullets} onCheckedChange={v => setPag({ dynamicBullets: v })} className="scale-75 origin-right" /></Row>
            <Row label="Clickable"><Switch checked={cc.pagination.clickable} onCheckedChange={v => setPag({ clickable: v })} className="scale-75 origin-right" /></Row>
          </>)}
          {cc.pagination.type === "progressbar" && (
            <SliderRow label="Bar size" value={cc.pagination.progressbarSize} min={2} max={16} unit="px" onChange={v => setPag({ progressbarSize: v })} />
          )}
        </ModuleRow>
      </Section>

      {/* Autoplay */}
      <Section title="Autoplay">
        <ModuleRow label="Autoplay" checked={cc.autoplay.enabled} onChange={v => setAuto({ enabled: v })}>
          <SliderRow label="Delay" value={cc.autoplay.delay} min={500} max={10000} step={250} unit="ms" onChange={v => setAuto({ delay: v })} />
          <Row label="Stop on drag"><Switch checked={cc.autoplay.stopOnInteraction} onCheckedChange={v => setAuto({ stopOnInteraction: v })} className="scale-75 origin-right" /></Row>
          <Row label="Pause on hover"><Switch checked={cc.autoplay.pauseOnMouseEnter} onCheckedChange={v => setAuto({ pauseOnMouseEnter: v })} className="scale-75 origin-right" /></Row>
          <Row label="Reverse direction"><Switch checked={cc.autoplay.reverseDirection} onCheckedChange={v => setAuto({ reverseDirection: v })} className="scale-75 origin-right" /></Row>
        </ModuleRow>
      </Section>

      {/* Modules */}
      <Section title="Modules">
        <ModuleRow label="Free mode" checked={cc.freeMode} onChange={v => set({ freeMode: v })}>
          <Row label="Sticky"><Switch checked={cc.freeModeSticky} onCheckedChange={v => set({ freeModeSticky: v })} className="scale-75 origin-right" /></Row>
        </ModuleRow>
        <Row label="Keyboard control"><Switch checked={cc.keyboard} onCheckedChange={v => set({ keyboard: v })} className="scale-75 origin-right" /></Row>
        <Row label="Mousewheel"><Switch checked={cc.mousewheel} onCheckedChange={v => set({ mousewheel: v })} className="scale-75 origin-right" /></Row>
        <ModuleRow label="Scrollbar" checked={cc.scrollbar} onChange={v => set({ scrollbar: v })}>
          <Row label="Draggable"><Switch checked={cc.scrollbarDraggable} onCheckedChange={v => set({ scrollbarDraggable: v })} className="scale-75 origin-right" /></Row>
        </ModuleRow>
        <Row label="Parallax"><Switch checked={cc.parallax} onCheckedChange={v => set({ parallax: v })} className="scale-75 origin-right" /></Row>
        <Row label="Lazy loading"><Switch checked={cc.lazyLoad} onCheckedChange={v => set({ lazyLoad: v })} className="scale-75 origin-right" /></Row>
        <Row label="Accessibility"><Switch checked={cc.accessibility} onCheckedChange={v => set({ accessibility: v })} className="scale-75 origin-right" /></Row>
        <ModuleRow label="Zoom" checked={cc.zoom} onChange={v => set({ zoom: v })}>
          <SliderRow label="Max zoom" value={cc.zoomMax} min={1.5} max={6} step={0.5} onChange={v => set({ zoomMax: v })} />
        </ModuleRow>
      </Section>
    </div>
  );
}

// ── Gallery Design tab ────────────────────────────────────────────────────────

function GalleryDesign({ node, layoutMode, onPropChange }: { node: BuilderNode; layoutMode: GalleryLayoutMode; onPropChange: GalleryUnifiedSettingsPanelProps["onPropChange"] }) {
  const p = node.props;
  const needsColumns = ["grid", "masonry", "honeycomb", "bricks", "collage", "freestyle"].includes(layoutMode);
  const needsAspect  = ["grid", "collage", "bricks"].includes(layoutMode);

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
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[["1/1","1:1"],["4/3","4:3"],["16/9","16:9"],["3/4","3:4 Portrait"],["2/1","2:1 Wide"]].map(([v, l]) => (
                <SelectItem key={v} value={v!} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Image Fit</Label>
        <Select value={String(p["imageFit"] ?? "cover")} onValueChange={(v) => onPropChange({ imageFit: v })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
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

export function GalleryUnifiedSettingsPanel({ node, onPropChange, onConfigChange }: GalleryUnifiedSettingsPanelProps) {
  const layoutMode = (node.props["layoutMode"] as GalleryLayoutMode) ?? "grid";
  const isCarouselMode = CAROUSEL_MODES.has(layoutMode);
  const galleryModes   = GALLERY_LAYOUT_MODES.filter((m) => m.group === "gallery");
  const slideshowModes = GALLERY_LAYOUT_MODES.filter((m) => m.group === "slideshow");
  const creativeModes  = GALLERY_LAYOUT_MODES.filter((m) => m.group === "creative");

  return (
    <Tabs defaultValue="layout" className="w-full">
      <TabsList className="grid grid-cols-2 w-full rounded-none border-b h-8 bg-transparent">
        <TabsTrigger value="layout" className="text-xs h-full rounded-none">Layout</TabsTrigger>
        <TabsTrigger value="design" className="text-xs h-full rounded-none">Design</TabsTrigger>
      </TabsList>

      {/* ── Layout tab ────────────────────────────────────────────────────── */}
      <TabsContent value="layout" className="m-0">
        <ScrollArea className="h-[480px]">
          <div className="p-2 space-y-3">
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">Gallery</p>
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
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">Slideshow</p>
              {/* layout modes (Slider, Slideshow, Thumbnails) + presets (Basic, Fade, Peek…) — tất cả ngang hàng */}
              <div className="grid grid-cols-2 gap-1.5">
                {slideshowModes.map((mode) => {
                  const cc = normalizeCarouselConfig(node.props["carouselConfig"]);
                  // layout mode card selected: đang ở mode này VÀ không có preset nào active
                  const isSel = layoutMode === mode.value && !cc.presetId;
                  return (
                    <LayoutModeCard
                      key={mode.value}
                      mode={mode}
                      selected={isSel}
                      onClick={() => {
                        onPropChange({ layoutMode: mode.value });
                        onConfigChange({ presetId: undefined });
                      }}
                    />
                  );
                })}
                {(() => {
                  const cc = normalizeCarouselConfig(node.props["carouselConfig"]);
                  return CAROUSEL_PRESETS.map(preset => (
                    <CarouselPresetCard
                      key={preset.id}
                      preset={preset}
                      selected={isCarouselMode && cc.presetId === preset.id}
                      onClick={() => {
                        const merged = mergeCarouselConfig(DEFAULT_CAROUSEL_CONFIG, preset.config);
                        onPropChange({ layoutMode: "slider" });
                        onConfigChange({ ...merged, presetId: preset.id });
                      }}
                    />
                  ));
                })()}
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

      {/* ── Design tab — nội dung thay đổi theo loại mode ─────────────────── */}
      <TabsContent value="design" className="m-0">
        <ScrollArea className="h-[480px]">
          {isCarouselMode ? (
            <CarouselDesign node={node} onConfigChange={onConfigChange} />
          ) : (
            <GalleryDesign node={node} layoutMode={layoutMode} onPropChange={onPropChange} />
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
