/**
 * AIAssistant — prompt dialog for AI-powered canvas generation.
 *
 * Flow: user types prompt → Generate → loading/streaming indicator
 * → commands parsed → applied to canvas → dialog closes automatically.
 */
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  ScrollArea,
  Badge,
} from "@ui-builder/ui";
import { Settings, Sparkles, Zap, Loader2 } from "lucide-react";
import { useBuilder } from "@ui-builder/builder-react";
import type { AIConfig, AIMessage, AIBuilderContext, AIResponse, AICommandSuggestion } from "./types";
import { sendAIMessage, streamAIMessage, parseAIResponse } from "./AIService";
import { AIConfigPanel } from "./AIConfig";
import { normalizeAICommands } from "./normalizeAICommands";
import { useTranslation } from "react-i18next";

// Commands the AI is allowed to dispatch — destructive/system commands are excluded
const ALLOWED_AI_COMMANDS = new Set([
  "ADD_NODE",
  "UPDATE_PROPS",
  "UPDATE_STYLE",
  "UPDATE_RESPONSIVE_PROPS",
  "UPDATE_RESPONSIVE_STYLE",
  "RENAME_NODE",
  "DUPLICATE_NODE",
  "UPDATE_CANVAS_CONFIG",
  "UPDATE_INTERACTIONS",
]);

// ── Props ───────────────────────────────────────────────────────────────

export interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AIConfig;
  onConfigChange?: (config: AIConfig) => void;
  context: AIBuilderContext;
}

// ── Component ───────────────────────────────────────────────────────────

export function AIAssistant({ open, onOpenChange, config, onConfigChange, context }: AIAssistantProps) {
  const { t } = useTranslation();
  const { dispatch } = useBuilder();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef(false);
  const streamScrollRef = useRef<HTMLPreElement>(null);

  const [view, setView] = useState<"generate" | "settings">("generate");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset all state when dialog closes
  useEffect(() => {
    if (!open) {
      setPrompt("");
      setError(null);
      setIsLoading(false);
      setStreamingText("");
      setView("generate");
      abortRef.current = false;
    }
  }, [open]);

  // Focus textarea when dialog opens and is in idle state
  useEffect(() => {
    if (open && view === "generate" && !isLoading) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, view, isLoading]);

  // Auto-scroll streaming text to bottom as tokens arrive
  useEffect(() => {
    if (streamScrollRef.current) {
      streamScrollRef.current.scrollTop = streamScrollRef.current.scrollHeight;
    }
  }, [streamingText]);

  const applyAndClose = useCallback(
    (response: AIResponse) => {
      if (abortRef.current) return;
      if (response.suggestions && response.suggestions.length > 0) {
        const commands = normalizeAICommands(response.suggestions, context.document.rootNodeId);
        const errors: string[] = [];
        for (const s of commands) {
          if (!ALLOWED_AI_COMMANDS.has(s.type)) continue;
          try {
            dispatch({ type: s.type, payload: s.payload } as never);
          } catch (err) {
            errors.push(`${s.type}: ${err instanceof Error ? err.message : "unknown error"}`);
          }
        }
        if (errors.length > 0) {
          console.warn(`[AI] ${errors.length} command(s) failed:`, errors);
          setError(`${errors.length} command(s) failed to apply. Check console for details.`);
          // Don't auto-close so the user sees the error
          return;
        }
      }
      onOpenChange(false);
    },
    [dispatch, onOpenChange, context.document.rootNodeId],
  );

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isLoading) return;
    if (!config.apiKey) {
      setError(t("ai.apiKeyNotConfigured"));
      return;
    }

    setIsLoading(true);
    setStreamingText("");
    setError(null);
    abortRef.current = false;

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    try {
      if (config.streamingEnabled === true) {
        // ── Streaming mode ──
        await streamAIMessage([userMessage], context, config, {
          onToken: (token) => {
            if (abortRef.current) return;
            setStreamingText((prev) => prev + token);
          },
          onComplete: (fullText) => {
            if (abortRef.current) return;
            setIsLoading(false);
            applyAndClose(parseAIResponse(fullText));
          },
          onError: (err) => {
            if (abortRef.current) return;
            setIsLoading(false);
            setStreamingText("");
            setError(err.message);
          },
        });
      } else {
        // ── Non-streaming mode ──
        const response = await sendAIMessage([userMessage], context, config);
        if (!abortRef.current) {
          setIsLoading(false);
          applyAndClose(response);
        }
      }
    } catch (err) {
      if (!abortRef.current) {
        setIsLoading(false);
        setStreamingText("");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }
  }, [prompt, isLoading, config, context, t, applyAndClose]);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
    setIsLoading(false);
    setStreamingText("");
    onOpenChange(false);
  }, [onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleGenerate();
      }
    },
    [handleGenerate],
  );

  const isStreaming = config.streamingEnabled === true;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[560px] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-sm font-medium">{t("ai.title")}</DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              {isStreaming && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Streaming
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                {config.provider}
              </Badge>
              {!isLoading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setView(view === "generate" ? "settings" : "generate")}
                  title={view === "generate" ? "Settings" : "Back"}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Generate view */}
        {view === "generate" && (
          <div className="px-5 py-5 flex flex-col gap-4">
            {!isLoading ? (
              <>
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("ai.generateDescription")}
                </p>

                {/* Prompt textarea */}
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("ai.placeholder")}
                  rows={5}
                  className="w-full rounded-md border bg-transparent px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />

                {/* Error */}
                {error && <p className="text-xs text-destructive">{error}</p>}

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleGenerate()}
                    disabled={!prompt.trim()}
                    className="gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("ai.generate")}
                  </Button>
                </div>
              </>
            ) : (
              /* Loading / streaming state */
              <div className="flex flex-col gap-4 py-2">
                {/* Status row */}
                <div className="flex items-center gap-3">
                  {isStreaming ? (
                    <>
                      <span className="flex gap-0.5 shrink-0">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t("ai.generating")}
                      </span>
                      <Badge variant="secondary" className="text-[10px] gap-1 ml-auto">
                        <Zap className="h-2.5 w-2.5 animate-pulse" />
                        Streaming
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {t("ai.generating")}
                      </span>
                    </>
                  )}
                </div>

                {/* Live streaming text preview */}
                {isStreaming && streamingText && (
                  <pre
                    ref={streamScrollRef}
                    className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 rounded-md px-3 py-2 max-h-[160px] overflow-y-auto"
                  >
                    {streamingText}
                    <span className="animate-pulse">▌</span>
                  </pre>
                )}

                {/* Cancel */}
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings view */}
        {view === "settings" && (
          <ScrollArea className="max-h-[70vh]">
            <AIConfigPanel
              config={config}
              onChange={(newConfig) => {
                onConfigChange?.(newConfig);
              }}
            />
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
