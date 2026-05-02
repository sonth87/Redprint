import React from "react";
import { cn } from "@ui-builder/ui";

/**
 * Numeric input with:
 * - Click & drag horizontal scrubbing (Shift=×10, Alt=×0.1)
 * - Unit cycling by clicking the unit label (e.g. px ↔ %)
 * - "auto" value support
 */
export function NumericInput({
  value,
  onChange,
  placeholder = "0",
  units = ["px"],
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  units?: string[];
}) {
  const [isScrubbing, setIsScrubbing] = React.useState(false);

  const safeUnits = units && units.length > 0 ? units : ["px"];

  const isAuto = value === "auto";
  const strVal = String(value || "");
  // Find the current unit by checking which suffix the value ends with
  const matchedUnit = safeUnits.find((u) => u !== "" && strVal.endsWith(u));
  const currentUnit = matchedUnit ?? (safeUnits.includes("") ? "" : safeUnits[0]!);
  // Strip unit suffix to get only the numeric part
  const numPart = isAuto
    ? ""
    : currentUnit === ""
      ? strVal
      : matchedUnit
        ? strVal.slice(0, strVal.length - currentUnit.length)
        : strVal; // value doesn't have unit yet (e.g. bare "600"), show as-is

  const handleNumChange = (newVal: string) => {
    if (newVal === "" || newVal === "auto") {
      onChange(newVal);
      return;
    }
    if (!/^[-+]?[0-9]*\.?[0-9]*$/.test(newVal)) return;
    onChange(newVal + currentUnit);
  };

  const toggleUnit = () => {
    if (safeUnits.length <= 1 || isAuto) return;
    const currentIndex = safeUnits.indexOf(currentUnit);
    const nextUnit = safeUnits[(currentIndex + 1) % safeUnits.length]!;

    let nextNum = parseFloat(numPart) || 0;
    if (nextUnit === "%" && nextNum > 100) nextNum = 100;

    onChange(nextNum + nextUnit);
  };

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (isAuto || e.button !== 0) return;

      const startX = e.clientX;
      const startVal = parseFloat(numPart) || 0;
      let hasMoved = false;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        if (Math.abs(deltaX) > 3) {
          hasMoved = true;
          setIsScrubbing(true);

          let step = 1;
          if (moveEvent.shiftKey) step = 10;
          if (moveEvent.altKey) step = 0.1;

          const newVal = startVal + deltaX * step;
          const formattedVal =
            step < 1 ? Math.round(newVal * 10) / 10 : Math.round(newVal);

          onChange(formattedVal + currentUnit);
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
    [numPart, currentUnit, isAuto, onChange],
  );

  const showUnit = !isAuto && currentUnit !== "";

  return (
    <div
      className={cn(
        "flex h-7 items-center rounded-md border border-input bg-background text-xs ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        isScrubbing && "cursor-ew-resize",
      )}
    >
      <input
        className={cn(
          "h-full flex-1 min-w-0 bg-transparent px-2 py-0 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          !isAuto && "cursor-ew-resize focus:cursor-text",
          isScrubbing && "pointer-events-none select-none",
          showUnit ? "pr-0" : "pr-2",
        )}
        value={numPart}
        placeholder={isAuto ? "auto" : placeholder}
        onMouseDown={onMouseDown}
        onChange={(e) => handleNumChange(e.target.value)}
      />
      {showUnit && (
        <span
          className={cn(
            "shrink-0 px-1.5 text-[10px] font-medium text-muted-foreground/70 select-none",
            safeUnits.length > 1
              ? "cursor-pointer hover:text-primary hover:bg-muted rounded transition-colors"
              : "cursor-default",
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleUnit();
          }}
          title={
            safeUnits.length > 1
              ? `Click to switch unit (${safeUnits.join("/")})`
              : undefined
          }
        >
          {currentUnit}
        </span>
      )}
    </div>
  );
}
