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
    aiTextGeneration: true,
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
    // position: relative ensures children with position:absolute are scoped
    // to this container, not an ancestor section.
    position: "relative",
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
        minHeight: "40px",
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

// ── Grid ──────────────────────────────────────────────────────────────────

export const GridComponent: ComponentDefinition = {
  type: "Grid",
  name: "Grid",
  category: "layout",
  group: "layout",
  subGroup: "grid",
  description: "A CSS grid layout container. Children are placed in grid cells — no absolute positioning.",
  version: "1.0.0",
  tags: ["layout", "grid", "columns", "rows", "css-grid"],
  capabilities: {
    canContainChildren: true,
    canResize: true,
    canTriggerEvents: false,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  containerConfig: {
    layoutType: "grid",
    // Column component belongs to a separate concept — Grid uses CSS grid directly
    disallowedChildTypes: ["Column"],
    emptyStateConfig: { message: "Drop components into grid cells", allowDrop: true },
  },
  propSchema: [
    {
      key: "columns",
      label: "Columns",
      type: "number",
      default: 3,
      min: 1,
      max: 12,
      step: 1,
    },
    {
      key: "rows",
      label: "Rows",
      type: "number",
      default: 1,
      min: 1,
      max: 20,
      step: 1,
    },
    {
      key: "columnGap",
      label: "Column Gap",
      type: "number",
      default: 16,
      min: 0,
      max: 128,
      step: 4,
      unit: "px",
    },
    {
      key: "rowGap",
      label: "Row Gap",
      type: "number",
      default: 16,
      min: 0,
      max: 128,
      step: 4,
      unit: "px",
    },
    {
      key: "padding",
      label: "Padding",
      type: "number",
      default: 16,
      min: 0,
      max: 128,
      step: 4,
      unit: "px",
    },
  ],
  defaultProps: { columns: 3, rows: 1, columnGap: 16, rowGap: 16, padding: 16 },
  defaultStyle: {
    display: "grid",
    // gridTemplateColumns is NOT stored here — it is computed dynamically
    // from node.props.columns in the renderer so changing the prop always
    // takes effect without a separate style update.
    columnGap: "16px",
    rowGap: "16px",
    padding: "16px",
    width: "100%",
    minHeight: "80px",
  },
  editorRenderer: ({ node, children, style }) => {
    const columns = Number(node.props.columns ?? 3);
    const rows = Number(node.props.rows ?? 1);
    const columnGap = Number(node.props.columnGap ?? 16);
    const rowGap = Number(node.props.rowGap ?? 16);
    const padding = Number(node.props.padding ?? 16);

    const gridStyle: React.CSSProperties = {
      ...(style as React.CSSProperties),
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gridTemplateRows: rows > 1 ? `repeat(${rows}, auto)` : "auto",
      columnGap: `${columnGap}px`,
      rowGap: `${rowGap}px`,
      padding: `${padding}px`,
      width: "100%",
      minHeight: "80px",
      boxSizing: "border-box",
    };

    return (
      <div data-node-id={node.id} data-layout-type="grid" style={gridStyle}>
        {(children as React.ReactNode) ??
          Array.from({ length: columns }, (_, i) => (
            <div
              key={i}
              style={{
                minHeight: "80px",
                border: "2px dashed #e5e7eb",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: 12,
                userSelect: "none",
              }}
            >
              {i + 1}
            </div>
          ))}
      </div>
    );
  },
  runtimeRenderer: ({ node, children, style }) => {
    const columns = Number(node.props.columns ?? 3);
    const rows = Number(node.props.rows ?? 1);
    const columnGap = Number(node.props.columnGap ?? 16);
    const rowGap = Number(node.props.rowGap ?? 16);
    const padding = Number(node.props.padding ?? 16);

    return (
      <div
        style={{
          ...(style as React.CSSProperties),
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: rows > 1 ? `repeat(${rows}, auto)` : "auto",
          columnGap: `${columnGap}px`,
          rowGap: `${rowGap}px`,
          padding: `${padding}px`,
          width: "100%",
        }}
      >
        {children as React.ReactNode}
      </div>
    );
  },
};

// ── Column ────────────────────────────────────────────────────────────────

export const ColumnComponent: ComponentDefinition = {
  type: "Column",
  name: "Column",
  category: "layout",
  group: "layout",
  subGroup: "grid",
  description: "A flex column container. Children stack vertically without absolute positioning.",
  version: "1.0.0",
  tags: ["layout", "column", "flex", "stack"],
  capabilities: {
    canContainChildren: true,
    canResize: true,
    canTriggerEvents: false,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  containerConfig: {
    layoutType: "flex",
    emptyStateConfig: { message: "Drop components here", allowDrop: true },
  },
  propSchema: [
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
    {
      key: "alignItems",
      label: "Align Items",
      type: "select",
      options: [
        { value: "flex-start", label: "Start" },
        { value: "center", label: "Center" },
        { value: "flex-end", label: "End" },
        { value: "stretch", label: "Stretch" },
      ],
      default: "stretch",
    },
  ],
  defaultProps: { gap: 8, padding: 16, alignItems: "stretch" },
  defaultStyle: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
    width: "100%",
    minHeight: "80px",
    position: "relative",
  },
  editorRenderer: ({ node, children, style }) => {
    const gap = Number(node.props.gap ?? 8);
    const padding = Number(node.props.padding ?? 16);
    const alignItems = String(node.props.alignItems ?? "stretch");

    return (
      <div
        data-node-id={node.id}
        data-layout-type="flex"
        style={{
          ...(style as React.CSSProperties),
          display: "flex",
          flexDirection: "column",
          gap: `${gap}px`,
          padding: `${padding}px`,
          alignItems,
          width: "100%",
          minHeight: "80px",
        }}
      >
        {(children as React.ReactNode) ?? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "40px",
              color: "#9ca3af",
              fontSize: 12,
              border: "2px dashed #e5e7eb",
              borderRadius: 8,
              userSelect: "none",
            }}
          >
            Drop components here
          </div>
        )}
      </div>
    );
  },
  runtimeRenderer: ({ node, children, style }) => {
    const gap = Number(node.props.gap ?? 8);
    const padding = Number(node.props.padding ?? 16);
    const alignItems = String(node.props.alignItems ?? "stretch");

    return (
      <div
        style={{
          ...(style as React.CSSProperties),
          display: "flex",
          flexDirection: "column",
          gap: `${gap}px`,
          padding: `${padding}px`,
          alignItems,
        }}
      >
        {children as React.ReactNode}
      </div>
    );
  },
};

