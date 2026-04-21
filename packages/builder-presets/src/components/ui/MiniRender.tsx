import React from "react";
import type { ComponentRegistry, StyleConfig } from "@ui-builder/builder-core";
import type { PaletteItem } from "../../types/palette.types";
import { buildPreviewDocument } from "../../lib/buildPreviewDocument";
import { RuntimeRenderer } from "@ui-builder/builder-renderer";

export const MINI_THUMB_W = 120;
export const MINI_THUMB_H = 72;
// Render at 200px then scale to fit thumbnail width — gives readable text at ~0.6×
const MINI_WIDTH = 200;
const MINI_SCALE = MINI_THUMB_W / MINI_WIDTH;

export interface MiniRenderProps {
  item: PaletteItem;
  registry: ComponentRegistry;
}

export function MiniRender({ item, registry }: MiniRenderProps) {
  const definition = registry.getComponent(item.componentType);
  if (!definition) {
    return (
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
        {item.componentType.slice(0, 3)}
      </span>
    );
  }

  const doc = buildPreviewDocument(
    item.componentType,
    item.props,
    (item.style ?? {}) as Partial<StyleConfig>,
  );

  const alignStart = definition.category === "content";

  return (
    <div
      style={{
        minWidth: MINI_THUMB_W,
        width: MINI_THUMB_W,
        height: MINI_THUMB_H,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: alignStart ? "flex-start" : "center",
      }}
    >
      <div
        style={{
          width: MINI_WIDTH,
          transformOrigin: alignStart ? "center left" : "center center",
          transform: `scale(${MINI_SCALE})`,
          pointerEvents: "none",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <RuntimeRenderer
          document={doc}
          registry={registry}
          config={{ breakpoint: "desktop", variables: {}, attachNodeIds: false }}
        />
      </div>
    </div>
  );
}
