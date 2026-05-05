import React, { memo, useCallback, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent, Badge, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@ui-builder/ui";
import type { Asset, BuilderNode, Breakpoint, ComponentDefinition, InteractionConfig } from "@ui-builder/builder-core";
import { resolveStyle, resolveProps } from "@ui-builder/builder-core";
import {
  Paintbrush,
  Zap,
  Sparkles,
  Database,
  Settings2,
  EyeOff,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { MediaContext, type MediaContextValue } from "./context";

export interface PropertyPanelProps {
  selectedNode: BuilderNode | null;
  definition: ComponentDefinition | null;
  breakpoint?: Breakpoint;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
  onInteractionsChange?: (interactions: InteractionConfig[]) => void;
  /** Asset list from AssetProvider — used by image/video controls */
  assets?: Asset[];
  /** Callback to open MediaManager and get selected asset back */
  onOpenMediaManager?: (onSelect: (asset: Asset) => void) => void;
}

import { DesignTab } from "./tabs/DesignTab";
import { EventsTab } from "./tabs/EventsTab";
import { EffectsTab } from "./tabs/EffectsTab";
import { DataTab } from "./tabs/DataTab";
import { AdvancedTab } from "./tabs/AdvancedTab";




// ── Main Property Panel ──────────────────────────────────────────────────

/**
 * PropertyPanel — right panel displaying selected node's editable properties.
 *
 * 5 tabs: Design | Events | Effects | Data | Advanced
 */
export const PropertyPanel = memo(function PropertyPanel({
  selectedNode,
  definition,
  breakpoint,
  onPropChange,
  onStyleChange,
  onInteractionsChange,
  assets = [],
  onOpenMediaManager = () => {},
}: PropertyPanelProps) {
  const { t } = useTranslation();
  const mediaCtx: MediaContextValue = useMemo(
    () => ({ assets, onOpenMediaManager }),
    [assets, onOpenMediaManager],
  );

  if (!selectedNode || !definition) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-2 p-4">
        <Settings2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-center">{t("panels.selectComponent")}</p>
      </div>
    );
  }

  const activeBp = breakpoint ?? "desktop";
  const resolvedStyle = resolveStyle(selectedNode.style, selectedNode.responsiveStyle ?? {}, activeBp);
  const resolvedPropsMap = resolveProps(selectedNode.props, selectedNode.responsiveProps, activeBp);
  const style = resolvedStyle as Record<string, unknown>;
  const interactions = selectedNode.interactions ?? [];



  return (
    <MediaContext.Provider value={mediaCtx}>
    <div className="flex flex-col h-full">
      {/* Node type header */}
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold truncate">{selectedNode.name ?? definition.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{selectedNode.type}</p>
        </div>
        <div className="flex items-center gap-1">
          {selectedNode.locked && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">{t("propertyPanel.locked")}</Badge>
          )}
          {selectedNode.hidden && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              <EyeOff className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
      </div>

      <TooltipProvider delayDuration={400}>
      <Tabs orientation="vertical" defaultValue="design" className="flex flex-row flex-1 min-h-0">
        <TabsList className="flex flex-col w-10 h-full border-r py-1 px-0.5 gap-0.5 rounded-none bg-muted/30 justify-start">
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="design" className="w-8 h-8 p-0 flex items-center justify-center rounded-md aria-selected:bg-primary aria-selected:text-primary-foreground">
                <Paintbrush className="h-4 w-4" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{t("propertyPanel.design")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="events" className="w-8 h-8 p-0 flex items-center justify-center rounded-md aria-selected:bg-primary aria-selected:text-primary-foreground">
                <Zap className="h-4 w-4" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{t("propertyPanel.events")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="effects" className="w-8 h-8 p-0 flex items-center justify-center rounded-md aria-selected:bg-primary aria-selected:text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{t("propertyPanel.effects")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="data" className="w-8 h-8 p-0 flex items-center justify-center rounded-md aria-selected:bg-primary aria-selected:text-primary-foreground">
                <Database className="h-4 w-4" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{t("propertyPanel.data")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="advanced" className="w-8 h-8 p-0 flex items-center justify-center rounded-md aria-selected:bg-primary aria-selected:text-primary-foreground">
                <Settings2 className="h-4 w-4" />
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{t("propertyPanel.advanced")}</TooltipContent>
          </Tooltip>
        </TabsList>

        {/* ── Design tab ───────────────────────────────────────────── */}
        <TabsContent value="design" className="flex-1 overflow-hidden mt-0">
          <DesignTab
            definition={definition}
            selectedNode={selectedNode}
            resolvedPropsMap={resolvedPropsMap}
            style={style}
            onPropChange={onPropChange}
            onStyleChange={onStyleChange}
          />
        </TabsContent>

        {/* ── Events tab ───────────────────────────────────────────── */}
        <TabsContent value="events" className="flex-1 overflow-hidden mt-0">
          <EventsTab
            interactions={interactions}
            onInteractionsChange={onInteractionsChange}
          />
        </TabsContent>

        {/* ── Effects tab ──────────────────────────────────────────── */}
        <TabsContent value="effects" className="flex-1 overflow-hidden mt-0">
          <EffectsTab
            selectedNode={selectedNode}
            style={style}
            onPropChange={onPropChange}
            onStyleChange={onStyleChange}
          />
        </TabsContent>

        {/* ── Data tab ─────────────────────────────────────────────── */}
        <TabsContent value="data" className="flex-1 overflow-hidden mt-0">
          <DataTab
            selectedNode={selectedNode}
            onPropChange={onPropChange}
          />
        </TabsContent>

        {/* ── Advanced tab ─────────────────────────────────────────── */}
        <TabsContent value="advanced" className="flex-1 overflow-hidden mt-0">
          <AdvancedTab
            selectedNode={selectedNode}
            onPropChange={onPropChange}
          />
        </TabsContent>
      </Tabs>
      </TooltipProvider>
    </div>
    </MediaContext.Provider>
  );
});
