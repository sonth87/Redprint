/**
 * PresetPalette — displays component presets organised by category.
 *
 * Works as a panel in the left sidebar alongside ComponentPalette.
 * Users can browse preset thumbnails and drag them to canvas.
 */
import React, { memo, useState, useMemo } from "react";
import { ScrollArea, Input, Badge, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { Search, LayoutTemplate, Grip } from "lucide-react";
import type { ComponentPreset } from "@ui-builder/builder-core";
import { cn } from "@ui-builder/ui";

export interface PresetPaletteProps {
  presets: ComponentPreset[];
  onDragStart: (preset: ComponentPreset, e: React.DragEvent) => void;
  onSelect?: (preset: ComponentPreset) => void;
}

interface CategoryGroup {
  category: string;
  presets: ComponentPreset[];
}

export const PresetPalette = memo(function PresetPalette({
  presets,
  onDragStart,
  onSelect,
}: PresetPaletteProps) {
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return presets;
    const q = search.toLowerCase();
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [presets, search]);

  const groups = useMemo((): CategoryGroup[] => {
    const map = new Map<string, ComponentPreset[]>();
    for (const p of filtered) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, presets: items }));
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
              placeholder="Search presets…"
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Preset list */}
        <ScrollArea className="flex-1">
          {groups.length === 0 && (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No presets match your search.
            </div>
          )}

          {groups.map(({ category, presets: cats }) => {
            const isCollapsed = collapsedCategories.has(category);
            return (
              <div key={category} className="border-b last:border-b-0">
                <button
                  className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <span className="capitalize">{category}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">
                    {isCollapsed ? `+${cats.length}` : cats.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-1.5 p-1.5">
                    {cats.map((preset) => (
                      <Tooltip key={preset.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-md border border-transparent",
                              "hover:border-border hover:bg-muted/60 cursor-grab active:cursor-grabbing",
                              "transition-colors text-center select-none",
                            )}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "text/plain",
                                JSON.stringify({ type: preset.componentType, presetId: preset.id }),
                              );
                              e.dataTransfer.effectAllowed = "copy";
                              onDragStart(preset, e);
                            }}
                            onClick={() => onSelect?.(preset)}
                          >
                            {preset.thumbnail ? (
                              <div
                                className="w-full h-16 rounded bg-muted bg-cover bg-center"
                                style={{ backgroundImage: `url(${preset.thumbnail})` }}
                              />
                            ) : (
                              <div className="w-full h-16 rounded bg-muted flex items-center justify-center text-muted-foreground">
                                <LayoutTemplate className="h-5 w-5" />
                              </div>
                            )}
                            <span className="text-[10px] leading-tight text-foreground/80 line-clamp-1">
                              {preset.name}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">{preset.name}</p>
                          {preset.description && (
                            <p className="text-xs text-muted-foreground max-w-[200px]">
                              {preset.description}
                            </p>
                          )}
                          {preset.tags && preset.tags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {preset.tags.map((t) => (
                                <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                              ))}
                            </div>
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
