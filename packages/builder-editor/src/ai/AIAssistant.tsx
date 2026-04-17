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
  const { t, i18n } = useTranslation();
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
  const [showTemplates, setShowTemplates] = useState(false);

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

  // Filter templates by selected category with i18n labels
  const categorizedTemplates = TEMPLATE_CATEGORIES.map((cat) => ({
    ...cat,
    label: t(`ai.templateCategories.${cat.id}`),
    templates: PROMPT_TEMPLATES.filter((t) => t.category === cat.id).map((template) => ({
      ...template,
      label: t(`ai.promptTemplates.${template.id}`),
    })),
  }));

  const handleTemplateClick = useCallback((template: typeof PROMPT_TEMPLATES[0]) => {
    // Get translated prompt if available, otherwise use English
    let promptText = template.prompt;

    // If Vietnamese is selected, try to get translated prompt
    if (i18n.language === 'vi') {
      const translatedPrompt = t(`ai.promptTemplateTexts.${template.id}`, { defaultValue: template.prompt });
      // Only use translated if it's different from the key (meaning translation exists)
      if (!translatedPrompt.includes('ai.promptTemplateTexts')) {
        promptText = translatedPrompt;
      }
    }

    setPrompt(promptText);
    textareaRef.current?.focus();
  }, [i18n.language, t]);

  const handleColorPaletteClick = useCallback((paletteName: string) => {
    setSelectedColorPalette(paletteName);
  }, []);

  const handleToneClick = useCallback((toneId: string) => {
    setSelectedTone(toneId);
  }, []);

  // Map palette names to i18n keys
  const paletteI18nMap: Record<string, string> = {
    "Blue & White": "blue-white",
    "Dark Modern": "dark-modern",
    "Green Accent": "green-accent",
    "Orange Warm": "orange-warm",
    "Purple Elegant": "purple-elegant",
    "Navy Professional": "navy-professional",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[700px] flex flex-col p-0 gap-0 max-h-[95vh]">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-semibold">{t("ai.title")}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">{t("ai.generateDescription")}</p>
            </div>
            {isStreaming && (
              <Badge variant="secondary" className="text-xs gap-1.5 ml-4">
                <Zap className="h-3 w-3" />
                Streaming
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-4 flex flex-col gap-5 overflow-y-auto flex-1">
          {!isLoading ? (
            <>
              {/* Prompt textarea - Priority section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("ai.yourPrompt")}
                </label>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("ai.placeholder")}
                  rows={5}
                  className="w-full rounded-lg border bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              {/* Quick Selectors Row */}
              <div className="grid grid-cols-3 gap-3">
                {/* Color Palette Quick Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t("ai.colorPalette")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COLOR_PALETTES.slice(0, 4).map((palette) => {
                      const paletteKey = paletteI18nMap[palette.name];
                      const paletteName = t(`ai.colorPalettes.${paletteKey}`);
                      return (
                        <button
                          key={palette.name}
                          onClick={() => handleColorPaletteClick(palette.name)}
                          className={`h-10 rounded-lg border-2 transition-all flex items-center justify-center gap-1 p-1.5 ${
                            selectedColorPalette === palette.name
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          }`}
                          title={paletteName}
                        >
                          <div className="flex gap-1">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: palette.primary }} />
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: palette.secondary }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tone/Style Quick Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t("ai.toneStyle")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONE_STYLES.slice(0, 4).map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => handleToneClick(tone.id)}
                        className={`px-2.5 py-2 rounded-lg border-2 transition-all text-left text-xs font-medium ${
                          selectedTone === tone.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                        title={t(`ai.toneDescriptions.${tone.id}`)}
                      >
                        {t(`ai.toneStyles.${tone.id}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Templates Quick Access */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">{t("ai.templates")}</label>
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="w-full px-3 py-2 rounded-lg border-2 border-border hover:border-primary/50 bg-background hover:bg-accent text-xs font-medium transition-all text-left"
                  >
                    {showTemplates ? "Hide" : "Browse"} Templates
                  </button>
                </div>
              </div>

              {/* Expandable Template Categories */}
              {showTemplates && (
                <div className="space-y-3 bg-muted/30 rounded-lg p-3 border border-border">
                  {categorizedTemplates.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <p className="text-xs font-semibold" style={{ color: category.color }}>
                        {t(`ai.templateCategories.${category.id}`)}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {category.templates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => {
                              handleTemplateClick(template);
                              setShowTemplates(false);
                            }}
                            className="text-left px-3 py-2.5 rounded-md border border-border bg-background hover:bg-primary/5 hover:border-primary/50 text-xs font-medium transition-colors truncate"
                            title={t(`ai.promptTemplates.${template.id}`)}
                          >
                            {t(`ai.promptTemplates.${template.id}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Options */}
              <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border">
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
                <Label htmlFor="fullPageMode" className="text-xs text-muted-foreground cursor-pointer select-none flex-1">
                  {t("toolbar.fullPageMode")}
                </Label>
              </div>

              {/* Error */}
              {error && (
                <div className="px-3 py-2.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-xs">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
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
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("ai.generate")}
                </Button>
              </div>
            </>
          ) : (
            /* Loading / streaming state */
            <div className="flex flex-col gap-5 py-8 items-center justify-center min-h-[300px]">
              {isStreaming ? (
                <>
                  <span className="flex gap-1.5 shrink-0">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="inline-block w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                  <span className="text-sm text-muted-foreground">{t("ai.generating")}</span>
                  {streamingText && (
                    <pre
                      ref={streamScrollRef}
                      className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed bg-muted/40 rounded-lg px-3 py-2 w-full max-h-[200px] overflow-y-auto border border-border"
                    >
                      {streamingText}
                      <span className="animate-pulse">▌</span>
                    </pre>
                  )}
                </>
              ) : (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("ai.generating")}</span>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleCancel} className="mt-4">
                {t("common.cancel")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
