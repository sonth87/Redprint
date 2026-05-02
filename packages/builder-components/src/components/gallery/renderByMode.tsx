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
} from "./renderLayouts";
import { SwiperSliderRuntime } from "./SwiperSliderRuntime";
import { ThumbnailsEditorPreview } from "./ThumbnailsEditorPreview";
import { ThumbnailsRuntime } from "./ThumbnailsRuntime";

export function renderByMode(
  mode: GalleryLayoutMode,
  items: GalleryItem[],
  p: GalleryProps,
  cc: CarouselConfig,
  isEditor: boolean,
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
    case "slideshow":
    case "carousel-3d":
      return <SwiperSliderRuntime items={items} p={p} cc={cc} isEditor={isEditor} />;
    case "thumbnails":
      return isEditor ? (
        <ThumbnailsEditorPreview items={items} p={p} />
      ) : (
        <ThumbnailsRuntime items={items} p={p} />
      );
    default:
      return renderGrid(items, p);
  }
}
