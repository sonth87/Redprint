/**
 * AIAssistant — prompt dialog for AI-powered canvas generation.
 *
 * Phase 4D Refactor: Removed settings panel, added quick selectors.
 *
 * Flow: user selects template or color/tone → types/edits prompt → Generate
 * → loading/streaming indicator → commands parsed → applied to canvas → dialog closes.
 */
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Label,
  Checkbox,
} from "@ui-builder/ui";
import { Sparkles, Zap, Loader2 } from "lucide-react";
import { useBuilder } from "@ui-builder/builder-react";
import type { AIConfig, AIMessage, AIBuilderContext, AIResponse } from "./types";
import { sendAIMessage, streamAIMessage, parseAIResponse } from "./AIService";
import { normalizeAICommands } from "./normalizeAICommands";
import { useTranslation } from "react-i18next";
import { PROMPT_TEMPLATES, COLOR_PALETTES, TONE_STYLES, TEMPLATE_CATEGORIES } from "./ai-prompt-templates";

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
  context: AIBuilderContext;
}

// ── Component ───────────────────────────────────────────────────────────

export function AIAssistant({ open, onOpenChange, config, context }: AIAssistantProps) {
  const { t } = useTranslation();
  const { dispatch } = useBuilder();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef(false);
  const streamScrollRef = useRef<HTMLPreElement>(null);

  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fullPageMode, setFullPageMode] = useState(false);
  const [selectedColorPalette, setSelectedColorPalette] = useState<string>("");
  const [selectedTone, setSelectedTone] = useState<string>("");

  // Reset all state when dialog closes
  useEffect(() => {
    if (!open) {
      setPrompt("");
      setError(null);
      setIsLoading(false);
      setStreamingText("");
      abortRef.current = false;
    }
  }, [open]);

  // Focus textarea when dialog opens and is in idle state
  useEffect(() => {
    if (open && !isLoading) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, isLoading]);

  // Auto-scroll streaming text to bottom as tokens arrive
  useEffect(() => {
    if (streamScrollRef.current) {
      streamScrollRef.current.scrollTop = streamScrollRef.current.scrollHeight;
    }
  }, [streamingText]);

  const applyAndClose = useCallback(
    (response: AIResponse) => {
      if (abortRef.current) return;
      
      // If fullPageMode is enabled, clear all existing nodes first (except root)
      if (fullPageMode) {
        // Get current state to find children of root
        const state = (dispatch as unknown as { getState?: () => { document?: { rootNodeId: string; nodes?: Record<string, unknown> } } }).getState?.() || { document: { rootNodeId: context.document.rootNodeId, nodes: {} } };
        const rootNodeId = context.document.rootNodeId;
        const nodes = state.document?.nodes || {};
        
        // Find and remove all children of root node
        const childrenToRemove = Object.values(nodes).filter(
          (n: unknown) => {
            const node = n as { parentId?: string; id?: string };
            return node.parentId === rootNodeId && node.id !== rootNodeId;
          }
        );
        
        for (const child of childrenToRemove) {
          try {
            const childNode = child as { id: string };
            dispatch({ type: "REMOVE_NODE", payload: { nodeId: childNode.id } } as never);
          } catch (err) {
            const nodeId = (child as { id?: string }).id || 'unknown';
            console.warn(`[AI] Failed to remove node ${nodeId}:`, err);
          }
        }
      }
      
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
    [dispatch, onOpenChange, context.document.rootNodeId, fullPageMode],
  );

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isLoading) return;
    if (!config.backendUrl) {
      setError("Backend URL not configured. Set backendUrl in AI settings.");
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
  }, [prompt, isLoading, config, context, applyAndClose]);

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

  // Filter templates by selected category (if any)
  const categorizedTemplates = TEMPLATE_CATEGORIES.map((cat) => ({
    ...cat,
    templates: PROMPT_TEMPLATES.filter((t) => t.category === cat.id),
  }));

  const handleTemplateClick = (template: typeof PROMPT_TEMPLATES[0]) => {
    setPrompt(template.prompt);
    textareaRef.current?.focus();
  };

  const handleColorPaletteClick = (paletteName: string) => {
    setSelectedColorPalette(paletteName);
  };

  const handleToneClick = (toneId: string) => {
    setSelectedTone(toneId);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[640px] flex flex-col p-0 gap-0 max-h-[90vh]">
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
                backend
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-5 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {!isLoading ? (
            <>
              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("ai.generateDescription")}
              </p>

              {/* Template Categories (Phase 4D) */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Templates</p>
                <div className="space-y-2.5">
                  {categorizedTemplates.map((category) => (
                    <div key={category.id}>
                      <p className="text-xs font-medium text-muted-foreground mb-2" style={{ color: category.color }}>
                        {category.label}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {category.templates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateClick(template)}
                            className="text-left px-3 py-2.5 rounded-md border border-input bg-background hover:bg-accent hover:border-accent text-xs transition-colors"
                          >
                            <div className="font-medium truncate">{template.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Palette Selector (Phase 4D) */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Color Palette</p>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.name}
                      onClick={() => handleColorPaletteClick(palette.name)}
                      className={`h-12 rounded-md border-2 transition-all flex flex-col items-center justify-center gap-1 p-2 ${
                        selectedColorPalette === palette.name
                          ? "border-ring ring-2 ring-ring"
                          : "border-input hover:border-foreground/50"
                      }`}
                      title={palette.name}
                    >
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: palette.primary }} />
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: palette.secondary }} />
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: palette.accent }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{palette.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone/Style Selector (Phase 4D) */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Tone & Style</p>
                <div className="grid grid-cols-3 gap-2">
                  {TONE_STYLES.map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => handleToneClick(tone.id)}
                      className={`px-3 py-2.5 rounded-md border-2 transition-all text-left ${
                        selectedTone === tone.id
                          ? "border-ring ring-2 ring-ring bg-accent"
                          : "border-input bg-background hover:border-foreground/50"
                      }`}
                      title={tone.description}
                    >
                      <div className="font-medium text-xs">{tone.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{tone.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt textarea */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Your Prompt
                </label>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("ai.placeholder")}
                  rows={4}
                  className="w-full rounded-md border bg-transparent px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              {/* Full Page Mode Checkbox */}
              <div className="flex items-center gap-2.5 pt-2">
                <Checkbox
                  id="fullPageMode"
                  checked={fullPageMode}
                  onCheckedChange={(checked: boolean | "indeterminate") => {
                    if (typeof checked === "boolean") {
                      setFullPageMode(checked);
                    }
                  }}
                  disabled={isLoading}
                />
                <Label htmlFor="fullPageMode" className="text-sm cursor-pointer select-none">
                  {t("toolbar.fullPageMode")}
                </Label>
              </div>

              {/* Error */}
              {error && <p className="text-xs text-destructive">{error}</p>}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
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
      </DialogContent>
    </Dialog>
  );
}
