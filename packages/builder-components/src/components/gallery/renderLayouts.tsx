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
  const hexClip = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  const cellSize = 110;
  const rowH = cellSize * 0.866;
  const rows = Math.ceil(items.length / p.columns);
  const containerH = rows * (rowH + p.gap) + cellSize * 0.134;

  return (
    <div style={{ position: "relative", width: "100%", height: containerH }}>
      {items.map((img, i) => {
        const col = i % p.columns;
        const row = Math.floor(i / p.columns);
        const isOdd = row % 2 === 1;
        const x = col * (cellSize + p.gap) + (isOdd ? (cellSize + p.gap) / 2 : 0);
        const y = row * (rowH + p.gap);
        return (
          <div
            key={img.id ?? i}
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

export function renderFreestyle(items: GalleryItem[], p: GalleryProps): React.ReactElement {
  const cellW = 160;
  const cellH = 120;
  const rowCount = Math.ceil(items.length / p.columns);
  const containerH = rowCount * (cellH + 40) + 60;

  return (
    <div style={{ position: "relative", width: "100%", height: containerH, overflow: "hidden" }}>
      {items.map((img, i) => {
        const col = i % p.columns;
        const row = Math.floor(i / p.columns);
        const rPos = seededRandom(`${img.id}_pos`);
        const rY = seededRandom(`${img.id}_y`);
        const rRot = seededRandom(`${img.id}_rot`);
        const rZ = seededRandom(`${img.id}_z`);
        const baseX = (col / p.columns) * (100 - 20);
        const offsetX = (rPos - 0.5) * 32;
        const offsetY = (rY - 0.5) * 24;
        const rotation = (rRot - 0.5) * 16;
        return (
          <div
            key={img.id ?? i}
            style={{
              position: "absolute",
              left: `calc(${baseX}% + ${offsetX}px)`,
              top: row * (cellH + 40) + offsetY + 20,
              width: cellW,
              height: cellH,
              transform: `rotate(${rotation}deg)`,
              zIndex: Math.floor(rZ * 10) + 1,
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
