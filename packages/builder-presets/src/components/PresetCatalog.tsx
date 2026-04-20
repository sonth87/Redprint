import React, { useState, useMemo } from "react";
import type { ComponentRegistry, StyleConfig } from "@ui-builder/builder-core";
import type { PaletteGroup, PaletteItem } from "../types/palette.types";
import { buildPreviewDocument } from "../lib/buildPreviewDocument";
import { RuntimeRenderer } from "@ui-builder/builder-renderer";
import { Input, ScrollArea, Badge } from "@ui-builder/ui";
import {
  Search, ChevronDown, ChevronRight,
  Type, Image, Square, Mouse, Pointer,
  Menu, Layout, List, Box, Grid,
  Zap, Settings, Layers, Navigation
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  type: Type,
  image: Image,
  square: Square,
  "mouse-pointer": Pointer,
  menu: Menu,
  layout: Layout,
  list: List,
  box: Box,
  grid: Grid,
  zap: Zap,
  settings: Settings,
  layers: Layers,
  navigation: Navigation,
};

const MINI_THUMB_W = 120;
const MINI_THUMB_H = 72;
// Render at 200px then scale to fit thumbnail width — gives readable text at ~0.6×
const MINI_WIDTH = 200;
const MINI_SCALE = MINI_THUMB_W / MINI_WIDTH;

interface MiniRenderProps {
  item: PaletteItem;
  registry: ComponentRegistry;
}

function MiniRender({ item, registry }: MiniRenderProps) {
  const definition = registry.getComponent(item.componentType);
  if (!definition) {
    return (
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
        {item.componentType.slice(0, 3)}
      </span>
    );
  }

  const doc = buildPreviewDocument(
    item.componentType,
    item.props,
    (item.style ?? {}) as Partial<StyleConfig>,
  );

  const alignStart = definition.category === "content";

  return (
    <div style={{ minWidth: MINI_THUMB_W, width: MINI_THUMB_W, height: MINI_THUMB_H, overflow: "hidden", position: "relative", display: "flex", alignItems: "center", justifyContent: alignStart ? "flex-start" : "center" }}>
      <div
        style={{
          width: MINI_WIDTH,
          transformOrigin: alignStart ? "center left" : "center center",
          transform: `scale(${MINI_SCALE})`,
          pointerEvents: "none",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <RuntimeRenderer
          document={doc}
          registry={registry}
          config={{ breakpoint: "desktop", variables: {}, attachNodeIds: false }}
        />
      </div>
    </div>
  );
}

function PaletteItemRow({
  item,
  selected,
  onSelect,
  registry,
}: {
  item: PaletteItem;
  selected: boolean;
  onSelect: (item: PaletteItem) => void;
  registry: ComponentRegistry;
}) {
  return (
    <button
      className={
        "w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 " +
        (selected
          ? "bg-primary/5"
          : "hover:bg-muted text-foreground")
      }
      onClick={() => onSelect(item)}
    >
      <div
        className={
          "shrink-0 w-32 h-18 rounded border overflow-hidden flex items-center justify-center " +
          (selected ? "border-primary-foreground/30" : "border-border bg-white")
        }
      >
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <MiniRender item={item} registry={registry} />
        )}
      </div>
      <div className="flex flex-col items-start min-w-0">
        <span className="truncate w-full font-medium leading-tight">{item.name}</span>
        <span
          className={
            "text-[9px] leading-tight " +
            (selected ? "" : "text-muted-foreground")
          }
        >
          {item.componentType}
        </span>
      </div>
    </button>
  );
}

interface PresetCatalogProps {
  groups: PaletteGroup[];
  selectedItemId: string | null;
  onSelect: (item: PaletteItem) => void;
  registry: ComponentRegistry;
}

export function PresetCatalog({ groups, selectedItemId, onSelect, registry }: PresetCatalogProps) {
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.id)),
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groups;

    return groups.map((group) => ({
      ...group,
      types: group.types
        .map((type) => ({
          ...type,
          items: type.items.filter(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              item.componentType.toLowerCase().includes(q) ||
              item.tags?.some((t) => t.toLowerCase().includes(q)),
          ),
        }))
        .filter((type) => type.items.length > 0),
    })).filter((group) => group.types.length > 0);
  }, [search, groups]);

  const totalItems = useMemo(
    () =>
      groups.reduce(
        (sum, g) => sum + g.types.reduce((s, t) => s + t.items.length, 0),
        0,
      ),
    [groups],
  );

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
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
            placeholder="Search presets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-3 py-1.5 border-b shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {totalItems} presets
        </span>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            No presets found
          </div>
        )}

        {filtered.map((group) => {
          const collapsed = collapsedGroups.has(group.id);
          const allItems = group.types.flatMap((t) => t.items);

          return (
            <div key={group.id}>
              <button
                className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors"
                onClick={() => toggleGroup(group.id)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-4 h-4 rounded text-[9px] font-bold bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    {group.icon && ICON_MAP[group.icon] ? (
                      React.createElement(ICON_MAP[group.icon]!, { className: "h-3 w-3" })
                    ) : (
                      group.label[0]
                    )}
                  </div>
                  <span className="truncate">{group.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px] px-1 h-4 font-normal">
                    {allItems.length}
                  </Badge>
                  {collapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </button>

              {!collapsed && allItems.map((item) => (
                <PaletteItemRow
                  key={item.id}
                  item={item}
                  selected={selectedItemId === item.id}
                  onSelect={onSelect}
                  registry={registry}
                />
              ))}
            </div>
          );
        })}
      </ScrollArea>
    </>
  );
}
