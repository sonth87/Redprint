/**
 * useAISectionState — manages all local state for the AI Section Popover.
 *
 * Flow:
 *   main view  → click preset → (remove children) → dispatch ADD_NODE cmds
 *              → preview view  → Accept (close) | Regenerate (undo + re-run) | Cancel (undo)
 *
 *   main view  → click "Custom" → custom view → submit
 *              → preview view  (same Accept/Regenerate/Cancel)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AIConfig, AICommandSuggestion, AIBuilderContext } from "../types";
import { generateSectionContent } from "./ai-section-service";
import { AI_SECTION_REGENERATE_COOLDOWN_SECONDS } from "./ai-section-config";
import type { Command } from "@ui-builder/builder-core";

export type AISectionView = "main" | "custom" | "loading" | "preview";

export interface AISectionState {
  view: AISectionView;
  customPrompt: string;
  isLoading: boolean;
  error: string | null;
  aiMessage: string | null;
  /** How many commands were dispatched (so we can undo them all) */
  undoCount: number;
  /** How many REMOVE_NODE commands were dispatched before the AI commands */
  removeCount: number;
  /** The last request — used for Regenerate so we remember exactly which children to remove again */
  lastRequest: { actionId: string; customPrompt?: string; childIdsToRemove: string[] } | null;
  cooldownRemaining: number;
}

export interface UseAISectionStateOptions {
  sectionNodeId: string;
  /** IDs of the section's direct children (to remove before applying AI content) */
  currentChildIds: string[];
  availableComponentTypes: string[];
  aiConfig: AIConfig;
  dispatch: (command: Command) => void;
  undo: () => void;
  onClose: () => void;
  getBuilderContext: () => AIBuilderContext;
}

export interface UseAISectionStateReturn {
  state: AISectionState;
  setCustomPrompt: (v: string) => void;
  goToCustom: () => void;
  goToMain: () => void;
  executeAction: (actionId: string) => Promise<void>;
  executeCustom: () => Promise<void>;
  accept: () => void;
  regenerate: () => Promise<void>;
  cancel: () => void;
}

function toUserFriendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("429") || raw.toLowerCase().includes("quota") || raw.toLowerCase().includes("rate limit"))
    return "Rate limit exceeded";
  if (raw.includes("401") || raw.includes("403") || raw.toLowerCase().includes("api key"))
    return "Invalid API key";
  if (raw.includes("404")) return "Model not found";
  if (raw.includes("500") || raw.includes("502") || raw.includes("503")) return "Service unavailable";
  if (raw.toLowerCase().includes("failed to fetch") || raw.toLowerCase().includes("networkerror"))
    return "Network error";
  const first = raw.split(/[.\n]/)[0] ?? raw;
  return first.length > 60 ? `${first.slice(0, 57)}…` : first;
}

const INITIAL_STATE: AISectionState = {
  view: "main",
  customPrompt: "",
  isLoading: false,
  error: null,
  aiMessage: null,
  undoCount: 0,
  removeCount: 0,
  lastRequest: null,
  cooldownRemaining: 0,
};

