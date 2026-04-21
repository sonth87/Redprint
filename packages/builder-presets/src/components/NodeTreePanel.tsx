import React, { useState } from "react";
import type { BuilderDocument, BuilderNode, ComponentRegistry } from "@ui-builder/builder-core";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";

interface NodeTreePanelProps {
  document: BuilderDocument;
  registry: ComponentRegistry;
  selectedNodeId: string;
  onSelect: (nodeId: string) => void;
  onRequestAddChild: (parentId: string) => void;
  onRemove: (nodeId: string) => void;
  onReorder?: (nodeId: string, targetParentId: string | undefined, insertIndex: number) => void;
}

export function NodeTreePanel({
  document,
  registry,
  selectedNodeId,
  onSelect,
  onRequestAddChild,
  onRemove,
  onReorder,
}: NodeTreePanelProps) {
  const rootNode = document.nodes[document.rootNodeId];
  if (!rootNode) return null;

  return (
    <div className="border-b bg-background">
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Layers
        </span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        <NodeRow
          node={rootNode}
          document={document}
          registry={registry}
          selectedNodeId={selectedNodeId}
          depth={0}
          isRoot
          onSelect={onSelect}
          onRequestAddChild={onRequestAddChild}
          onRemove={onRemove}
          onReorder={onReorder}
        />
      </div>
    </div>
  );
}

interface NodeRowProps {
  node: BuilderNode;
  document: BuilderDocument;
  registry: ComponentRegistry;
  selectedNodeId: string;
  depth: number;
  isRoot: boolean;
  onSelect: (nodeId: string) => void;
  onRequestAddChild: (parentId: string) => void;
  onRemove: (nodeId: string) => void;
  onReorder?: (nodeId: string, targetParentId: string | undefined, insertIndex: number) => void;
}

function NodeRow({
  node,
  document,
  registry,
  selectedNodeId,
  depth,
  isRoot,
  onSelect,
  onRequestAddChild,
  onRemove,
  onReorder,
}: NodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [dragOver, setDragOver] = useState<"above" | "below" | null>(null);

  const definition = registry.getComponent(node.type);
  const canHaveChildren = definition?.capabilities.canContainChildren ?? false;

  const children = Object.values(document.nodes)
    .filter((n) => n.parentId === node.id)
    .sort((a, b) => a.order - b.order);

  const hasChildren = children.length > 0;
  const isSelected = selectedNodeId === node.id;

  const label = node.name ?? definition?.name ?? node.type;
  const typeAbbr = node.type.slice(0, 2).toUpperCase();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(true);
    onRequestAddChild(node.id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(node.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("nodeId", node.id);
  };

  const handleDragOver = (e: React.DragEvent, position: "above" | "below") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(position);
  };

  const handleDrop = (e: React.DragEvent, position: "above" | "below") => {
    e.preventDefault();
    e.stopPropagation();
    const draggedNodeId = e.dataTransfer.getData("nodeId");
    if (!draggedNodeId || draggedNodeId === node.id) {
      setDragOver(null);
      return;
    }

    const parentIdValue = node.parentId;
    const parentId = parentIdValue ?? undefined;
    const siblings = parentIdValue
      ? Object.values(document.nodes)
          .filter((n) => n.parentId === parentIdValue)
          .sort((a, b) => a.order - b.order)
      : [node];

    const targetIdx = siblings.findIndex((n) => n.id === node.id);
    const insertIndex = position === "above" ? targetIdx : targetIdx + 1;

    onReorder?.(draggedNodeId, parentId, insertIndex);
    setDragOver(null);
  };

  return (
    <div>
      {dragOver === "above" && (
        <div className="h-0.5 bg-primary mx-2 mb-1" />
      )}
      <div
        className={
          "flex items-center gap-1 pr-1 cursor-move select-none group transition-colors " +
          (dragOver
            ? "bg-primary/20"
            : isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground")
        }
        style={{ paddingLeft: depth * 12 + 4 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setDragOver(null);
        }}
        onClick={() => onSelect(node.id)}
        draggable
        onDragStart={handleDragStart}
        onDragOver={(e) => handleDragOver(e, "below")}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, dragOver === "above" ? "above" : "below")}
      >
        {/* Expand toggle */}
        <button
          className="w-4 h-4 shrink-0 flex items-center justify-center text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
          }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : (
            <span className="w-3 h-3 rounded-full border border-muted-foreground/30 inline-block" />
          )}
        </button>

        {/* Type badge */}
        <span className="text-[8px] font-bold w-5 h-5 rounded shrink-0 bg-muted flex items-center justify-center text-muted-foreground">
          {typeAbbr}
        </span>

        {/* Label */}
        <span className="text-[11px] flex-1 truncate py-1.5">{label}</span>

        {/* Actions (visible on hover or selected) */}
        {(hovered || isSelected) && (
          <div className="flex items-center gap-0.5 shrink-0">
            {canHaveChildren && (
              <button
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={handleAdd}
                title="Add child"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            {!isRoot && (
              <button
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={handleRemove}
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && children.map((child) => (
        <NodeRow
          key={child.id}
          node={child}
          document={document}
          registry={registry}
          selectedNodeId={selectedNodeId}
          depth={depth + 1}
          isRoot={false}
          onSelect={onSelect}
          onRequestAddChild={onRequestAddChild}
          onRemove={onRemove}
          onReorder={onReorder}
        />
      ))}
      {dragOver === "below" && (
        <div className="h-0.5 bg-primary mx-2 mt-1" />
      )}
    </div>
  );
}
