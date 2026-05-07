import React, { useState } from "react";
import type { GalleryItem, GalleryLayoutMode } from "@ui-builder/shared";
import type { GalleryProps } from "./types";
import { renderHoneycomb, renderHoneycombDiamond, renderHoneycombTriangle } from "./renderLayouts";
import { GalleryLightbox } from "./GalleryLightbox";

interface HoneycombRuntimeProps {
  mode: GalleryLayoutMode;
  items: GalleryItem[];
  p: GalleryProps;
}

export function HoneycombRuntime({ mode, items, p }: HoneycombRuntimeProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const behavior = p.honeycombClickBehavior;

  const handleClick = (img: GalleryItem, index: number) => {
    if (behavior === "open-preview") {
      setLightboxIndex(index);
    } else if (behavior === "open-link" && img.link) {
      window.open(img.link, "_blank", "noopener,noreferrer");
    }
  };

  if (behavior === "none") {
    // Static render — no wrapper overhead
    if (mode === "honeycomb-diamond") return renderHoneycombDiamond(items, p);
    if (mode === "honeycomb-triangle") return renderHoneycombTriangle(items, p);
    return renderHoneycomb(items, p);
  }

  // Clickable render: re-implement the grid with onClick handlers on each cell
  const cursor = "pointer";

  let cells: React.ReactElement;
  if (mode === "honeycomb-diamond") {
    cells = renderHoneycombDiamondClickable(items, p, cursor, handleClick);
  } else if (mode === "honeycomb-triangle") {
    cells = renderHoneycombTriangleClickable(items, p, cursor, handleClick);
  } else {
    cells = renderHoneycombClickable(items, p, cursor, handleClick);
  }

  return (
    <>
      {cells}
      {lightboxIndex !== null && (
        <GalleryLightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

// ── Clickable variants (same geometry as renderLayouts, adds onClick + cursor) ──

function renderHoneycombClickable(
  items: GalleryItem[],
  p: GalleryProps,
  cursor: string,
  onClick: (img: GalleryItem, i: number) => void,
): React.ReactElement {
  const hexClip = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  const available = p.containerWidth ?? 600;
  const cols = Math.max(1, p.columns);
  const cellSize = Math.max(40, Math.floor((available - (cols - 1) * p.gap) / cols));
  const rowStep = Math.floor(cellSize * 0.75) + p.gap;

  type HexCell = { img: GalleryItem; row: number; col: number; idx: number };
  const cells: HexCell[] = [];
  let idx = 0;
  let row = 0;
  while (idx < items.length) {
    const rowCols = row % 2 === 1 ? cols - 1 : cols;
    for (let col = 0; col < rowCols && idx < items.length; col++) {
      cells.push({ img: items[idx]!, row, col, idx });
      idx++;
    }
    row++;
  }
  const containerH = row * rowStep + Math.floor(cellSize * 0.25);

  return (
    <div style={{ position: "relative", width: "100%", height: containerH }}>
      {cells.map(({ img, row: r, col: c, idx: itemIdx }) => {
        const isOddRow = r % 2 === 1;
        const x = c * (cellSize + p.gap) + (isOddRow ? Math.floor((cellSize + p.gap) / 2) : 0);
        const y = r * rowStep;
        return (
          <div
            key={img.id ?? itemIdx}
            onClick={() => onClick(img, itemIdx)}
            style={{ position: "absolute", left: x, top: y, width: cellSize, height: cellSize, clipPath: hexClip, overflow: "hidden", background: "#f3f4f6", cursor }}
          >
            <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </div>
  );
}

function renderHoneycombDiamondClickable(
  items: GalleryItem[],
  p: GalleryProps,
  cursor: string,
  onClick: (img: GalleryItem, i: number) => void,
): React.ReactElement {
  const diamondClip = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
  const available = p.containerWidth ?? 600;
  const cols = Math.max(1, p.columns);
  const cellSize = Math.max(40, Math.floor((available - (cols - 1) * p.gap) / cols));
  const rowStep = Math.floor(cellSize / 2) + p.gap;

  type Cell = { img: GalleryItem; row: number; col: number; idx: number };
  const cells: Cell[] = [];
  let idx = 0;
  let row = 0;
  while (idx < items.length) {
    const rowCols = row % 2 === 1 ? cols - 1 : cols;
    for (let col = 0; col < rowCols && idx < items.length; col++) {
      cells.push({ img: items[idx]!, row, col, idx });
      idx++;
    }
    row++;
  }
  const containerH = row * rowStep + Math.floor(cellSize / 2);

  return (
    <div style={{ position: "relative", width: "100%", height: containerH }}>
      {cells.map(({ img, row: r, col: c, idx: itemIdx }) => {
        const isOddRow = r % 2 === 1;
        const x = c * (cellSize + p.gap) + (isOddRow ? Math.floor((cellSize + p.gap) / 2) : 0);
        const y = r * rowStep;
        return (
          <div
            key={img.id ?? itemIdx}
            onClick={() => onClick(img, itemIdx)}
            style={{ position: "absolute", left: x, top: y, width: cellSize, height: cellSize, clipPath: diamondClip, overflow: "hidden", background: "#f3f4f6", cursor }}
          >
            <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </div>
  );
}

function renderHoneycombTriangleClickable(
  items: GalleryItem[],
  p: GalleryProps,
  cursor: string,
  onClick: (img: GalleryItem, i: number) => void,
): React.ReactElement {
  const rightClip = "polygon(0% 0%, 100% 50%, 0% 100%)";
  const leftClip  = "polygon(100% 0%, 0% 50%, 100% 100%)";
  const available = p.containerWidth ?? 600;
  const triPerRow = Math.max(2, p.columns);
  const pairs = Math.ceil(triPerRow / 2);
  const cellW = Math.max(20, Math.floor((available - (triPerRow - 1) * p.gap) / triPerRow));
  const cellH = Math.floor(cellW * 1.2);
  const rowStep = Math.floor(cellH / 2) + p.gap;
  const rowCount = Math.ceil(items.length / triPerRow);
  const containerH = rowCount * rowStep + Math.floor(cellH / 2);

  return (
    <div style={{ position: "relative", width: "100%", height: containerH }}>
      {items.map((img, i) => {
        const triCol = i % triPerRow;
        const triRow = Math.floor(i / triPerRow);
        const x = triCol * (cellW + p.gap);
        const y = triRow * rowStep;
        const isLeft = (triRow + triCol) % 2 === 0;
        return (
          <div
            key={img.id ?? i}
            onClick={() => onClick(img, i)}
            style={{ position: "absolute", left: x, top: y, width: cellW, height: cellH, clipPath: isLeft ? leftClip : rightClip, overflow: "hidden", background: "#f3f4f6", cursor }}
          >
            <img src={img.src} alt={img.alt ?? ""} draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </div>
  );
}
