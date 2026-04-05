/**
 * AIToolsPopover — contextual AI tools panel that appears on the component toolbar.
 *
 * Text mode: tone chips → action list → (transform sub-view) → preview
 * Image mode: image action list → (prompt sub-view) → preview
 *
 * Uses Radix Popover so it stays anchored to the toolbar button.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  Badge,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui-builder/ui";
import {
  Sparkles,
  PencilLine,
  Scissors,
  Maximize2,
  TrendingUp,
  Languages,
  Smile,
  BookOpen,
  MessageSquare,
  Zap,
  Target,
  ChevronRight,
  ArrowLeft,
  Check,
  RefreshCw,
  X,
  Send,
  ImagePlus,
  Eraser,
  ZoomIn,
  Palette,
  Copy,
  Loader2,
} from "lucide-react";
import { useAIToolsState } from "./useAIToolsState";
import { AI_TONES, AI_TEXT_ACTIONS, AI_IMAGE_ACTIONS, AI_CUSTOM_SUGGESTIONS } from "./ai-tools-config";
import type { AIToolsMode } from "./types";
import type { AIConfig } from "../types";

// ── Icon map (Lucide icon names → components) ─────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PencilLine,
  Scissors,
  Maximize2,
  TrendingUp,
  Languages,
  Smile,
  BookOpen,
  MessageSquare,
  Zap,
  Target,
  Sparkles,
  ImagePlus,
  Eraser,
  ZoomIn,
  Palette,
  Copy,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return <Sparkles className={className} />;
  return <Icon className={className} />;
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface AIToolsPopoverProps {
  mode: AIToolsMode;
  /** Current prop value (text html or image URL) to be transformed */
  currentContent: string;
  /** e.g. "headline", "paragraph", "image" — shown as badge in header */
  componentType?: string;
  aiConfig: AIConfig;
  /** Called when user confirms AI-generated content */
  onConfirm: (newContent: string) => void;
}

// ── Main component ────────────────────────────────────────────────────────

