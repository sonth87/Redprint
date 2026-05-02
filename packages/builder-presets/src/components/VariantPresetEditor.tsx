import React, { useMemo, useEffect, useRef } from "react";
import type { ComponentDefinition, ComponentRegistry } from "@ui-builder/builder-core";
import { createBuilder } from "@ui-builder/builder-core";
import { BuilderProvider } from "@ui-builder/builder-react";
import type { PaletteItem } from "../types/palette.types";
import { Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui-builder/ui";
import { buildPreviewDocument } from "../lib/buildPreviewDocument";
import { documentToPaletteItem } from "../lib/documentToPaletteItem";
import { InteractiveCanvas } from "./InteractiveCanvas";
import { PropSchemaEditor } from "./PropSchemaEditor";
import { PresetInfoPanel } from "./PresetInfoPanel";
import { Info, SlidersHorizontal } from "lucide-react";
import { usePresetEditorState } from "../hooks/usePresetEditorState";
import type { PanelTab } from "../hooks/usePresetEditorState";

const TABS: Array<{ id: PanelTab; label: string; Icon: React.ElementType }> = [
  { id: "info", label: "Component Info", Icon: Info },
  { id: "properties", label: "Properties", Icon: SlidersHorizontal },
];

export interface VariantPresetEditorProps {
  item: PaletteItem;
  registry: ComponentRegistry;
  onReset: () => void;
  onChange?: (updatedItem: PaletteItem) => void;
  allPresets?: PaletteItem[];
}

export function VariantPresetEditor({
  item,
  registry,
  onReset,
  onChange,
  allPresets = [],
}: VariantPresetEditorProps) {
  const builder = useMemo(() => {
    const doc = buildPreviewDocument(item);
    const b = createBuilder({
      document: {
        nodes: doc.nodes,
        rootNodeId: doc.rootNodeId,
        name: item.name,
        breakpoints: doc.breakpoints,
        assets: doc.assets,
        canvasConfig: {
          showGrid: false,
          gridSize: 8,
          snapEnabled: false,
          snapThreshold: 6,
          snapToGrid: false,
          snapToComponents: false,
          rulerEnabled: false,
          showHelperLines: false,
        },
      },
    });
    const components = registry.listComponents();
    for (const component of components) {
      b.registry.registerComponent(component);
    }
    return b;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BuilderProvider builder={builder}>
      <VariantPresetEditorInner
        item={item}
        registry={registry}
        onReset={onReset}
        onChange={onChange}
        allPresets={allPresets}
      />
    </BuilderProvider>
  );
}

function VariantPresetEditorInner({
  item,
  registry,
  onReset,
  onChange,
  allPresets = [],
}: VariantPresetEditorProps) {
  const {
    state,
    dispatch,
    breakpoint,
    activeTab,
    setActiveTab,
    selectedNodeId,
    selectedNode,
    selectedDefinition,
  } = usePresetEditorState(registry, allPresets);

  const definition = registry.getComponent(item.componentType) ?? null;

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onChange?.(documentToPaletteItem(item, state.document));
  }, [state.document]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <InteractiveCanvas />
      </div>

      <Separator orientation="vertical" />

      <div className="w-80 shrink-0 border-l overflow-hidden flex h-full">
        <div className="flex-1 overflow-hidden flex flex-col h-full">
          {activeTab === "info" ? (
            <PresetInfoPanel
              item={item}
              definition={definition}
              registryInstance={registry}
            />
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-hidden flex flex-col">
                <PropSchemaEditor
                  definition={selectedDefinition}
                  node={selectedNode}
                  breakpoint={breakpoint}
                  onPropChange={(key, val) => {
                    if (breakpoint && breakpoint !== "desktop") {
                      dispatch({
                        type: "UPDATE_RESPONSIVE_PROPS",
                        payload: { nodeId: selectedNodeId, breakpoint, props: { [key]: val } },
                      });
                    } else {
                      dispatch({
                        type: "UPDATE_PROPS",
                        payload: { nodeId: selectedNodeId, props: { [key]: val } },
                      });
                    }
                  }}
                  onStyleChange={(key, val) => {
                    dispatch({
                      type: "UPDATE_STYLE",
                      payload: { nodeId: selectedNodeId, style: { [key]: val }, breakpoint },
                    });
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="w-9 shrink-0 border-l flex flex-col items-center py-2 gap-1 bg-background">
          <TooltipProvider delayDuration={300}>
            {TABS.map(({ id, label, Icon }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab(id)}
                    className={
                      "w-7 h-7 rounded flex items-center justify-center transition-colors " +
                      (activeTab === id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted")
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
