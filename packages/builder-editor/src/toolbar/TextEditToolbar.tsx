/**
 * TextEditToolbar — rich-text formatting toolbar displayed while inline editing.
 *
 * Rendered in the overlay layer (screen-space) above the node being edited.
 * Connects directly to a Tiptap Editor instance via props.
 *
 * Add the attribute `data-text-edit-toolbar` so InlineTextEditor's
 * click-outside handler can exclude it.
 */
import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Check,
  Type,
  Highlighter,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { RichtextToolbarConfig } from "@ui-builder/builder-core";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui-builder/ui";
import { TOOLTIP_DELAY_MS } from "@ui-builder/shared";

export interface TextEditToolbarProps {
  editor: Editor | null;
  toolbarConfig?: RichtextToolbarConfig;
  /** Canvas-space bounding box of the node being edited */
  rect: { x: number; y: number; width: number; height: number };
  zoom: number;
  panOffset: { x: number; y: number };
  onExit: () => void;
}

export const TextEditToolbar: React.FC<TextEditToolbarProps> = ({
  editor,
  toolbarConfig,
  rect,
  zoom,
  panOffset,
  onExit,
}) => {
  const { t } = useTranslation();
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  const cfg: Required<RichtextToolbarConfig> = {
    bold:          toolbarConfig?.bold          ?? true,
    italic:        toolbarConfig?.italic        ?? true,
    underline:     toolbarConfig?.underline     ?? true,
    strikethrough: toolbarConfig?.strikethrough ?? true,
    link:          toolbarConfig?.link          ?? true,
    list:          toolbarConfig?.list          ?? false,
    align:         toolbarConfig?.align         ?? true,
    fontSize:      toolbarConfig?.fontSize      ?? true,
    color:         toolbarConfig?.color         ?? true,
    highlight:     toolbarConfig?.highlight     ?? true,
  };

  const TOOLBAR_HEIGHT = 40;
  const viewportX = rect.x * zoom + panOffset.x;
  const viewportY = rect.y * zoom + panOffset.y;
  const yPos =
    viewportY - TOOLBAR_HEIGHT - 8 > 0
      ? viewportY - TOOLBAR_HEIGHT - 8
      : viewportY + rect.height * zoom + 8;

  const wrap = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const toggleLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    if (prev) {
      editor.chain().focus().unsetLink().run();
    } else {
      setLinkUrl("");
      setLinkOpen(true);
    }
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url) {
      editor
        .chain()
        .focus()
        .setLink({ href: url.startsWith("http") ? url : `https://${url}` })
        .run();
    }
    setLinkOpen(false);
  }, [editor, linkUrl]);

  if (!editor) return null;

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <div
        data-text-edit-toolbar
        className="absolute z-[70] flex items-center bg-background/95 backdrop-blur-md rounded-md border shadow-lg p-1 gap-0.5"
        style={{ left: viewportX, top: yPos }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {/* ── Format buttons ─────────────────────────────────────────────── */}
        {cfg.bold && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor.isActive("bold") ? "secondary" : "ghost"}
                size="icon-sm"
                className="h-6 w-6"
                onClick={wrap(() => editor.chain().focus().toggleBold().run())}
              >
                <Bold className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("textEdit.bold", "Bold")}</TooltipContent>
          </Tooltip>
        )}

        {cfg.italic && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor.isActive("italic") ? "secondary" : "ghost"}
                size="icon-sm"
                className="h-6 w-6"
                onClick={wrap(() => editor.chain().focus().toggleItalic().run())}
              >
                <Italic className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("textEdit.italic", "Italic")}</TooltipContent>
          </Tooltip>
        )}

        {cfg.underline && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor.isActive("underline") ? "secondary" : "ghost"}
                size="icon-sm"
                className="h-6 w-6"
                onClick={wrap(() => editor.chain().focus().toggleUnderline().run())}
              >
                <UnderlineIcon className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("textEdit.underline", "Underline")}</TooltipContent>
          </Tooltip>
        )}

        {cfg.strikethrough && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editor.isActive("strike") ? "secondary" : "ghost"}
                size="icon-sm"
                className="h-6 w-6"
                onClick={wrap(() => editor.chain().focus().toggleStrike().run())}
              >
                <Strikethrough className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("textEdit.strikethrough", "Strikethrough")}</TooltipContent>
          </Tooltip>
        )}

        {/* ── Font size ────────────────────────────────────────────────── */}
        {cfg.fontSize && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <select
              title={t("textEdit.fontSize", "Font Size")}
              className="h-6 max-w-[52px] text-xs rounded px-1 bg-transparent border border-border/50 hover:bg-accent focus:outline-none cursor-pointer"
              value={
                ((editor.getAttributes("textStyle").fontSize as string | undefined) ?? "")
                  .replace("px", "")
              }
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = e.target.value;
                if (val) editor.chain().focus().setFontSize(`${val}px`).run();
                else editor.chain().focus().unsetFontSize().run();
              }}
            >
              <option value="">–</option>
              {[8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72].map((s) => (
                <option key={s} value={String(s)}>{s}</option>
              ))}
            </select>
          </>
        )}

        {/* ── Text colour ──────────────────────────────────────────────── */}
        {cfg.color && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <label className="relative h-6 w-6 flex flex-col items-center justify-center rounded cursor-pointer hover:bg-accent">
                  <Type className="h-3 w-3 shrink-0" />
                  <div
                    className="w-3 h-[3px] rounded-[1px] shrink-0"
                    style={{
                      backgroundColor:
                        (editor.getAttributes("textStyle").color as string | undefined) ?? "#000000",
                    }}
                  />
                  <input
                    type="color"
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    value={
                      (editor.getAttributes("textStyle").color as string | undefined) ?? "#000000"
                    }
                    onChange={(e) =>
                      editor.chain().focus().setColor(e.target.value).run()
                    }
                  />
                </label>
              </TooltipTrigger>
              <TooltipContent side="top">{t("textEdit.textColor", "Text Color")}</TooltipContent>
            </Tooltip>
          </>
        )}

        {/* ── Highlight colour ─────────────────────────────────────────── */}
        {cfg.highlight && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <label className="relative h-6 w-6 flex flex-col items-center justify-center rounded cursor-pointer hover:bg-accent">
                  <Highlighter className="h-3 w-3 shrink-0" />
                  <div
                    className="w-3 h-[3px] rounded-[1px] shrink-0"
                    style={{
                      backgroundColor:
                        (editor.getAttributes("highlight").color as string | undefined) ?? "#fef08a",
                    }}
                  />
                  <input
                    type="color"
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    value={
                      (editor.getAttributes("highlight").color as string | undefined) ?? "#fef08a"
                    }
                    onChange={(e) =>
                      editor.chain().focus().setHighlight({ color: e.target.value }).run()
                    }
                  />
                </label>
              </TooltipTrigger>
              <TooltipContent side="top">{t("textEdit.highlight", "Highlight")}</TooltipContent>
            </Tooltip>
          </>
        )}

        {/* ── Align ──────────────────────────────────────────────────────── */}
        {cfg.align && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editor.isActive({ textAlign: "left" }) ? "secondary" : "ghost"}
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={wrap(() => editor.chain().focus().setTextAlign("left").run())}
                >
                  <AlignLeft className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("textEdit.alignLeft", "Align Left")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editor.isActive({ textAlign: "center" }) ? "secondary" : "ghost"}
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={wrap(() => editor.chain().focus().setTextAlign("center").run())}
                >
                  <AlignCenter className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("textEdit.alignCenter", "Align Center")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editor.isActive({ textAlign: "right" }) ? "secondary" : "ghost"}
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={wrap(() => editor.chain().focus().setTextAlign("right").run())}
                >
                  <AlignRight className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("textEdit.alignRight", "Align Right")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editor.isActive({ textAlign: "justify" }) ? "secondary" : "ghost"}
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={wrap(() => editor.chain().focus().setTextAlign("justify").run())}
                >
                  <AlignJustify className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("textEdit.alignJustify", "Justify")}</TooltipContent>
            </Tooltip>
          </>
        )}

        {/* ── Link ───────────────────────────────────────────────────────── */}
        {cfg.link && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <Popover open={linkOpen} onOpenChange={setLinkOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={editor.isActive("link") ? "secondary" : "ghost"}
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={wrap(toggleLink)}
                >
                  <Link className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-2"
                side="bottom"
                align="start"
                data-text-edit-toolbar
                onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
              >
                <div className="flex gap-1">
                  <Input
                    className="h-7 text-xs flex-1"
                    placeholder="https://…"
                    value={linkUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkUrl(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") { e.preventDefault(); applyLink(); }
                      if (e.key === "Escape") { e.preventDefault(); setLinkOpen(false); }
                    }}
                    autoFocus
                  />
                  <Button size="icon-sm" className="h-7 w-7 shrink-0" onClick={applyLink}>
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* ── Done ───────────────────────────────────────────────────────── */}
        <div className="w-px h-4 bg-border mx-0.5" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] font-semibold text-primary"
          onClick={wrap(onExit)}
        >
          {t("textEdit.done", "Done")}
        </Button>
      </div>
    </TooltipProvider>
  );
};
