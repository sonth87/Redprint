import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from "react";
import type { GalleryItem } from "@ui-builder/shared";
import { seededRandom } from "@ui-builder/shared";
import type { GalleryProps } from "./types";
import { GalleryLightbox } from "./GalleryLightbox";

interface ImageLayout {
  left: number;
  top: number;
  rotation: number;
  zIndex: number;
}

type Mode =
  | { kind: "idle" }
  | { kind: "selected"; id: string }
  | { kind: "lightbox"; index: number };

interface DragState {
  id: string;
  startClientX: number;
  startClientY: number;
  origLeft: number;
  origTop: number;
}

function computeLayouts(
  items: GalleryItem[],
  available: number,
  containerH: number,
  cellW: number,
  cellH: number,
  seed: string,
  rotate: boolean,
): Record<string, ImageLayout> {
  const result: Record<string, ImageLayout> = {};
  const maxZ = items.length;
  items.forEach((img, i) => {
    const useSeed = seed === "__random__" ? `${img.id}_${Math.random()}` : seed;
    const rX = seededRandom(`${img.id}_x_${useSeed}`);
    const rY = seededRandom(`${img.id}_y_${useSeed}`);
    const rRot = seededRandom(`${img.id}_rot`);
    const rZ = seededRandom(`${img.id}_z`);
    const rawRot = (rRot - 0.5) * 30;
    result[img.id] = {
      left: rX * Math.max(0, available - cellW),
      top: containerH <= cellH ? 0 : rY * (containerH - cellH),
      rotation: rotate ? (i % 2 === 0 ? rawRot : -rawRot) : 0,
      zIndex: Math.floor(rZ * maxZ) + 1,
    };
  });
  return result;
}

interface FreestyleRuntimeProps {
  items: GalleryItem[];
  p: GalleryProps;
}

export function FreestyleRuntime({ items, p }: FreestyleRuntimeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(p.containerWidth ?? 600);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [overrides, setOverrides] = useState<Record<string, { left: number; top: number }>>({});
  const dragRef = useRef<DragState | null>(null);

  // If freestyleRandomLayout=true, generate a one-time random seed on mount
  const runtimeSeed = useRef(p.freestyleRandomLayout ? "__random__" : (p.freestyleRandomSeed ?? "default"));
  const rotate = p.freestyleRotate !== false;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(Math.floor(w));
    });
    ro.observe(el);
    const initialW = el.getBoundingClientRect().width;
    if (initialW > 0) setContainerWidth(Math.floor(initialW));
    return () => ro.disconnect();
  }, []);

  const cellW = Math.floor(containerWidth * 0.42);
  const cellH = Math.floor(cellW * 0.68);
  const rows = Math.ceil(items.length / Math.max(1, p.columns));
  const containerH = Math.max(cellH + 40, rows * cellH * 0.85 + cellH * 0.6);

  const initialLayouts = useRef<Record<string, ImageLayout>>({});
  const layoutKey = `${items.map((i) => i.id).join(",")}_${containerWidth}_${runtimeSeed.current}_${rotate}`;
  const layoutKeyRef = useRef<string>("");
  if (layoutKeyRef.current !== layoutKey) {
    layoutKeyRef.current = layoutKey;
    initialLayouts.current = computeLayouts(items, containerWidth, containerH, cellW, cellH, runtimeSeed.current, rotate);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode({ kind: "idle" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startClientX;
      const dy = e.clientY - drag.startClientY;
      const newLeft = Math.max(0, Math.min(containerWidth - cellW, drag.origLeft + dx));
      const newTop = Math.max(0, Math.min(containerH - cellH, drag.origTop + dy));
      setOverrides((prev) => ({ ...prev, [drag.id]: { left: newLeft, top: newTop } }));
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = Math.abs(e.clientX - drag.startClientX);
      const dy = Math.abs(e.clientY - drag.startClientY);
      const wasTap = dx < 5 && dy < 5;
      if (wasTap) {
        setMode((prev) => {
          if (prev.kind === "idle") {
            return { kind: "selected", id: drag.id };
          } else if (prev.kind === "selected") {
            if (prev.id === drag.id) {
              const idx = items.findIndex((it) => it.id === drag.id);
              return { kind: "lightbox", index: idx >= 0 ? idx : 0 };
            }
            return { kind: "selected", id: drag.id };
          }
          return prev;
        });
      }
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [containerWidth, containerH, cellW, cellH, items]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setMode({ kind: "idle" });
    }
  }, []);

  const selectedId = mode.kind === "selected" ? mode.id : null;
  const maxZIndex = items.length + 10;

  return (
    <>
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        style={{ position: "relative", width: "100%", height: containerH, overflow: "hidden", cursor: "default" }}
      >
        {items.map((img) => {
          const base = initialLayouts.current[img.id] ?? { left: 0, top: 0, rotation: 0, zIndex: 1 };
          const pos = overrides[img.id] ?? { left: base.left, top: base.top };
          const isSelected = selectedId === img.id;
          const zIndex = isSelected ? maxZIndex : base.zIndex;

          return (
            <div
              key={img.id}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                dragRef.current = {
                  id: img.id,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  origLeft: pos.left,
                  origTop: pos.top,
                };
              }}
              style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                width: cellW,
                height: cellH,
                transform: `rotate(${base.rotation}deg)${isSelected ? " scale(1.04)" : ""}`,
                zIndex,
                overflow: "hidden",
                borderRadius: p.borderRadius + 2,
                background: "#f3f4f6",
                boxShadow: isSelected
                  ? "0 8px 24px rgba(0,0,0,0.28)"
                  : "2px 4px 12px rgba(0,0,0,0.18)",
                outline: isSelected ? "3px solid #4f46e5" : "none",
                cursor: "grab",
                touchAction: "none",
                transition: "outline 0.1s, box-shadow 0.15s",
                userSelect: "none",
              }}
            >
              <img
                src={img.src}
                alt={img.alt ?? ""}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
              />
            </div>
          );
        })}
      </div>

      {mode.kind === "lightbox" && (
        <GalleryLightbox
          items={items}
          initialIndex={mode.index}
          onClose={() => setMode({ kind: "idle" })}
        />
      )}
    </>
  );
}
