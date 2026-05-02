import React from "react";
import type { ComponentDefinition, ComponentRenderer } from "@ui-builder/builder-core";
import { sanitizeHtml } from "../utils/sanitize";

type RendererProps = Parameters<ComponentRenderer>[0];

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
    { key: "previewLines", label: "Preview Lines", type: "number", default: 3, min: 1, max: 10 },
    { key: "expandLabel", label: "Expand label", type: "string", default: "Read more" },
    { key: "collapseLabel", label: "Collapse label", type: "string", default: "Show less" },
  ],
  defaultProps: {
    text: "<p>Collapsible text is great for longer section titles and descriptions. It gives people access to all the info they need, while keeping your design clean.</p>",
    previewLines: 3,
    expandLabel: "Read more",
    collapseLabel: "Show less",
  },
  defaultStyle: { fontSize: "16px", color: "#374151", lineHeight: "1.6", width: "200px" },
  editorRenderer: ({ node, style }) => {
    const html = String(node.props.text ?? "<p>Text…</p>");
    const label = String(node.props.expandLabel ?? "Read more");

    return (
      <div data-node-id={node.id} style={style as React.CSSProperties}>
        <div
          style={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: Number(node.props.previewLines ?? 3), WebkitBoxOrient: "vertical" }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
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
  runtimeRenderer: (props) => <CollapsibleTextRuntime {...props} />,
};

function CollapsibleTextRuntime({ node, style }: RendererProps) {
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
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
      <button
        style={{ display: "inline-block", marginTop: 8, fontSize: "14px", fontWeight: "600", cursor: "pointer", background: "none", border: "none", padding: 0, textDecoration: "underline" }}
        onClick={() => setExpanded((p) => !p)}
      >
        {expanded ? collapseLabel : expandLabel}
      </button>
    </div>
  );
}
