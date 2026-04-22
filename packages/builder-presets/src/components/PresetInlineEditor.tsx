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
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Link as LinkIcon
} from "lucide-react";

interface PresetInlineEditorProps {
  nodeId: string;
  initialContent: string;
  /** Ref to the scaled canvas frame — used as coordinate reference. */
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onCommit: (html: string) => void;
  onExit: () => void;
}

export function PresetInlineEditor({
  nodeId,
  initialContent,
  canvasFrameRef,
  zoom,
  onCommit,
  onExit,
}: PresetInlineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef(false);
  const stylesRef = useRef<Record<string, string>>({});

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
    content: initialContent || "",
    autofocus: "end",
    editorProps: {
      attributes: {
        class: "outline-none w-full h-full",
        "data-inline-editor": "true",
        spellcheck: "false",
      },
    },
  });

  // ── 1. Capture typography once ──
  useEffect(() => {
    const frame = canvasFrameRef.current;
    if (!frame) return;
    const el = frame.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;

    const computed = window.getComputedStyle(el);
    stylesRef.current = {
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontStyle: computed.fontStyle,
      lineHeight: computed.lineHeight,
      letterSpacing: computed.letterSpacing,
      textAlign: computed.textAlign,
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      borderRadius: computed.borderRadius,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
    };

    el.style.visibility = "hidden";
    return () => { el.style.visibility = ""; };
  }, [nodeId, canvasFrameRef]);

  // ── 2. Position editor in canvas-space ──
  useEffect(() => {
    const frame = canvasFrameRef.current;
    if (!frame || !containerRef.current) return;

    const el = frame.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;

    // Inside the scaled container, we need coordinates relative to the frame origin.
    // getBoundingClientRect() returns scaled values, so we divide by zoom to get canvas-space coords.
    const frameRect = frame.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const x = (elRect.left - frameRect.left) / zoom;
    const y = (elRect.top - frameRect.top) / zoom;
    const w = elRect.width / zoom;
    const h = elRect.height / zoom;

    const s = containerRef.current.style;
    s.position = "absolute";
    s.left = `${x}px`;
    s.top = `${y}px`;
    s.width = `${w}px`;
    s.minHeight = `${h}px`;
    s.zIndex = "60";
    s.boxSizing = "border-box";
    s.outline = "2px solid #3b82f6";
    s.overflow = "visible";
    s.transform = "none"; // Parent handle scaling

    const st = stylesRef.current;
    s.fontFamily = st.fontFamily || "";
    s.fontSize = st.fontSize || "";
    s.fontWeight = st.fontWeight || "";
    s.fontStyle = st.fontStyle || "";
    s.lineHeight = st.lineHeight || "";
    s.letterSpacing = st.letterSpacing || "";
    s.textAlign = st.textAlign || "";
    s.color = st.color || "";
    s.borderRadius = st.borderRadius || "";
    s.paddingTop = st.paddingTop || "";
    s.paddingRight = st.paddingRight || "";
    s.paddingBottom = st.paddingBottom || "";
    s.paddingLeft = st.paddingLeft || "";
  }, [nodeId, canvasFrameRef, zoom]);

  const commit = useCallback(() => {
    if (committedRef.current || !editor) return;
    committedRef.current = true;

    let html = editor.getHTML();

    // ── Cleanup logic: Aggressively remove empty trailing noise ──
    const temp = document.createElement("div");
    temp.innerHTML = html;
    
    // 1. Remove trailing empty blocks (p, h1, etc. that only contain whitespace/br)
    while (temp.lastChild) {
      const last = temp.lastChild as HTMLElement;
      // If it's a text node with only whitespace
      if (last.nodeType === Node.TEXT_NODE && !last.textContent?.trim()) {
        temp.removeChild(last);
        continue;
      }
      // If it's an element that is effectively empty
      if (last.nodeType === Node.ELEMENT_NODE) {
        const text = last.textContent?.trim() || "";
        const hasVisibleContent = text.length > 0 || last.querySelector("img, iframe, hr");
        if (!hasVisibleContent) {
          temp.removeChild(last);
          continue;
        }
      }
      break;
    }

    // 2. If after cleanup we have only one paragraph, unwrap it to keep it inline
    if (temp.childNodes.length === 1 && temp.firstChild?.nodeName === "P") {
      html = (temp.firstChild as HTMLElement).innerHTML;
    } else {
      html = temp.innerHTML;
    }
    
    // 3. Final trim and empty check
    html = html.trim();
    if (html === "<p></p>" || html === "<p><br></p>" || html === "<br>") {
      html = "";
    }

    onCommit(html);
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

  const btnClass = (active: boolean) => 
    `w-7 h-7 flex items-center justify-center rounded transition-colors ${active ? "bg-blue-500 text-white" : "hover:bg-gray-100 text-gray-600"}`;

  return (
    <div
      ref={containerRef}
      data-inline-editor-container
      onPointerDown={(e) => e.stopPropagation()}
      className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:cursor-text [&_.ProseMirror_p]:my-0"
    >
      {/* Mini Floating Toolbar — counter-scaled to stay constant size */}
      <div 
        style={{ transform: `scale(${1 / zoom})`, transformOrigin: "left bottom" }}
        className="absolute -top-1 px-1 py-1 mb-2 left-0 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
      >
        <button className={btnClass(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="h-3.5 w-3.5" /></button>
        <button className={btnClass(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="h-3.5 w-3.5" /></button>
        <button className={btnClass(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button className={btnClass(editor.isActive({ textAlign: "left" }))} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></button>
        <button className={btnClass(editor.isActive({ textAlign: "center" }))} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center"><AlignCenter className="h-3.5 w-3.5" /></button>
        <button className={btnClass(editor.isActive({ textAlign: "right" }))} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right"><AlignRight className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <button className={btnClass(editor.isActive("highlight"))} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight"><Highlighter className="h-3.5 w-3.5" /></button>
        <button 
          className={btnClass(editor.isActive("link"))} 
          onClick={() => {
            const url = window.prompt("URL:", editor.getAttributes("link").href);
            if (url) editor.chain().focus().setLink({ href: url }).run();
            else if (url === "") editor.chain().focus().unsetLink().run();
          }}
          title="Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <EditorContent editor={editor} className="w-full h-full" />
    </div>
  );
}
