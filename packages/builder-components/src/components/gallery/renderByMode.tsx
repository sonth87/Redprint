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
  renderHoneycombDiamond,
  renderHoneycombTriangle,
  renderFreestyle,
  renderStacked,
} from "./renderLayouts";
import { SwiperSliderRuntime } from "./SwiperSliderRuntime";
import { ThumbnailsEditorPreview } from "./ThumbnailsEditorPreview";
import { ThumbnailsRuntime } from "./ThumbnailsRuntime";
import { FreestyleRuntime } from "./FreestyleRuntime";
import { HoneycombRuntime } from "./HoneycombRuntime";

export function renderByMode(
  mode: GalleryLayoutMode,
  items: GalleryItem[],
  p: GalleryProps,
  cc: CarouselConfig,
  isEditor: boolean,
  hasExplicitHeight = false,
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
      return isEditor
        ? renderHoneycomb(items, p)
        : <HoneycombRuntime mode="honeycomb" items={items} p={p} />;
    case "honeycomb-diamond":
      return isEditor
        ? renderHoneycombDiamond(items, p)
        : <HoneycombRuntime mode="honeycomb-diamond" items={items} p={p} />;
    case "honeycomb-triangle":
      return isEditor
        ? renderHoneycombTriangle(items, p)
        : <HoneycombRuntime mode="honeycomb-triangle" items={items} p={p} />;
    case "freestyle":
      return isEditor
        ? renderFreestyle(items, p, hasExplicitHeight)
        : <FreestyleRuntime items={items} p={p} />;
    case "stacked":
      return renderStacked(items, p);
    case "slider":
    case "slideshow":
    case "carousel-3d":
      return <SwiperSliderRuntime items={items} p={p} cc={cc} isEditor={isEditor} hasExplicitHeight={hasExplicitHeight} />;
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
