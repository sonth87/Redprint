import React from "react";
import { Input, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, cn } from "@ui-builder/ui";

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

  const toggleUnit = () => {
    if (safeUnits.length <= 1 || isAuto) return;
    const currentIndex = safeUnits.indexOf(currentUnit);
    const nextUnit = safeUnits[(currentIndex + 1) % safeUnits.length]!;
    
    let nextNum = parseFloat(numPart) || 0;
    
    // Method 1: Safe Defaults
    // If switching to %, ensure the value isn't absurdly large (max 100%)
    if (nextUnit === "%" && nextNum > 100) {
      nextNum = 100;
    } else if (nextUnit === "px" && currentUnit === "%" && nextNum === 100) {
      // If switching from 100% to px, maybe default to a common size or let it be
      // For now, just keep the number as per user's "Method 1" request
    }

    onChange(nextNum + nextUnit);
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
        <TooltipProvider delayDuration={600}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "absolute right-2.5 text-[10px] font-medium text-muted-foreground/60 select-none cursor-default",
                  safeUnits.length > 1 && "cursor-pointer hover:text-primary hover:bg-muted px-1 rounded transition-colors"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleUnit();
                }}
              >
                {currentUnit}
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              {unitInfo ? (
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs">{unitInfo.label} <span className="font-mono opacity-60">({currentUnit})</span></p>
                  <p className="text-xs text-muted-foreground leading-snug">{unitInfo.description}</p>
                  {safeUnits.length > 1 && (
                    <p className="text-[10px] text-muted-foreground/60 pt-0.5 border-t border-border/50 mt-1">
                      Click to cycle: {safeUnits.join(" → ")}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs">{currentUnit}{safeUnits.length > 1 ? ` — click to cycle: ${safeUnits.join(" → ")}` : ""}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
