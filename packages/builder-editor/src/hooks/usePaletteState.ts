import { useState, useCallback } from "react";

export interface UsePaletteStateReturn {
  paletteMode: "floating" | "docked";
  activePaletteGroupId: string | null;
  setActivePaletteGroupId: (id: string | null) => void;
  handleGroupSelect: (groupId: string) => void;
  handlePaletteClose: () => void;
}

/** Manages floating ↔ docked palette panel state and active group selection. */
export function usePaletteState(): UsePaletteStateReturn {
  const [paletteMode, setPaletteMode] = useState<"floating" | "docked">("floating");
  const [activePaletteGroupId, setActivePaletteGroupId] = useState<string | null>(null);

  const handleGroupSelect = useCallback((groupId: string) => {
    setActivePaletteGroupId(groupId);
    setPaletteMode("docked");
  }, []);

  const handlePaletteClose = useCallback(() => {
    setPaletteMode("floating");
    setActivePaletteGroupId(null);
  }, []);

  return { paletteMode, activePaletteGroupId, setActivePaletteGroupId, handleGroupSelect, handlePaletteClose };
}
