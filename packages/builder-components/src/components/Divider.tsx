import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

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
