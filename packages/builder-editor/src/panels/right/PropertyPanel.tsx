import React, { memo, useState } from "react";
import { Badge } from "@ui-builder/ui";
import { cn } from "@ui-builder/ui";
import {
  Paintbrush,
  Zap,
  Database,
  Settings2,
  EyeOff,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Breakpoint } from "@ui-builder/builder-core";

import { DesignTab } from "./tabs/DesignTab";
import { EventsTab } from "./tabs/EventsTab";
import { DataTab } from "./tabs/DataTab";
import { AdvancedTab } from "./tabs/AdvancedTab";
import type { PropertyPanelProps } from "./property-panel.types";

// Re-export types for external use
export type { PropertyPanelProps } from "./property-panel.types";

type TabId = "design" | "events" | "data" | "advanced";

const TABS: { id: TabId; icon: React.ReactNode; labelKey: string }[] = [
  { id: "design",   icon: <Paintbrush className="h-3.5 w-3.5" />, labelKey: "propertyPanel.design" },
  { id: "events",   icon: <Zap        className="h-3.5 w-3.5" />, labelKey: "propertyPanel.events" },
  { id: "data",     icon: <Database   className="h-3.5 w-3.5" />, labelKey: "propertyPanel.data" },
  { id: "advanced", icon: <Settings2  className="h-3.5 w-3.5" />, labelKey: "propertyPanel.advanced" },
];

/**
 * PropertyPanel v2 — modular, plugin-based, vertical tabs.
 *
 * Tabs are icon-only on the left rail; tooltip on hover shows the label.
 * Each tab content is a separate component for clean separation of concerns.
 */
export const PropertyPanel = memo(function PropertyPanel({
  selectedNode,
  definition,
  breakpoint = "desktop",
  onPropChange,
  onStyleChange,
  onInteractionsChange,
  onSpacingHover,
}: PropertyPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("design");

  if (!selectedNode || !definition) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2 p-4">
        <Settings2 className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-center">{t("panels.selectComponent")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-b flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">
            {selectedNode.name ?? definition.name}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">
            {selectedNode.type}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedNode.locked && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5">
              <Lock className="h-2.5 w-2.5" />
            </Badge>
          )}
          {selectedNode.hidden && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              <EyeOff className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
      </div>

      {/* ── Body: vertical tab bar + content ───────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Vertical tab rail */}
        <div className="flex flex-col items-center border-r w-8 shrink-0 pt-1.5 gap-0.5 bg-muted/30">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              title={t(tab.labelKey)}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative h-8 w-8 flex items-center justify-center rounded-sm transition-colors",
                activeTab === tab.id
                  ? "text-foreground bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {tab.icon}
              {/* Active indicator bar on the right */}
              {activeTab === tab.id && (
                <span className="absolute right-0 top-1 bottom-1 w-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {activeTab === "design" && (
            <DesignTab
              node={selectedNode}
              definition={definition}
              breakpoint={breakpoint}
              onPropChange={onPropChange}
              onStyleChange={onStyleChange}
              onSpacingHover={onSpacingHover}
            />
          )}
          {activeTab === "events" && (
            <EventsTab node={selectedNode} onInteractionsChange={onInteractionsChange} />
          )}
          {activeTab === "data" && (
            <DataTab node={selectedNode} onPropChange={onPropChange} />
          )}
          {activeTab === "advanced" && (
            <AdvancedTab node={selectedNode} onPropChange={onPropChange} />
          )}
        </div>
      </div>
    </div>
  );
});
