import { useCallback, useState } from "react";

interface UseMobileFrameOptions {
  zoom: number;
  /** Desktop frame width (canvas px) — used to compute alignment guides while dragging. */
  desktopWidth: number;
  /** Desktop frame height (canvas px) — used to compute alignment guides while dragging. */
  desktopHeight: number;
  /** Mobile frame width (canvas px) — used to compute alignment guides while dragging. */
  mobileWidth: number;
  /** Mobile frame height (canvas px) — used to compute alignment guides while dragging. */
  mobileHeight: number;
}

export interface MobileFrameGuide {
  type: "vertical" | "horizontal";
  /** Position in canvas px, relative to the desktop frame's own top-left corner (same space as mobileFramePos). */
  position: number;
}

export interface UseMobileFrameReturn {
  mobileFramePos: { x: number; y: number };
  handleMobileFrameGripDown: (e: React.PointerEvent) => void;
  /** Active alignment guides — only non-empty while actively dragging the grip. */
  guides: MobileFrameGuide[];
}

// Screen-space px thresholds for magnetic snapping.
// Attract threshold: distance within which snap engages.
// Release threshold: distance required to break free from latch once snapped.
const SNAP_ATTRACT_SCREEN_PX = 8;
const SNAP_RELEASE_SCREEN_PX = 14;
const MIN_CANVAS_SNAP_PX = 4;
const MAX_CANVAS_SNAP_PX = 20;

/** Manages the draggable position of the mobile artboard in dual-canvas mode with magnetic snapping hysteresis. */
export function useMobileFrame({ zoom, desktopWidth, desktopHeight, mobileWidth, mobileHeight }: UseMobileFrameOptions): UseMobileFrameReturn {
  const [mobileFramePos, setMobileFramePos] = useState({ x: 0, y: 0 });
  const [guides, setGuides] = useState<MobileFrameGuide[]>([]);

  const handleMobileFrameGripDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      // Route pointer events to this handle to prevent text-selection during fast motion
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = mobileFramePos.x;
      const startPosY = mobileFramePos.y;
      const capturedZoom = Math.max(0.1, zoom);

      // Magnetic snap state held across move events
      let activeSnapTargetX: number | null = null;
      let activeSnappedX: number | null = null;
      let activeSnapTargetY: number | null = null;
      let activeSnappedY: number | null = null;

      const onMove = (ev: PointerEvent) => {
        const rawX = startPosX + (ev.clientX - startX) / capturedZoom;
        const rawY = startPosY + (ev.clientY - startY) / capturedZoom;

        // Bounded canvas-space thresholds derived from screen-space pixels
        const attractThreshold = Math.max(
          MIN_CANVAS_SNAP_PX,
          Math.min(MAX_CANVAS_SNAP_PX, SNAP_ATTRACT_SCREEN_PX / capturedZoom),
        );
        const releaseThreshold = Math.max(
          MIN_CANVAS_SNAP_PX * 1.5,
          Math.min(MAX_CANVAS_SNAP_PX * 1.5, SNAP_RELEASE_SCREEN_PX / capturedZoom),
        );

        const nextGuides: MobileFrameGuide[] = [];
        let x = rawX;
        let y = rawY;

        const mobileLeft = rawX;
        const mobileRight = rawX + mobileWidth;
        const mobileCenterX = rawX + mobileWidth / 2;
        const mobileTop = rawY;
        const mobileBottom = rawY + mobileHeight;
        const mobileCenterY = rawY + mobileHeight / 2;

        const desktopLeft = 0;
        const desktopRight = desktopWidth;
        const desktopCenterX = desktopWidth / 2;
        const desktopTop = 0;
        const desktopBottom = desktopHeight;
        const desktopCenterY = desktopHeight / 2;

        const verticalTargets: Array<[number, number, number]> = [
          [mobileLeft, desktopLeft, desktopLeft],
          [mobileLeft, desktopRight, desktopRight],
          [mobileCenterX, desktopCenterX, desktopCenterX - mobileWidth / 2],
          [mobileRight, desktopLeft, desktopLeft - mobileWidth],
          [mobileRight, desktopRight, desktopRight - mobileWidth],
        ];

        // Vertical magnetic latching
        if (activeSnapTargetX !== null && activeSnappedX !== null) {
          if (Math.abs(rawX - activeSnappedX) <= releaseThreshold) {
            x = activeSnappedX;
            nextGuides.push({ type: "vertical", position: activeSnapTargetX });
          } else {
            activeSnapTargetX = null;
            activeSnappedX = null;
          }
        }

        if (activeSnapTargetX === null) {
          for (const [edge, target, snappedX] of verticalTargets) {
            if (Math.abs(edge - target) <= attractThreshold) {
              x = snappedX;
              activeSnapTargetX = target;
              activeSnappedX = snappedX;
              nextGuides.push({ type: "vertical", position: target });
              break;
            }
          }
        }

        const horizontalTargets: Array<[number, number, number]> = [
          [mobileTop, desktopTop, desktopTop],
          [mobileTop, desktopBottom, desktopBottom],
          [mobileCenterY, desktopCenterY, desktopCenterY - mobileHeight / 2],
          [mobileBottom, desktopTop, desktopTop - mobileHeight],
          [mobileBottom, desktopBottom, desktopBottom - mobileHeight],
        ];

        // Horizontal magnetic latching
        if (activeSnapTargetY !== null && activeSnappedY !== null) {
          if (Math.abs(rawY - activeSnappedY) <= releaseThreshold) {
            y = activeSnappedY;
            nextGuides.push({ type: "horizontal", position: activeSnapTargetY });
          } else {
            activeSnapTargetY = null;
            activeSnappedY = null;
          }
        }

        if (activeSnapTargetY === null) {
          for (const [edge, target, snappedY] of horizontalTargets) {
            if (Math.abs(edge - target) <= attractThreshold) {
              y = snappedY;
              activeSnapTargetY = target;
              activeSnappedY = snappedY;
              nextGuides.push({ type: "horizontal", position: target });
              break;
            }
          }
        }

        setMobileFramePos({ x, y });
        setGuides(nextGuides);
      };

      const onUp = () => {
        setGuides([]);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [mobileFramePos.x, mobileFramePos.y, zoom, desktopWidth, desktopHeight, mobileWidth, mobileHeight],
  );

  return { mobileFramePos, handleMobileFrameGripDown, guides };
}
