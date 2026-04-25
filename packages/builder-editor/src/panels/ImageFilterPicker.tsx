/**
 * ImageFilterPicker — shared filter grid used in both:
 *   - ContextualToolbar (popover when clicking the filter button)
 *   - PropertyPanel (inline section in the Design tab for Image nodes)
 *
 * Filter definitions live in @ui-builder/shared (imageFilters.ts) so they
 * can be consumed by both builder-editor and builder-components without
 * creating a circular dependency.
 */
import React from "react";
import { cn } from "@ui-builder/ui";
import {
  IMAGE_FILTERS,
  buildCssFilter,
  collectSvgFilterDefs,
  type ImageFilter,
} from "@ui-builder/shared";

// Re-export so callers can import ImageFilter type from this module if needed
export type { ImageFilter };
export { IMAGE_FILTERS, buildCssFilter };

// ── SVG defs injector ─────────────────────────────────────────────────────

/**
 * Hidden SVG that holds all SVG filter defs.
 * Must be rendered once in the DOM so `filter: url(#id)` references resolve.
 */
export function ImageFilterDefs() {
  const defs = collectSvgFilterDefs();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: `<defs>${defs}</defs>` }}
    />
  );
}

// ── Props ─────────────────────────────────────────────────────────────────

interface ImageFilterPickerProps {
  /** Live image src shown in each swatch */
  previewSrc?: string;
  /** Current filter value key (e.g. "none", "3d", "hulk") */
  value: string;
  /** Called when user picks a filter */
  onChange: (filter: string) => void;
}

// ── Swatch ────────────────────────────────────────────────────────────────

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect width='80' height='60' fill='%23a0b4c0'/%3E%3Cpolygon points='40,8 15,52 65,52' fill='%2356a085'/%3E%3Cellipse cx='60' cy='18' rx='10' ry='9' fill='%23e8d5a3'/%3E%3Crect x='0' y='46' width='80' height='14' fill='%2382a87a'/%3E%3C/svg%3E";

function FilterSwatch({
  filter,
  selected,
  previewSrc,
  onClick,
}: {
  filter: ImageFilter;
  selected: boolean;
  previewSrc?: string;
  onClick: () => void;
}) {
  const src = previewSrc || PLACEHOLDER;
  const cssFilter = buildCssFilter(filter);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-1 rounded-lg border-2 transition-all hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40",
        selected ? "border-primary shadow-sm" : "border-transparent"
      )}
    >
      <div className="w-full aspect-[4/3] rounded overflow-hidden bg-muted relative">
        <img
          src={src}
          alt={filter.label}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            filter: cssFilter,
          }}
        />
        {/* Color overlay layer for "overlay" mode filters */}
        {filter.mode === "overlay" && filter.overlayColor && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: filter.overlayColor,
              opacity: filter.overlayOpacity ?? 0.3,
              mixBlendMode: (filter.overlayBlend ?? "multiply") as React.CSSProperties["mixBlendMode"],
              pointerEvents: "none",
            }}
          />
        )}
      </div>
      <span
        className={cn(
          "text-[10px] leading-tight text-center truncate w-full",
          selected ? "text-primary font-semibold" : "text-muted-foreground"
        )}
      >
        {filter.label}
      </span>
    </button>
  );
}

// ── Main picker ───────────────────────────────────────────────────────────

export function ImageFilterPicker({ previewSrc, value, onChange }: ImageFilterPickerProps) {
  const current = value || "none";

  return (
    <div className="grid grid-cols-3 gap-1.5 p-1">
      {/* Inject SVG filter defs once per picker mount */}
      <ImageFilterDefs />
      {IMAGE_FILTERS.map((f) => (
        <FilterSwatch
          key={f.value}
          filter={f}
          selected={current === f.value}
          previewSrc={previewSrc}
          onClick={() => onChange(f.value)}
        />
      ))}
    </div>
  );
}