// ── TextMarquee ───────────────────────────────────────────────────────────

export const TextMarqueeComponent: ComponentDefinition = {
  type: "TextMarquee",
  name: "Text Marquee",
  category: "content",
  group: "text",
  subGroup: "text-marquee",
  description: "Scrolling ticker-tape text with configurable speed and direction.",
  version: "1.0.0",
  tags: ["marquee", "scrolling", "ticker", "animation", "text"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: false,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "text", label: "Text", type: "string", default: "Let's Talk 👋  Let's Talk 👋  Let's Talk 👋" },
    {
      key: "speed",
      label: "Speed (s)",
      type: "number",
      default: 20,
      min: 2,
      max: 120,
      step: 1,
      unit: "s",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ],
      default: "left",
    },
    { key: "separator", label: "Separator", type: "string", default: "  •  " },
  ],
  defaultProps: {
    text: "Let's Talk 👋",
    speed: 20,
    direction: "left",
    separator: "  •  ",
  },
  defaultStyle: {
    width: "100%",
    overflow: "hidden",
    whiteSpace: "nowrap",
    fontSize: "18px",
    fontWeight: "500",
    color: "#111827",
    padding: "12px 0",
  },
  editorRenderer: ({ node, style }) => {
    const text = String(node.props.text ?? "Marquee Text");
    const separator = String(node.props.separator ?? "  •  ");
    const speed = Number(node.props.speed ?? 20);
    const direction = node.props.direction === "right" ? "normal" : "reverse";
    const repeated = Array.from({ length: 6 }, (_, i) => `${text}${separator}`).join("");

    return (
      <div
        data-node-id={node.id}
        style={{ ...(style as React.CSSProperties), overflow: "hidden" }}
      >
        <div
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            animation: `marquee ${speed}s linear infinite ${direction}`,
          }}
        >
          {repeated}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const text = String(node.props.text ?? "Marquee Text");
    const separator = String(node.props.separator ?? "  •  ");
    const speed = Number(node.props.speed ?? 20);
    const direction = node.props.direction === "right" ? "normal" : "reverse";
    const repeated = Array.from({ length: 6 }, () => `${text}${separator}`).join("");

    return (
      <div style={{ ...(style as React.CSSProperties), overflow: "hidden" }}>
        <div
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            animation: `marquee ${speed}s linear infinite ${direction}`,
          }}
        >
          {repeated}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>
    );
  },
};

