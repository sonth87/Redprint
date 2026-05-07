import React from "react";
import type { GalleryItem } from "@ui-builder/shared";
import { seededRandom } from "@ui-builder/shared";
import type { GalleryProps } from "./types";

export function renderGrid(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${p.columns}, 1fr)`,
        gap: `${p.gap}px`,
      }}
    >
      {items.map((img, i) => (
        <div
          key={img.id ?? i}
          style={{
            aspectRatio: p.aspectRatio,
            overflow: "hidden",
            borderRadius: br,
            background: "#f3f4f6",
          }}
        >
          <img
            src={img.src}
            alt={img.alt ?? ""}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: p.imageFit,
              display: "block",
              borderRadius: br,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function renderMasonry(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  return (
    <div style={{ columnCount: p.columns, columnGap: `${p.gap}px` } as React.CSSProperties}>
      {items.map((img, i) => (
        <div
          key={img.id ?? i}
          style={{
            breakInside: "avoid",
            marginBottom: `${p.gap}px`,
            overflow: "hidden",
            borderRadius: br,
            background: "#f3f4f6",
          }}
        >
          <img
            src={img.src}
            alt={img.alt ?? ""}
            draggable={false}
            style={{ width: "100%", display: "block", borderRadius: br }}
          />
        </div>
      ))}
    </div>
  );
}

export function renderCollage(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridAutoRows: "200px",
        gap: `${p.gap}px`,
      }}
    >
      {items.map((img, i) => (
        <div
          key={img.id ?? i}
          style={{
            ...(i === 0 ? { gridColumn: "span 2", gridRow: "span 2" } : {}),
            overflow: "hidden",
            borderRadius: br,
            background: "#f3f4f6",
          }}
        >
          <img
            src={img.src}
            alt={img.alt ?? ""}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              borderRadius: br,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function renderStrip(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gridAutoRows: "200px",
        gap: `${p.gap}px`,
      }}
    >
      {items.map((img, i) => (
        <div
          key={img.id ?? i}
          style={{
            ...(i === 0 ? { gridRow: "span 2", minHeight: `${400 + p.gap}px` } : {}),
            overflow: "hidden",
            borderRadius: br,
            background: "#f3f4f6",
          }}
        >
          <img
            src={img.src}
            alt={img.alt ?? ""}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              borderRadius: br,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function renderColumn(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${p.gap}px` }}>
      {items.map((img, i) => (
        <div
          key={img.id ?? i}
          style={{
            width: "100%",
            overflow: "hidden",
            borderRadius: p.borderRadius,
            background: "#f3f4f6",
          }}
        >
          <img
            src={img.src}
            alt={img.alt ?? ""}
            draggable={false}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      ))}
    </div>
  );
}

