/**
 * PageGeneratorModal — full-page AI generation dialog.
 *
 * Shows:
 *  - Prompt input (idle)
 *  - Outline preview with per-section progress (generating)
 *  - Success/error state (done)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Checkbox,
  Label,
} from "@ui-builder/ui";
import { useTranslation } from "react-i18next";
import { Sparkles, CheckCircle2, XCircle, Loader2, LayoutTemplate } from "lucide-react";
import type { AIConfig, AIBuilderContext } from "../types";
import { usePageGenerator, type SectionOutlineView } from "./usePageGenerator";

// ── Section type → icon label map ─────────────────────────────────────────

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "🦸 Hero",
  header: "🧭 Header",
  features: "✨ Features",
  stats: "📊 Stats",
  testimonials: "💬 Testimonials",
  pricing: "💰 Pricing",
  faq: "❓ FAQ",
  cta: "🎯 CTA",
  footer: "🏁 Footer",
  custom: "⚙️ Custom",
};

function sectionLabel(type: string): string {
  return SECTION_TYPE_LABELS[type] ?? `📦 ${type.charAt(0).toUpperCase() + type.slice(1)}`;
}

// ── Section row component ─────────────────────────────────────────────────

function SectionRow({ section }: { section: SectionOutlineView }) {
  const { t } = useTranslation();
  const isGenerating = !section.done;
  const hasError = Boolean(section.error);

  return (
    <div
      className={
        "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-all text-sm " +
        (hasError
          ? "border-destructive/40 bg-destructive/5"
          : section.done
            ? "border-border bg-muted/30 opacity-80"
            : "border-primary/40 bg-primary/5")
      }
    >
      <div className="mt-0.5 shrink-0">
        {hasError ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : section.done ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs">{sectionLabel(section.sectionType)}</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
            {section.layoutHint}
          </Badge>
          {isGenerating && !hasError && (
            <span className="text-[10px] text-primary animate-pulse ml-auto">{t("ai.pageGenerator.building")}</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{section.purpose}</p>
        {hasError && (
          <p className="text-[10px] text-destructive mt-0.5">{section.error}</p>
        )}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface PageGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AIConfig;
  context: AIBuilderContext;
}

// ── Component ─────────────────────────────────────────────────────────────

export function PageGeneratorModal({
  open,
  onOpenChange,
  config,
  context,
}: PageGeneratorModalProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [fullPageMode, setFullPageMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { state, generate, cancel, reset } = usePageGenerator(config, context);

  const isIdle = state.phase === "idle";
  const isOutline = state.phase === "outline";
  const isGenerating = state.phase === "generating";
  const isDone = state.phase === "done";
  const isError = state.phase === "error";
  const isBusy = isOutline || isGenerating;

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setPrompt("");
    }
  }, [open, reset]);

  // Auto-close after done (2 seconds)
  useEffect(() => {
    if (isDone) {
      const t = setTimeout(() => onOpenChange(false), 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isDone, onOpenChange]);

  // Focus textarea on open
  useEffect(() => {
    if (open && isIdle) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, isIdle]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isBusy) return;
    await generate(prompt.trim(), { fullPageMode });
  }, [prompt, isBusy, generate, fullPageMode]);

  const handleCancel = useCallback(() => {
    if (isBusy) {
      cancel();
    } else {
      onOpenChange(false);
    }
  }, [isBusy, cancel, onOpenChange]);

  const progressPct =
    state.totalCount > 0
      ? Math.round((state.completedCount / state.totalCount) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isBusy) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[580px] flex flex-col p-0 gap-0 max-h-[85vh]">
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 border-b shrink-0">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            <DialogTitle className="text-sm font-medium">{t("ai.pageGenerator.title")}</DialogTitle>
            {isBusy && (
              <Badge variant="secondary" className="text-[10px] gap-1 ml-auto mr-8">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                {isOutline ? t("common.loading") : `${state.completedCount}/${state.totalCount}`}
              </Badge>
            )}
            {isDone && (
              <Badge variant="secondary" className="text-[10px] gap-1 ml-auto mr-8 text-emerald-600 bg-emerald-50 border-emerald-200">
                <CheckCircle2 className="h-2.5 w-2.5" /> {t("ai.pageGenerator.done")}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
          {/* ── Prompt input (idle state) ─────────────────────────────── */}
          {(isIdle || isError) && (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("ai.pageGenerator.description")}
                </p>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void handleGenerate();
                    }
                  }}
                  placeholder={t("ai.pageGenerator.placeholder")}
                  rows={4}
                  className="w-full rounded-md border bg-transparent px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
              {/* Full page mode checkbox */}
              <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border">
                <Checkbox
                  id="fullPageMode"
                  checked={fullPageMode}
                  onCheckedChange={(checked: boolean | "indeterminate") => {
                    if (typeof checked === "boolean") {
                      setFullPageMode(checked);
                    }
                  }}
                  disabled={isBusy}
                />
                <Label htmlFor="fullPageMode" className="text-xs text-muted-foreground cursor-pointer select-none flex-1">
                  {t("toolbar.fullPageMode")}
                </Label>
              </div>
              {isError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
                  <p className="text-xs text-destructive">{state.error}</p>
                </div>
              )}
            </>
          )}

          {/* ── Outline step ─────────────────────────────────────────── */}
          {isOutline && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block h-2 w-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{t("ai.pageGenerator.analysing")}</p>
            </div>
          )}

          {/* ── Section list (generating / done) ─────────────────────── */}
          {(isGenerating || isDone) && state.outline.length > 0 && (
            <div className="space-y-2">
              {/* Progress bar */}
              {isGenerating && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{t("ai.pageGenerator.generatingSections")}</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
              {/* Section rows */}
              <div className="space-y-1.5">
                {state.outline.map((section) => (
                  <SectionRow key={section.sectionId} section={section} />
                ))}
              </div>
            </div>
          )}

          {/* ── Done state ────────────────────────────────────────────── */}
          {isDone && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              {t("ai.pageGenerator.success")}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isDone && (
          <div className="flex justify-end gap-2 px-5 py-3.5 border-t shrink-0">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              {isBusy ? t("common.cancel") : t("common.close")}
            </Button>
            {isIdle && (
              <Button
                size="sm"
                onClick={() => void handleGenerate()}
                disabled={!prompt.trim()}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("ai.generate")}
              </Button>
            )}
            {isError && (
              <Button
                size="sm"
                onClick={() => void handleGenerate()}
                disabled={!prompt.trim()}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("ai.pageGenerator.tryAgain")}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
