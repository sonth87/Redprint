/**
 * LeftSidebar — icon rail + expandable panel.
 *
 * Provides quick access to Components, Presets, Layers, Media, and Popups
 * via an icon rail on the far left. Clicking an icon expands
 * the corresponding panel beside the rail.
 */
import React, { memo } from "react";
import {
  AppWindow,
  Image,
  LayoutGrid,
  LayoutTemplate,
  Layers,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { cn } from "@ui-builder/ui";

export type LeftPanelTab = "components" | "presets" | "layers" | "media" | "popups";

export interface LeftSidebarProps {
  activeTab: LeftPanelTab | null;
  onTabChange: (tab: LeftPanelTab | null) => void;
  /** Panel content rendered beside the icon rail */
  children: React.ReactNode;
}

const MAIN_TABS: { id: LeftPanelTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "components", label: "Components", icon: LayoutGrid },
  { id: "presets", label: "Presets", icon: LayoutTemplate },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "media", label: "Media", icon: Image },
];

const BOTTOM_TABS: { id: LeftPanelTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "popups", label: "Popups", icon: AppWindow },
];

export const LeftSidebar = memo(function LeftSidebar({
  activeTab,
  onTabChange,
  children,
}: LeftSidebarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full">
        {/* Icon rail */}
        <div className="flex flex-col items-center w-10 border-r bg-muted/30 py-2 gap-1 shrink-0">
          {/* Main tabs */}
          {MAIN_TABS.map(({ id, label, icon: Icon }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                    activeTab === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  onClick={() => onTabChange(activeTab === id ? null : id)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}

          {/* Spacer pushes popup tab to bottom */}
          <div className="flex-1" />

          {/* Bottom tabs (popups) */}
          {BOTTOM_TABS.map(({ id, label, icon: Icon }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                    activeTab === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  onClick={() => onTabChange(activeTab === id ? null : id)}
                >
                  <Icon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Expandable panel */}
        {activeTab && (
          <div className="w-[240px] border-r bg-background overflow-hidden">
            {children}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});
