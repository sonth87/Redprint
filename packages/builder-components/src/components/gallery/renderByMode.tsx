// ── renderByMode — dispatches to the correct layout renderer ─────────────────
import React from "react";
import type { GalleryItem, GalleryLayoutMode, CarouselConfig } from "@ui-builder/shared";
import type { GalleryProps } from "./types";
import {
  renderGrid,
  renderMasonry,
  renderCollage,
  renderStrip,
  renderColumn,
  renderBricks,
  renderHoneycomb,
  renderFreestyle,
  renderStacked,
} from "./GridLayouts";
import {
  SliderEditorPreview,
  SlideshowEditorPreview,
  ThumbnailsEditorPreview,
  Carousel3DEditorPreview,
} from "./EditorPreviews";
import { SwiperSliderRuntime } from "./SwiperRuntime";
import { ThumbnailsRuntime } from "./ThumbnailsRuntime";

export function renderByMode(
  mode: GalleryLayoutMode,
  items: GalleryItem[],
  p: GalleryProps,
  cc: CarouselConfig,
  isEditor: boolean,
  _style?: React.CSSProperties,
): React.ReactElement {
  switch (mode) {
    case "grid":
      return renderGrid(items, p);
    case "masonry":
      return renderMasonry(items, p);
    case "collage":
      return renderCollage(items, p);
    case "strip":
      return renderStrip(items, p);
    case "column":
      return renderColumn(items, p);
    case "bricks":
      return renderBricks(items, p);
    case "honeycomb":
      return renderHoneycomb(items, p);
    case "freestyle":
      return renderFreestyle(items, p);
    case "stacked":
      return renderStacked(items, p);
    case "slider":
      return isEditor ? (
        <SliderEditorPreview items={items} p={p} cc={cc} />
      ) : (
        <SwiperSliderRuntime items={items} p={p} cc={cc} isEditor={false} />
      );
    case "slideshow":
      return isEditor ? (
        <SlideshowEditorPreview items={items} p={p} />
      ) : (
        <SwiperSliderRuntime items={items} p={p} cc={cc} isEditor={false} />
      );
    case "thumbnails":
      return isEditor ? (
        <ThumbnailsEditorPreview items={items} p={p} />
      ) : (
        <ThumbnailsRuntime items={items} p={p} />
      );
    case "carousel-3d":
      return isEditor ? (
        <Carousel3DEditorPreview items={items} p={p} />
      ) : (
        <SwiperSliderRuntime items={items} p={p} cc={cc} isEditor={false} />
      );
    default:
      return renderGrid(items, p);
  }
}
