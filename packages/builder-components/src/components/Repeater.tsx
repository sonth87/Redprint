import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

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
        style={{ ...(style as React.CSSProperties), display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px` }}
      >
        {children
          ? Array.from({ length: count }, (_, i) => <div key={i}>{children as React.ReactNode}</div>)
          : Array.from({ length: count }, (_, i) => (
              <div
                key={i}
                style={{ minHeight: 120, border: "2px dashed #e5e7eb", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 12 }}
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
        {Array.from({ length: count }, (_, i) => <div key={i}>{children as React.ReactNode}</div>)}
      </div>
    );
  },
};
