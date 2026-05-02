/**
 * AISectionPopover — contextual AI button on the Section toolbar.
 *
 * Shows a list of preset section templates (Hero, Header, Features, Stats,
 * Testimonials, CTA, Footer) plus a free-form "Custom prompt" entry at the
 * bottom. The AI generates ADD_NODE commands that are applied directly to
 * the canvas; the user can then Accept, Regenerate, or Cancel.
 */

import React, { useCallback, useEffect, useState } from "react";
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
  Layers,
  LayoutPanelTop,
  LayoutGrid,
  BarChart2,
  Quote,
  Megaphone,
  PanelBottom,
  ChevronRight,
  ArrowLeft,
  Check,
  RefreshCw,
  X,
  Send,
  Loader2,
} from "lucide-react";
import { useAISectionState } from "./useAISectionState";
import { AI_SECTION_ACTIONS } from "./ai-section-config";
import type { AIConfig } from "../types";
import type { Command } from "@ui-builder/builder-core";
import { useBuilder } from "@ui-builder/builder-react";
import { buildAIContext } from "../buildAIContext";

// ── Icon map ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Layers,
  LayoutPanelTop,
  LayoutGrid,
  BarChart2,
  Quote,
  Megaphone,
  PanelBottom,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return <Sparkles className={className} />;
  return <Icon className={className} />;
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface AISectionPopoverProps {
  sectionNodeId: string;
  /** Current child node IDs — used to remove them before writing AI content */
  currentChildIds: string[];
  /** Component types available in the registry — passed to the AI prompt */
  availableComponentTypes: string[];
  aiConfig: AIConfig;
  dispatch: (command: Command) => void;
  undo: () => void;
  trigger?: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────

export function AISectionPopover({
  sectionNodeId,
  currentChildIds,
  availableComponentTypes,
  aiConfig,
  dispatch,
  undo,
  trigger,
}: AISectionPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { state: builderState, builder } = useBuilder();

  const getBuilderContext = useCallback(() => {
    return buildAIContext(builderState, builder.registry.listComponents(), {
      includePageContext: true,
      designTokens: aiConfig.designTokens,
    });
  }, [builderState, builder, aiConfig.designTokens]);

  const handleClose = useCallback(() => setOpen(false), []);

  const {
    state,
    setCustomPrompt,
    goToCustom,
    goToMain,
    executeAction,
    executeCustom,
    accept,
    regenerate,
    cancel,
  } = useAISectionState({
    sectionNodeId,
    currentChildIds,
    availableComponentTypes,
    aiConfig,
    dispatch,
    undo,
    onClose: handleClose,
    getBuilderContext,
  });

  // Reset to main view if popover is closed and we were in custom mode
  useEffect(() => {
    if (!open) {
      if (state.view === "custom") {
        goToMain();
      }
    }
  }, [open, state.view, goToMain]);

  // Esc key navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (state.isLoading) {
          e.preventDefault();
        } else if (state.view === "preview") {
          cancel();
        } else if (state.view === "custom") {
          goToMain();
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, state.view, state.isLoading, cancel, goToMain, handleClose]);

  const isConfigured = !!aiConfig.backendUrl;

  const headerTitle = (() => {
    if (state.view === "custom") return t("aiSection.customTitle");
    if (state.view === "loading" || state.view === "preview") return t("aiSection.previewTitle");
    return t("aiSection.title");
  })();

  const showBackArrow = state.view === "custom" || state.view === "preview";
  const backAction = state.view === "preview" ? cancel : goToMain;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {trigger ? (
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-purple-500 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/30"
              >
                <Sparkles size={16} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">{t("aiSection.buttonTooltip")}</TooltipContent>
        </Tooltip>
      )}

      <PopoverContent
        className="w-72 p-0 shadow-xl"
        side="bottom"
        align="start"
        data-ai-section-popover
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (state.isLoading) {
            e.preventDefault();
          }
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            {showBackArrow && (
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={backAction}
                disabled={state.isLoading}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-semibold">{headerTitle}</span>
            </div>
          </div>
          {state.view === "main" && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              Section
            </Badge>
          )}
        </div>

        {/* ── No API key warning ───────────────────────────────────────── */}
        {!isConfigured && state.view === "main" && (
          <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border-b">
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {t("aiSection.noApiKey")}
            </p>
          </div>
        )}

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {state.error && (
          <div className="px-3 py-2 bg-destructive/10 border-b">
            <p className="text-[11px] text-destructive">{state.error}</p>
          </div>
        )}

        {/* ── Main view ────────────────────────────────────────────────── */}
        {state.view === "main" && (
          <SectionMainView
            isLoading={state.isLoading}
            isConfigured={isConfigured}
            onExecuteAction={(id) => {
              const action = AI_SECTION_ACTIONS.find((a) => a.id === id);
              if (action?.isCustom) {
                goToCustom();
              } else {
                void executeAction(id);
              }
            }}
            t={t}
          />
        )}

        {/* ── Custom prompt view ───────────────────────────────────────── */}
        {state.view === "custom" && (
          <CustomView
            value={state.customPrompt}
            isLoading={state.isLoading}
            isConfigured={isConfigured}
            onChange={setCustomPrompt}
            onSubmit={() => void executeCustom()}
            t={t}
          />
        )}

        {/* ── Loading view ─────────────────────────────────────────────── */}
        {state.view === "loading" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-[12px] text-muted-foreground">{t("aiSection.generating")}</p>
          </div>
        )}

        {/* ── Preview view ─────────────────────────────────────────────── */}
        {state.view === "preview" && (
          <PreviewView
            aiMessage={state.aiMessage}
            isLoading={state.isLoading}
            cooldownRemaining={state.cooldownRemaining}
            onAccept={accept}
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

interface SectionMainViewProps {
  isLoading: boolean;
  isConfigured: boolean;
  onExecuteAction: (id: string) => void;
  t: (key: string) => string;
}

function SectionMainView({ isLoading, isConfigured, onExecuteAction, t }: SectionMainViewProps) {
  const presetActions = AI_SECTION_ACTIONS.filter((a) => !a.isCustom);
  const customAction = AI_SECTION_ACTIONS.find((a) => a.isCustom);

  return (
    <ScrollArea className="max-h-[380px]">
      <div className="py-2">
        {/* Preset templates */}
        {presetActions.map((action) => (
          <button
            key={action.id}
            disabled={isLoading || !isConfigured}
            onClick={() => onExecuteAction(action.id)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-foreground transition-colors hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <DynamicIcon name={action.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-[13px]">{t(action.i18nKey)}</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground shrink-0" />
          </button>
        ))}

        {/* Separator before custom */}
        {customAction && <div className="h-px bg-border mx-3 my-1" />}

        {/* Custom prompt action */}
        {customAction && (
          <button
            disabled={isLoading || !isConfigured}
            onClick={() => onExecuteAction(customAction.id)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left text-primary font-semibold transition-colors hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="text-[13px]">{t(customAction.i18nKey)}</span>
            <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0" />
          </button>
        )}
      </div>
    </ScrollArea>
  );
}

// ── Custom prompt view ────────────────────────────────────────────────────

interface CustomViewProps {
  value: string;
  isLoading: boolean;
  isConfigured: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  t: (key: string) => string;
}

function CustomView({ value, isLoading, isConfigured, onChange, onSubmit, t }: CustomViewProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && isConfigured && value.trim()) onSubmit();
    }
  };

  return (
    <div className="p-3 flex flex-col gap-2">
      <textarea
        className="w-full rounded-md border bg-background px-3 py-2 text-[12px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        rows={4}
        placeholder={t("aiSection.customPlaceholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading || !isConfigured}
        autoFocus
      />
      <Button
        size="sm"
        className="w-full h-8 text-[12px] gap-1.5"
        disabled={isLoading || !isConfigured || !value.trim()}
        onClick={onSubmit}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        {t("aiSection.generate")}
      </Button>
    </div>
  );
}

// ── Preview view ──────────────────────────────────────────────────────────

interface PreviewViewProps {
  aiMessage: string | null;
  isLoading: boolean;
  cooldownRemaining: number;
  onAccept: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}

function PreviewView({
  aiMessage,
  isLoading,
  cooldownRemaining,
  onAccept,
  onRegenerate,
  onCancel,
  t,
}: PreviewViewProps) {
  return (
    <div className="p-3 flex flex-col gap-3">
      {/* AI description */}
      <div className="rounded-md border bg-muted/30 p-3 min-h-[60px] relative">
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 text-[9px] h-4 px-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700"
        >
          AI preview
        </Badge>
        <p className="text-[12px] text-foreground leading-relaxed pr-14">
          {aiMessage ?? t("aiSection.previewTitle")}
        </p>
      </div>

      {/* Hint */}
      <p className="text-[11px] text-muted-foreground">
        {t("aiSection.previewHint")}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Accept */}
        <Button
          size="sm"
          className="flex-1 h-8 text-[12px] gap-1.5 bg-green-600 hover:bg-green-700 text-white"
          onClick={onAccept}
          disabled={isLoading}
        >
          <Check className="h-3.5 w-3.5" />
          {t("aiSection.accept")}
        </Button>

        {/* Regenerate */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-[12px] gap-1"
          onClick={onRegenerate}
          disabled={isLoading || cooldownRemaining > 0}
          title={
            cooldownRemaining > 0
              ? `Wait ${cooldownRemaining}s`
              : undefined
          }
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {cooldownRemaining > 0 ? `${cooldownRemaining}s` : t("aiSection.regenerate")}
        </Button>

        {/* Cancel */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[12px] text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

