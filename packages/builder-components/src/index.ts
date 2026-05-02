// Component definitions — individual named exports
export { TextComponent } from "./components/Text";
export { ButtonComponent } from "./components/Button";
export { ContainerComponent } from "./components/Container";
export { ImageComponent } from "./components/Image";
export { DividerComponent } from "./components/Divider";
export { SectionComponent } from "./components/Section";
export { GridComponent } from "./components/Grid";
export { ColumnComponent } from "./components/Column";
export { RowComponent } from "./components/Row";
export { TextMarqueeComponent } from "./components/TextMarquee";
export { CollapsibleTextComponent } from "./components/CollapsibleText";
export { TextMaskComponent } from "./components/TextMask";
export { GalleryGridComponent } from "./components/GalleryGrid";
export { GallerySliderComponent } from "./components/GallerySlider";
export { GalleryProComponent } from "./components/gallery";
export { ShapeComponent } from "./components/Shape";
export { NavigationMenuComponent } from "./components/NavigationMenu";
export { RepeaterComponent } from "./components/Repeater";
export { AnchorComponent } from "./components/Anchor";

// Utility
export { extendComponent } from "./utils/extendComponent";

// Re-export defineComponent for convenience
export { defineComponent } from "@ui-builder/builder-core";

// ── Aggregated component array ────────────────────────────────────────────────

import type { ComponentDefinition } from "@ui-builder/builder-core";
import { SectionComponent } from "./components/Section";
import { ContainerComponent } from "./components/Container";
import { GridComponent } from "./components/Grid";
import { ColumnComponent } from "./components/Column";
import { RowComponent } from "./components/Row";
import { TextComponent } from "./components/Text";
import { ButtonComponent } from "./components/Button";
import { ImageComponent } from "./components/Image";
import { DividerComponent } from "./components/Divider";
import { TextMarqueeComponent } from "./components/TextMarquee";
import { CollapsibleTextComponent } from "./components/CollapsibleText";
import { TextMaskComponent } from "./components/TextMask";
import { GalleryProComponent } from "./components/gallery";
import { ShapeComponent } from "./components/Shape";
import { NavigationMenuComponent } from "./components/NavigationMenu";
import { RepeaterComponent } from "./components/Repeater";
import { AnchorComponent } from "./components/Anchor";
import { extendComponent } from "./utils/extendComponent";
import { DEFAULT_GALLERY_ITEMS } from "@ui-builder/shared";

// ── Gallery variants (all share GalleryPro engine, different default layoutMode) ──

// ── Standard gallery variants ─────────────────────────────────────────────────

export const GalleryMasonryComponent: ComponentDefinition = extendComponent(GalleryProComponent, {
  type: "GalleryMasonry",
  name: "Gallery Masonry",
  subGroup: "gallery-standard",
  description: "Pinterest-style masonry layout with varying heights.",
  tags: ["gallery", "masonry", "pinterest", "photos"],
  defaultProps: { ...GalleryProComponent.defaultProps, layoutMode: "masonry", columns: 3 },
});

export const GalleryCollageComponent: ComponentDefinition = extendComponent(GalleryProComponent, {
  type: "GalleryCollage",
  name: "Gallery Collage",
  subGroup: "gallery-standard",
  description: "Mosaic collage with featured first image spanning 2×2.",
  tags: ["gallery", "collage", "mosaic", "featured"],
  defaultProps: { ...GalleryProComponent.defaultProps, layoutMode: "collage" },
});

export const GalleryThumbnailsComponent: ComponentDefinition = extendComponent(GalleryProComponent, {
  type: "GalleryThumbnails",
  name: "Gallery Thumbnails",
  subGroup: "gallery-standard",
  description: "Main image with filmstrip thumbnail strip.",
  tags: ["gallery", "thumbnails", "filmstrip", "preview"],
  defaultProps: { ...GalleryProComponent.defaultProps, layoutMode: "thumbnails" },
});

// ── Slide & Carousel variants ─────────────────────────────────────────────────