// ── CollapsibleText ───────────────────────────────────────────────────────

export const CollapsibleTextComponent: ComponentDefinition = {
  type: "CollapsibleText",
  name: "Collapsible Text",
  category: "content",
  group: "text",
  subGroup: "collapsible-text",
  description: "Long text with a 'Read more' / 'Show more' expand toggle.",
  version: "1.0.0",
  tags: ["collapsible", "expandable", "read-more", "text", "accordion"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    {
      key: "text",
      label: "Content",
      type: "richtext",
      toolbar: { bold: true, italic: true, underline: true, link: true, align: true },
    },
    {
      key: "previewLines",
      label: "Preview Lines",
      type: "number",
      default: 3,
      min: 1,
      max: 10,
    },
    {
      key: "expandLabel",
      label: "Expand label",
      type: "string",
      default: "Read more",
    },
    {
      key: "collapseLabel",
      label: "Collapse label",
      type: "string",
      default: "Show less",
    },
  ],
  defaultProps: {
    text: "<p>Collapsible text is great for longer section titles and descriptions. It gives people access to all the info they need, while keeping your design clean.</p>",
    previewLines: 3,
    expandLabel: "Read more",
    collapseLabel: "Show less",
  },
  defaultStyle: { fontSize: "16px", color: "#374151", lineHeight: "1.6" },
  editorRenderer: ({ node, style }) => {
    const html = String(node.props.text ?? "<p>Text…</p>");
    const label = String(node.props.expandLabel ?? "Read more");

    return (
      <div data-node-id={node.id} style={style as React.CSSProperties}>
        <div
          style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: Number(node.props.previewLines ?? 3), WebkitBoxOrient: "vertical" }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <span
          style={{
            display: "inline-block",
            marginTop: 8,
            fontSize: "14px",
            fontWeight: "600",
            color: "#374151",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {label}
        </span>
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const html = String(node.props.text ?? "<p>Text…</p>");
    const expandLabel = String(node.props.expandLabel ?? "Read more");
    const collapseLabel = String(node.props.collapseLabel ?? "Show less");

    const [expanded, setExpanded] = React.useState(false);

    return (
      <div style={style as React.CSSProperties}>
        <div
          style={
            expanded
              ? {}
              : { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: Number(node.props.previewLines ?? 3), WebkitBoxOrient: "vertical" }
          }
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <button
          style={{ display: "inline-block", marginTop: 8, fontSize: "14px", fontWeight: "600", cursor: "pointer", background: "none", border: "none", padding: 0, textDecoration: "underline" }}
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
      </div>
    );
  },
};

// ── TextMask ──────────────────────────────────────────────────────────────

export const TextMaskComponent: ComponentDefinition = {
  type: "TextMask",
  name: "Text Mask",
  category: "content",
  group: "text",
  subGroup: "text-mask",
  description: "Text used as a mask over a background image or gradient.",
  version: "1.0.0",
  tags: ["text-mask", "clip-path", "background-clip", "decorative", "typography"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: false,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "text", label: "Text", type: "string", default: "HELLO" },
    { key: "backgroundImage", label: "Background Image URL", type: "string", default: "" },
    { key: "gradient", label: "Gradient (CSS)", type: "string", default: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { key: "fontSize", label: "Font Size", type: "string", default: "120px" },
    { key: "fontWeight", label: "Font Weight", type: "select", options: [{ value: "700", label: "Bold" }, { value: "900", label: "Black" }], default: "900" },
  ],
  defaultProps: {
    text: "HELLO",
    backgroundImage: "",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontSize: "120px",
    fontWeight: "900",
  },
  defaultStyle: { display: "inline-block", width: "100%", padding: "16px 0", textAlign: "center" },
  editorRenderer: ({ node, style }) => {
    const text = String(node.props.text ?? "HELLO");
    const bg = node.props.backgroundImage ? `url(${String(node.props.backgroundImage)})` : String(node.props.gradient ?? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)");

    return (
      <div data-node-id={node.id} style={style as React.CSSProperties}>
        <span
          style={{
            fontSize: String(node.props.fontSize ?? "120px"),
            fontWeight: String(node.props.fontWeight ?? "900"),
            background: bg,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            display: "inline-block",
          }}
        >
          {text}
        </span>
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const text = String(node.props.text ?? "HELLO");
    const bg = node.props.backgroundImage ? `url(${String(node.props.backgroundImage)})` : String(node.props.gradient ?? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)");

    return (
      <div style={style as React.CSSProperties}>
        <span
          style={{
            fontSize: String(node.props.fontSize ?? "120px"),
            fontWeight: String(node.props.fontWeight ?? "900"),
            background: bg,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            display: "inline-block",
          }}
        >
          {text}
        </span>
      </div>
    );
  },
};

// ── GalleryGrid ───────────────────────────────────────────────────────────

export const GalleryGridComponent: ComponentDefinition = {
  type: "GalleryGrid",
  name: "Gallery Grid",
  category: "media",
  group: "gallery",
  subGroup: "gallery-grid",
  description: "A responsive image grid gallery layout.",
  version: "1.0.0",
  tags: ["gallery", "grid", "images", "photos", "masonry"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "columns", label: "Columns", type: "number", default: 3, min: 1, max: 6 },
    { key: "gap", label: "Gap (px)", type: "number", default: 8, min: 0, max: 48 },
    {
      key: "images",
      label: "Images (JSON array of {src, alt})",
      type: "json",
    },
    {
      key: "aspectRatio",
      label: "Cell Aspect Ratio",
      type: "select",
      options: [
        { value: "1/1", label: "1:1 Square" },
        { value: "4/3", label: "4:3" },
        { value: "16/9", label: "16:9" },
        { value: "3/4", label: "3:4 Portrait" },
      ],
      default: "1/1",
    },
  ],
  defaultProps: {
    columns: 3,
    gap: 8,
    aspectRatio: "1/1",
    images: [
      { src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=80", alt: "Image 1" },
      { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80", alt: "Image 2" },
      { src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80", alt: "Image 3" },
      { src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&q=80", alt: "Image 4" },
      { src: "https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=400&q=80", alt: "Image 5" },
      { src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80", alt: "Image 6" },
    ],
  },
  defaultStyle: { width: "100%", padding: "16px" },
  editorRenderer: ({ node, style }) => {
    const cols = Number(node.props.columns ?? 3);
    const gap = Number(node.props.gap ?? 8);
    const aspect = String(node.props.aspectRatio ?? "1/1");
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];

    return (
      <div
        data-node-id={node.id}
        style={{
          ...(style as React.CSSProperties),
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {imgs.map((img, i) => (
          <div key={i} style={{ aspectRatio: aspect, overflow: "hidden", borderRadius: 4, background: "#f3f4f6" }}>
            <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
          </div>
        ))}
        {imgs.length === 0 && Array.from({ length: cols * 2 }, (_, i) => (
          <div key={i} style={{ aspectRatio: aspect, background: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 11 }}>
            {i + 1}
          </div>
        ))}
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const cols = Number(node.props.columns ?? 3);
    const gap = Number(node.props.gap ?? 8);
    const aspect = String(node.props.aspectRatio ?? "1/1");
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];

    return (
      <div style={{ ...(style as React.CSSProperties), display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}>
        {imgs.map((img, i) => (
          <div key={i} style={{ aspectRatio: aspect, overflow: "hidden", borderRadius: 4 }}>
            <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>
    );
  },
};

// ── GallerySlider ─────────────────────────────────────────────────────────

export const GallerySliderComponent: ComponentDefinition = {
  type: "GallerySlider",
  name: "Gallery Slider",
  category: "media",
  group: "gallery",
  subGroup: "gallery-slider",
  description: "A horizontal image slideshow with prev/next navigation.",
  version: "1.0.0",
  tags: ["gallery", "slider", "carousel", "slideshow", "images"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "images", label: "Images (JSON array of {src, alt})", type: "json" },
    { key: "autoPlay", label: "Auto Play", type: "boolean", default: false },
    { key: "autoPlaySpeed", label: "Auto Play Speed (ms)", type: "number", default: 3000, min: 500, max: 10000 },
    { key: "showArrows", label: "Show Arrows", type: "boolean", default: true },
    { key: "showDots", label: "Show Dots", type: "boolean", default: true },
    { key: "aspectRatio", label: "Aspect Ratio", type: "select", options: [{ value: "16/9", label: "16:9" }, { value: "4/3", label: "4:3" }, { value: "1/1", label: "1:1" }], default: "16/9" },
  ],
  defaultProps: {
    images: [
      { src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80", alt: "Slide 1" },
      { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", alt: "Slide 2" },
      { src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", alt: "Slide 3" },
    ],
    autoPlay: false,
    autoPlaySpeed: 3000,
    showArrows: true,
    showDots: true,
    aspectRatio: "16/9",
  },
  defaultStyle: { width: "100%", position: "relative" },
  editorRenderer: ({ node, style }) => {
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];
    const aspect = String(node.props.aspectRatio ?? "16/9");

    return (
      <div data-node-id={node.id} style={{ ...(style as React.CSSProperties), position: "relative", overflow: "hidden" }}>
        <div style={{ aspectRatio: aspect, overflow: "hidden", borderRadius: 4, background: "#f3f4f6" }}>
          {imgs[0] ? (
            <img src={imgs[0].src} alt={imgs[0].alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
              Add images
            </div>
          )}
        </div>
        {Boolean(node.props.showArrows) && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
            <button style={{ pointerEvents: "all", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer", fontSize: 16 }}>‹</button>
            <button style={{ pointerEvents: "all", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer", fontSize: 16 }}>›</button>
          </div>
        )}
        {Boolean(node.props.showDots) && imgs.length > 1 && (
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
            {imgs.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? "#fff" : "rgba(255,255,255,0.5)" }} />
            ))}
          </div>
        )}
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];
    const aspect = String(node.props.aspectRatio ?? "16/9");
    const [current, setCurrent] = React.useState(0);

    return (
      <div style={{ ...(style as React.CSSProperties), position: "relative", overflow: "hidden" }}>
        <div style={{ aspectRatio: aspect, overflow: "hidden" }}>
          {imgs[current] && (
            <img src={imgs[current].src} alt={imgs[current].alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
        {Boolean(node.props.showArrows) && imgs.length > 1 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
            <button style={{ pointerEvents: "all", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer" }} onClick={() => setCurrent((c) => (c - 1 + imgs.length) % imgs.length)}>‹</button>
            <button style={{ pointerEvents: "all", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer" }} onClick={() => setCurrent((c) => (c + 1) % imgs.length)}>›</button>
          </div>
        )}
        {Boolean(node.props.showDots) && imgs.length > 1 && (
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
            {imgs.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === current ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer" }} onClick={() => setCurrent(i)} />
            ))}
          </div>
        )}
      </div>
    );
  },
};

// ── Shape ─────────────────────────────────────────────────────────────────

export const ShapeComponent: ComponentDefinition = {
  type: "Shape",
  name: "Shape",
  category: "decorative",
  group: "decorative",
  subGroup: "basic-shapes",
  description: "A decorative SVG shape element.",
  version: "1.0.0",
  tags: ["shape", "decorative", "svg", "circle", "square", "triangle", "star"],
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
      key: "shape",
      label: "Shape",
      type: "select",
      options: [
        { value: "rectangle", label: "Rectangle" },
        { value: "circle", label: "Circle" },
        { value: "triangle", label: "Triangle" },
        { value: "star", label: "Star" },
        { value: "heart", label: "Heart" },
        { value: "hexagon", label: "Hexagon" },
        { value: "diamond", label: "Diamond" },
        { value: "arrow-right", label: "Arrow Right" },
        { value: "arrow-left", label: "Arrow Left" },
        { value: "arrow-up", label: "Arrow Up" },
        { value: "arrow-down", label: "Arrow Down" },
        { value: "blob", label: "Blob" },
      ],
      default: "rectangle",
    },
    { key: "fill", label: "Fill Color", type: "color", default: "#111827" },
    { key: "stroke", label: "Stroke Color", type: "color", default: "transparent" },
    { key: "strokeWidth", label: "Stroke Width", type: "number", default: 0, min: 0, max: 20 },
  ],
  defaultProps: { shape: "rectangle", fill: "#111827", stroke: "transparent", strokeWidth: 0 },
  defaultStyle: { width: "100px", height: "100px", display: "block" },
  editorRenderer: ({ node, style }) => {
    const fill = String(node.props.fill ?? "#111827");
    const stroke = String(node.props.stroke ?? "transparent");
    const sw = Number(node.props.strokeWidth ?? 0);

    const shapeSvg = (shape: string): React.ReactNode => {
      switch (shape) {
        case "circle":    return <ellipse cx="50" cy="50" rx="50" ry="50" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "triangle":  return <polygon points="50,0 100,100 0,100" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "star":      return <polygon points="50,5 61,35 95,35 68,57 80,90 50,70 20,90 32,57 5,35 39,35" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "heart":     return <path d="M50,85 C20,65 0,50 0,30 A25,25,0,0,1,50,20 A25,25,0,0,1,100,30 C100,50 80,65 50,85Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "hexagon":   return <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "diamond":   return <polygon points="50,0 100,50 50,100 0,50" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "arrow-right": return <polygon points="0,30 60,30 60,10 100,50 60,90 60,70 0,70" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "arrow-left":  return <polygon points="100,30 40,30 40,10 0,50 40,90 40,70 100,70" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "arrow-up":    return <polygon points="50,0 90,60 70,60 70,100 30,100 30,60 10,60" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "arrow-down":  return <polygon points="50,100 10,40 30,40 30,0 70,0 70,40 90,40" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "blob":      return <path d="M20,45 Q-5,20 20,5 Q50,-10 75,10 Q100,20 95,50 Q90,80 65,90 Q40,100 20,80 Q10,70 20,45Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
        default:          return <rect x="0" y="0" width="100" height="100" fill={fill} stroke={stroke} strokeWidth={sw} rx="4" />;
      }
    };

    return (
      <div data-node-id={node.id} style={{ ...(style as React.CSSProperties), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
          {shapeSvg(String(node.props.shape ?? "rectangle"))}
        </svg>
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const fill = String(node.props.fill ?? "#111827");
    const stroke = String(node.props.stroke ?? "transparent");
    const sw = Number(node.props.strokeWidth ?? 0);

    const pathForShape = (shape: string): React.ReactNode => {
      switch (shape) {
        case "circle":    return <ellipse cx="50" cy="50" rx="50" ry="50" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "triangle":  return <polygon points="50,0 100,100 0,100" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "star":      return <polygon points="50,5 61,35 95,35 68,57 80,90 50,70 20,90 32,57 5,35 39,35" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "heart":     return <path d="M50,85 C20,65 0,50 0,30 A25,25,0,0,1,50,20 A25,25,0,0,1,100,30 C100,50 80,65 50,85Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "hexagon":   return <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "diamond":   return <polygon points="50,0 100,50 50,100 0,50" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "arrow-right": return <polygon points="0,30 60,30 60,10 100,50 60,90 60,70 0,70" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "arrow-left":  return <polygon points="100,30 40,30 40,10 0,50 40,90 40,70 100,70" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "arrow-up":    return <polygon points="50,0 90,60 70,60 70,100 30,100 30,60 10,60" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "arrow-down":  return <polygon points="50,100 10,40 30,40 30,0 70,0 70,40 90,40" fill={fill} stroke={stroke} strokeWidth={sw} />;
        case "blob":      return <path d="M20,45 Q-5,20 20,5 Q50,-10 75,10 Q100,20 95,50 Q90,80 65,90 Q40,100 20,80 Q10,70 20,45Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
        default:          return <rect x="0" y="0" width="100" height="100" fill={fill} stroke={stroke} strokeWidth={sw} rx="4" />;
      }
    };

    return (
      <div style={{ ...(style as React.CSSProperties), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
          {pathForShape(String(node.props.shape ?? "rectangle"))}
        </svg>
      </div>
    );
  },
};

// ── NavigationMenu ────────────────────────────────────────────────────────

export const NavigationMenuComponent: ComponentDefinition = {
  type: "NavigationMenu",
  name: "Navigation Menu",
  category: "navigation",
  group: "menu",
  subGroup: "menu-horizontal",
  description: "Responsive navigation: horizontal on desktop, hamburger on mobile.",
  version: "1.0.0",
  tags: ["menu", "navigation", "nav", "header", "hamburger", "responsive"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    {
      key: "items",
      label: "Menu Items (JSON array of {label, href})",
      type: "json",
    },
    {
      key: "layout",
      label: "Layout",
      type: "select",
      options: [
        { value: "horizontal", label: "Horizontal" },
        { value: "vertical", label: "Vertical" },
        { value: "hamburger", label: "Hamburger" },
      ],
      default: "horizontal",
    },
    { key: "textColor", label: "Text Color", type: "color", default: "#111827" },
    { key: "activeColor", label: "Active Color", type: "color", default: "#4f46e5" },
    { key: "fontSize", label: "Font Size", type: "string", default: "14px" },
    { key: "gap", label: "Gap (px)", type: "number", default: 24, min: 4, max: 64 },
  ],
  defaultProps: {
    items: [
      { label: "Home", href: "#" },
      { label: "About", href: "#" },
      { label: "Services", href: "#" },
      { label: "Contact", href: "#" },
    ],
    layout: "horizontal",
    textColor: "#111827",
    activeColor: "#4f46e5",
    fontSize: "14px",
    gap: 24,
  },
  defaultStyle: { width: "100%", padding: "0 16px", display: "flex", alignItems: "center" },
  editorRenderer: ({ node, style }) => {
    const items = Array.isArray(node.props.items) ? (node.props.items as { label: string; href: string }[]) : [];
    const layout = String(node.props.layout ?? "horizontal");
    const textColor = String(node.props.textColor ?? "#111827");
    const fontSize = String(node.props.fontSize ?? "14px");
    const gap = Number(node.props.gap ?? 24);

    if (layout === "hamburger") {
      return (
        <div data-node-id={node.id} style={{ ...(style as React.CSSProperties), display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: textColor }}>LOGO</span>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
            <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
            <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
          </button>
        </div>
      );
    }

    return (
      <nav
        data-node-id={node.id}
        style={{
          ...(style as React.CSSProperties),
          display: "flex",
          flexDirection: layout === "vertical" ? "column" : "row",
          alignItems: layout === "vertical" ? "flex-start" : "center",
          gap: `${gap}px`,
        }}
      >
        {items.map((item, i) => (
          <a
            key={i}
            href={item.href}
            style={{
              color: textColor,
              fontSize,
              fontWeight: "500",
              textDecoration: "none",
            }}
            onClick={(e) => e.preventDefault()}
          >
            {item.label}
          </a>
        ))}
      </nav>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const items = Array.isArray(node.props.items) ? (node.props.items as { label: string; href: string }[]) : [];
    const layout = String(node.props.layout ?? "horizontal");
    const textColor = String(node.props.textColor ?? "#111827");
    const fontSize = String(node.props.fontSize ?? "14px");
    const gap = Number(node.props.gap ?? 24);
    const [open, setOpen] = React.useState(false);

    if (layout === "hamburger") {
      return (
        <div style={{ ...(style as React.CSSProperties), position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "700", color: textColor }}>LOGO</span>
            <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
              <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
              <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
              <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
            </button>
          </div>
          {open && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, zIndex: 100 }}>
              {items.map((item, i) => (
                <a key={i} href={item.href} style={{ display: "block", color: textColor, fontSize, padding: "8px 0", textDecoration: "none" }}>
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <nav style={{ ...(style as React.CSSProperties), display: "flex", flexDirection: layout === "vertical" ? "column" : "row", gap: `${gap}px` }}>
        {items.map((item, i) => (
          <a key={i} href={item.href} style={{ color: textColor, fontSize, fontWeight: "500", textDecoration: "none" }}>
            {item.label}
          </a>
        ))}
      </nav>
    );
  },
};

// ── Repeater ──────────────────────────────────────────────────────────────

export const RepeaterComponent: ComponentDefinition = {
  type: "Repeater",
  name: "Repeater",
  category: "layout",
  group: "collection",
  subGroup: "repeaters",
  description: "Repeats a template layout for each item in a data set.",
  version: "1.0.0",
  tags: ["repeater", "list", "collection", "data", "grid", "cards"],
  capabilities: {
    canContainChildren: true,
    canResize: true,
    canTriggerEvents: false,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  containerConfig: {
    layoutType: "grid",
    emptyStateConfig: { message: "Define your item template here", allowDrop: true },
  },
  propSchema: [
    { key: "count", label: "Preview Items", type: "number", default: 3, min: 1, max: 12 },
    { key: "columns", label: "Columns", type: "number", default: 3, min: 1, max: 6 },
    { key: "gap", label: "Gap (px)", type: "number", default: 16, min: 0, max: 64 },
  ],
  defaultProps: { count: 3, columns: 3, gap: 16 },
  defaultStyle: { width: "100%", padding: "16px" },
  editorRenderer: ({ node, children, style }) => {
    const cols = Number(node.props.columns ?? 3);
    const gap = Number(node.props.gap ?? 16);
    const count = Number(node.props.count ?? 3);

    return (
      <div
        data-node-id={node.id}
        style={{
          ...(style as React.CSSProperties),
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {children
          ? Array.from({ length: count }, (_, i) => (
              <div key={i}>{children as React.ReactNode}</div>
            ))
          : Array.from({ length: count }, (_, i) => (
              <div
                key={i}
                style={{
                  minHeight: 120,
                  border: "2px dashed #e5e7eb",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: 12,
                }}
              >
                Item {i + 1}
              </div>
            ))}
      </div>
    );
  },
  runtimeRenderer: ({ node, children, style }) => {
    const cols = Number(node.props.columns ?? 3);
    const gap = Number(node.props.gap ?? 16);
    const count = Number(node.props.count ?? 3);

    return (
      <div style={{ ...(style as React.CSSProperties), display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i}>{children as React.ReactNode}</div>
        ))}
      </div>
    );
  },
};

// ── Anchor ────────────────────────────────────────────────────────────────

export const AnchorComponent: ComponentDefinition = {
  type: "Anchor",
  name: "Anchor",
  category: "navigation",
  group: "menu",
  subGroup: "anchors",
  description: "An invisible anchor point for scroll-to navigation.",
  version: "1.0.0",
  tags: ["anchor", "navigation", "scroll", "jump-link", "id"],
  capabilities: {
    canContainChildren: false,
    canResize: false,
    canTriggerEvents: false,
    canBindData: false,
    canBeHidden: false,
    canBeLocked: true,
  },
  propSchema: [
    { key: "anchorId", label: "Anchor ID", type: "string", default: "section-anchor", required: true },
    { key: "label", label: "Label (editor-only)", type: "string", default: "Section Anchor" },
  ],
  defaultProps: { anchorId: "section-anchor", label: "Section Anchor" },
  defaultStyle: { width: "1px", height: "1px", display: "block" },
  editorRenderer: ({ node }) => (
    <div
      data-node-id={node.id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        background: "rgba(99,102,241,0.08)",
        border: "1px dashed rgba(99,102,241,0.4)",
        borderRadius: 4,
        color: "rgb(99,102,241)",
        fontSize: 11,
        fontWeight: 500,
        userSelect: "none",
        cursor: "default",
        width: "fit-content",
      }}
    >
      <span style={{ userSelect: "none" }}>⚓</span>
      <span>#{String(node.props.anchorId ?? "anchor")}</span>
      {Boolean(node.props.label) && (
        <span style={{ opacity: 0.6 }}>— {String(node.props.label)}</span>
      )}
    </div>
  ),
  runtimeRenderer: ({ node }) => (
    <div
      id={String(node.props.anchorId ?? "anchor")}
      style={{ width: "1px", height: "1px", display: "block", position: "absolute", pointerEvents: "none" }}
      aria-hidden="true"
    />
  ),
};

// ── Export all ────────────────────────────────────────────────────────────

export const SAMPLE_COMPONENTS: ComponentDefinition[] = [
  SectionComponent,
  ContainerComponent,
  GridComponent,
  ColumnComponent,
  TextComponent,
  ButtonComponent,
  ImageComponent,
  DividerComponent,
  TextMarqueeComponent,
  CollapsibleTextComponent,
  TextMaskComponent,
  GalleryGridComponent,
  GallerySliderComponent,
  ShapeComponent,
  NavigationMenuComponent,
  RepeaterComponent,
  AnchorComponent,
];
