/**
 * Sample component definitions for the playground.
 * These demonstrate the ComponentDefinition contract from builder-core.
 *
 * In a real project, each component would ship from its own package.
 */
import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

// ── Text ──────────────────────────────────────────────────────────────────

export const TextComponent: ComponentDefinition = {
  type: "Text",
  name: "Text",
  category: "content",
  group: "text",
  subGroup: "paragraph",
  description: "A text block with configurable content and typography.",
  version: "1.0.0",
  tags: ["typography", "content", "label"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
    inlineEditable: true,
  },
  propSchema: [
    {
      key: "text",
      label: "Content",
      type: "richtext",
      toolbar: {
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
        link: true,
        align: true,
      },
    },
    {
      key: "tag",
      label: "HTML Tag",
      type: "select",
      options: [
        { value: "p", label: "Paragraph (p)" },
        { value: "span", label: "Inline (span)" },
        { value: "h1", label: "Heading 1" },
        { value: "h2", label: "Heading 2" },
        { value: "h3", label: "Heading 3" },
        { value: "h4", label: "Heading 4" },
      ],
      default: "p",
    },
  ],
  defaultProps: { text: "<p>Hello World</p>", tag: "p" },
  defaultStyle: { fontSize: "16px", color: "#111827", lineHeight: "1.6" },
  editorRenderer: ({ node, style }) => {
    const Tag = (node.props.tag ?? "p") as keyof React.JSX.IntrinsicElements;
    const html = String(node.props.text ?? "<p>Text</p>");
    return (
      <Tag
        data-node-id={node.id}
        style={style as React.CSSProperties}
        className="outline-none"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const Tag = (node.props.tag ?? "p") as keyof React.JSX.IntrinsicElements;
    return (
      <Tag
        style={style as React.CSSProperties}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: String(node.props.text ?? "") }}
      />
    );
  },
};

// ── Button ────────────────────────────────────────────────────────────────

export const ButtonComponent: ComponentDefinition = {
  type: "Button",
  name: "Button",
  category: "interactive",
  group: "button",
  subGroup: "button-single",
  description: "A clickable button element.",
  version: "1.0.0",
  tags: ["button", "action", "cta"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
    inlineEditable: true,
  },
  propSchema: [
    {
      key: "label",
      label: "Label",
      type: "richtext",
      toolbar: { bold: true, italic: false, underline: false, strikethrough: false, link: false, align: false },
    },
    {
      key: "variant",
      label: "Variant",
      type: "select",
      options: [
        { value: "primary", label: "Primary" },
        { value: "secondary", label: "Secondary" },
        { value: "outline", label: "Outline" },
        { value: "ghost", label: "Ghost" },
        { value: "destructive", label: "Destructive" },
      ],
      default: "primary",
    },
    {
      key: "size",
      label: "Size",
      type: "select",
      options: [
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
        { value: "lg", label: "Large" },
      ],
      default: "md",
    },
    { key: "disabled", label: "Disabled", type: "boolean", default: false },
  ],
  defaultProps: { label: "<p>Click me</p>", variant: "primary", size: "md", disabled: false },
  defaultStyle: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    border: "none",
    backgroundColor: "#111827",
    color: "#ffffff",
  },
  editorRenderer: ({ node, style }) => (
    <button
      data-node-id={node.id}
      style={style as React.CSSProperties}
      disabled={Boolean(node.props.disabled)}
      className="select-none"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: String(node.props.label ?? "<p>Button</p>") }}
    />
  ),
  runtimeRenderer: ({ node, style }) => (
    <button
      style={style as React.CSSProperties}
      disabled={Boolean(node.props.disabled)}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: String(node.props.label ?? "<p>Button</p>") }}
    />
  ),
};

// ── Container ─────────────────────────────────────────────────────────────

export const ContainerComponent: ComponentDefinition = {
  type: "Container",
  name: "Container",
  category: "layout",
  group: "container",
  description: "A flexible container that can hold any child components.",
  version: "1.0.0",
  tags: ["layout", "box", "div", "flex", "container"],
  capabilities: {
    canContainChildren: true,
    canResize: true,
    canTriggerEvents: false,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    {
      key: "display",
      label: "Display",
      type: "select",
      options: [
        { value: "block", label: "Block" },
        { value: "flex", label: "Flex" },
        { value: "grid", label: "Grid" },
        { value: "inline-flex", label: "Inline Flex" },
      ],
      default: "flex",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "row", label: "Row" },
        { value: "column", label: "Column" },
      ],
      default: "column",
    },
    {
      key: "gap",
      label: "Gap",
      type: "number",
      default: 8,
      min: 0,
      max: 96,
      step: 4,
      unit: "px",
    },
    {
      key: "padding",
      label: "Padding",
      type: "number",
      default: 16,
      min: 0,
      max: 96,
      step: 4,
      unit: "px",
    },
  ],
  defaultProps: { display: "flex", direction: "column", gap: 8, padding: 16 },
  defaultStyle: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    width: "100%",
    minHeight: "40px",
  },
  editorRenderer: ({ node, children, style }) => (
    <div
      data-node-id={node.id}
      style={{
        ...(style as React.CSSProperties),
        display: (node.props.display as string) ?? "flex",
        flexDirection: (node.props.direction as "row" | "column") ?? "column",
        gap: `${node.props.gap ?? 8}px`,
        padding: `${node.props.padding ?? 16}px`,
        minHeight: "40px",
      }}
    >
      {(children as React.ReactNode) ?? (
        <div className="flex items-center justify-center h-10 text-xs text-muted-foreground border-2 border-dashed border-border rounded">
          Drop components here
        </div>
      )}
    </div>
  ),
  runtimeRenderer: ({ node, children, style }) => (
    <div
      style={{
        ...(style as React.CSSProperties),
        display: (node.props.display as string) ?? "flex",
        flexDirection: (node.props.direction as "row" | "column") ?? "column",
        gap: `${node.props.gap ?? 8}px`,
        padding: `${node.props.padding ?? 16}px`,
      }}
    >
      {children as React.ReactNode}
    </div>
  ),
};

