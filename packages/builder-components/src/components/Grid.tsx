import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

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
    disallowedChildTypes: ["Column"],
    emptyStateConfig: { message: "Drop components into grid cells", allowDrop: true },
  },
  propSchema: [
    { key: "columns", label: "Columns", type: "number", default: 3, min: 1, max: 12, step: 1 },
    { key: "rows", label: "Rows", type: "number", default: 1, min: 1, max: 20, step: 1 },
    { key: "columnGap", label: "Column Gap", type: "number", default: 16, min: 0, max: 128, step: 4, unit: "px" },
    { key: "rowGap", label: "Row Gap", type: "number", default: 16, min: 0, max: 128, step: 4, unit: "px" },
    { key: "padding", label: "Padding", type: "number", default: 16, min: 0, max: 128, step: 4, unit: "px" },
  ],
  defaultProps: { columns: 3, rows: 1, columnGap: 16, rowGap: 16, padding: 16 },
  defaultStyle: {
    display: "grid",
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
