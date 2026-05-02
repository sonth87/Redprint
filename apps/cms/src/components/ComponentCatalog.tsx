import React, { useState, useMemo } from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import type { ComponentRegistry } from "@ui-builder/builder-core";
import { Input, ScrollArea, Badge } from "@ui-builder/ui";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

interface ComponentCatalogProps {
  registry: ComponentRegistry;
  selectedType: string | null;
  onSelect: (type: string) => void;
}

const CATEGORY_META: Record<string, { label: string; order: number }> = {
  layout:      { label: "Layout",      order: 0 },
  content:     { label: "Content",     order: 1 },
  interactive: { label: "Interactive", order: 2 },
  media:       { label: "Media",       order: 3 },
  navigation:  { label: "Navigation",  order: 4 },
  decorative:  { label: "Decorative",  order: 5 },
};

export function ComponentCatalog({ registry, selectedType, onSelect }: ComponentCatalogProps) {
  const [search, setSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const all = registry.listComponents(search ? { search } : undefined);
    const byCategory: Record<string, ComponentDefinition[]> = {};
    for (const def of all) {
      (byCategory[def.category] ??= []).push(def);
    }
    return Object.entries(byCategory).sort(
      ([a], [b]) =>
        (CATEGORY_META[a]?.order ?? 99) - (CATEGORY_META[b]?.order ?? 99),
    );
  }, [registry, search]);

  const totalCount = useMemo(() => registry.listComponents().length, [registry]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  return (
    <>
      <div className="p-2 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-7 h-7 text-xs"
            placeholder="Search components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-3 py-1.5 border-b shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {totalCount} components
        </span>
      </div>

      <ScrollArea className="flex-1">
        {grouped.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            No components found
          </div>
        )}
        {grouped.map(([category, defs]) => {
          const collapsed = collapsedCategories.has(category);
          const meta = CATEGORY_META[category];
          return (
            <div key={category}>
              <button
                className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategory(category)}
              >
                <span>{meta?.label ?? category}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px] px-1 h-4 font-normal">
                    {defs.length}
                  </Badge>
                  {collapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </button>

              {!collapsed &&
                defs.map((def) => (
                  <button
                    key={def.type}
                    className={
                      "w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between gap-2 " +
                      (selectedType === def.type
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground")
                    }
                    onClick={() => onSelect(def.type)}
                  >
                    <span className="truncate">{def.name}</span>
                    {def.capabilities.canContainChildren && (
                      <Badge
                        variant={selectedType === def.type ? "secondary" : "outline"}
                        className="text-[9px] px-1 h-4 font-normal shrink-0"
                      >
                        container
                      </Badge>
                    )}
                  </button>
                ))}
            </div>
          );
        })}
      </ScrollArea>
    </>
  );
}
