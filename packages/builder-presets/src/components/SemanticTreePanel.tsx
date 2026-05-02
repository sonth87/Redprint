import React from "react";
import type { BuilderDocument, BuilderNode, ComponentRegistry } from "@ui-builder/builder-core";
import { Badge } from "@ui-builder/ui";
import { Plus, RefreshCw, Copy } from "lucide-react";
import type { InsertTarget } from "./NodeTreePanel";

interface SemanticTreePanelProps {
  document: BuilderDocument;
  registry: ComponentRegistry;
  selectedNodeId: string;
  onSelect: (nodeId: string) => void;
  onRequestInsert: (target: InsertTarget) => void;
  onRequestReplace?: (target: InsertTarget) => void;
  onDuplicate?: (nodeId: string) => void;
}

interface SemanticItem {
  nodeId: string;
  label: string;
  subtitle: string;
  depth: number;
  canInsertInside: boolean;
  slotName?: string;
  childCount: number;
  children: SemanticItem[];
}

function getSemanticMeta(node: BuilderNode): { role?: string } | undefined {
  const pluginData = node.metadata?.pluginData?.["@ui-builder/preset-node"];
  if (!pluginData || typeof pluginData !== "object") {
    return undefined;
  }
  return pluginData as { role?: string };
}

function buildSemanticItems(
  document: BuilderDocument,
  registry: ComponentRegistry,
  nodeId: string,
  depth = 0,
): SemanticItem | null {
  const node = document.nodes[nodeId];
  if (!node) return null;

  const definition = registry.getComponent(node.type);
  const meta = getSemanticMeta(node);
  const label = meta?.role ?? node.slot ?? node.name ?? definition?.name ?? node.type;
  const subtitleParts = [node.type];
  if (node.slot) subtitleParts.push(`slot:${node.slot}`);

  const children = Object.values(document.nodes)
    .filter((candidate) => candidate.parentId === nodeId)
    .sort((a, b) => a.order - b.order)
    .map((child) => buildSemanticItems(document, registry, child.id, depth + 1))
    .filter((item): item is SemanticItem => Boolean(item));

  const hasSemanticSignal = !!meta?.role || !!node.slot || depth === 0 || children.length > 0;
  if (!hasSemanticSignal) {
    return null;
  }

  return {
    nodeId: node.id,
    label,
    subtitle: subtitleParts.join(" · "),
    depth,
    canInsertInside: definition?.capabilities.canContainChildren ?? false,
    slotName: node.slot,
    childCount: children.length,
    children,
  };
}

export function SemanticTreePanel({
  document,
  registry,
  selectedNodeId,
  onSelect,
  onRequestInsert,
  onRequestReplace,
  onDuplicate,
}: SemanticTreePanelProps) {
  const rootItem = buildSemanticItems(document, registry, document.rootNodeId);
  if (!rootItem) return null;

  return (
    <div className="border-b bg-background">
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Structure
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto px-2 py-2">
        <SemanticRow
          item={rootItem}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          onRequestInsert={onRequestInsert}
          onRequestReplace={onRequestReplace}
          onDuplicate={onDuplicate}
        />
      </div>
    </div>
  );
}

function SemanticRow({
  item,
  selectedNodeId,
  onSelect,
  onRequestInsert,
  onRequestReplace,
  onDuplicate,
}: {
  item: SemanticItem;
  selectedNodeId: string;
  onSelect: (nodeId: string) => void;
  onRequestInsert: (target: InsertTarget) => void;
  onRequestReplace?: (target: InsertTarget) => void;
  onDuplicate?: (nodeId: string) => void;
}) {
  const isSelected = item.nodeId === selectedNodeId;
  const isSlotNode = !!item.slotName;
  const isEmptySlot = isSlotNode && item.childCount === 0;

  return (
    <div>
      <div
        className={
          "flex items-center gap-2 rounded px-2 py-1.5 transition-colors " +
          (isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/60")
        }
        style={{ marginLeft: item.depth * 10 }}
        onClick={() => onSelect(item.nodeId)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="text-[11px] font-medium truncate">{item.label}</div>
            {isSlotNode && (
              <Badge
                variant={isEmptySlot ? "outline" : "secondary"}
                className="text-[8px] px-1 h-4 font-normal shrink-0"
              >
                {isEmptySlot ? "empty slot" : "slot"}
              </Badge>
            )}
          </div>
          <div className="text-[9px] text-muted-foreground truncate">{item.subtitle}</div>
        </div>
        {item.canInsertInside && (
          <button
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRequestInsert({
                nodeId: item.nodeId,
                mode: "inside",
                label: item.label,
              });
            }}
            title="Add inside"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
        {item.depth > 0 && (
          <button
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate?.(item.nodeId);
            }}
            title="Duplicate node"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
        {item.depth > 0 && (
          <button
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRequestReplace?.({
                nodeId: item.nodeId,
                mode: "inside",
                label: item.label,
              });
            }}
            title="Replace node"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>

      {isSlotNode && (
        <div
          style={{ marginLeft: item.depth * 10 + 8 }}
          className="pb-1 flex items-center gap-1.5"
        >
          <button
            className="px-2 py-1 rounded text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border"
            onClick={(e) => {
              e.stopPropagation();
              onRequestInsert({
                nodeId: item.nodeId,
                mode: "inside",
                label: item.label,
              });
            }}
          >
            {isEmptySlot ? "Add to slot" : "Add more"}
          </button>
          {!isEmptySlot && (
            <button
              className="px-2 py-1 rounded text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border"
              onClick={(e) => {
                e.stopPropagation();
                onRequestReplace?.({
                  nodeId: item.nodeId,
                  mode: "inside",
                  label: item.label,
                });
              }}
            >
              Replace slot
            </button>
          )}
        </div>
      )}

      {item.children.length > 0 && (
        <div className="space-y-1">
          {item.children.map((child) => (
            <SemanticRow
              key={child.nodeId}
              item={child}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onRequestInsert={onRequestInsert}
              onRequestReplace={onRequestReplace}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      )}

      {item.children.length === 0 && item.depth > 0 && item.subtitle.includes("slot:") && (
        <div style={{ marginLeft: item.depth * 10 + 8 }} className="py-1">
          <Badge variant="outline" className="text-[9px] px-1.5 h-4 font-normal">
            Empty semantic node
          </Badge>
        </div>
      )}
    </div>
  );
}
