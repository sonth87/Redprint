import React, { useState, useMemo, useEffect, useRef } from "react";
import type { ComponentDefinition, ComponentRegistry, StyleConfig, BuilderDocument, BuilderNode } from "@ui-builder/builder-core";
import { createBuilder } from "@ui-builder/builder-core";
import { BuilderProvider, useBuilder, useSelection, useBreakpoint } from "@ui-builder/builder-react";
import type { PaletteItem } from "../types/palette.types";
import { Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui-builder/ui";
import { buildPreviewDocument } from "../lib/buildPreviewDocument";
import { InteractiveCanvas } from "./InteractiveCanvas";
import { PropSchemaEditor } from "./PropSchemaEditor";
import { PresetInfoPanel } from "./PresetInfoPanel";
import { NodeTreePanel } from "./NodeTreePanel";
import { Info, SlidersHorizontal } from "lucide-react";

type PanelTab = "info" | "properties";

const TABS: Array<{ id: PanelTab; label: string; Icon: React.ElementType }> = [
  { id: "info", label: "Component Info", Icon: Info },
  { id: "properties", label: "Properties & Style", Icon: SlidersHorizontal },
];

export interface PresetEditorProps {
  item: PaletteItem;
  registry: ComponentRegistry;
  onReset: () => void;
  onChange?: (updatedItem: PaletteItem) => void;
}

function buildChildrenFromDocument(
  nodes: Record<string, BuilderNode>,
  parentId: string,
): PaletteItem["children"] {
  const children = Object.values(nodes)
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);

  if (children.length === 0) return undefined;

  return children.map((child) => ({
    componentType: child.type,
    name: child.name,
    props: child.props,
    style: child.style as Record<string, unknown>,
    children: buildChildrenFromDocument(nodes, child.id),
  }));
}

function documentToItem(original: PaletteItem, doc: BuilderDocument): PaletteItem {
  const root = doc.nodes[doc.rootNodeId];
  if (!root) return original;
  return {
    ...original,
    props: root.props,
    style: root.style as Record<string, unknown>,
    children: buildChildrenFromDocument(doc.nodes, doc.rootNodeId),
  };
}

/**
 * Keyed wrapper — remounts entirely when item.id changes.
 * Creates a fresh BuilderAPI from the palette item's document on each mount.
 */
export function PresetEditor({
  item,
  registry,
  onReset,
  onChange,
}: PresetEditorProps) {
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
    const components = registry.listComponents();
    for (const component of components) {
      b.registry.registerComponent(component);
    }
    return b;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BuilderProvider builder={builder}>
      <PresetEditorInner
        item={item}
        registry={registry}
        onReset={onReset}
        onChange={onChange}
      />
    </BuilderProvider>
  );
}

function PresetEditorInner({
  item,
  registry,
  onReset,
  onChange,
}: PresetEditorProps) {
  const { state, dispatch } = useBuilder();
  const { selectedNodeIds } = useSelection();
  const { breakpoint } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<PanelTab>("properties");

  const selectedNodeId = selectedNodeIds[0] ?? state.document.rootNodeId;
  const selectedNode = state.document.nodes[selectedNodeId] ?? null;
  const selectedDefinition = selectedNode
    ? (registry.getComponent(selectedNode.type) ?? null)
    : null;

  const definition = registry.getComponent(item.componentType) ?? null;
  const hasMultipleNodes = Object.keys(state.document.nodes).length > 1;
  const rootCanContainChildren = definition?.capabilities.canContainChildren ?? false;
  const showTree = hasMultipleNodes || rootCanContainChildren;

  // Track previous doc to avoid firing onChange on first render
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onChange?.(documentToItem(item, state.document));
  }, [state.document]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <InteractiveCanvas />
      </div>

      <Separator orientation="vertical" />

      <div className="w-80 shrink-0 border-l overflow-hidden flex">
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "info" ? (
            <PresetInfoPanel
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
                  breakpoint={breakpoint}
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
