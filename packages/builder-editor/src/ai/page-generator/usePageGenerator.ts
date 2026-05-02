/**
 * usePageGenerator — hook for full-page AI generation via backend SSE pipeline.
 *
 * Flow:
 *  1. POST /api/ai/generate-page with user prompt + canvas context
 *  2. Receive SSE "outline_ready"  → show outline preview to user
 *  3. Receive SSE "section_ready"  → apply commands to canvas in real-time
 *  4. Receive SSE "complete"       → done
 */
import { useCallback, useRef, useState } from "react";
import { useBuilder } from "@ui-builder/builder-react";
import { normalizeAICommands } from "../normalizeAICommands";
import { applyAICommandsProgressive } from "../applyAICommandsProgressive";
import type { AIConfig, AIBuilderContext, AICommandSuggestion } from "../types";

// ── Types ────────────────────────────────────────────────────────────────

export interface SectionOutlineView {
  index: number;
  sectionId: string;
  sectionType: string;
  purpose: string;
  layoutHint: string;
  keyContent: string[];
  done: boolean;
  error?: string;
}

export type GeneratorPhase = "idle" | "outline" | "generating" | "done" | "error";

export interface PageGeneratorState {
  phase: GeneratorPhase;
  outline: SectionOutlineView[];
  completedCount: number;
  totalCount: number;
  error: string | null;
}

const ALLOWED_COMMANDS = new Set([
  "ADD_NODE",
  "UPDATE_PROPS",
  "UPDATE_STYLE",
  "UPDATE_RESPONSIVE_PROPS",
  "UPDATE_RESPONSIVE_STYLE",
  "RENAME_NODE",
  "DUPLICATE_NODE",
  "REMOVE_NODE",
  "UPDATE_CANVAS_CONFIG",
  "UPDATE_INTERACTIONS",
  "TOGGLE_RESPONSIVE_HIDDEN",
  "RESET_RESPONSIVE_STYLE",
]);

// ── Hook ─────────────────────────────────────────────────────────────────

export function usePageGenerator(config: AIConfig, context: AIBuilderContext) {
  const { dispatch } = useBuilder();
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<PageGeneratorState>({
    phase: "idle",
    outline: [],
    completedCount: 0,
    totalCount: 0,
    error: null,
  });

  const applyCommands = useCallback(
    (commands: AICommandSuggestion[], rootNodeId: string) => {
      const normalized = normalizeAICommands(commands, rootNodeId);
      // fire-and-forget: sections arrive seconds apart (one LLM call each),
      // so phase 2 of section N always completes before section N+1 arrives.
      void applyAICommandsProgressive(
        normalized,
        (cmd) => dispatch({ type: cmd.type, payload: cmd.payload } as never),
        (cmd) => ALLOWED_COMMANDS.has(cmd.type),
      );
    },
    [dispatch],
  );

  const generate = useCallback(
    async (prompt: string, options?: { fullPageMode?: boolean }) => {
      if (!prompt.trim()) return;

      // Cancel any ongoing generation
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        phase: "outline",
        outline: [],
        completedCount: 0,
        totalCount: 0,
        error: null,
      });

      const backendUrl = config.backendUrl?.replace(/\/$/, "");
      if (!backendUrl) {
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: "Backend URL is not configured. Please set it in AI settings.",
        }));
        return;
      }

      // Clear existing nodes if fullPageMode is enabled
      if (options?.fullPageMode && context.pageNodes) {
        const childrenToRemove = Object.values(context.pageNodes).filter(
          (node) => node.parentId === context.document.rootNodeId
        );
        for (const node of childrenToRemove) {
          try {
            dispatch({ type: "REMOVE_NODE", payload: { id: node.id } } as never);
          } catch (err) {
            console.warn("[PageGenerator] REMOVE_NODE failed for:", node.id, err);
          }
        }
      }

      // Phase 1B/1C: send compact manifest + presets instead of full versions
      const requestBody = {
        prompt,
        fullPageMode: options?.fullPageMode ?? false,
        availableComponents: context.availableComponents,
        availablePresetsCompact: context.availablePresetsCompact,
        nestingRules: context.nestingRules,
        // Keep full presets for backward compat (phase may still need them)
        availablePresets: context.availablePresets,
        designTokens: config.designTokens ?? {},
      };

      // Timeout logic
      const timeoutId = setTimeout(() => {
        controller.abort();
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: "Request timed out. The backend might be busy or unreachable.",
        }));
      }, 90000); // 90 second timeout for whole page generation

      try {
        const response = await fetch(`${backendUrl}/api/ai/generate-page`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errDetail = "";
          try {
            const errJson = await response.json();
            errDetail = errJson.message || errJson.error || response.statusText;
          } catch {
            errDetail = await response.text() || response.statusText;
          }
          throw new Error(`Backend error: ${errDetail}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";

        const processLine = (line: string) => {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            try {
              const data = JSON.parse(dataStr) as Record<string, unknown>;
              handleSSEEvent(currentEvent, data);
            } catch {
              console.warn("[PageGenerator] SSE parse error:", dataStr);
            }
          }
        };

        const handleSSEEvent = (event: string, data: Record<string, unknown>) => {
          if (controller.signal.aborted) return;

          if (event === "outline_ready") {
            const sections = data.sections as SectionOutlineView[];
            setState((prev) => ({
              ...prev,
              phase: "generating",
              outline: sections.map((s) => ({ ...s, done: false })),
              totalCount: sections.length,
            }));
          } else if (event === "section_ready") {
            const { index, sectionId, commands } = data as {
              index: number;
              sectionId: string;
              commands: AICommandSuggestion[];
            };

            // Apply commands to canvas in real-time
            applyCommands(commands, context.document.rootNodeId);

            setState((prev) => ({
              ...prev,
              completedCount: prev.completedCount + 1,
              outline: prev.outline.map((s) =>
                s.sectionId === sectionId || s.index === index ? { ...s, done: true } : s,
              ),
            }));
          } else if (event === "section_error") {
            const { index, sectionId, error } = data as {
              index: number;
              sectionId: string;
              error: string;
            };
            setState((prev) => ({
              ...prev,
              completedCount: prev.completedCount + 1,
              outline: prev.outline.map((s) =>
                s.sectionId === sectionId || s.index === index
                  ? { ...s, done: true, error }
                  : s,
              ),
            }));
          } else if (event === "complete") {
            setState((prev) => ({ ...prev, phase: "done" }));
          } else if (event === "error") {
            setState((prev) => ({
              ...prev,
              phase: "error",
              error: (data.message as string) ?? "Unknown error",
            }));
          }
        };

        // Read SSE stream
        while (true) {
          if (controller.signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            processLine(line);
          }
        }
        if (buffer) processLine(buffer);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    },
    [config, context, applyCommands],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, phase: "idle", error: null }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ phase: "idle", outline: [], completedCount: 0, totalCount: 0, error: null });
  }, []);

  return { state, generate, cancel, reset };
}
