import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ScrollArea, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { ChevronRight, Eye, EyeOff, Lock, Unlock, Layers } from "lucide-react";
import type { BuilderDocument, BuilderNode } from "@ui-builder/builder-core";
import { cn } from "@ui-builder/ui";

export interface LayerTreeProps {
  document: BuilderDocument;
  selectedIds: string[];
  onSelect: (nodeId: string, addToSelection: boolean) => void;
  onToggleHidden: (nodeId: string) => void;
  onToggleLocked: (nodeId: string) => void;
}

interface LayerItemProps {
  node: BuilderNode;
  depth: number;
  document: BuilderDocument;
  selectedIds: string[];
  onSelect: (nodeId: string, add: boolean) => void;
  onToggleHidden: (nodeId: string) => void;
  onToggleLocked: (nodeId: string) => void;
}

const LayerItem = memo(function LayerItem({
  node,
  depth,
  document,
  selectedIds,
  onSelect,
  onToggleHidden,
  onToggleLocked,
}: LayerItemProps) {
  const [expanded, setExpanded] = useState(true);
  const itemRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedIds.includes(node.id);

  const children = useMemo(() => 
    Object.values(document.nodes)
      .filter((n) => n.parentId === node.id)
      .sort((a, b) => a.order - b.order)
  , [document.nodes, node.id]);

  const hasChildren = children.length > 0;

  // Auto-expand if a descendant is selected
  const hasSelectedDescendant = useMemo(() => {
    return selectedIds.some(id => {
      let current = document.nodes[id];
      while (current && current.parentId) {
        if (current.parentId === node.id) return true;
        current = document.nodes[current.parentId];
      }
      return false;
    });
  }, [selectedIds, node.id, document.nodes]);

  useEffect(() => {
    if (hasSelectedDescendant) {
      setExpanded(true);
    }
  }, [hasSelectedDescendant]);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);

  return (
    <div>
      <div
        ref={itemRef}
        className={cn(
          "group flex items-center h-7 pr-1 rounded-sm cursor-pointer select-none",
          "hover:bg-muted/60 transition-colors",
          isSelected && "bg-blue-500/10 text-blue-600 font-medium",
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
        onClick={(e) => onSelect(node.id, e.shiftKey || e.metaKey)}
      >
        {/* Expand toggle */}
        <button
          className={cn(
            "flex-shrink-0 w-4 h-4 flex items-center justify-center mr-0.5 rounded hover:bg-muted transition-colors",
            !hasChildren && "invisible",
          )}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
          />
        </button>

        {/* Node name */}
        <span className="flex-1 text-xs truncate">
          {node.name ?? node.type}
        </span>

        {/* Actions (visible on hover / when active) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-muted"
            onClick={(e) => { e.stopPropagation(); onToggleHidden(node.id); }}
            title={node.hidden ? "Show" : "Hide"}
          >
            {node.hidden
              ? <EyeOff className="h-3 w-3 text-muted-foreground" />
              : <Eye className="h-3 w-3 text-muted-foreground" />
            }
          </button>
          <button
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-muted"
            onClick={(e) => { e.stopPropagation(); onToggleLocked(node.id); }}
            title={node.locked ? "Unlock" : "Lock"}
          >
            {node.locked
              ? <Lock className="h-3 w-3 text-muted-foreground" />
              : <Unlock className="h-3 w-3 text-muted-foreground" />
            }
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && children.map((child) => (
        <LayerItem
          key={child.id}
          node={child}
          depth={depth + 1}
          document={document}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onToggleHidden={onToggleHidden}
          onToggleLocked={onToggleLocked}
        />
      ))}
    </div>
  );
});

/**
 * LayerTree — left/bottom panel showing the document node hierarchy.
 * Supports multi-select, expand/collapse, show/hide, lock/unlock.
 */
export const LayerTree = memo(function LayerTree({
  document,
  selectedIds,
  onSelect,
  onToggleHidden,
  onToggleLocked,
}: LayerTreeProps) {
  const rootNode = document.nodes[document.rootNodeId];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">Layers</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {rootNode && (
            <LayerItem
              node={rootNode}
              depth={0}
              document={document}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onToggleHidden={onToggleHidden}
              onToggleLocked={onToggleLocked}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
