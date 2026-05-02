import { useState, useCallback } from "react";

export interface UsePaletteStateReturn {
  paletteMode: "floating" | "docked";
  activePaletteGroupId: string | null;
  setActivePaletteGroupId: (id: string | null) => void;
  handleGroupSelect: (groupId: string) => void;
  handlePaletteClose: () => void;
  /** The section ID that was explicitly targeted via the DS button on an empty section. */
  pendingTargetSectionId: string | null;
  /**
   * Called when user clicks the "Designed Section" button on an empty section.
   * Records the target section so the palette item click can add into it,
   * regardless of current selection state.
   */
  handleDSButtonClick: (sectionId: string) => void;
}

/** Manages floating ↔ docked palette panel state and active group selection. */
export function usePaletteState(): UsePaletteStateReturn {
  const [paletteMode, setPaletteMode] = useState<"floating" | "docked">("floating");
  const [activePaletteGroupId, setActivePaletteGroupId] = useState<string | null>(null);
  // Tracks which empty section was targeted via the DS button — independent of selection state
  const [pendingTargetSectionId, setPendingTargetSectionId] = useState<string | null>(null);

  const handleGroupSelect = useCallback((groupId: string) => {
    setActivePaletteGroupId(groupId);
    setPaletteMode("docked");
  }, []);

  const handleDSButtonClick = useCallback((sectionId: string) => {
    setPendingTargetSectionId(sectionId);
    setActivePaletteGroupId("designed_section");
    setPaletteMode("docked");
  }, []);

  const handlePaletteClose = useCallback(() => {
    setPaletteMode("floating");
    setActivePaletteGroupId(null);
    setPendingTargetSectionId(null);
  }, []);

  return {
    paletteMode,
    activePaletteGroupId,
    setActivePaletteGroupId,
    handleGroupSelect,
    handlePaletteClose,
    pendingTargetSectionId,
    handleDSButtonClick,
  };
}