export function renderBricks(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const br = `${p.borderRadius}px`;
  const rows: GalleryItem[][] = [];
  let i = 0;
  let isDouble = true;
  while (i < items.length) {
    rows.push(isDouble ? items.slice(i, i + 2) : [items[i]!]);
    i += isDouble ? 2 : 1;
    isDouble = !isDouble;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${p.gap}px` }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: `${p.gap}px` }}>
          {row.map((img, ci) => (
            <div
              key={img.id ?? `${ri}-${ci}`}
              style={{
                flex: 1,
                aspectRatio: p.aspectRatio,
                overflow: "hidden",
                borderRadius: br,
                background: "#f3f4f6",
              }}
            >
              <img
                src={img.src}
                alt={img.alt ?? ""}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  borderRadius: br,
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function renderHoneycomb(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  // Pointy-top hexagon: đỉnh nhọn ở trên/dưới
  const hexClip = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  const available = p.containerWidth ?? 600;
  const cols = Math.max(1, p.columns);
  const cellSize = Math.max(40, Math.floor((available - (cols - 1) * p.gap) / cols));
  const rowStep = Math.floor(cellSize * 0.75) + p.gap;

  // Build per-row layout: even rows = cols items, odd rows = cols-1 items (offset right)
  type HexCell = { img: GalleryItem; row: number; col: number };
  const cells: HexCell[] = [];
  let idx = 0;
  let row = 0;
  while (idx < items.length) {
    const isOddRow = row % 2 === 1;
    const rowCols = isOddRow ? cols - 1 : cols;
    for (let col = 0; col < rowCols && idx < items.length; col++) {
      cells.push({ img: items[idx]!, row, col });
      idx++;
    }
    row++;
  }
  const totalRows = row;
  const containerH = totalRows * rowStep + Math.floor(cellSize * 0.25);

  return (
    <div style={{ position: "relative", width: "100%", height: containerH }}>
      {cells.map(({ img, row: r, col: c }) => {
        const isOddRow = r % 2 === 1;
        // Odd rows shift right by half a cell+gap so they sit between even-row cells
        const x = c * (cellSize + p.gap) + (isOddRow ? Math.floor((cellSize + p.gap) / 2) : 0);
        const y = r * rowStep;
        return (
          <div
            key={img.id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: cellSize,
              height: cellSize,
              clipPath: hexClip,
              overflow: "hidden",
              background: "#f3f4f6",
            }}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function renderHoneycombDiamond(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const diamondClip = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
  const available = p.containerWidth ?? 600;
  const cols = Math.max(1, p.columns);
  const cellSize = Math.max(40, Math.floor((available - (cols - 1) * p.gap) / cols));
  const rowStep = Math.floor(cellSize / 2) + p.gap;

  // Even rows = cols items, odd rows = cols-1 items (offset right by half cell)
  type Cell = { img: GalleryItem; row: number; col: number };
  const cells: Cell[] = [];
  let idx = 0;
  let row = 0;
  while (idx < items.length) {
    const rowCols = row % 2 === 1 ? cols - 1 : cols;
    for (let col = 0; col < rowCols && idx < items.length; col++) {
      cells.push({ img: items[idx]!, row, col });
      idx++;
    }
    row++;
  }
  const containerH = row * rowStep + Math.floor(cellSize / 2);

  return (
    <div style={{ position: "relative", width: "100%", height: containerH }}>
      {cells.map(({ img, row: r, col: c }) => {
        const isOddRow = r % 2 === 1;
        const x = c * (cellSize + p.gap) + (isOddRow ? Math.floor((cellSize + p.gap) / 2) : 0);
        const y = r * rowStep;
        return (
          <div
            key={img.id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: cellSize,
              height: cellSize,
              clipPath: diamondClip,
              overflow: "hidden",
              background: "#f3f4f6",
            }}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function renderHoneycombTriangle(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  // Isoceles triangles pointing LEFT or RIGHT, arranged in pairs filling a rectangle.
  // Each pair: right-pointing ▷ + left-pointing ◁ = one rectangular cell.
  const rightClip = "polygon(0% 0%, 100% 50%, 0% 100%)"; // đỉnh phải
  const leftClip  = "polygon(100% 0%, 0% 50%, 100% 100%)"; // đỉnh trái

  const available = p.containerWidth ?? 600;
  const triPerRow = Math.max(2, p.columns);
  const cellW = Math.max(20, Math.floor((available - (triPerRow - 1) * p.gap) / triPerRow));
  const cellH = Math.floor(cellW * 1.2);
  // Rows interlock: odd rows offset right by half cell, vertical step = cellH/2 + gap
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
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: cellW,
              height: cellH,
              clipPath: isLeft ? leftClip : rightClip,
              overflow: "hidden",
              background: "#f3f4f6",
            }}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function renderFreestyle(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const available = p.containerWidth ?? 600;
  const cellW = Math.floor(available * 0.42);
  const cellH = Math.floor(cellW * 0.68);
  const rows = Math.ceil(items.length / Math.max(1, p.columns));
  const containerH = Math.max(cellH + 40, rows * cellH * 0.85 + cellH * 0.6);
  const rotate = p.freestyleRotate !== false;
  // Editor always uses the stable seed (freestyleRandomLayout only affects runtime)
  const seed = p.freestyleRandomSeed ?? "default";

  return (
    <div style={{ position: "relative", width: "100%", height: containerH, overflow: "hidden" }}>
      {items.map((img, i) => {
        const rX = seededRandom(`${img.id}_x_${seed}`);
        const rY = seededRandom(`${img.id}_y_${seed}`);
        const rRot = seededRandom(`${img.id}_rot`);
        const rZ = seededRandom(`${img.id}_z`);
        const left = rX * Math.max(0, available - cellW);
        const top = containerH <= cellH ? 0 : rY * (containerH - cellH);
        // Use index parity to ensure rotation spreads in both directions regardless of hash
        const rawRot = (rRot - 0.5) * 30;
        const rotation = rotate ? (i % 2 === 0 ? rawRot : -rawRot) : 0;
        const zIndex = Math.floor(rZ * items.length) + 1;
        return (
          <div
            key={img.id ?? i}
            style={{
              position: "absolute",
              left,
              top,
              width: cellW,
              height: cellH,
              transform: `rotate(${rotation}deg)`,
              zIndex,
              overflow: "hidden",
              borderRadius: p.borderRadius + 2,
              background: "#f3f4f6",
              boxShadow: "2px 4px 12px rgba(0,0,0,0.18)",
            }}
          >
            <img
              src={img.src}
              alt={img.alt ?? ""}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function renderStacked(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const visible = Math.min(items.length, 5);
  const w = 280;
  const h = 196;
  return (
    <div
      style={{
        position: "relative",
        width: w + 40,
        height: h + visible * 8 + 20,
        margin: "0 auto",
      }}
    >
      {items
        .slice(0, visible)
        .reverse()
        .map((img, revIdx) => {
          const idx = visible - 1 - revIdx;
          const rotation = (idx - Math.floor(visible / 2)) * 3;
          return (
            <div
              key={img.id ?? idx}
              style={{
                position: "absolute",
                top: idx * 4,
                left: idx * 2,
                width: w,
                height: h,
                transform: `rotate(${rotation}deg)`,
                zIndex: idx + 1,
                overflow: "hidden",
                borderRadius: p.borderRadius + 4,
                background: "#f3f4f6",
                boxShadow: "1px 2px 10px rgba(0,0,0,0.14)",
                transformOrigin: "bottom center",
              }}
            >
              <img
                src={img.src}
                alt={img.alt ?? ""}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          );
        })}
    </div>
  );
}
