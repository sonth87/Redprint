import React, { useState, useRef, useEffect } from "react";
import type { Breakpoint, ComponentDefinition, BuilderDocument } from "@ui-builder/builder-core";
import type { ComponentRegistry } from "@ui-builder/builder-core";
import { DEFAULT_BREAKPOINTS, DEVICE_VIEWPORT_PRESETS } from "@ui-builder/builder-core";
import { RuntimeRenderer } from "@ui-builder/builder-renderer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui-builder/ui";
import { Monitor, Tablet, Smartphone, LayoutTemplate } from "lucide-react";

const BREAKPOINT_ICONS: Record<Breakpoint, React.ElementType> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

interface ComponentPreviewProps {
  definition: ComponentDefinition | null;
  document: BuilderDocument | null;
  registry: ComponentRegistry;
}

export function ComponentPreview({ definition, document, registry }: ComponentPreviewProps) {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const viewport = DEVICE_VIEWPORT_PRESETS[breakpoint];

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const available = entry.contentRect.width - 64; // 32px padding each side
      setScale(Math.min(1, available / viewport.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewport.width]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 h-10 border-b bg-background shrink-0">
        <span className="text-xs text-muted-foreground truncate max-w-[160px]">
          {definition ? definition.name : "Select a component"}
        </span>

        <TooltipProvider>
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            {DEFAULT_BREAKPOINTS.map(({ breakpoint: bp, label }) => {
              const Icon = BREAKPOINT_ICONS[bp];
              return (
                <Tooltip key={bp}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setBreakpoint(bp)}
                      className={
                        "flex items-center px-2.5 py-1 rounded text-xs transition-colors " +
                        (breakpoint === bp
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground")
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <span className="text-[10px] text-muted-foreground tabular-nums w-25 text-right">
          {viewport.width} × {viewport.height}
          {scale < 1 && (
            <span className="ml-1 opacity-60">{Math.round(scale * 100)}%</span>
          )}
        </span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-canvas-bg flex items-start justify-center p-8">
        {!definition || !document ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground pointer-events-none select-none">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <LayoutTemplate className="h-7 w-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm">Select a component from the left panel</p>
            <p className="text-xs text-muted-foreground/60">
              Preview and edit properties in real-time
            </p>
          </div>
        ) : (
          <div
            style={{
              width: viewport.width,
              minHeight: 120,
              backgroundColor: "#ffffff",
              borderRadius: 4,
              boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
              flexShrink: 0,
              overflow: "hidden",
              position: "relative",
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: scale < 1 ? `calc((${viewport.width}px * ${scale} - ${viewport.width}px) / 2)` : 0,
            }}
          >
            <RuntimeRenderer
              document={document}
              registry={registry}
              config={{
                breakpoint,
                variables: {},
                attachNodeIds: false,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
