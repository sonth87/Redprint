import React, { useState, useMemo } from "react";
import type { ComponentDefinition, StyleConfig } from "@ui-builder/builder-core";
import type { ComponentRegistry } from "@ui-builder/builder-core";
import { createBuilder } from "@ui-builder/builder-core";
import { BASE_COMPONENTS } from "@ui-builder/builder-components";
import { BuilderProvider, useBuilder, useSelection } from "@ui-builder/builder-react";
import type { PaletteItem } from "@/types/palette.types";
import { Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui-builder/ui";
import { buildPreviewDocument } from "@/lib/buildPreviewDocument";
import { InteractiveCanvas } from "./InteractiveCanvas";
import { PropSchemaEditor } from "./PropSchemaEditor";
import { ComponentInfoPanel } from "./ComponentInfoPanel";
import { NodeTreePanel } from "./NodeTreePanel";
import { Info, SlidersHorizontal } from "lucide-react";

type PanelTab = "info" | "properties";

const TABS: Array<{ id: PanelTab; label: string; Icon: React.ElementType }> = [
  { id: "info", label: "Component Info", Icon: Info },
  { id: "properties", label: "Properties & Style", Icon: SlidersHorizontal },
];

interface ComponentEditorPaneProps {
  item: PaletteItem;
  definition: ComponentDefinition | null;
  registry: ComponentRegistry;
  onReset: () => void;
}

/**
 * Keyed wrapper — remounts entirely when item.id changes.
 * Creates a fresh BuilderAPI from the palette item's document on each mount.
 */
export function ComponentEditorPane({
  item,
  definition,
  registry,
  onReset,
}: ComponentEditorPaneProps) {
  // Create builder once per mount (item.id keying in App.tsx ensures remount on item change)
  const builder = useMemo(() => {
    const doc = buildPreviewDocument(
      item.componentType,
      item.props,
      (item.style ?? {}) as Partial<StyleConfig>,
      item.children,
    );
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
    for (const component of BASE_COMPONENTS) {
      b.registry.registerComponent(component);
    }
    return b;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BuilderProvider builder={builder}>
      <ComponentEditorPaneInner
        item={item}
        definition={definition}
        registry={registry}
        onReset={onReset}
      />
    </BuilderProvider>
  );
}

function ComponentEditorPaneInner({
  item,
  definition,
  registry,
  onReset,
}: ComponentEditorPaneProps) {
  const { state, dispatch } = useBuilder();
  const { selectedNodeIds } = useSelection();
  const [activeTab, setActiveTab] = useState<PanelTab>("properties");

  const selectedNodeId = selectedNodeIds[0] ?? state.document.rootNodeId;
  const selectedNode = state.document.nodes[selectedNodeId] ?? null;
  const selectedDefinition = selectedNode
    ? (registry.getComponent(selectedNode.type) ?? null)
    : null;

  const rootDefinition = definition;
  const hasMultipleNodes = Object.keys(state.document.nodes).length > 1;
  const rootCanContainChildren = rootDefinition?.capabilities.canContainChildren ?? false;
  const showTree = hasMultipleNodes || rootCanContainChildren;

  const handleAddChild = (parentId: string, componentType: string) => {
    const def = registry.getComponent(componentType);
    const childCount = Object.values(state.document.nodes).filter(
      (n) => (n as { parentId: string | null }).parentId === parentId,
    ).length;
    dispatch({
      type: "ADD_NODE",
      payload: {
        parentId,
        componentType,
        props: def?.defaultProps ?? {},
        style: def?.defaultStyle ?? {},
        insertIndex: childCount,
      },
    });
  };

  const handleRemoveNode = (nodeId: string) => {
    dispatch({ type: "REMOVE_NODE", payload: { nodeId } });
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <InteractiveCanvas />
      </div>

      <Separator orientation="vertical" />

      <div className="w-80 shrink-0 border-l overflow-hidden flex">
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "info" ? (
            <ComponentInfoPanel
              item={item}
              definition={definition}
              registryInstance={registry}
            />
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              {showTree && (
                <NodeTreePanel
                  document={state.document}
                  registry={registry}
                  selectedNodeId={selectedNodeId}
                  onSelect={(id) =>
                    dispatch({ type: "SELECT_NODE", payload: { nodeId: id } })
                  }
                  onAddChild={handleAddChild}
                  onRemove={handleRemoveNode}
                />
              )}

              <div className="flex-1 overflow-hidden flex flex-col">
                <PropSchemaEditor
                  definition={selectedDefinition}
                  node={selectedNode}
                  onPropChange={(key, val) =>
                    dispatch({
                      type: "UPDATE_PROPS",
                      payload: { nodeId: selectedNodeId, props: { [key]: val } },
                    })
                  }
                  onStyleChange={(key, val) => {
                    const node = state.document.nodes[selectedNodeId];
                    if (!node) return;
                    const next = { ...(node.style as Record<string, unknown>) };
                    if (val === undefined || val === "") delete next[key];
                    else next[key] = val;
                    dispatch({
                      type: "UPDATE_STYLE",
                      payload: { nodeId: selectedNodeId, style: next },
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
