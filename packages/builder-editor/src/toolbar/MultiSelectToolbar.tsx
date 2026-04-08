import React from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Copy, GripVertical } from "lucide-react";
import { Button, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { TOOLTIP_DELAY_MS } from "@ui-builder/shared";

interface MultiSelectToolbarProps {
  rect: { x: number; y: number; width: number; height: number };
  zoom: number;
  panOffset: { x: number; y: number };
  onDelete: () => void;
  onDuplicate: () => void;
  onDragHandlePointerDown: (e: React.PointerEvent) => void;
  count: number;
}

export const MultiSelectToolbar: React.FC<MultiSelectToolbarProps> = ({
  rect,
  zoom,
  panOffset,
  onDelete,
  onDuplicate,
  onDragHandlePointerDown,
  count,
}) => {
  const { t } = useTranslation();
  const TOOLBAR_HEIGHT = 40;

  const viewportX = rect.x * zoom + panOffset.x;
  const viewportY = rect.y * zoom + panOffset.y;

  const yPos = viewportY - TOOLBAR_HEIGHT - 8 > 0
    ? viewportY - TOOLBAR_HEIGHT - 8
    : viewportY + rect.height * zoom + 8;

  const xPos = viewportX;

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <div
        className="absolute z-30 flex items-center bg-background/95 backdrop-blur-md rounded-md border shadow-md p-1 gap-1"
        style={{
          left: xPos,
          top: yPos,
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center gap-1 pl-1 pr-2 border-r cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={onDragHandlePointerDown}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none truncate max-w-[150px]">
                 {count} {t("selected", { count })}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t("multiSelect.ctrlClickHint", "Ctrl+Click to add/remove")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={onDuplicate}>
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.duplicate")}</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive text-red-500" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("contextToolbar.delete")}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
