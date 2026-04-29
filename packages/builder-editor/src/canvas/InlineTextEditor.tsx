/**
 * InlineTextEditor — tiptap-powered rich-text editor that renders
 * directly on top of a canvas node when the user double-clicks it.
 *
 * Behaviour:
 * - Mounts at the exact bounding-box of the target DOM node (canvas-space).
 * - Applies the node's computed style so fonts, colours, etc. look identical.
 * - Escape or clicking outside commits the content and exits editing mode.
 * - While active, pointer events on the bounding box are captured so the
 *   canvas gestures (move, resize) are suppressed.
 */
import React, { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { FontSize } from "./extensions/FontSize";
import type { RichtextToolbarConfig } from "@ui-builder/builder-core";

export interface InlineTextEditorProps {
  /** The node id being edited — used to locate the DOM element on the canvas. */
  nodeId: string;
  /** Initial HTML content. */
  initialContent: string;
  /** Toolbar feature flags from the prop schema. */
  toolbarConfig?: RichtextToolbarConfig;
  /**
   * The active canvas frame — used to query the target DOM element.
   * In dual (side-by-side) mode this should be the frame whose breakpoint
   * is currently active (desktop or mobile), not always the desktop frame.
   */
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /**
   * The outermost editor container (the element that contains the CanvasRoot
   * and all overlays).  Used as the coordinate-space origin so that overlay
   * positions are correct regardless of which frame is active.
   */
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Zoom level — bounding rect is in DOM pixels; we need to map to overlay pixels. */
  zoom: number;
  /** Pan offset of the canvas. */
  panOffset: { x: number; y: number };
  /** Called when editing is committed with the final HTML content. */
  onCommit: (html: string) => void;
  /** Called when editing should be exited (before or after commit). */
  onExit: () => void;
  /** Forwarded ref so parent can access the tiptap Editor instance (for toolbar). */
  onEditorReady?: (editor: Editor) => void;
  /**
   * Called whenever the editor container resizes (content grows/shrinks).
   * Receives the updated canvas-space bounding rect so the parent can keep
   * SelectionOverlay and TextEditToolbar in sync.
   */
  onBoundsChange?: (rect: { x: number; y: number; width: number; height: number }) => void;
}

export const InlineTextEditor: React.FC<InlineTextEditorProps> = ({
  nodeId,
  initialContent,
  toolbarConfig,
  canvasFrameRef,
  canvasContainerRef,
  zoom,
  panOffset,
  onCommit,
  onExit,
  onEditorReady,
  onBoundsChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef(false);

  // ── Tiptap editor instance ─────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
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

  // Notify parent when editor is ready (so TextEditToolbar can connect)
  useEffect(() => {
    if (editor) onEditorReady?.(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // ── Commit + exit ──────────────────────────────────────────────────────
  const commit = useCallback(() => {
    if (committedRef.current || !editor) return;
    committedRef.current = true;
    onCommit(editor.getHTML());
    onExit();
  }, [editor, onCommit, onExit]);

  // ── Position the editor over the canvas node ──────────────────────────
  useEffect(() => {
    if (!canvasFrameRef.current || !containerRef.current || !canvasContainerRef.current) return;

    const frameEl = canvasFrameRef.current;
    const el = frameEl.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
    if (!el) return;

    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Get the element's unrotated dimensions and transform
    const computed = window.getComputedStyle(el);
    const originalTransform = computed.transform !== "none" ? computed.transform : "";

    // Calculate the center of the element in the container's coordinate space
    const centerX = elRect.left + elRect.width / 2 - containerRect.left;
    const centerY = elRect.top + elRect.height / 2 - containerRect.top;

    // Use offsetWidth/offsetHeight instead of bounding rect dimensions because
    // bounding rect is larger than the actual element when rotated.
    const canvasW = el.offsetWidth;
    const canvasH = el.offsetHeight;

    // Calculate the unrotated top-left layout position.
    // We don't multiply by zoom here because the CSS scale() transform
    // visually scales the element from its center without affecting its layout box.
    const viewportX = centerX - canvasW / 2;
    const viewportY = centerY - canvasH / 2;

    const s = containerRef.current.style;
    s.left            = `${viewportX}px`;
    s.top             = `${viewportY}px`;
    s.width           = `${canvasW}px`;
    s.minHeight       = `${canvasH}px`;

    // Use pixel-based transform origin anchored to the canvas element's center (canvasH/2
    // from top), NOT "50% 50%" of the container's actual rendered height. This matters
    // because TipTap renders block elements (h1-h6) with browser-default margins, making
    // the container taller than canvasH. "50% 50%" would drift the origin downward,
    // causing the editor to appear below the original element.
    s.transformOrigin = `${canvasW / 2}px ${canvasH / 2}px`;

    // Apply scale first (from center), then original transform (which includes rotation)
    // CSS transforms are applied from right to left: scale(zoom) then originalTransform
    s.transform       = `${originalTransform} scale(${zoom})`;

    // Copy computed styles as-is — no zoom scaling needed because the
    // container itself is scaled by the transform above.
    s.fontFamily      = computed.fontFamily;
    s.fontSize        = computed.fontSize;
    s.fontWeight      = computed.fontWeight;
    s.lineHeight      = computed.lineHeight;
    s.letterSpacing   = computed.letterSpacing;
    s.textAlign       = computed.textAlign;
    s.color           = computed.color;
    s.backgroundColor = computed.backgroundColor;
    s.borderRadius    = computed.borderRadius;
    s.padding         = computed.padding;

    // Hide the original element so it doesn't show through the editor
    const prevVisibility = el.style.visibility;
    el.style.visibility = "hidden";
    return () => {
      el.style.visibility = prevVisibility;
    };
  }, [nodeId, canvasFrameRef, canvasContainerRef, zoom, panOffset]);

  // ── Sync container size → parent selectionRect via ResizeObserver ─────
  useEffect(() => {
    if (!containerRef.current || !onBoundsChange) return;
    const container = containerRef.current;

    const notify = () => {
      if (!canvasContainerRef.current) return;
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      // Convert overlay pixels → canvas-space coordinates (absolute from origin).
      // Subtract panOffset so the result is independent of scroll/pan position.
      // Use offsetWidth/offsetHeight instead of cRect.width/height to get the unrotated size.
      const centerX = (cRect.left + cRect.width / 2 - containerRect.left - panOffset.x) / zoom;
      const centerY = (cRect.top + cRect.height / 2 - containerRect.top - panOffset.y) / zoom;
      const width  = container.offsetWidth;
      const height = container.offsetHeight;
      const x = centerX - width / 2;
      const y = centerY - height / 2;
      onBoundsChange({ x, y, width, height });
    };

    const ro = new ResizeObserver(notify);
    ro.observe(container);
    // fire once immediately so the initial size is reported
    notify();
    return () => ro.disconnect();
  // zoom/panOffset change means positions shift — re-attach so first notify uses fresh values
  }, [onBoundsChange, canvasContainerRef, zoom, panOffset]);

  // ── Keyboard: Escape = commit & exit ─────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        commit();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [commit]);

  // ── Click outside = commit & exit ─────────────────────────────────────
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current?.contains(e.target as Node) ||
        (e.target as HTMLElement).closest("[data-text-edit-toolbar]")
      ) {
        return;
      }
      commit();
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => window.removeEventListener("pointerdown", handlePointerDown, true);
  }, [commit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  // Suppress features not enabled in toolbar config
  const enabledExtensions = {
    bold:          toolbarConfig?.bold          ?? true,
    italic:        toolbarConfig?.italic        ?? true,
    underline:     toolbarConfig?.underline     ?? true,
    strikethrough: toolbarConfig?.strikethrough ?? true,
    link:          toolbarConfig?.link          ?? true,
    list:          toolbarConfig?.list          ?? true,
    align:         toolbarConfig?.align         ?? true,
  };
  void enabledExtensions; // used by TextEditToolbar, not directly here

  if (!editor) return null;

  return (
    <div
      ref={containerRef}
      data-inline-editor-container
      className="absolute z-[60] cursor-text"
      style={{ boxSizing: "border-box" }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Tiptap content */}
      <EditorContent
        editor={editor}
        className="w-full h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:cursor-text [&_.ProseMirror_p]:my-0 [&_.ProseMirror_h1]:my-0 [&_.ProseMirror_h2]:my-0 [&_.ProseMirror_h3]:my-0 [&_.ProseMirror_h4]:my-0 [&_.ProseMirror_h5]:my-0 [&_.ProseMirror_h6]:my-0"
      />
    </div>
  );
};
