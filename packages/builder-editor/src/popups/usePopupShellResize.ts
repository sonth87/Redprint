import React from "react";
import { v4 as uuidv4 } from "uuid";
import type { PopupDefinition, PopupKindConfig } from "@ui-builder/builder-core";
import type { ResizeHandleType } from "../types";

interface UsePopupShellResizeOptions {
  popup: PopupDefinition | null;
  popupFrameRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  updatePopup: (
    popupId: string,
    popup: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>,
    groupId?: string,
    description?: string,
  ) => void;
}

const px = (value: number, min: number) => `${Math.max(min, Math.round(value))}px`;

export function usePopupShellResize({
  popup,
  popupFrameRef,
  zoom,
  updatePopup,
}: UsePopupShellResizeOptions) {
  return React.useCallback((handle: ResizeHandleType, event: React.MouseEvent) => {
    if (!popup || !popupFrameRef.current) return;
    const startRect = popupFrameRef.current.getBoundingClientRect();
    const startPoint = { x: event.clientX, y: event.clientY };
    const startConfig = popup.kindConfig;
    const groupId = uuidv4();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startPoint.x) / zoom;
      const dy = (moveEvent.clientY - startPoint.y) / zoom;
      let kindConfig: PopupKindConfig = startConfig;

      if (popup.kind === "modal" && startConfig.kind === "modal") {
        kindConfig = {
          ...startConfig,
          size: "custom",
          width: handle.includes("e") ? px(startRect.width + dx, 160) : startConfig.width,
          height: handle.includes("s") ? px(startRect.height + dy, 120) : startConfig.height,
          resizable: true,
        };
      } else if (popup.kind === "drawer" && startConfig.kind === "drawer") {
        const nextWidth = popup.placement === "left" ? startRect.width + dx : startRect.width - dx;
        kindConfig = { ...startConfig, width: px(nextWidth, 240), resizable: true };
      } else if (popup.kind === "bottomSheet" && startConfig.kind === "bottomSheet") {
        kindConfig = { ...startConfig, initialHeight: px(startRect.height - dy, 120) };
      } else if (popup.kind === "bar" && startConfig.kind === "bar") {
        const nextHeight = popup.placement === "top" ? startRect.height + dy : startRect.height - dy;
        kindConfig = { ...startConfig, height: px(nextHeight, 40) };
      }

      updatePopup(popup.id, { kindConfig }, groupId, "Resize popup");
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [popup, popupFrameRef, updatePopup, zoom]);
}
