import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

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