export function useAISectionState(options: UseAISectionStateOptions): UseAISectionStateReturn {
  const { sectionNodeId, availableComponentTypes, aiConfig, dispatch, undo, onClose, getBuilderContext } = options;

  const [state, setState] = useState<AISectionState>(INITIAL_STATE);

  // Keep a ref to currentChildIds so we always have the latest snapshot
  const currentChildIdsRef = useRef(options.currentChildIds);
  useEffect(() => {
    currentChildIdsRef.current = options.currentChildIds;
  }, [options.currentChildIds]);

  // Cooldown timer
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setState((prev) => ({ ...prev, cooldownRemaining: AI_SECTION_REGENERATE_COOLDOWN_SECONDS }));
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setState((prev) => {
        const next = prev.cooldownRemaining - 1;
        if (next <= 0) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return { ...prev, cooldownRemaining: 0 };
        }
        return { ...prev, cooldownRemaining: next };
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────

  /**
   * Remove all current children of the section, dispatch the AI commands,
   * and transition to preview view. Returns { removeCount, addCount }.
   */
  const applyCommands = useCallback(
    async (
      actionId: string,
      customPrompt: string | undefined,
      childIdsToRemove: string[],
    ): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null, view: "loading" }));

      let result: Awaited<ReturnType<typeof generateSectionContent>>;
      try {
        result = await generateSectionContent({
          sectionNodeId,
          actionId,
          customPrompt,
          availableComponentTypes,
          aiConfig,
          builderContext: getBuilderContext(),
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: toUserFriendlyError(err),
          view: "main",
        }));
        return;
      }

      // Filter to only ADD_NODE commands (safety — the AI should only return ADD_NODE)
      const safeCommands: AICommandSuggestion[] = result.commands.filter(
        (c) => c.type === "ADD_NODE" || c.type === "RENAME_NODE",
      );

      if (safeCommands.length === 0) {
        const debugInfo = result.commands.length > 0 
          ? `(found ${result.commands.length} non-ADD_NODE commands)`
          : "(no commands received)";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: `AI returned no usable commands ${debugInfo}. Try again or adjust your request.`,
          view: "main",
        }));
        return;
      }

      // 1. Remove existing children
      let removeCount = 0;
      for (const childId of childIdsToRemove) {
        dispatch({ type: "REMOVE_NODE", payload: { nodeId: childId } } as Command);
        removeCount++;
      }

      // 2. Dispatch AI-generated commands
      let addCount = 0;
      for (const cmd of safeCommands) {
        dispatch({ type: cmd.type, payload: cmd.payload } as Command);
        addCount++;
      }

      setState({
        ...INITIAL_STATE,
        view: "preview",
        aiMessage: result.message,
        undoCount: addCount,
        removeCount,
        lastRequest: { actionId, customPrompt, childIdsToRemove },
        cooldownRemaining: AI_SECTION_REGENERATE_COOLDOWN_SECONDS,
      });

      startCooldown();
    },
    [sectionNodeId, availableComponentTypes, aiConfig, dispatch, startCooldown, getBuilderContext],
  );

  // ── Navigation ─────────────────────────────────────────────────────────

  const goToCustom = useCallback(() => {
    setState((prev) => ({ ...prev, view: "custom", customPrompt: "", error: null }));
  }, []);

  const goToMain = useCallback(() => {
    setState((prev) => ({ ...prev, view: "main", error: null }));
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────

  const executeAction = useCallback(
    async (actionId: string) => {
      await applyCommands(actionId, undefined, currentChildIdsRef.current);
    },
    [applyCommands],
  );

  const executeCustom = useCallback(async () => {
    const customPrompt = state.customPrompt.trim();
    if (!customPrompt) return;
    await applyCommands("custom", customPrompt, currentChildIdsRef.current);
  }, [applyCommands, state.customPrompt]);

  // ── Preview actions ───────────────────────────────────────────────────

  const accept = useCallback(() => {
    onClose();
    setState(INITIAL_STATE);
  }, [onClose]);

  const cancel = useCallback(() => {
    // Undo the AI ADD_NODE commands
    for (let i = 0; i < state.undoCount; i++) {
      undo();
    }
    // Re-add the removed children by undoing REMOVE_NODE commands
    for (let i = 0; i < state.removeCount; i++) {
      undo();
    }
    setState(INITIAL_STATE);
  }, [state.undoCount, state.removeCount, undo]);

  const regenerate = useCallback(async () => {
    if (!state.lastRequest || state.cooldownRemaining > 0) return;

    // Undo previous AI commands without restoring removed children —
    // we will remove them again in applyCommands
    for (let i = 0; i < state.undoCount; i++) {
      undo();
    }
    // Undo the removal of children too
    for (let i = 0; i < state.removeCount; i++) {
      undo();
    }

    // Re-run with the same request, explicitly using the explicitly saved original child IDs
    const { actionId, customPrompt, childIdsToRemove } = state.lastRequest;
    
    // Give React one tick to process the undo dispatches before reading document
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await applyCommands(actionId, customPrompt, childIdsToRemove);
  }, [state.lastRequest, state.undoCount, state.removeCount, state.cooldownRemaining, undo, applyCommands]);

  const setCustomPrompt = useCallback((v: string) => {
    setState((prev) => ({ ...prev, customPrompt: v }));
  }, []);

  return {
    state,
    setCustomPrompt,
    goToCustom,
    goToMain,
    executeAction,
    executeCustom,
    accept,
    regenerate,
    cancel,
  };
}
