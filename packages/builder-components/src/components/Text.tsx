import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import { sanitizeHtml } from "../utils/sanitize";

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
  defaultStyle: { fontSize: "16px", color: "#111827", lineHeight: "1.6", width: "360px" },
  editorRenderer: ({ node, style }) => {
    const Tag = (node.props.tag ?? "p") as keyof React.JSX.IntrinsicElements;
    const html = String(node.props.text ?? "<p>Text</p>");
    return (
      <Tag
        data-node-id={node.id}
        style={style as React.CSSProperties}
        className="outline-none"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const Tag = (node.props.tag ?? "p") as keyof React.JSX.IntrinsicElements;
    return (
      <Tag
        style={style as React.CSSProperties}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(node.props.text ?? "")) }}
      />
    );
  },
};