export function AIToolsPopover({
  mode,
  currentContent,
  componentType,
  aiConfig,
  onConfirm,
}: AIToolsPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => setOpen(false), []);

  const {
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
  } = useAIToolsState({
    mode,
    currentContent,
    componentType,
    aiConfig,
    onConfirm,
    onClose: handleClose,
  });

  // Esc closes the popover / cancels preview
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (state.view === "preview") {
          cancel();
        } else if (state.view === "transform") {
          goToMain();
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, state.view, cancel, goToMain, handleClose]);

  const actions = mode === "image" ? AI_IMAGE_ACTIONS : AI_TEXT_ACTIONS;
  const isConfigured = !!aiConfig.apiKey;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            >
              <Sparkles className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{t("aiTools.buttonTooltip")}</TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-72 p-0 shadow-xl"
        side="bottom"
        align="start"
        data-ai-tools-popover
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            {(state.view === "transform" || state.view === "preview") && (
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={state.view === "preview" ? cancel : goToMain}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-semibold">
                {state.view === "transform"
                  ? t("aiTools.transformTitle")
                  : state.view === "preview"
                    ? t("aiTools.previewTitle")
                    : t("aiTools.title")}
              </span>
            </div>
          </div>
          {componentType && state.view === "main" && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {componentType}
            </Badge>
          )}
        </div>

        {/* ── No API key warning ───────────────────────────────────────── */}
        {!isConfigured && (
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border-b">
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {t("aiTools.noApiKey")}
            </p>
          </div>
        )}

        {/* ── Error dot ────────────────────────────────────────────────── */}
        {state.error && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-2.5 right-8 h-2 w-2 rounded-full bg-destructive cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-[11px]">
              {state.error}
            </TooltipContent>
          </Tooltip>
        )}

        {/* ── Views ────────────────────────────────────────────────────── */}
        {state.view === "main" && (
          <MainView
            mode={mode}
            actions={actions}
            selectedToneIds={state.selectedToneIds}
            isLoading={state.isLoading}
            isConfigured={isConfigured}
            onToggleTone={toggleTone}
            onExecuteAction={(id) => {
              const action = actions.find((a) => a.id === id);
              if (action?.isTransform) {
                goToTransform();
              } else {
                void executeAction(id);
              }
            }}
            t={t}
          />
        )}

        {state.view === "transform" && (
          <TransformView
            customPrompt={state.customPrompt}
            isLoading={state.isLoading}
            isConfigured={isConfigured}
            onPromptChange={setCustomPrompt}
            onSuggestionClick={appendToPrompt}
            onSubmit={() => void executeTransform()}
            t={t}
          />
        )}

        {state.view === "preview" && (
          <PreviewView
            mode={mode}
            previewContent={state.previewContent}
            originalContent={state.originalContent}
            isLoading={state.isLoading}
            cooldownRemaining={state.cooldownRemaining}
            onConfirm={confirm}
            onRegenerate={() => void regenerate()}
            onCancel={cancel}
            t={t}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────

interface MainViewProps {
  mode: AIToolsMode;
  actions: typeof AI_TEXT_ACTIONS;
  selectedToneIds: string[];
  isLoading: boolean;
  isConfigured: boolean;
  onToggleTone: (id: string) => void;
  onExecuteAction: (id: string) => void;
  t: (key: string) => string;
}

function MainView({
  mode,
  actions,
  selectedToneIds,
  isLoading,
  isConfigured,
  onToggleTone,
  onExecuteAction,
  t,
}: MainViewProps) {
  return (
    <ScrollArea className="max-h-[420px]">
      <div className="py-2">
        {/* Tones — text mode only */}
        {mode === "text" && (
          <div className="px-3 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("aiTools.tonesLabel")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {AI_TONES.map((tone) => {
                const isSelected = selectedToneIds.includes(tone.id);
                return (
                  <button
                    key={tone.id}
                    onClick={() => onToggleTone(tone.id)}
                    className={[
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all",
                      isSelected
                        ? "bg-primary/10 border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    ].join(" ")}
                  >
                    <DynamicIcon name={tone.icon} className="h-3 w-3" />
                    {t(tone.i18nKey)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Separator if tones rendered */}
        {mode === "text" && <div className="h-px bg-border mx-3 mb-2" />}

        {/* Action list */}
        {actions.map((action, idx) => {
          const isTransformItem = action.isTransform;
          const isLast = idx === actions.length - 1;

          return (
            <React.Fragment key={action.id}>
              {isLast && <div className="h-px bg-border mx-3 mb-1 mt-1" />}
              <button
                disabled={isLoading || !isConfigured}
                onClick={() => onExecuteAction(action.id)}
                className={[
                  "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                  "hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed",
                  isTransformItem ? "text-primary font-semibold" : "text-foreground",
                ].join(" ")}
              >
                {isLoading && !isTransformItem ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <div
                    className={[
                      "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                      isTransformItem ? "bg-purple-100 dark:bg-purple-900/30" : "bg-muted",
                    ].join(" ")}
                  >
                    <DynamicIcon
                      name={action.icon}
                      className={[
                        "h-3.5 w-3.5",
                        isTransformItem ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground",
                      ].join(" ")}
                    />
                  </div>
                )}
                <span className="flex-1 text-[12px] leading-tight">{t(action.i18nKey)}</span>
                {action.badgeKey && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {t(action.badgeKey)}
                  </Badge>
                )}
                <ChevronRight
                  className={[
                    "h-3.5 w-3.5 shrink-0",
                    isTransformItem ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                />
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ── Transform (custom prompt) view ────────────────────────────────────────

interface TransformViewProps {
  customPrompt: string;
  isLoading: boolean;
  isConfigured: boolean;
  onPromptChange: (v: string) => void;
  onSuggestionClick: (text: string) => void;
  onSubmit: () => void;
  t: (key: string) => string;
}

function TransformView({
  customPrompt,
  isLoading,
  isConfigured,
  onPromptChange,
  onSuggestionClick,
  onSubmit,
  t,
}: TransformViewProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={customPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("aiTools.transformPlaceholder")}
          rows={4}
          disabled={isLoading || !isConfigured}
          className={[
            "w-full resize-none rounded-md border bg-background px-3 py-2 text-[12px]",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        />
        <button
          onClick={onSubmit}
          disabled={!customPrompt.trim() || isLoading || !isConfigured}
          className={[
            "absolute bottom-2.5 right-2.5 h-6 w-6 rounded flex items-center justify-center transition-colors",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "enabled:hover:bg-primary enabled:hover:text-primary-foreground",
          ].join(" ")}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-1.5">
        {AI_CUSTOM_SUGGESTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSuggestionClick(s.descriptionPrompt)}
            className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
          >
            {t(s.titleKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Preview view ──────────────────────────────────────────────────────────

interface PreviewViewProps {
  mode: AIToolsMode;
  previewContent: string | null;
  originalContent: string | null;
  isLoading: boolean;
  cooldownRemaining: number;
  onConfirm: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}

function PreviewView({
  mode,
  previewContent,
  isLoading,
  cooldownRemaining,
  onConfirm,
  onRegenerate,
  onCancel,
  t,
}: PreviewViewProps) {
  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Preview content */}
      <div className="rounded-md border bg-muted/30 p-3 min-h-[80px] relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : mode === "image" && previewContent ? (
          <img
            src={previewContent}
            alt="AI generated preview"
            className="w-full rounded object-cover max-h-40"
          />
        ) : (
          <div
            className="text-[12px] leading-relaxed text-foreground prose-sm max-w-none"
            /* Safe — content comes from the AI, same origin as user-authored content */
            dangerouslySetInnerHTML={{ __html: previewContent ?? "" }}
          />
        )}

        {/* Preview badge */}
        {!isLoading && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
              AI preview
            </Badge>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Confirm */}
        <Button
          size="sm"
          className="flex-1 h-8 text-[12px] gap-1.5"
          onClick={onConfirm}
          disabled={isLoading || !previewContent}
        >
          <Check className="h-3.5 w-3.5" />
          {t("aiTools.confirm")}
        </Button>

        {/* Regenerate */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-[12px] gap-1"
          onClick={onRegenerate}
          disabled={isLoading || cooldownRemaining > 0}
          title={cooldownRemaining > 0 ? `${t("aiTools.cooldown")} ${cooldownRemaining}s` : undefined}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {cooldownRemaining > 0 ? `${cooldownRemaining}s` : t("aiTools.regenerate")}
        </Button>

        {/* Cancel */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[12px]"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