export const GallerySliderProComponent: ComponentDefinition = extendComponent(GalleryProComponent, {
  type: "GallerySliderPro",
  name: "Gallery Slider",
  subGroup: "gallery-slides",
  description: "Horizontal slider carousel with arrows and dots.",
  tags: ["gallery", "slider", "carousel", "slideshow"],
  defaultProps: { ...GalleryProComponent.defaultProps, layoutMode: "slider", aspectRatio: "16/9", showArrows: true, showDots: true },
});

export const GallerySlideshowComponent: ComponentDefinition = extendComponent(GalleryProComponent, {
  type: "GallerySlideshow",
  name: "Gallery Slideshow",
  subGroup: "gallery-slides",
  description: "Full-bleed autoplay slideshow presentation.",
  tags: ["gallery", "slideshow", "fullscreen", "autoplay"],
  defaultProps: { ...GalleryProComponent.defaultProps, layoutMode: "slideshow", autoPlay: true, autoPlaySpeed: 4000 },
});

// ── Creative gallery variants ─────────────────────────────────────────────────

export const GalleryHoneycombComponent: ComponentDefinition = extendComponent(GalleryProComponent, {
  type: "GalleryHoneycomb",
  name: "Gallery Honeycomb",
  subGroup: "gallery-creative",
  description: "Hexagonal honeycomb grid — images clipped to hex shapes.",
  tags: ["gallery", "honeycomb", "hexagon", "creative"],
  defaultProps: { ...GalleryProComponent.defaultProps, layoutMode: "honeycomb", columns: 4 },
});

export const GalleryFreestyleComponent: ComponentDefinition = extendComponent(GalleryProComponent, {
  type: "GalleryFreestyle",
  name: "Gallery Freestyle",
  subGroup: "gallery-creative",
  description: "Images scattered with random rotation — like photos on a table.",
  tags: ["gallery", "freestyle", "scattered", "creative", "random"],
  defaultProps: { ...GalleryProComponent.defaultProps, layoutMode: "freestyle", columns: 3, items: DEFAULT_GALLERY_ITEMS.slice(0, 5) },
});

export const Gallery3DCarouselComponent: ComponentDefinition = extendComponent(GalleryProComponent, {
  type: "Gallery3DCarousel",
  name: "Gallery 3D Carousel",
  subGroup: "gallery-creative",
  description: "3D perspective coverflow carousel effect.",
  tags: ["gallery", "3d", "carousel", "coverflow", "creative"],
  defaultProps: { ...GalleryProComponent.defaultProps, layoutMode: "carousel-3d" },
});

export const GalleryStackedComponent: ComponentDefinition = extendComponent(GalleryProComponent, {
  type: "GalleryStacked",
  name: "Gallery Stacked",
  subGroup: "gallery-creative",
  description: "Card stack with depth and rotation — fan out effect.",
  tags: ["gallery", "stacked", "cards", "depth", "creative"],
  defaultProps: { ...GalleryProComponent.defaultProps, layoutMode: "stacked", items: DEFAULT_GALLERY_ITEMS.slice(0, 5) },
});

export const BASE_COMPONENTS: ComponentDefinition[] = [
  SectionComponent,
  ContainerComponent,
  GridComponent,
  ColumnComponent,
  RowComponent,
  TextComponent,
  ButtonComponent,
  ImageComponent,
  DividerComponent,
  TextMarqueeComponent,
  CollapsibleTextComponent,
  TextMaskComponent,
  // Gallery — unified engine, multiple palette variants
  GalleryProComponent,
  GalleryMasonryComponent,
  GalleryCollageComponent,
  GallerySliderProComponent,
  GallerySlideshowComponent,
  GalleryThumbnailsComponent,
  GalleryHoneycombComponent,
  GalleryFreestyleComponent,
  Gallery3DCarouselComponent,
  GalleryStackedComponent,
  // Legacy (deprecated) — kept in registry for backward compatibility with existing documents
  // but NOT shown in palette (excluded from BASE_COMPONENTS display)
  // GalleryGridComponent, GallerySliderComponent — still importable, just not in palette
  ShapeComponent,
  NavigationMenuComponent,
  RepeaterComponent,
  AnchorComponent,
];
