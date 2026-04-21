import React, { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

interface InlineRichtextEditorProps {
  nodeId: string;
  initialContent: string;
  outerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onCommit: (html: string) => void;
  onExit: () => void;
}

export function InlineRichtextEditor({
  nodeId,
  initialContent,
  outerRef,
  zoom,
  onCommit,
  onExit,
}: InlineRichtextEditorProps) {
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

  // Position editor over node
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer || !containerRef.current) return;
    const el = outer.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;

    // getBoundingClientRect() already returns screen-space coords after canvas scale.
    // Overlay div is outside the scaled canvas and anchored to outerRef (position:relative),
    // so we just subtract outerRef's origin — no need to apply zoom again.
    const outerRect = outer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const x = elRect.left - outerRect.left;
    const y = elRect.top - outerRect.top;
    const w = elRect.width;
    const h = elRect.height;

    // Copy computed styles from the element so typography matches.
    // getComputedStyle returns layout values (pre-transform), so we must
    // scale px values manually because the editor lives outside the scaled canvas.
    const computed = window.getComputedStyle(el);
    const scalePx = (val: string) => {
      const n = parseFloat(val);
      return isNaN(n) ? val : `${n * zoom}px`;
    };

    const s = containerRef.current.style;
    s.position = "absolute";
    s.left = `${x}px`;
    s.top = `${y}px`;
    s.width = `${w}px`;
    s.minHeight = `${h}px`;
    s.zIndex = "60";
    s.boxSizing = "border-box";
    s.border = "2px solid #3b82f6";
    s.outline = "none";
    s.overflow = "auto";
    s.margin = "0";
    s.transform = "none";

    // Typography — scale px values by zoom since editor is outside the scaled canvas
    s.fontFamily = computed.fontFamily;
    s.fontSize = scalePx(computed.fontSize);
    s.fontWeight = computed.fontWeight;
    s.fontStyle = computed.fontStyle;
    s.lineHeight = scalePx(computed.lineHeight);
    s.letterSpacing = scalePx(computed.letterSpacing);
    s.textAlign = computed.textAlign;
    s.color = computed.color;
    s.backgroundColor = computed.backgroundColor;
    s.borderRadius = scalePx(computed.borderRadius);
    s.paddingTop = scalePx(computed.paddingTop);
    s.paddingRight = scalePx(computed.paddingRight);
    s.paddingBottom = scalePx(computed.paddingBottom);
    s.paddingLeft = scalePx(computed.paddingLeft);

    // Hide original element while editing
    el.style.visibility = "hidden";
    return () => {
      el.style.visibility = "";
    };
  }, [nodeId, outerRef, zoom]);

  // Auto-focus on mount (already set via autofocus in useEditor)
  // No need to manually focus again

  const commit = useCallback(() => {
    if (committedRef.current || !editor) return;
    committedRef.current = true;
    onCommit(editor.getHTML());
    onExit();
  }, [editor, onCommit, onExit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        commit();
      }
      // Enter without shift = commit
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commit();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [commit]);

  // Click outside = commit
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) commit();
    };
    window.addEventListener("pointerdown", handler, true);
    return () => window.removeEventListener("pointerdown", handler, true);
  }, [commit]);

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

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
