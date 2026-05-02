import React, { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui-builder/ui";
import { ArrowUp, ArrowDown, Copy, Trash2 } from "lucide-react";

interface Rect { x: number; y: number; width: number; height: number }

interface PresetContextualToolbarProps {
  nodeId: string;
  document: {
    nodes: Record<string, { id: string; type: string; parentId: string | null; order: number }>;
    rootNodeId: string;
  };
  dispatch: (cmd: { type: string; payload: unknown }) => void;
  getRect: (id: string) => Rect | null;
}

export function PresetContextualToolbar({
  nodeId,
  document,
  dispatch,
  getRect,
}: PresetContextualToolbarProps) {
  const node = document.nodes[nodeId];
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    setRect(getRect(nodeId));
  }, [nodeId, getRect]);

  if (!node || !rect) return null;
  if (node.type === "Section") return null;

  const isRoot = nodeId === document.rootNodeId;
  const siblings = node.parentId
    ? Object.values(document.nodes)
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.order - b.order)
    : [];
  const sibIdx = siblings.findIndex((n) => n.id === nodeId);
  const canMoveUp = sibIdx > 0;
  const canMoveDown = sibIdx < siblings.length - 1;

  const TOOLBAR_H = 34;
  const top = rect.y > TOOLBAR_H + 8 ? rect.y - TOOLBAR_H - 6 : rect.y + rect.height + 6;
  const left = Math.max(0, rect.x + rect.width / 2);

  return (
    <div
      style={{ position: "absolute", left, top, transform: "translateX(-50%)", zIndex: 55 }}
      className="flex items-center gap-0.5 bg-background/95 backdrop-blur-sm border shadow-md rounded-md p-0.5"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ToolbarBtn
        icon={<ArrowUp className="h-3.5 w-3.5" />}
        label="Move up"
        disabled={!canMoveUp}
        onClick={() => dispatch({ type: "REORDER_NODE", payload: { nodeId, insertIndex: sibIdx - 1 } })}
      />
      <ToolbarBtn
        icon={<ArrowDown className="h-3.5 w-3.5" />}
        label="Move down"
        disabled={!canMoveDown}
        onClick={() => dispatch({ type: "REORDER_NODE", payload: { nodeId, insertIndex: sibIdx + 1 } })}
      />
      <div className="w-px h-4 bg-border mx-0.5" />
      <ToolbarBtn
        icon={<Copy className="h-3.5 w-3.5" />}
        label="Duplicate"
        onClick={() => dispatch({ type: "DUPLICATE_NODE", payload: { nodeId } })}
      />
      {!isRoot && (
        <ToolbarBtn
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Delete"
          danger
          onClick={() => dispatch({ type: "REMOVE_NODE", payload: { nodeId } })}
        />
      )}
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={
              "w-7 h-7 flex items-center justify-center rounded transition-colors " +
              (disabled
                ? "opacity-30 cursor-not-allowed text-muted-foreground"
                : danger
                ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted")
            }
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