// ── Image ─────────────────────────────────────────────────────────────────

export const ImageComponent: ComponentDefinition = {
  type: "Image",
  name: "Image",
  category: "media",
  group: "image",
  description: "An image element with configurable src and alt text.",
  version: "1.0.0",
  tags: ["image", "photo", "media", "asset"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "src", label: "Image URL", type: "image", required: true, accept: ["image/*"] },
    { key: "alt", label: "Alt text", type: "string", default: "" },
    {
      key: "objectFit",
      label: "Object Fit",
      type: "select",
      options: [
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
        { value: "fill", label: "Fill" },
        { value: "none", label: "None" },
      ],
      default: "cover",
    },
  ],
  defaultProps: {
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    alt: "Sample image",
    objectFit: "cover",
  },
  defaultStyle: { width: "100%", height: "200px", borderRadius: "8px" },
  editorRenderer: ({ node, style }) => (
    <img
      data-node-id={node.id}
      src={String(node.props.src ?? "")}
      alt={String(node.props.alt ?? "")}
      style={{
        ...(style as React.CSSProperties),
        objectFit: (node.props.objectFit as React.CSSProperties["objectFit"]) ?? "cover",
        display: "block",
      }}
      draggable={false}
    />
  ),
  runtimeRenderer: ({ node, style }) => (
    <img
      src={String(node.props.src ?? "")}
      alt={String(node.props.alt ?? "")}
      style={{
        ...(style as React.CSSProperties),
        objectFit: (node.props.objectFit as React.CSSProperties["objectFit"]) ?? "cover",
        display: "block",
      }}
    />
  ),
};

// ── Divider ───────────────────────────────────────────────────────────────

export const DividerComponent: ComponentDefinition = {
  type: "Divider",
  name: "Divider",
  category: "layout",
  group: "divider",
  description: "A horizontal or vertical rule separator.",
  version: "1.0.0",
  tags: ["divider", "separator", "rule", "hr"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: false,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    {
      key: "orientation",
      label: "Orientation",
      type: "select",
      options: [
        { value: "horizontal", label: "Horizontal" },
        { value: "vertical", label: "Vertical" },
      ],
      default: "horizontal",
    },
    { key: "thickness", label: "Thickness (px)", type: "number", default: 1, min: 1, max: 16 },
    { key: "color", label: "Color", type: "color", default: "#e5e7eb" },
  ],
  defaultProps: { orientation: "horizontal", thickness: 1, color: "#e5e7eb" },
  defaultStyle: { width: "100%", height: "1px", backgroundColor: "#e5e7eb" },
  editorRenderer: ({ node }) => (
    <hr
      data-node-id={node.id}
      style={{
        width: node.props.orientation === "vertical" ? `${node.props.thickness ?? 1}px` : "100%",
        height: node.props.orientation === "vertical" ? "100%" : `${node.props.thickness ?? 1}px`,
        backgroundColor: String(node.props.color ?? "#e5e7eb"),
        border: "none",
        margin: 0,
      }}
    />
  ),
  runtimeRenderer: ({ node }) => (
    <hr
      style={{
        width: node.props.orientation === "vertical" ? `${node.props.thickness ?? 1}px` : "100%",
        height: node.props.orientation === "vertical" ? "100%" : `${node.props.thickness ?? 1}px`,
        backgroundColor: String(node.props.color ?? "#e5e7eb"),
        border: "none",
        margin: 0,
      }}
    />
  ),
};

// ── Section ───────────────────────────────────────────────────────────────

export const SectionComponent: ComponentDefinition = {
  type: "Section",
  name: "Section",
  category: "layout",
  group: "layout",
  description: "A full-width page section. Sections stack vertically and can be resized.",
  version: "1.0.0",
  tags: ["section", "page", "layout", "block"],
  capabilities: {
    canContainChildren: true,
    canResize: false,
    canTriggerEvents: false,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    {
      key: "minHeight",
      label: "Min Height (px)",
      type: "number",
      default: 400,
      min: 100,
      max: 4000,
      step: 8,
      unit: "px",
    },
  ],
  defaultProps: { minHeight: 400 },
  defaultStyle: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: "400px",
    position: "relative",
  },
  editorRenderer: ({ node, children, style }) => (
    <div
      data-node-id={node.id}
      data-section
      style={{
        ...(style as React.CSSProperties),
        width: "100%",
        minHeight: `${node.props.minHeight ?? 400}px`,
        position: "relative",
      }}
    >
      {(children as React.ReactNode) ?? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            minHeight: `${Number(node.props.minHeight ?? 400) - 32}px`,
            color: "#9ca3af",
            fontSize: 13,
            border: "2px dashed #e5e7eb",
            borderRadius: 8,
            margin: 16,
          }}
        >
          Drop components here
        </div>
      )}
    </div>
  ),
  runtimeRenderer: ({ node, children, style }) => (
    <div
      style={{
        ...(style as React.CSSProperties),
        width: "100%",
        minHeight: `${node.props.minHeight ?? 400}px`,
        position: "relative",
      }}
    >
      {children as React.ReactNode}
    </div>
  ),
};

// ── Export all ────────────────────────────────────────────────────────────

export const SAMPLE_COMPONENTS: ComponentDefinition[] = [
  SectionComponent,
  ContainerComponent,
  TextComponent,
  ButtonComponent,
  ImageComponent,
  DividerComponent,
];
