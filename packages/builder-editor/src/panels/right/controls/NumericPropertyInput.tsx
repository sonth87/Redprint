import React from "react";
import { Input } from "@ui-builder/ui";
import { cn } from "@ui-builder/ui";

interface NumericPropertyInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  units?: string[];
  min?: number;
  max?: number;
}

/**
 * Input for numeric CSS values with scrub-drag and optional unit cycling.
 * - Drag horizontally to scrub (Shift = ×10, Alt = ×0.1)
 * - Click unit badge to cycle through units
 * - Min/max constraints applied during drag
 */
export function NumericPropertyInput({
  value,
  onChange,
  placeholder = "0",
  units = ["px"],
  min,
  max,
}: NumericPropertyInputProps) {
  const [isScrubbing, setIsScrubbing] = React.useState(false);

  const isAuto = value === "auto";
  const currentUnit = units.find((u) => u !== "" && String(value).endsWith(u)) ?? units[0] ?? "";
  const numPart = isAuto
    ? ""
    : String(value || "").replace(new RegExp(`${currentUnit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "");

  const handleNumChange = (newVal: string) => {
    if (newVal === "" || newVal === "auto") {
      onChange(newVal);
      return;
    }
    if (!/^[-+]?[0-9]*\.?[0-9]*$/.test(newVal)) return;
    const num = parseFloat(newVal);
    const clamped =
      min !== undefined && num < min
        ? min
        : max !== undefined && num > max
        ? max
        : num;
    onChange(isNaN(clamped) ? newVal + currentUnit : clamped + currentUnit);
  };

  const toggleUnit = () => {
    if (units.length <= 1 || isAuto) return;
    const idx = units.indexOf(currentUnit);
    const next = units[(idx + 1) % units.length] ?? units[0] ?? "";
    let nextNum = parseFloat(numPart) || 0;
    if (next === "%" && nextNum > 100) nextNum = 100;
    onChange(nextNum + next);
  };

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (isAuto || e.button !== 0) return;
      const startX = e.clientX;
      const startVal = parseFloat(numPart) || 0;
      let hasMoved = false;

      const onMouseMove = (me: MouseEvent) => {
        const delta = me.clientX - startX;
        if (Math.abs(delta) > 3) {
          hasMoved = true;
          setIsScrubbing(true);
          const step = me.shiftKey ? 10 : me.altKey ? 0.1 : 1;
          let newVal = startVal + delta * step;
          if (min !== undefined) newVal = Math.max(min, newVal);
          if (max !== undefined) newVal = Math.min(max, newVal);
          const fmt = step < 1 ? Math.round(newVal * 10) / 10 : Math.round(newVal);
          onChange(fmt + currentUnit);
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
    [numPart, currentUnit, isAuto, onChange, min, max],
  );

  return (
    <div className="relative flex items-center group">
      <Input
        className={cn(
          "h-7 text-xs focus-visible:ring-1",
          currentUnit ? "pr-7" : "pr-2",
          !isAuto && "cursor-ew-resize select-none focus:cursor-text",
          isScrubbing && "cursor-ew-resize pointer-events-none",
        )}
        value={numPart}
        placeholder={isAuto ? "auto" : placeholder}
        onMouseDown={onMouseDown}
        onChange={(e) => handleNumChange(e.target.value)}
      />
      {!isAuto && currentUnit && (
        <span
          className={cn(
            "absolute right-2 text-[10px] font-medium text-muted-foreground/60 select-none",
            units.length > 1 &&
              "cursor-pointer hover:text-primary hover:bg-muted px-1 rounded transition-colors",
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleUnit();
          }}
          title={units.length > 1 ? `Click to cycle unit (${units.join("/")})` : undefined}
        >
          {currentUnit}
        </span>
      )}
    </div>
  );
}
