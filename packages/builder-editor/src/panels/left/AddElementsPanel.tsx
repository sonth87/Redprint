import React, { useState, useCallback, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@ui-builder/ui";
import type { PaletteCatalog, PaletteGroup, PaletteType, PaletteItem } from "@ui-builder/builder-core";
import { useTranslation } from "react-i18next";
import { PaletteItemCard } from "./PaletteItemCard";

// ── Dynamic Lucide icon helper ─────────────────────────────────────────────

function getLucideIcon(name: string): React.ElementType {
  const pascal = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return (LucideIcons as Record<string, unknown>)[pascal] as React.ElementType ?? LucideIcons.Box;
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface AddElementsPanelProps {
  catalog: PaletteCatalog;
  activeGroupId: string | null;
  onGroupChange: (groupId: string) => void;
  onClose: () => void;
  onItemDragStart: (item: PaletteItem, e: React.DragEvent) => void;
  onItemClick: (item: PaletteItem) => void;
  locale?: string;
  isLoading?: boolean;
}

// ── Type section ──────────────────────────────────────────────────────────

interface TypeSectionProps {
  type: PaletteType;
  items: PaletteItem[];
  locale?: string;
  onDragStart: (item: PaletteItem, e: React.DragEvent) => void;
  onItemClick: (item: PaletteItem) => void;
}

const TypeSection: React.FC<TypeSectionProps> = ({ type, items, locale, onDragStart, onItemClick }) => {
  const layout = type.layout ?? "grid";
  const [open, setOpen] = useState(true);
  const { i18n } = useTranslation();
  const lang = locale ?? i18n.language ?? "en";

  const typeLabel: string = useMemo(() => {
    if (type.i18n) {
      const override = (type.i18n as Record<string, string>)[lang];
      if (override) return override;
    }
    return type.label;
  }, [type, lang]);

  if (items.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left hover:bg-accent/40 transition-colors rounded-md"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex-1 truncate">
          {typeLabel}
        </span>
        <span className="text-[10px] text-muted-foreground/60">{items.length}</span>
      </button>

      {open && (
        <div className={cn(
          "px-3 pb-2",
          layout === "list" ? "flex flex-col gap-1" :
          layout === "preview" ? "grid grid-cols-2 gap-4" :
          "grid grid-cols-2 gap-2"
        )}>
          {items.map((item) => (
            <PaletteItemCard
              key={item.id}
              item={item}
              layout={layout}
              locale={locale}
              onDragStart={(e) => onDragStart(item, e)}
              onClick={() => onItemClick(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export const AddElementsPanel: React.FC<AddElementsPanelProps> = ({
  catalog,
  activeGroupId,
  onGroupChange,
  onClose,
  onItemDragStart,
  onItemClick,
  locale,
  isLoading = false,
}) => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const lang = locale ?? i18n.language ?? "en";

  const groups: PaletteGroup[] = useMemo(
    () => [...catalog.groups].sort((a, b) => a.order - b.order),
    [catalog.groups],
  );

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === (activeGroupId ?? groups[0]?.id)) ?? groups[0] ?? null,
    [groups, activeGroupId],
  );

  const getGroupLabel = useCallback(
    (group: PaletteGroup): string => {
      if (group.i18n) {
        const override = (group.i18n as Record<string, string>)[lang];
        if (override) return override;
      }
      return t(`palette.groups.${group.id}`, { defaultValue: group.label });
    },
    [lang, t],
  );

  // Filter items matching search term
  const filterItems = useCallback(
    (items: PaletteItem[]): PaletteItem[] => {
      if (!searchQuery.trim()) return items;
      const q = searchQuery.toLowerCase();
      return items.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(q);
        const tagMatch = item.tags?.some((tag) => tag.toLowerCase().includes(q));
        const i18nName = item.i18n ? (item.i18n as Record<string, { name?: string }>)[lang]?.name : undefined;
        const i18nMatch = i18nName?.toLowerCase().includes(q);
        return Boolean(nameMatch || tagMatch || i18nMatch);
      });
    },
    [searchQuery, lang],
  );

  const filteredTypes = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.types
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((type) => ({ type, items: filterItems(type.items) }))
      .filter(({ items }) => items.length > 0);
  }, [activeGroup, filterItems]);

  const totalFilteredItems = filteredTypes.reduce((sum, { items }) => sum + items.length, 0);

  return (
    <div className="fixed left-0 top-0 bottom-0 z-50 flex" style={{ width: 380 }}>
      {/* ── Left: group icon rail ── */}
      <div className="flex flex-col items-center gap-1 py-3 px-1.5 bg-background/50 backdrop-blur-md border-r border-border/50 w-12 flex-shrink-0">
        {groups.map((group) => {
          const Icon = getLucideIcon(group.icon);
          const label = getGroupLabel(group);
          const isActive = group.id === (activeGroupId ?? groups[0]?.id);

          return (
            <button
              key={group.id}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onGroupChange(group.id)}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                "text-muted-foreground hover:text-foreground hover:bg-accent/70",
                isActive && "bg-primary/10 text-primary ring-1 ring-primary/30",
              )}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* ── Right: content area ── */}
      <div className="flex flex-col flex-1 bg-background/50 backdrop-blur-md border-r border-border/50 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 flex-shrink-0">
          <span className="text-sm font-semibold text-foreground">
            {t("palette.title", { defaultValue: "Add Elements" })}
          </span>
          <button
            type="button"
            aria-label={t("common.close", { defaultValue: "Close" })}
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border/50 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("palette.searchPlaceholder", { defaultValue: "Search elements…" })}
              aria-label={t("palette.search", { defaultValue: "Search" })}
              className="w-full h-7 pl-8 pr-3 text-xs rounded-md bg-muted/50 border border-border/50 focus:outline-none focus:ring-1 focus:ring-ring placeholder-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label={t("common.close")}
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Active group label */}
        {activeGroup && !searchQuery && (
          <div className="px-3 py-1.5 flex-shrink-0">
            <h2 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">
              {getGroupLabel(activeGroup)}
            </h2>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              {t("palette.loading", { defaultValue: "Loading…" })}
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <LucideIcons.SearchX className="w-8 h-8 opacity-40" />
              <span className="text-sm">{t("palette.noResults", { defaultValue: "No elements found" })}</span>
            </div>
          ) : (
            <div className="py-1">
              {filteredTypes.map(({ type, items }) => (
                <TypeSection
                  key={type.id}
                  type={type}
                  items={items}
                  locale={locale}
                  onDragStart={onItemDragStart}
                  onItemClick={onItemClick}
                />
              ))}
              {searchQuery && (
                <p className="text-center text-[10px] text-muted-foreground/50 py-2">
                  {totalFilteredItems}{" "}
                  {t("palette.resultsCount", { defaultValue: "result(s)" })}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
