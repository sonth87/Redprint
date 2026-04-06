import { useState, useCallback } from "react";
import { DEFAULT_LAYERS_PANEL_POS } from "../constants";

export interface UseLayersPanelReturn {
  layersOpen: boolean;
  layersPanelPos: { x: number; y: number };
  handleLayersToggle: (pos?: { x: number; y: number }) => void;
}

/** Manages floating layers panel open/close state and position. */
export function useLayersPanel(): UseLayersPanelReturn {
  const [layersOpen, setLayersOpen] = useState(false);
  const [layersPanelPos, setLayersPanelPos] = useState<{ x: number; y: number }>(DEFAULT_LAYERS_PANEL_POS);

  const handleLayersToggle = useCallback((pos?: { x: number; y: number }) => {
    if (pos) setLayersPanelPos(pos);
    setLayersOpen((v) => !v);
  }, []);

  return { layersOpen, layersPanelPos, handleLayersToggle };
}
