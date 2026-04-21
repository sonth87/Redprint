/**
 * PresetInlineEditor — tiptap richtext editor positioned over a canvas node.
 *
 * Unlike builder-editor's InlineTextEditor (which targets a non-CSS-scaled canvas),
 * this component is designed for builder-presets where the canvas uses
 * CSS `transform: scale(zoom)`. In that model:
 *   - getBoundingClientRect() already returns screen-space coords (post-scale)
 *   - getComputedStyle() returns layout values (pre-scale / canvas-space)
 *   - The editor lives outside the scaled canvas, so typography px values
 *     must be multiplied by zoom to visually match the scaled element.
 */
import React, { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

interface PresetInlineEditorProps {
  nodeId: string;
  initialContent: string;
  /** Ref to the scaled canvas frame — used to query the node element. */
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to the outer overlay container (position:relative) — used as coordinate origin. */
  outerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onCommit: (html: string) => void;
  onExit: () => void;
}

export function PresetInlineEditor({
  nodeId,
  initialContent,
  canvasFrameRef,
  outerRef,
  zoom,
  onCommit,
  onExit,
}: PresetInlineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: initialContent || "<p></p>",
    autofocus: "end",
    editorProps: {
      attributes: {
        class: "outline-none w-full h-full",
        "data-inline-editor": "true",
        spellcheck: "false",
      },
    },
  });

  // Position editor over node using screen-space bounding rects
  useEffect(() => {
    const outer = outerRef.current;
    const frame = canvasFrameRef.current;
    if (!outer || !frame || !containerRef.current) return;

    const el = frame.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;

    // getBoundingClientRect() returns screen-space coords after CSS scale transform.
    // Subtracting outerRef's origin gives position relative to the overlay container.
    const outerRect = outer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const x = elRect.left - outerRect.left;
    const y = elRect.top - outerRect.top;
    const w = elRect.width;
    const h = elRect.height;

    // getComputedStyle() returns layout values (pre-transform / canvas-space).
    // Since the editor lives outside the scaled canvas, we scale px values by zoom
    // so fonts visually match the scaled element.
    const computed = window.getComputedStyle(el);
    const scalePx = (val: string) => {
      const n = parseFloat(val);
      return isNaN(n) ? val : `${n * zoom}px`;
    };

    const s = containerRef.current.style;
    s.position        = "absolute";
    s.left            = `${x}px`;
    s.top             = `${y}px`;
    s.width           = `${w}px`;
    s.minHeight       = `${h}px`;
    s.zIndex          = "60";
    s.boxSizing       = "border-box";
    s.border          = "none";          // no border — would shrink content area and cause reflow
    s.outline         = "2px solid #3b82f6";
    s.outlineOffset   = "0px";
    s.overflow        = "auto";
    s.margin          = "0";
    s.transform       = "none"; // no extra scaling — screen-space coords already correct

    // Typography — scale canvas-space px values by zoom
    s.fontFamily      = computed.fontFamily;
    s.fontSize        = scalePx(computed.fontSize);
    s.fontWeight      = computed.fontWeight;
    s.fontStyle       = computed.fontStyle;
    s.lineHeight      = scalePx(computed.lineHeight);
    s.letterSpacing   = scalePx(computed.letterSpacing);
    s.textAlign       = computed.textAlign;
    s.color           = computed.color;
    s.backgroundColor = computed.backgroundColor;
    s.borderRadius    = scalePx(computed.borderRadius);
    s.paddingTop      = scalePx(computed.paddingTop);
    s.paddingRight    = scalePx(computed.paddingRight);
    s.paddingBottom   = scalePx(computed.paddingBottom);
    s.paddingLeft     = scalePx(computed.paddingLeft);

    // Hide original element while editing
    el.style.visibility = "hidden";
    return () => { el.style.visibility = ""; };
  }, [nodeId, canvasFrameRef, outerRef, zoom]);

  const commit = useCallback(() => {
    if (committedRef.current || !editor) return;
    committedRef.current = true;
    onCommit(editor.getHTML());
    onExit();
  }, [editor, onCommit, onExit]);

  // Escape = commit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); commit(); }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [commit]);

  // Click outside = commit
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) commit();
    };
    window.addEventListener("pointerdown", handler, true);
    return () => window.removeEventListener("pointerdown", handler, true);
  }, [commit]);

  useEffect(() => () => { editor?.destroy(); }, [editor]);

  if (!editor) return null;

  return (
    <div
      ref={containerRef}
      data-inline-editor-container
      onPointerDown={(e) => e.stopPropagation()}
      className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:cursor-text [&_.ProseMirror_p]:my-0 [&_.ProseMirror_ul]:my-1 [&_.ProseMirror_ol]:my-1"
    >
      <EditorContent editor={editor} />
    </div>
  );
}
