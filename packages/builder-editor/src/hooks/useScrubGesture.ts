import React from "react";

function clamp(val: number, min?: number, max?: number) {
  if (min !== undefined && val < min) return min;
  if (max !== undefined && val > max) return max;
  return val;
}

interface UseScrubGestureOptions {
  getValue: () => number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function useScrubGesture({
  getValue,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
}: UseScrubGestureOptions): {
  onMouseDown: (e: React.MouseEvent) => void;
  isScrubbing: boolean;
} {
  const [isScrubbing, setIsScrubbing] = React.useState(false);

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (disabled || e.button !== 0) return;

      const startX = e.clientX;
      const startVal = getValue();
      let hasMoved = false;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        if (Math.abs(deltaX) > 3) {
          hasMoved = true;
          setIsScrubbing(true);

          let rate = step * 0.5;
          if (moveEvent.shiftKey) rate = step * 5;
          if (moveEvent.altKey) rate = step * 0.05;

          const rawVal = startVal + deltaX * rate;
          const formattedVal =
            step < 1
              ? Math.round(rawVal * 100) / 100
              : step < 0.5
                ? Math.round(rawVal * 10) / 10
                : Math.round(rawVal / step) * step;

          onChange(clamp(formattedVal, min, max));
        }
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        setTimeout(() => setIsScrubbing(false), 0);
        if (hasMoved) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [disabled, getValue, onChange, step, min, max],
  );

  return { onMouseDown, isScrubbing };
}
