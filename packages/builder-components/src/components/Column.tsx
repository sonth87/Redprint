import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const ColumnComponent: ComponentDefinition = {
  type: "Column",
  name: "Column",
  category: "layout",
  group: "layout",
  subGroup: "grid",
  description: "A flex container. Children stack vertically or horizontally without absolute positioning.",
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
    { key: "gap", label: "Gap", type: "number", default: 8, min: 0, max: 96, step: 4, unit: "px" },
    { key: "padding", label: "Padding", type: "number", default: 16, min: 0, max: 96, step: 4, unit: "px" },
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
    {
      key: "justifyContent",
      label: "Justify Content",
      type: "select",
      options: [
        { value: "flex-start", label: "Start" },
        { value: "center", label: "Center" },
        { value: "flex-end", label: "End" },
        { value: "space-between", label: "Space Between" },
        { value: "space-around", label: "Space Around" },
      ],
      default: "flex-start",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "column", label: "Vertical" },
        { value: "row", label: "Horizontal" },
      ],
      default: "column",
    },
  ],
  defaultProps: { gap: 8, padding: 16, alignItems: "stretch", justifyContent: "flex-start", direction: "column" },
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
    const justifyContent = String(node.props.justifyContent ?? "flex-start");
    const flexDirection = String(node.props.direction ?? "column") as React.CSSProperties["flexDirection"];

    return (
      <div
        data-node-id={node.id}
        data-layout-type="flex"
        style={{
          ...(style as React.CSSProperties),
          display: "flex",
          flexDirection,
          gap: `${gap}px`,
          padding: `${padding}px`,
          alignItems,
          justifyContent,
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
    const justifyContent = String(node.props.justifyContent ?? "flex-start");
    const flexDirection = String(node.props.direction ?? "column") as React.CSSProperties["flexDirection"];

    return (
      <div
        style={{
          ...(style as React.CSSProperties),
          display: "flex",
          flexDirection,
          gap: `${gap}px`,
          padding: `${padding}px`,
          alignItems,
          justifyContent,
        }}
      >
        {children as React.ReactNode}
      </div>
    );
  },
};
