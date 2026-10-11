import React from "react";
import { X } from "lucide-react";
import type {
  Asset,
  Breakpoint,
  BuilderDocument,
  BuilderNode,
  ComponentDefinition,
  GroupRegistry,
  PaletteCatalog,
  PopupDefinition,
} from "@ui-builder/builder-core";
import { FloatingPanel } from "./FloatingPanel";
import { FloatingPalette } from "./left/FloatingPalette";
import { AddElementsPanel } from "./left/AddElementsPanel";
import { ComponentPalette } from "./left/ComponentPalette";
import { LayerTree } from "./bottom/LayerTree";
import { PropertyPanel } from "./right/PropertyPanel";
import { PageSettings } from "./right/PageSettings";
import { AIConfigPanel } from "../ai/AIConfig";
import { PopupManagerPanel } from "../popups/PopupManagerPanel";
import { PopupPropertyPanel } from "../popups/PopupPropertyPanel";
import type { RemotePaletteProvider } from "../types/remote-palette";

const DEFAULT_COMPONENTS_PANEL_POS = { x: 16, y: 64 };
const DEFAULT_PROPERTIES_PANEL_POS = { x: -356, y: 64 };

export interface EditorPanelsHostProps {
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  paletteMode: "floating" | "docked";
  effectiveCatalog?: PaletteCatalog;
  remotePaletteProvider?: RemotePaletteProvider;
  activePaletteGroupId: string | null;
  onGroupSelect: (id: string) => void;
  locale?: string;
  layersOpen: boolean;
  onLayersToggle: () => void;
  popupsOpen: boolean;
  onPopupsToggle: () => void;
  document: BuilderDocument;
  activePopupId: string | null;
  popupTemplates: any;
  aiConfig: any;
  onCreatePopupFromTemplate: (template: any) => void;
  onCreateBlankPopup: () => void;
  onEditPopup: (id: string | null) => void;
  onDuplicatePopup: (id: string) => void;
  onDeletePopup: (id: string) => void;
  onTogglePopupEnabled: (id: string, enabled: boolean) => void;
  onUpdatePopup: (id: string, popup: any) => void;
  onSavePopupTemplate: (id: string) => Promise<any>;
  setActivePaletteGroupId: (id: string) => void;
  onPaletteClose: () => void;
  onPaletteDragStart: any;
  onPaletteItemClick: any;
  isCatalogLoading: boolean;
  isGroupLoading: boolean;
  allComponents: ComponentDefinition[];
  onComponentDragStart: any;
  groupRegistry?: GroupRegistry;
  layersPanelPos: { x: number; y: number };
  activeRootNodeId: string;
  selectedNodeIds: string[];
  activePopupSelection: "shell" | "content" | null;
  onSelect: (nodeId: string | string[], addToSelection?: boolean) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onNodeHover: (id: string | null) => void;
  activePopup: PopupDefinition | null;
  onAddGoal: any;
  onUpdateGoal: any;
  onRemoveGoal: any;
  onAddVariant: any;
  onUpdateVariant: any;
  onRemoveVariant: any;
  onEditVariantContent: any;
  onUpdateExperiment: any;
  activeVariantId: string | null;
  onAddLocale: any;
  onUpdateLocale: any;
  onRemoveLocale: any;
  onEditLocaleContent: any;
  activePopupLocale: string | null;
  onUpdateTargeting: any;
  onUpdateSchedule: any;
  onUpdateFrequency: any;
  onAssignCampaign: any;
  onSetPopupPriority: any;
  selectedNode: BuilderNode | null;
  selectedDefinition?: ComponentDefinition | null;
  breakpoint: Breakpoint;
  onPropChange: (key: string, value: any) => void;
  onStyleChange: (key: string, value: any) => void;
  onInteractionsChange: (interactions: any) => void;
  assets: Asset[];
  onOpenMediaManager: (onSelect?: any) => void;
  spacingRects?: any;
  onCanvasConfigChange: (key: any, value: any) => void;
  onAIConfigChange: (cfg: any) => void;
}

