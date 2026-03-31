import React, { memo, useState, useMemo } from "react";
import { ScrollArea, Input, Badge, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { Search, Grip } from "lucide-react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import { cn } from "@ui-builder/ui";

export interface ComponentPaletteProps {
  components: ComponentDefinition[];
  onDragStart: (componentType: string, e: React.DragEvent) => void;
  isLoading?: boolean;
}

interface CategoryGroup {
  category: string;
  components: ComponentDefinition[];
}

/**
 * ComponentPalette — left panel listing all registered component types.
 *
 * Features:
 * - Live search (filters name, type, tags)
 * - Grouped by category (collapsible)
 * - Drag-to-canvas via HTML5 drag API
 * - Shows loading state for remote components
 */
export const ComponentPalette = memo(function ComponentPalette({
  components,
  onDragStart,
  isLoading,
}: ComponentPaletteProps) {
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return components;
    const q = search.toLowerCase();
    return components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [components, search]);

  const groups = useMemo((): CategoryGroup[] => {
    const map = new Map<string, ComponentDefinition[]>();
    for (const c of filtered) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return Array.from(map.entries()).map(([category, comps]) => ({ category, components: comps }));
  }, [filtered]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-col h-full">
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search components…"
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Component list */}
        <ScrollArea className="flex-1">
          {isLoading && (
            <div className="p-4 text-xs text-muted-foreground text-center animate-pulse">
              Loading components…
            </div>
          )}

          {groups.length === 0 && !isLoading && (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No components match your search.
            </div>
          )}

          {groups.map(({ category, components: cats }) => {
            const isCollapsed = collapsedCategories.has(category);
            return (
              <div key={category} className="border-b last:border-b-0">
                {/* Category header */}
                <button
                  className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="capitalize">{category}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">
                    {isCollapsed ? `+${cats.length}` : cats.length}
                  </span>
                </button>

                {/* Component items */}
                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-1 p-1.5">
                    {cats.map((comp) => (
                      <Tooltip key={comp.type}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-md border border-transparent",
                              "hover:border-border hover:bg-muted/60 cursor-grab active:cursor-grabbing",
                              "transition-colors text-center select-none",
                            )}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", JSON.stringify({ type: comp.type }));
                              e.dataTransfer.effectAllowed = "copy";
                              onDragStart(comp.type, e);
                            }}
                          >
                            {/* Icon placeholder */}
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
                              <Grip className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-[10px] leading-tight text-foreground/80 line-clamp-1">
                              {comp.name}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">{comp.name}</p>
                          {comp.description && (
                            <p className="text-xs text-muted-foreground max-w-[200px]">
                              {comp.description}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
});
