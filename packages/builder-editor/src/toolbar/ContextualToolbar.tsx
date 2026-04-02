import React from "react";
import { Copy, Trash2, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { useDocument } from "@ui-builder/builder-react";
import { Button, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";

export interface ContextualToolbarProps {
  nodeId: string;
  rect: { x: number; y: number; width: number; height: number };
  zoom: number;
  panOffset: { x: number; y: number };
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragHandlePointerDown: (e: React.PointerEvent) => void;
}

export const ContextualToolbar: React.FC<ContextualToolbarProps> = ({ nodeId, rect, zoom, panOffset, onDelete, onDuplicate, onMoveUp, onMoveDown, onDragHandlePointerDown }) => {
  const { document } = useDocument();
  const node = document.nodes[nodeId];

  if (!node) return null;

  const wrap = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  const TOOLBAR_HEIGHT = 40;
  // Convert canvas-space rect to viewport-space (accounting for zoom + panOffset)
  const viewportX = rect.x * zoom + panOffset.x;
  const viewportY = rect.y * zoom + panOffset.y;
  // Position above the node. If off-screen, put below.
  const yPos = viewportY - TOOLBAR_HEIGHT - 8 > 0
    ? viewportY - TOOLBAR_HEIGHT - 8
    : viewportY + rect.height * zoom + 8;

  const xPos = viewportX;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="absolute z-30 flex items-center bg-background/95 backdrop-blur-md rounded-md border shadow-md p-1 gap-1"
        style={{
          left: xPos,
          top: yPos,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-1 pl-1 pr-2 border-r cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={onDragHandlePointerDown}
          title="Drag to move"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none truncate max-w-[100px]">
            {node.name || node.type}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onMoveUp)}>
              <ArrowUp className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Move up</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onMoveDown)}>
              <ArrowDown className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Move down</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onDuplicate)}>
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Duplicate</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={wrap(onDelete)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Delete</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
