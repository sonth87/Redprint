import React from "react";
import { v4 as uuidv4 } from "uuid";
import type { PopupDefinition } from "@ui-builder/builder-core";

interface UsePopupShellDragOptions {
  popup: PopupDefinition | null;
  zoom: number;
  updatePopup: (
    popupId: string,
    popup: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>,
    groupId?: string,
    description?: string,
  ) => void;
}

export function usePopupShellDrag({ popup, zoom, updatePopup }: UsePopupShellDragOptions) {
  return React.useCallback((event: React.PointerEvent) => {
    if (!popup || popup.kind !== "modal" || popup.kindConfig.kind !== "modal" || !popup.kindConfig.draggable) return;
    event.preventDefault();
    event.stopPropagation();

    const modalConfig = popup.kindConfig;
    const startPoint = { x: event.clientX, y: event.clientY };
    const startOffsetX = modalConfig.offsetX ?? 0;
    const startOffsetY = modalConfig.offsetY ?? 0;
    const groupId = uuidv4();

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updatePopup(
        popup.id,
        {
          kindConfig: {
            ...modalConfig,
            offsetX: Math.round(startOffsetX + (moveEvent.clientX - startPoint.x) / zoom),
            offsetY: Math.round(startOffsetY + (moveEvent.clientY - startPoint.y) / zoom),
          },
        },
        groupId,
        "Move popup",
      );
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [popup, updatePopup, zoom]);
}
