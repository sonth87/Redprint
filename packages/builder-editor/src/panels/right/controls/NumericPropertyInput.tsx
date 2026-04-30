import React from "react";
import { Input, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, Popover, PopoverContent, PopoverTrigger, cn } from "@ui-builder/ui";

const UNIT_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  px:  { label: "Pixels",          description: "Fixed size — doesn't scale with screen or parent. Best for precise, absolute sizing." },
  "%": { label: "Percent",         description: "Relative to the parent element's size. 50% = half of parent width/height." },
  vh:  { label: "Viewport Height", description: "1vh = 1% of the browser window height. 100vh = full screen height." },
  vw:  { label: "Viewport Width",  description: "1vw = 1% of the browser window width. 100vw = full screen width." },
  rem: { label: "Root em",         description: "Relative to the root font size (usually 16px). 1rem = 16px, 2rem = 32px." },
  em:  { label: "Em",              description: "Relative to the current element's font size. Scales with typography." },
  fr:  { label: "Fraction",        description: "CSS Grid only — divides remaining space proportionally. 1fr = equal share." },
  deg: { label: "Degrees",         description: "Angle unit. 0deg = up, 90deg = right, 180deg = down, 360deg = full rotation." },
  s:   { label: "Seconds",         description: "Time unit for transitions and animations." },
  ms:  { label: "Milliseconds",    description: "Time unit. 1000ms = 1 second. Useful for fine-grained animation timing." },
};

export function NumericPropertyInput({
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
  const [isUnitPopoverOpen, setIsUnitPopoverOpen] = React.useState(false);

  // Ensure units is non-empty with fallback
  const safeUnits = (units && units.length > 0) ? units : ["px"];

  // Parsing: detect current unit and numeric value
  const isAuto = value === "auto";
  const currentUnit = safeUnits.find(u => String(value).endsWith(u)) || safeUnits[0]!;
  const numPart = isAuto ? "" : String(value || "").replace(new RegExp(`${currentUnit}$`), "");

  const handleNumChange = (newVal: string) => {
    if (newVal === "" || newVal === "auto") {
      onChange(newVal);
      return;
    }
    if (!/^[-+]?[0-9]*\.?[0-9]*$/.test(newVal)) return;
    onChange(newVal + currentUnit);
  };

  const selectUnit = (nextUnit: string) => {
    if (isAuto) return;
    let nextNum = parseFloat(numPart) || 0;

    // Clamp to 100 when switching to % or vh (both are relative units capped at 100)
    if ((nextUnit === "%" || nextUnit === "vh") && nextNum > 100) {
      nextNum = 100;
    }

    onChange(nextNum + nextUnit);
    setIsUnitPopoverOpen(false);
  };

  // Scrubbing Logic
  const onMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (isAuto || e.button !== 0) return; // Only left click

    const startX = e.clientX;
    const startVal = parseFloat(numPart) || 0;
    let hasMoved = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (Math.abs(deltaX) > 3) {
        hasMoved = true;
        setIsScrubbing(true);

        // Adjust step based on modifiers
        let step = 1;
        if (moveEvent.shiftKey) step = 10;
        if (moveEvent.altKey) step = 0.1;

        const newVal = startVal + (deltaX * step);
        // Round to 1 decimal place if using alt, else integer
        const formattedVal = step < 1 ? Math.round(newVal * 10) / 10 : Math.round(newVal);

        onChange(formattedVal + currentUnit);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setTimeout(() => setIsScrubbing(false), 0);

      if (hasMoved) {
        // Prevent click events if we actually dragged
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [numPart, currentUnit, isAuto, onChange]);

  const unitInfo = UNIT_DESCRIPTIONS[currentUnit];

  return (
    <div className="relative flex items-center group">
      <Input
        className={cn(
          "h-7 text-xs pr-8 focus-visible:ring-1",
          !isAuto && "cursor-ew-resize select-none focus:cursor-text",
          isScrubbing && "cursor-ew-resize pointer-events-none"
        )}
        value={numPart}
        placeholder={isAuto ? "auto" : placeholder}
        onMouseDown={onMouseDown}
        onChange={(e) => handleNumChange(e.target.value)}
      />
      {!isAuto && (
        <Popover
          open={safeUnits.length > 1 && !isAuto ? isUnitPopoverOpen : false}
          onOpenChange={safeUnits.length > 1 ? setIsUnitPopoverOpen : undefined}
        >
          <TooltipProvider delayDuration={600}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <span
                    className={cn(
                      "absolute right-2.5 text-[10px] font-medium text-muted-foreground/60 select-none cursor-default",
                      safeUnits.length > 1 && "cursor-pointer hover:text-primary hover:bg-muted px-1 rounded transition-colors"
                    )}
                  >
                    {currentUnit}
                  </span>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                {unitInfo ? (
                  <div className="space-y-0.5">
                    <p className="font-semibold text-xs">{unitInfo.label} <span className="font-mono opacity-60">({currentUnit})</span></p>
                    <p className="text-xs text-muted-foreground leading-snug">{unitInfo.description}</p>
                    {safeUnits.length > 1 && (
                      <p className="text-[10px] text-muted-foreground/60 pt-0.5 border-t border-border/50 mt-1">
                        Click to select unit
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs">{currentUnit}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {safeUnits.length > 1 && (
            <PopoverContent side="right" align="start" className="w-40 p-1">
              {safeUnits.map((unit) => (
                <button
                  key={unit}
                  onClick={() => selectUnit(unit)}
                  className={cn(
                    "flex items-center gap-2 w-full text-left px-2 py-1 text-xs rounded hover:bg-muted",
                    unit === currentUnit && "text-primary font-medium"
                  )}
                >
                  <span className="font-mono w-6">{unit || "—"}</span>
                  <span className="text-muted-foreground">{UNIT_DESCRIPTIONS[unit]?.label ?? ""}</span>
                </button>
              ))}
            </PopoverContent>
          )}
        </Popover>
      )}
    </div>
  );
}
