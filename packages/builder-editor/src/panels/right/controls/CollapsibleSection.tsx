import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  actions,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex flex-1 items-center gap-1 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide hover:bg-muted/50 transition-colors"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          {title}
        </button>
        {actions && <div className="pr-2">{actions}</div>}
      </div>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}
