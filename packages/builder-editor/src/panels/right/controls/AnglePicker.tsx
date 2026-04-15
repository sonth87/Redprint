import React, { useRef, useCallback } from "react";
import { cn } from "@ui-builder/ui";

interface AnglePickerProps {
  /** Angle in degrees (0–360), 0 = top/north */
  value: number;
  onChange: (deg: number) => void;
  size?: number;
  className?: string;
}

/**
 * Circular angle picker — drag the endpoint dot around the circle to set an angle.
 * 0° = top, 90° = right, 180° = bottom, 270° = left.
 */
export function AnglePicker({
  value,
  onChange,
  size = 44,
  className,
}: AnglePickerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 5;

  // Convert degrees (0=top) to canvas radians
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const rad = toRad(value);
  const ex = cx + r * Math.cos(rad);
  const ey = cy + r * Math.sin(rad);

  const getAngleFromEvent = useCallback(
    (clientX: number, clientY: number): number => {
      if (!svgRef.current) return value;
      const rect = svgRef.current.getBoundingClientRect();
      const x = clientX - rect.left - cx;
      const y = clientY - rect.top - cy;
      let deg = Math.atan2(y, x) * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;
      return Math.round(deg) % 360;
    },
    [cx, cy, value],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.preventDefault();
      svgRef.current?.setPointerCapture(e.pointerId);
      onChange(getAngleFromEvent(e.clientX, e.clientY));
    },
    [getAngleFromEvent, onChange],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.buttons !== 1) return;
      onChange(getAngleFromEvent(e.clientX, e.clientY));
    },
    [getAngleFromEvent, onChange],
  );

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="cursor-crosshair select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Track circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={2} fill="hsl(var(--muted-foreground))" />
        {/* Radius line */}
        <line
          x1={cx}
          y1={cy}
          x2={ex}
          y2={ey}
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {/* Endpoint dot */}
        <circle
          cx={ex}
          cy={ey}
          r={4}
          fill="hsl(var(--primary))"
          stroke="white"
          strokeWidth={1.5}
          className="cursor-grab"
        />
      </svg>
      <span className="text-[10px] tabular-nums text-muted-foreground">{value}°</span>
    </div>
  );
}
