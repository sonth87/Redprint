import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Trash2, ArrowUp, ArrowDown, GripVertical, CornerLeftUp } from "lucide-react";
import { useDocument, useBuilder } from "@ui-builder/builder-react";
import { Button, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { TOOLTIP_DELAY_MS } from "@ui-builder/shared";
import { AIToolsPopover } from "../ai/ai-tools/AIToolsPopover";
import { AISectionPopover } from "../ai/ai-section/AISectionPopover";
import { useAIConfig } from "../ai/AIConfigContext";

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
  const { builder, dispatch } = useBuilder();
  const { t } = useTranslation();
  const node = document.nodes[nodeId];
  const aiConfig = useAIConfig();

  // Resolve component definition to check AI capabilities
  const registry = builder?.registry;
  const definition = node && registry ? registry.getComponent(node.type) : null;
  const hasAIText = definition?.capabilities.aiTextGeneration === true;
  const hasAIImage = definition?.capabilities.aiImageGeneration === true;
  const hasAI = hasAIText || hasAIImage;
  const aiMode = hasAIImage ? "image" : "text";

  // Section AI Assistant
  const isSection = node?.type === "Section";
  const currentChildIds = isSection
    ? Object.values(document.nodes)
        .filter((n) => n.parentId === nodeId)
        .map((n) => n.id)
    : [];
  const availableComponentTypes = registry
    ? registry.listComponents().map((d) => d.type)
    : [];
  const handleUndo = useCallback(() => { builder.undo(); }, [builder]);

  // Derive current content for AI (richtext prop or image src)
  const richTextProp = definition?.propSchema.find((p) => p.type === "richtext");
  const imageProp = definition?.propSchema.find((p) => p.type === "image");
  const currentAIContent: string = node && hasAIImage
    ? String(node.props[imageProp?.key ?? "src"] ?? "")
    : String(node?.props[richTextProp?.key ?? "content"] ?? node?.props.text ?? node?.props.content ?? "");

  const handleAIConfirm = useCallback(
    (newContent: string) => {
      const targetKey = hasAIImage
        ? (imageProp?.key ?? "src")
        : (richTextProp?.key ?? "content");
      dispatch({
        type: "UPDATE_PROPS",
        payload: { nodeId, props: { [targetKey]: newContent } },
        description: "AI Tools — apply content",
      });
    },
    [hasAIImage, imageProp, richTextProp, nodeId, dispatch],
  );

  const wrap = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  if (!node) return null;

  const TOOLBAR_HEIGHT = 40;
  // Convert canvas-space rect to viewport-space (accounting for zoom + panOffset)
  const viewportX = rect.x * zoom + panOffset.x;
  const viewportY = rect.y * zoom + panOffset.y;
  // Position above the node. If off-screen, put below.
  const yPos = viewportY - TOOLBAR_HEIGHT - 8 > 0
    ? viewportY - TOOLBAR_HEIGHT - 8
    : viewportY + rect.height * zoom + 8;

  const xPos = viewportX;

  // Breadcrumbs string
  let breadcrumb = node.name || node.type;
  if (node.parentId && node.parentId !== "root") {
    const pNode = document.nodes[node.parentId];
    if (pNode) {
      breadcrumb = `${pNode.name || pNode.type} > ${breadcrumb}`;
    }
  }

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
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
          title={t("contextToolbar.dragToMove")}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none truncate max-w-[150px]">
            {breadcrumb}
          </span>
        </div>

        {node.parentId && node.parentId !== "root" && !isSection && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50" onClick={wrap(() => dispatch({ type: "SELECT_NODE", payload: { nodeId: node.parentId } }))}>
                <CornerLeftUp className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Select Parent</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onMoveUp)}>
              <ArrowUp className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.moveUp")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onMoveDown)}>
              <ArrowDown className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.moveDown")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onDuplicate)}>
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.duplicate")}</TooltipContent>
        </Tooltip>

        {hasAI && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <AIToolsPopover
              mode={aiMode}
              currentContent={currentAIContent}
              componentType={node.type.toLowerCase()}
              aiConfig={aiConfig}
              onConfirm={handleAIConfirm}
            />
          </>
        )}

        {isSection && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <AISectionPopover
              sectionNodeId={nodeId}
              currentChildIds={currentChildIds}
              availableComponentTypes={availableComponentTypes}
              aiConfig={aiConfig}
              dispatch={dispatch}
              undo={handleUndo}
            />
          </>
        )}

        <div className="w-px h-4 bg-border mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive text-red-500" onClick={wrap(onDelete)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.delete")}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
