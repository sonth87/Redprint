import React from "react";
import { Copy, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useBuilder, useDocument } from "@ui-builder/builder-react";
import { Button, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";

export interface ContextualToolbarProps {
  nodeId: string;
  rect: { x: number; y: number; width: number; height: number };
  zoom: number;
}

export const ContextualToolbar: React.FC<ContextualToolbarProps> = ({ nodeId, rect, zoom }) => {
  const { dispatch } = useBuilder();
  const { document } = useDocument();
  const node = document.nodes[nodeId];

  if (!node) return null;

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Simplified duplicate: dispatch duplicate logic or just copy
    console.log("Duplicate node", nodeId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "REMOVE_NODE", payload: { nodeId }, description: "Delete node" });
  };

  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Move up", nodeId);
  };

  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Move down", nodeId);
  };

  const TOOLBAR_HEIGHT = 40;
  // Position above the node. If off-screen, put below.
  const yPos = rect.y * zoom - TOOLBAR_HEIGHT - 8 > 0
    ? rect.y * zoom - TOOLBAR_HEIGHT - 8
    : rect.y * zoom + rect.height * zoom + 8;

  const xPos = rect.x * zoom;

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
      >
        <div className="px-2 border-r text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none truncate max-w-[100px]">
          {node.name || node.type}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={handleMoveUp}>
              <ArrowUp className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Move up</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={handleMoveDown}>
              <ArrowDown className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Move down</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={handleDuplicate}>
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Duplicate</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Delete</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
