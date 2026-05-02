import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ScrollArea, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { ChevronRight, Eye, EyeOff, Lock, Unlock, X } from "lucide-react";
import type { BuilderDocument, BuilderNode } from "@ui-builder/builder-core";
import { cn } from "@ui-builder/ui";

// Helper function to remove accents from text for search
function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Helper function to extract content from node props
function getNodeContent(node: BuilderNode): string {
  const contentProps = ["text", "label", "placeholder", "value", "title", "alt"];
  for (const prop of contentProps) {
    const value = node.props[prop];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export interface LayerTreeProps {
  document: BuilderDocument;
  selectedIds: string[];
  onSelect: (nodeId: string, addToSelection: boolean) => void;
  onToggleHidden: (nodeId: string) => void;
  onToggleLocked: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
}

interface LayerItemProps {
  node: BuilderNode;
  depth: number;
  document: BuilderDocument;
  selectedIds: string[];
  onSelect: (nodeId: string, add: boolean) => void;
  onToggleHidden: (nodeId: string) => void;
  onToggleLocked: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  searchText?: string;
}

const LayerItem = memo(function LayerItem({
  node,
  depth,
  document,
  selectedIds,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onNodeHover,
  searchText = "",
}: LayerItemProps) {
  const [expanded, setExpanded] = useState(true);
  const itemRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedIds.includes(node.id);

  const nodeName = node.name ?? node.type;
  const nodeContent = getNodeContent(node);

  // Normalize search text to remove accents
  const normalizedSearch = removeAccents(searchText.toLowerCase());
  const normalizedNodeName = removeAccents(nodeName.toLowerCase());
  const normalizedNodeContent = removeAccents(nodeContent.toLowerCase());

  const matchesSearch = !searchText ||
    normalizedNodeName.includes(normalizedSearch) ||
    normalizedNodeContent.includes(normalizedSearch);

  const children = useMemo(() =>
    Object.values(document.nodes)
      .filter((n) => n.parentId === node.id)
      .sort((a, b) => a.order - b.order)
  , [document.nodes, node.id]);

  const hasChildren = children.length > 0;

  // Auto-expand if search text matches or descendants match
  const descendantMatches = useMemo(() => {
    if (!searchText) return false;
    const normalizedSearch = removeAccents(searchText.toLowerCase());
    const checkDescendants = (nodeId: string): boolean => {
      const node = document.nodes[nodeId];
      if (!node) return false;
      const nodeName = node.name ?? node.type;
      const nodeContent = getNodeContent(node);
      const normalizedNodeName = removeAccents(nodeName.toLowerCase());
      const normalizedNodeContent = removeAccents(nodeContent.toLowerCase());
      if (normalizedNodeName.includes(normalizedSearch) || normalizedNodeContent.includes(normalizedSearch)) {
        return true;
      }
      const directChildren = Object.values(document.nodes).filter(n => n.parentId === nodeId);
      return directChildren.some(child => checkDescendants(child.id));
    };
    return checkDescendants(node.id);
  }, [document.nodes, node.id, searchText]);

  // Auto-expand if a descendant is selected or matches search
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
    if (hasSelectedDescendant || descendantMatches) {
      setExpanded(true);
    }
  }, [hasSelectedDescendant, descendantMatches]);

  // Scroll into view when selected
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isSelected]);

  // Don't render if doesn't match search and no descendants match
  if (searchText && !matchesSearch && !descendantMatches) {
    return null;
  }

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div
        ref={itemRef}
        className={cn(
          "group grid h-7 w-full min-w-0 grid-cols-[16px_minmax(0,1fr)_32px] items-center rounded-sm cursor-pointer select-none overflow-hidden",
          "hover:bg-muted/60 transition-colors",
          isSelected && "bg-blue-500/10 text-blue-600 font-medium",
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
        onClick={(e) => onSelect(node.id, e.shiftKey || e.metaKey)}
        onMouseEnter={() => onNodeHover?.(node.id)}
        onMouseLeave={() => onNodeHover?.(null)}
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

        {/* Node name + content */}
        <div className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap px-1">
          <span className="truncate text-xs font-medium">
            {nodeName}
          </span>
          {nodeContent && (
            <>
              <span className="text-muted-foreground/40 flex-shrink-0">-</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground/60">
                {nodeContent}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex h-full min-w-0 items-center justify-end gap-0.5 pr-1 opacity-0 group-hover:opacity-100 duration-200">
          <button
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded hover:bg-muted transition-colors cursor-pointer hover:scale-110"
            onClick={(e) => { e.stopPropagation(); onToggleHidden(node.id); }}
            title={node.hidden ? "Show" : "Hide"}
          >
            {node.hidden
              ? <EyeOff className="h-3 w-3 text-muted-foreground" />
              : <Eye className="h-3 w-3 text-muted-foreground" />
            }
          </button>
          <button
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded hover:bg-muted transition-colors cursor-pointer hover:scale-110"
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
          onNodeHover={onNodeHover}
          searchText={searchText}
        />
      ))}
    </div>
  );
});

/**
 * LayerTree — left/bottom panel showing the document node hierarchy.
 * Supports multi-select, expand/collapse, show/hide, lock/unlock, and filter search.
 */
export const LayerTree = memo(function LayerTree({
  document,
  selectedIds,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onNodeHover,
}: LayerTreeProps) {
  const [searchText, setSearchText] = useState("");
  const rootNode = document.nodes[document.rootNodeId];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <input
            type="text"
            placeholder="Search layers..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="w-full min-w-0 overflow-hidden p-1">
          {rootNode && (
            <LayerItem
              node={rootNode}
              depth={0}
              document={document}
              selectedIds={selectedIds}
              onSelect={onSelect}
              onToggleHidden={onToggleHidden}
              onToggleLocked={onToggleLocked}
              onNodeHover={onNodeHover}
              searchText={searchText}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
