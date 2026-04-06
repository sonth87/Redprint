import React from "react";
import { useTranslation } from "react-i18next";
import { Layers, Trash2 } from "lucide-react";
import { Button, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@ui-builder/ui";
import { TOOLTIP_DELAY_MS, type Rect } from "@ui-builder/shared";

export interface MultiSelectToolbarProps {
  rect: Rect;
  zoom: number;
  panOffset: { x: number; y: number };
  count: number;
  onGroup: () => void;
  onDelete: () => void;
}

const TOOLBAR_HEIGHT = 40;

export const MultiSelectToolbar: React.FC<MultiSelectToolbarProps> = ({
  rect,
  zoom,
  panOffset,
  count,
  onGroup,
  onDelete,
}) => {
  const { t } = useTranslation();

  const viewportX = rect.x * zoom + panOffset.x;
  const viewportY = rect.y * zoom + panOffset.y;

  const yPos =
    viewportY - TOOLBAR_HEIGHT - 8 > 0
      ? viewportY - TOOLBAR_HEIGHT - 8
      : viewportY + rect.height * zoom + 8;
  const xPos = viewportX;

  const wrap = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <div
        className="absolute z-30 flex items-center bg-background/95 backdrop-blur-md rounded-md border shadow-md p-1 gap-1"
        style={{ left: xPos, top: yPos }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none pl-1 pr-2 border-r">
          {t("multiSelect.label", { count })}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={wrap(onGroup)}>
              <Layers className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("multiSelect.group")}</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive text-red-500"
              onClick={wrap(onDelete)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("multiSelect.delete")}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
