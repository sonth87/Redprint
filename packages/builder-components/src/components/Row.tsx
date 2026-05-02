import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const RowComponent: ComponentDefinition = {
  type: "Row",
  name: "Row",
  category: "layout",
  group: "layout",
  subGroup: "flex",
  description: "A flex row container. Children stack horizontally without absolute positioning.",
  version: "1.0.0",
  tags: ["layout", "row", "flex", "horizontal"],
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
    emptyStateConfig: { message: "Drop here", allowDrop: true },
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
      default: "center",
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
      key: "flexWrap",
      label: "Wrap",
      type: "select",
      options: [
        { value: "nowrap", label: "No Wrap" },
        { value: "wrap", label: "Wrap" },
      ],
      default: "nowrap",
    },
  ],
  defaultProps: { gap: 8, padding: 16, alignItems: "center", justifyContent: "flex-start", flexWrap: "nowrap" },
  defaultStyle: {
    display: "flex",
    flexDirection: "row",
    gap: "8px",
    padding: "16px",
    width: "100%",
    minHeight: "48px",
  },
  editorRenderer: ({ node, children, style }) => {
    const gap = Number(node.props.gap ?? 8);
    const padding = Number(node.props.padding ?? 16);
    const alignItems = String(node.props.alignItems ?? "center");
    const justifyContent = String(node.props.justifyContent ?? "flex-start");
    const flexWrap = String(node.props.flexWrap ?? "nowrap") as React.CSSProperties["flexWrap"];

    return (
      <div
        data-node-id={node.id}
        data-layout-type="flex"
        style={{
          ...(style as React.CSSProperties),
          display: "flex",
          flexDirection: "row",
          gap: `${gap}px`,
          padding: `${padding}px`,
          alignItems,
          justifyContent,
          flexWrap,
          width: "100%",
          minHeight: "48px",
        }}
      >
        {(children as React.ReactNode) ?? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "40px",
              flex: 1,
              color: "#9ca3af",
              fontSize: 12,
              border: "2px dashed #e5e7eb",
              borderRadius: 8,
              userSelect: "none",
            }}
          >
            Drop here
          </div>
        )}
      </div>
    );
  },
  runtimeRenderer: ({ node, children, style }) => {
    const gap = Number(node.props.gap ?? 8);
    const padding = Number(node.props.padding ?? 16);
    const alignItems = String(node.props.alignItems ?? "center");
    const justifyContent = String(node.props.justifyContent ?? "flex-start");
    const flexWrap = String(node.props.flexWrap ?? "nowrap") as React.CSSProperties["flexWrap"];

    return (
      <div
        style={{
          ...(style as React.CSSProperties),
          display: "flex",
          flexDirection: "row",
          gap: `${gap}px`,
          padding: `${padding}px`,
          alignItems,
          justifyContent,
          flexWrap,
        }}
      >
        {children as React.ReactNode}
      </div>
    );
  },
};