export function EditorPanelsHost({
  leftPanelVisible,
  rightPanelVisible,
  paletteMode,
  effectiveCatalog,
  remotePaletteProvider,
  activePaletteGroupId,
  onGroupSelect,
  locale,
  layersOpen,
  onLayersToggle,
  popupsOpen,
  onPopupsToggle,
  document,
  activePopupId,
  popupTemplates,
  aiConfig,
  onCreatePopupFromTemplate,
  onCreateBlankPopup,
  onEditPopup,
  onDuplicatePopup,
  onDeletePopup,
  onTogglePopupEnabled,
  onUpdatePopup,
  onSavePopupTemplate,
  setActivePaletteGroupId,
  onPaletteClose,
  onPaletteDragStart,
  onPaletteItemClick,
  isCatalogLoading,
  isGroupLoading,
  allComponents,
  onComponentDragStart,
  groupRegistry,
  layersPanelPos,
  activeRootNodeId,
  selectedNodeIds,
  activePopupSelection,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onNodeHover,
  activePopup,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
  onAddVariant,
  onUpdateVariant,
  onRemoveVariant,
  onEditVariantContent,
  onUpdateExperiment,
  activeVariantId,
  onAddLocale,
  onUpdateLocale,
  onRemoveLocale,
  onEditLocaleContent,
  activePopupLocale,
  onUpdateTargeting,
  onUpdateSchedule,
  onUpdateFrequency,
  onAssignCampaign,
  onSetPopupPriority,
  selectedNode,
  selectedDefinition,
  breakpoint,
  onPropChange,
  onStyleChange,
  onInteractionsChange,
  assets,
  onOpenMediaManager,
  spacingRects,
  onCanvasConfigChange,
  onAIConfigChange,
}: EditorPanelsHostProps) {
  return (
    <>
      {/* Palette */}
      {leftPanelVisible && paletteMode === "floating" && (effectiveCatalog || remotePaletteProvider) && (
        <FloatingPalette
          catalog={effectiveCatalog!}
          activeGroupId={activePaletteGroupId}
          onGroupSelect={onGroupSelect}
          locale={locale}
          layersOpen={layersOpen}
          onLayersToggle={onLayersToggle}
          popupsOpen={popupsOpen}
          onPopupsToggle={onPopupsToggle}
        />
      )}

      {leftPanelVisible && paletteMode === "floating" && popupsOpen && (
        <div className="fixed left-14 top-0 bottom-0 z-50 flex" style={{ width: 398 }}>
          <div className="flex flex-col flex-1 bg-background/50 backdrop-blur-md border-r border-border/50 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 flex-shrink-0">
              <span className="text-sm font-semibold text-foreground">Popups</span>
              <button
                type="button"
                aria-label="Close"
                onClick={onPopupsToggle}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <PopupManagerPanel
                document={document}
                activePopupId={activePopupId}
                registryTemplates={popupTemplates}
                backendUrl={aiConfig.backendUrl}
                onCreateFromTemplate={onCreatePopupFromTemplate}
                onCreateBlank={onCreateBlankPopup}
                onEdit={onEditPopup}
                onDuplicate={onDuplicatePopup}
                onDelete={onDeletePopup}
                onToggleEnabled={onTogglePopupEnabled}
                onUpdatePopup={onUpdatePopup}
                onSaveToLibrary={onSavePopupTemplate}
              />
            </div>
          </div>
        </div>
      )}

      {leftPanelVisible && paletteMode === "docked" && (effectiveCatalog || remotePaletteProvider) && (
        <AddElementsPanel
          catalog={effectiveCatalog}
          activeGroupId={activePaletteGroupId}
          onGroupChange={setActivePaletteGroupId}
          onClose={onPaletteClose}
          onItemDragStart={onPaletteDragStart}
          onItemClick={onPaletteItemClick}
          locale={locale}
          isLoading={isCatalogLoading || isGroupLoading}
          popupsOpen={popupsOpen}
          onPopupsToggle={onPopupsToggle}
          popupContent={
            <PopupManagerPanel
              document={document}
              activePopupId={activePopupId}
              registryTemplates={popupTemplates}
              backendUrl={aiConfig.backendUrl}
              onCreateFromTemplate={onCreatePopupFromTemplate}
              onCreateBlank={onCreateBlankPopup}
              onEdit={onEditPopup}
              onDuplicate={onDuplicatePopup}
              onDelete={onDeletePopup}
              onToggleEnabled={onTogglePopupEnabled}
              onUpdatePopup={onUpdatePopup}
              onSaveToLibrary={onSavePopupTemplate}
            />
          }
        />
      )}

      {leftPanelVisible && !(effectiveCatalog || remotePaletteProvider) && !popupsOpen && (
        <FloatingPanel id="components" title="Components" defaultPosition={DEFAULT_COMPONENTS_PANEL_POS}>
          <div className="h-[40vh] min-h-[300px] overflow-hidden">
            <ComponentPalette components={allComponents} onDragStart={onComponentDragStart} groupRegistry={groupRegistry} />
          </div>
        </FloatingPanel>
      )}

      {/* Layers */}
      {leftPanelVisible && layersOpen && (
        <FloatingPanel id="layers" title="Layers" defaultPosition={layersPanelPos} onClose={onLayersToggle}>
          <div className="h-[48vh] min-h-[250px] overflow-hidden">
            <LayerTree
              document={document}
              rootNodeId={activeRootNodeId}
              selectedIds={selectedNodeIds}
              activePopupId={activePopupId}
              activePopupSelection={activePopupSelection}
              onSelect={onSelect}
              onSelectPage={() => onEditPopup(null)}
              onSelectPopup={onEditPopup}
              onTogglePopupEnabled={onTogglePopupEnabled}
              onToggleHidden={onToggleHidden}
              onToggleLocked={onToggleLocked}
              onNodeHover={onNodeHover}
            />
          </div>
        </FloatingPanel>
      )}

      {/* Properties / Page settings */}
      {rightPanelVisible && (
        <FloatingPanel
          id="properties"
          title={activePopup && activePopupSelection === "shell" ? "Popup" : selectedNode ? "Properties" : "Page Settings"}
          defaultPosition={DEFAULT_PROPERTIES_PANEL_POS}
          dockable
          dockOffset={{ top: 48, right: 12, bottom: 12 }}
        >
          <div className="flex h-[70vh] min-h-full max-h-[calc(100vh-72px)] flex-col overflow-hidden">
            {activePopup && activePopupSelection === "shell" ? (
              <PopupPropertyPanel
                popup={activePopup}
                document={document}
                onChange={(popup) => onUpdatePopup(activePopup.id, popup)}
                v4={{
                  onAddGoal,
                  onUpdateGoal,
                  onRemoveGoal,
                  onAddVariant,
                  onUpdateVariant,
                  onRemoveVariant,
                  onEditVariantContent,
                  onUpdateExperiment,
                  activeVariantId,
                }}
                v5={{
                  onAddLocale,
                  onUpdateLocale,
                  onRemoveLocale,
                  onEditLocaleContent,
                  activeLocale: activePopupLocale,
                  onUpdateTargeting,
                  onUpdateSchedule,
                  onUpdateFrequency,
                }}
                v6={{
                  campaigns: document.popupCampaigns ?? {},
                  onAssignCampaign,
                  onSetPriority: onSetPopupPriority,
                }}
              />
            ) : selectedNode ? (
              <PropertyPanel
                selectedNode={selectedNode}
                definition={selectedDefinition ?? null}
                breakpoint={breakpoint}
                onPropChange={onPropChange}
                onStyleChange={onStyleChange}
                onInteractionsChange={onInteractionsChange}
                popups={Object.values(document.popups ?? {})}
                assets={assets}
                onOpenMediaManager={onOpenMediaManager}
                elementSize={spacingRects?.elementSize}
              />
            ) : (
              <div className="flex flex-col h-full min-h-0">
                <PageSettings document={document} onCanvasConfigChange={onCanvasConfigChange} />
                <div className="border-t shrink-0">
                  <AIConfigPanel config={aiConfig} onChange={onAIConfigChange} />
                </div>
              </div>
            )}
          </div>
        </FloatingPanel>
      )}
    </>
  );
}
