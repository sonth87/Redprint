/**
 * useAIToolsState — manages all local state for the AI Tools Popover.
 *
 * Encapsulates: view transitions, tone selection, loading, cooldown timer,
 * preview management, confirm/cancel/regenerate actions.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AIToolsMode, AIToolsRequest, AIToolsResponse, AIToolsState, AIToolsView } from "./types";
import { executeAIToolsAction } from "./ai-tools-service";
import { AI_REGENERATE_COOLDOWN_SECONDS } from "./ai-tools-config";
import type { AIConfig } from "../types";

/** Extract a short, human-readable message from raw API errors */
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
  const firstSentence = raw.split(/[.\n]/)[0] ?? raw;
  return firstSentence.length > 60 ? `${firstSentence.slice(0, 57)}…` : firstSentence;
}

const INITIAL_STATE: AIToolsState = {
  view: "main",
  selectedToneIds: [],
  customPrompt: "",
  isLoading: false,
  error: null,
  previewContent: null,
  originalContent: null,
  lastRequest: null,
  cooldownRemaining: 0,
};

export interface UseAIToolsStateOptions {
  mode: AIToolsMode;
  /** Current text/image content of the component */
  currentContent: string;
  componentType?: string;
  aiConfig: AIConfig;
  onConfirm: (newContent: string) => void;
  onClose: () => void;
}

export interface UseAIToolsStateReturn {
  state: AIToolsState;
  // Navigation
  goToTransform: () => void;
  goToMain: () => void;
  // Tone
  toggleTone: (toneId: string) => void;
  // Custom prompt
  setCustomPrompt: (v: string) => void;
  appendToPrompt: (text: string) => void;
  // Execute
  executeAction: (actionId: string) => Promise<void>;
  executeTransform: () => Promise<void>;
  // Preview
  confirm: () => void;
  regenerate: () => Promise<void>;
  cancel: () => void;
}

export function useAIToolsState(options: UseAIToolsStateOptions): UseAIToolsStateReturn {
  const { mode, currentContent, componentType, aiConfig, onConfirm, onClose } = options;

  const [state, setState] = useState<AIToolsState>({
    ...INITIAL_STATE,
    originalContent: currentContent,
  });

  // Sync originalContent when popover opens with new content
  useEffect(() => {
    setState((prev) => ({ ...prev, originalContent: currentContent }));
  }, [currentContent]);

  // Cooldown countdown
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setState((prev) => ({ ...prev, cooldownRemaining: AI_REGENERATE_COOLDOWN_SECONDS }));
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

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const runRequest = useCallback(
    async (request: AIToolsRequest, targetView: AIToolsView = "preview") => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        lastRequest: request,
      }));

      try {
        const response: AIToolsResponse = await executeAIToolsAction(request, aiConfig);
        const previewContent =
          mode === "image" ? (response.imageUrl ?? null) : (response.textContent ?? null);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          view: targetView,
          previewContent,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: toUserFriendlyError(err),
        }));
      }
    },
    [aiConfig, mode],
  );

  // ── Navigation ────────────────────────────────────────────────────────────

  const goToTransform = useCallback(() => {
    setState((prev) => ({ ...prev, view: "transform", customPrompt: "" }));
  }, []);

  const goToMain = useCallback(() => {
    setState((prev) => ({ ...prev, view: "main", error: null }));
  }, []);

  // ── Tone ─────────────────────────────────────────────────────────────────

  const toggleTone = useCallback((toneId: string) => {
    setState((prev) => {
      const has = prev.selectedToneIds.includes(toneId);
      return {
        ...prev,
        selectedToneIds: has
          ? prev.selectedToneIds.filter((id) => id !== toneId)
          : [...prev.selectedToneIds, toneId],
      };
    });
  }, []);

  // ── Custom prompt ─────────────────────────────────────────────────────────

  const setCustomPrompt = useCallback((v: string) => {
    setState((prev) => ({ ...prev, customPrompt: v }));
  }, []);

  const appendToPrompt = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      customPrompt: prev.customPrompt ? `${prev.customPrompt} ${text}` : text,
    }));
  }, []);

  // ── Execute action ────────────────────────────────────────────────────────

  const executeAction = useCallback(
    async (actionId: string) => {
      const request: AIToolsRequest = {
        mode,
        actionId,
        currentContent: state.originalContent ?? currentContent,
        toneIds: state.selectedToneIds,
        componentType,
      };
      await runRequest(request);
    },
    [mode, state.originalContent, state.selectedToneIds, currentContent, componentType, runRequest],
  );

  const executeTransform = useCallback(async () => {
    if (!state.customPrompt.trim()) return;
    const request: AIToolsRequest = {
      mode,
      actionId: "transform",
      currentContent: state.originalContent ?? currentContent,
      toneIds: [],
      customPrompt: state.customPrompt.trim(),
      componentType,
    };
    await runRequest(request);
  }, [mode, state.originalContent, state.customPrompt, currentContent, componentType, runRequest]);

  // ── Preview actions ───────────────────────────────────────────────────────

  const confirm = useCallback(() => {
    if (state.previewContent != null) {
      onConfirm(state.previewContent);
    }
    setState({ ...INITIAL_STATE, originalContent: currentContent });
    onClose();
  }, [state.previewContent, onConfirm, onClose, currentContent]);

  const regenerate = useCallback(async () => {
    if (state.cooldownRemaining > 0 || !state.lastRequest) return;
    startCooldown();
    await runRequest(state.lastRequest);
  }, [state.cooldownRemaining, state.lastRequest, startCooldown, runRequest]);

  const cancel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      view: "main",
      previewContent: null,
      error: null,
    }));
  }, []);

  return {
    state,
    goToTransform,
    goToMain,
    toggleTone,
    setCustomPrompt,
    appendToPrompt,
    executeAction,
    executeTransform,
    confirm,
    regenerate,
    cancel,
  };
}
