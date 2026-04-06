import { useState, useCallback } from "react";

interface UseMobileFrameOptions {
  zoom: number;
}

export interface UseMobileFrameReturn {
  mobileFramePos: { x: number; y: number };
  handleMobileFrameGripDown: (e: React.MouseEvent) => void;
}

/** Manages the draggable position of the mobile artboard in dual-canvas mode. */
export function useMobileFrame({ zoom }: UseMobileFrameOptions): UseMobileFrameReturn {
  const [mobileFramePos, setMobileFramePos] = useState({ x: 0, y: 0 });

  const handleMobileFrameGripDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = mobileFramePos.x;
      const startPosY = mobileFramePos.y;
      const capturedZoom = zoom;

      const onMove = (ev: MouseEvent) => {
        setMobileFramePos({
          x: startPosX + (ev.clientX - startX) / capturedZoom,
          y: startPosY + (ev.clientY - startY) / capturedZoom,
        });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [mobileFramePos.x, mobileFramePos.y, zoom],
  );

  return { mobileFramePos, handleMobileFrameGripDown };
}
