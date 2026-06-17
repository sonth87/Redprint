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
  Textarea,
} from "@ui-builder/ui";
import { useTranslation } from "react-i18next";
import { Sparkles, CheckCircle2, XCircle, Loader2, LayoutTemplate } from "lucide-react";
import type { AIConfig, AIBuilderContext } from "../types";
import { usePageGenerator, type SectionOutlineView } from "./usePageGenerator";
import { COLOR_PALETTES, TONE_STYLES } from "../ai-prompt-templates";

// ── Section type → icon label map ─────────────────────────────────────────

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "🦸 Hero",
  header: "🧭 Header",
  services: "Services",
  trust: "Trust",
  process: "Process",
  gallery: "Gallery",
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
  const isRetrying = section.status === "retrying";
  const hasError = section.status === "failed" && Boolean(section.error);

  return (
    <div
      className={
        "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-all text-sm " +
        (hasError
          ? "border-destructive/40 bg-destructive/5"
            : isRetrying
              ? "border-amber-400/50 bg-amber-50/60"
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
        {isRetrying && (
          <p className="text-[10px] text-amber-600 mt-0.5">{t("ai.pageGenerator.retrying")} {section.attempt ?? ""}</p>
        )}
        {hasError && !isRetrying && (
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
  const [selectedColorPalette, setSelectedColorPalette] = useState(COLOR_PALETTES[0]?.name ?? "");
  const [selectedTone, setSelectedTone] = useState(TONE_STYLES[0]?.id ?? "");
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
    if (isDone && state.completionStatus !== "partial" && state.completionStatus !== "failed") {
      const t = setTimeout(() => onOpenChange(false), 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isDone, state.completionStatus, onOpenChange]);

  // Focus textarea on open
  useEffect(() => {
    if (open && isIdle) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, isIdle]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isBusy) return;
    const palette = COLOR_PALETTES.find((p) => p.name === selectedColorPalette);
    const tone = TONE_STYLES.find((item) => item.id === selectedTone);
    await generate(prompt.trim(), {
      fullPageMode,
      generationOptions: {
        colorPalette: palette
          ? { name: palette.name, primary: palette.primary, secondary: palette.secondary, accent: palette.accent }
          : undefined,
        tone: tone ? { id: tone.id, label: tone.label, description: tone.description } : undefined,
        complexity: "standard",
      },
    });
  }, [prompt, isBusy, generate, fullPageMode, selectedColorPalette, selectedTone]);

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
                <Textarea
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("ai.colorPalette")}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {COLOR_PALETTES.slice(0, 6).map((palette) => (
                      <button
                        key={palette.name}
                        type="button"
                        onClick={() => setSelectedColorPalette(palette.name)}
                        className={
                          "flex h-9 items-center justify-center rounded-md border-2 transition-all " +
                          (selectedColorPalette === palette.name
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50")
                        }
                        title={palette.name}
                      >
                        <span className="flex gap-1">
                          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: palette.primary }} />
                          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: palette.secondary }} />
                          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: palette.accent }} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("ai.toneStyle")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONE_STYLES.slice(0, 4).map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setSelectedTone(tone.id)}
                        className={
                          "truncate rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-all " +
                          (selectedTone === tone.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50")
                        }
                        title={tone.description}
                      >
                        {tone.label}
                      </button>
                    ))}
                  </div>
                </div>
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
            <div className={"flex items-center gap-2 text-sm font-medium " + (state.completionStatus === "partial" ? "text-amber-600" : "text-emerald-600")}>
              <CheckCircle2 className="h-4 w-4" />
              {state.completionStatus === "partial"
                ? `${t("ai.pageGenerator.partial")} (${state.failedCount} ${t("ai.pageGenerator.failedSections")})`
                : t("ai.pageGenerator.success")}
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
