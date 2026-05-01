import React, { memo, useState, useMemo } from "react";
import { ScrollArea, Input, Badge, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { Search, Grip, ChevronRight } from "lucide-react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import type { GroupRegistry, GroupTreeNode } from "@ui-builder/builder-core";
import { cn } from "@ui-builder/ui";
import type { GalleryLayoutMode } from "@ui-builder/shared";
import { LayoutMiniPreview } from "../gallery/LayoutMiniPreview";

export interface ComponentPaletteProps {
  components: ComponentDefinition[];
  onDragStart: (componentType: string, e: React.DragEvent) => void;
  isLoading?: boolean;
  /** Optional GroupRegistry for 2-level group → sub-group → component tree */
  groupRegistry?: GroupRegistry;
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
 * - 2-level grouping (Group → SubGroup → components) when groupRegistry provided
 * - Falls back to single-level category grouping without groupRegistry
 * - Drag-to-canvas via HTML5 drag API
 * - Shows loading state for remote components
 */
export const ComponentPalette = memo(function ComponentPalette({
  components,
  onDragStart,
  isLoading,
  groupRegistry,
}: ComponentPaletteProps) {
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedSubGroups, setCollapsedSubGroups] = useState<Set<string>>(new Set());

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

  // ── 2-level mode (GroupRegistry provided) ──────────────────────────────
  const groupTree = useMemo((): GroupTreeNode[] | null => {
    if (!groupRegistry) return null;
    return groupRegistry.getGroupTree(filtered);
  }, [groupRegistry, filtered]);

  // ── 1-level fallback mode ───────────────────────────────────────────────
  const legacyGroups = useMemo((): CategoryGroup[] => {
    if (groupTree) return []; // skip when using groupTree
    const map = new Map<string, ComponentDefinition[]>();
    for (const c of filtered) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    }
    return Array.from(map.entries()).map(([category, comps]) => ({ category, components: comps }));
  }, [filtered, groupTree]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubGroup = (id: string) => {
    setCollapsedSubGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isEmpty = groupTree ? groupTree.length === 0 : legacyGroups.length === 0;

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

          {isEmpty && !isLoading && (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No components match your search.
            </div>
          )}

          {/* ── 2-level tree mode ─────────────────────────────────────── */}
          {groupTree?.map(({ group, subGroups, components: directComps }) => {
            const isGroupCollapsed = collapsedGroups.has(group.id);
            const totalCount =
              directComps.length +
              subGroups.reduce((s, sg) => s + sg.components.length, 0);

            return (
              <div key={group.id} className="border-b last:border-b-0">
                {/* Group header */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex items-center gap-1.5">
                        <ChevronRight
                          className={cn(
                            "h-3 w-3 transition-transform text-muted-foreground/60",
                            !isGroupCollapsed && "rotate-90",
                          )}
                        />
                        <span className="capitalize">{group.label}</span>
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground/60">
                        {isGroupCollapsed ? `+${totalCount}` : totalCount}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="bg-black/30 backdrop-blur-lg border-white/20 text-foreground"
                  >
                    {group.label}
                  </TooltipContent>
                </Tooltip>

                {!isGroupCollapsed && (
                  <div className="pb-1">
                    {/* Sub-groups */}
                    {subGroups.map(({ subGroup, components: subComps }) => {
                      const isSubCollapsed = collapsedSubGroups.has(subGroup.id);
                      return (
                        <div key={subGroup.id}>
                          {/* Sub-group header */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="flex items-center justify-between w-full px-4 py-1 text-[10px] font-medium text-muted-foreground/80 hover:bg-muted/40 transition-colors"
                                onClick={() => toggleSubGroup(subGroup.id)}
                              >
                                <div className="flex items-center gap-1">
                                  <ChevronRight
                                    className={cn(
                                      "h-2.5 w-2.5 transition-transform text-muted-foreground/40",
                                      !isSubCollapsed && "rotate-90",
                                    )}
                                  />
                                  <span>{subGroup.label}</span>
                                </div>
                                <span className="text-[9px] tabular-nums text-muted-foreground/40">
                                  {subComps.length}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="bg-black/40 backdrop-blur-md border border-white/20 text-white/90"
                            >
                              {subGroup.label}
                            </TooltipContent>
                          </Tooltip>

                          {!isSubCollapsed && (
                            subGroup.parentGroupId === "gallery" ? (
                              <GalleryComponentGrid
                                components={subComps}
                                onDragStart={onDragStart}
                                className="pl-2"
                              />
                            ) : (
                              <ComponentGrid
                                components={subComps}
                                onDragStart={onDragStart}
                                className="pl-3"
                              />
                            )
                          )}
                        </div>
                      );
                    })}

                    {/* Direct (no sub-group) components */}
                    {directComps.length > 0 && (
                      <ComponentGrid components={directComps} onDragStart={onDragStart} />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Legacy 1-level mode ────────────────────────────────────── */}
          {!groupTree &&
            legacyGroups.map(({ category, components: cats }) => {
              const isCollapsed = collapsedGroups.has(category);
              return (
                <div key={category} className="border-b last:border-b-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
                        onClick={() => toggleGroup(category)}
                      >
                        <span className="capitalize">{category}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground/60">
                          {isCollapsed ? `+${cats.length}` : cats.length}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="bg-black/40 backdrop-blur-md border border-white/20 text-white/90"
                    >
                      {category}
                    </TooltipContent>
                  </Tooltip>
                  {!isCollapsed && (
                    <ComponentGrid components={cats} onDragStart={onDragStart} />
                  )}
                </div>
              );
            })}
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
});

// ── Shared component card grid ────────────────────────────────────────────

interface ComponentGridProps {
  components: ComponentDefinition[];
  onDragStart: (componentType: string, e: React.DragEvent) => void;
  className?: string;
}

const ComponentGrid = memo(function ComponentGrid({
  components,
  onDragStart,
  className,
}: ComponentGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-1 p-1.5", className)}>
      {components.map((comp) => (
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
  );
});

// ── Gallery component grid — 2-col cards with animated layout previews ────────

function GalleryCard({
  comp,
  onDragStart,
}: {
  comp: ComponentDefinition;
  onDragStart: (componentType: string, e: React.DragEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const layoutMode = (comp.defaultProps?.["layoutMode"] as GalleryLayoutMode) ?? "grid";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex flex-col rounded-md border border-transparent overflow-hidden",
            "hover:border-border hover:bg-muted/40 cursor-grab active:cursor-grabbing",
            "transition-colors select-none",
          )}
          draggable
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify({ type: comp.type }));
            e.dataTransfer.effectAllowed = "copy";
            onDragStart(comp.type, e);
          }}
        >
          {/* Layout preview */}
          <div className="h-[68px] w-full overflow-hidden bg-muted/50 rounded-t-md">
            <LayoutMiniPreview mode={layoutMode} animated={hovered} />
          </div>
          {/* Name */}
          <div className="px-1.5 py-1.5 text-center">
            <span className="text-[10px] font-medium leading-tight text-foreground/80 line-clamp-2">
              {comp.name}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p className="font-medium">{comp.name}</p>
        {comp.description && (
          <p className="text-xs text-muted-foreground max-w-[200px]">{comp.description}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

const GalleryComponentGrid = memo(function GalleryComponentGrid({
  components,
  onDragStart,
  className,
}: ComponentGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-1.5 p-1.5", className)}>
      {components.map((comp) => (
        <GalleryCard key={comp.type} comp={comp} onDragStart={onDragStart} />
      ))}
    </div>
  );
});
