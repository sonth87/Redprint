/**
 * FigmaImportDialog — popup dialog for importing a Figma frame into the canvas.
 *
 * Flow: enter URL + PAT → click Import → loading states → nodes applied to canvas
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from "@ui-builder/ui";
import { Loader2, ExternalLink, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useFigmaImport, type FigmaImportMode } from "../hooks/useFigmaImport";

// ── Figma logo SVG (inline, no external dependency) ──────────────────────

const FigmaLogo = () => (
  <svg width="16" height="16" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 28.5C19 23.8056 22.8056 20 27.5 20C32.1944 20 36 23.8056 36 28.5C36 33.1944 32.1944 37 27.5 37C22.8056 37 19 33.1944 19 28.5Z" fill="#1ABCFE"/>
    <path d="M2 46.5C2 41.8056 5.80558 38 10.5 38H19V46.5C19 51.1944 15.1944 55 10.5 55C5.80558 55 2 51.1944 2 46.5Z" fill="#0ACF83"/>
    <path d="M19 2V20H27.5C32.1944 20 36 16.1944 36 11.5C36 6.80558 32.1944 3 27.5 3L19 2Z" fill="#FF7262"/>
    <path d="M2 11.5C2 16.1944 5.80558 20 10.5 20H19V3H10.5C5.80558 3 2 6.80558 2 11.5Z" fill="#F24E1E"/>
    <path d="M2 28.5C2 33.1944 5.80558 37 10.5 37H19V20H10.5C5.80558 20 2 23.8056 2 28.5Z" fill="#A259FF"/>
  </svg>
);

// ── Props ─────────────────────────────────────────────────────────────────

export interface FigmaImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export function FigmaImportDialog({ open, onOpenChange }: FigmaImportDialogProps) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<FigmaImportMode>("add");
  const [showPat, setShowPat] = useState(false);
  const [success, setSuccess] = useState(false);

  const urlRef = useRef<HTMLInputElement>(null);

  const { pat, setPat, isLoading, status, error, handleImport, reset } = useFigmaImport(
    useCallback(() => {
      setSuccess(true);
      // Auto-close after brief success flash
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1200);
    }, [onOpenChange])
  );

  // Reset local state when dialog closes/opens
  useEffect(() => {
    if (open) {
      setUrl("");
      setSuccess(false);
      reset();
      setTimeout(() => urlRef.current?.focus(), 100);
    }
  }, [open, reset]);

  const handleSubmit = useCallback(async () => {
    if (!url.trim() || !pat.trim() || isLoading) return;
    await handleImport(url.trim(), mode);
  }, [url, pat, mode, isLoading, handleImport]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit]
  );

  const canSubmit = url.trim().length > 0 && pat.trim().length > 0 && !isLoading;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        {/* ── Header ───────────────────────────────────────────── */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <FigmaLogo />
            <DialogTitle className="text-sm font-semibold">Import từ Figma</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Chọn một frame trên Figma → chuột phải → <strong>Copy link to selection</strong>, sau đó dán vào đây.
          </p>
        </DialogHeader>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="px-5 py-5 flex flex-col gap-4" onKeyDown={handleKeyDown}>

          {/* Figma URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="figma-url">
              Figma URL <span className="text-destructive">*</span>
            </label>
            <input
              id="figma-url"
              ref={urlRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.figma.com/design/..."
              disabled={isLoading}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
            />
          </div>

          {/* Personal Access Token */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground" htmlFor="figma-pat">
                Personal Access Token <span className="text-destructive">*</span>
              </label>
              <a
                href="https://www.figma.com/developers/api#access-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Lấy token
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="relative">
              <input
                id="figma-pat"
                type={showPat ? "text" : "password"}
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="figd_xxxxxxxxxxxxxxxxxxxxxxxx"
                disabled={isLoading}
                className="w-full rounded-md border bg-transparent px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPat((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPat ? "Ẩn token" : "Hiện token"}
              >
                {showPat ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Token được lưu trong localStorage của trình duyệt. Không được gửi đi ngoài thiết bị của bạn.
            </p>
          </div>

          {/* Import mode */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Chế độ import</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "add", label: "Thêm vào canvas", desc: "Giữ nguyên nội dung hiện tại" },
                  { value: "replace", label: "Thay thế canvas", desc: "Xoá nội dung cũ" },
                ] as const
              ).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  disabled={isLoading}
                  className={[
                    "flex flex-col items-start px-3 py-2.5 rounded-md border text-left transition-colors disabled:opacity-50",
                    mode === value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <span className="text-xs font-medium">{label}</span>
                  <span className="text-[11px] opacity-70 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Loading status */}
          {isLoading && status && (
            <div className="flex items-center gap-2.5 rounded-md bg-muted/50 px-3 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{status}</span>
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className="flex items-start gap-2.5 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive mt-0.5" />
              <p className="text-xs text-destructive leading-relaxed">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2.5 rounded-md bg-green-500/10 border border-green-500/20 px-3 py-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
              <span className="text-xs text-green-700 dark:text-green-400">Import thành công! Đang đóng...</span>
            </div>
          )}

          {/* Actions */}
          {!success && (
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSubmit()}
                disabled={!canSubmit}
                className="gap-1.5 min-w-[100px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <FigmaLogo />
                    Import
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
