import React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";

export function PropInfoTooltip({ text }: { text: string }) {
  if (!text) return null;
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground cursor-help inline-block ml-1 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px]">
          <p className="text-xs leading-snug">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
