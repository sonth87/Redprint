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
    emptyStateConfig: { message: "Drop components into grid cells", allowDrop: true },
  },
  propSchema: [
    { key: "columns", label: "Columns", type: "number", default: 3, min: 1, max: 12, step: 1 },
    { key: "rows", label: "Rows", type: "number", default: 1, min: 1, max: 20, step: 1 },
    {
      key: "columnTemplate",
      label: "Column Template",
      type: "select",
      options: [
        { value: "equal", label: "Equal" },
        { value: "sidebar-left", label: "Sidebar Left" },
        { value: "sidebar-right", label: "Sidebar Right" },
        { value: "custom", label: "Custom" },
      ],
      default: "equal",
    },
    { key: "customTemplate", label: "Custom Template", type: "string", default: "1fr 1fr 1fr" },
    { key: "columnGap", label: "Column Gap", type: "number", default: 16, min: 0, max: 128, step: 4, unit: "px" },
    { key: "rowGap", label: "Row Gap", type: "number", default: 16, min: 0, max: 128, step: 4, unit: "px" },
    { key: "padding", label: "Padding", type: "number", default: 16, min: 0, max: 128, step: 4, unit: "px" },
  ],
  defaultProps: { columns: 3, rows: 1, columnTemplate: "equal", customTemplate: "1fr 1fr 1fr", columnGap: 16, rowGap: 16, padding: 16 },
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
    const tpl = String(node.props.columnTemplate ?? "equal");
    const gridTemplateColumns =
      tpl === "custom"         ? String(node.props.customTemplate ?? "1fr 1fr 1fr")
      : tpl === "sidebar-left"  ? "1fr 2fr"
      : tpl === "sidebar-right" ? "2fr 1fr"
      : `repeat(${columns}, 1fr)`;

    const resolvedStyle = style as React.CSSProperties;
    const gridStyle: React.CSSProperties = {
      ...resolvedStyle,
      display: "grid",
      gridTemplateColumns,
      gridTemplateRows: `repeat(${rows}, auto)`,
      columnGap: `${columnGap}px`,
      rowGap: `${rowGap}px`,
      padding: `${padding}px`,
      width: resolvedStyle.width ?? "100%",
      minHeight: resolvedStyle.minHeight ?? "80px",
      boxSizing: "border-box",
    };

    // Always render placeholder cells behind real children so all rows/cols are visible
    const placeholders = Array.from({ length: columns * rows }, (_, i) => {
      const col = (i % columns) + 1;
      const row = Math.floor(i / columns) + 1;
      return (
        <div
          key={`ph-${i}`}
          style={{
            gridColumn: col,
            gridRow: row,
            minHeight: "80px",
            border: "2px dashed #e5e7eb",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e5e7eb",
            fontSize: 11,
            userSelect: "none",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      );
    });

    return (
      <div data-node-id={node.id} data-layout-type="grid" style={gridStyle}>
        {placeholders}
        {children as React.ReactNode}
      </div>
    );
  },
  runtimeRenderer: ({ node, children, style }) => {
    const columns = Number(node.props.columns ?? 3);
    const rows = Number(node.props.rows ?? 1);
    const columnGap = Number(node.props.columnGap ?? 16);
    const rowGap = Number(node.props.rowGap ?? 16);
    const padding = Number(node.props.padding ?? 16);
    const tpl = String(node.props.columnTemplate ?? "equal");
    const gridTemplateColumns =
      tpl === "custom"         ? String(node.props.customTemplate ?? "1fr 1fr 1fr")
      : tpl === "sidebar-left"  ? "1fr 2fr"
      : tpl === "sidebar-right" ? "2fr 1fr"
      : `repeat(${columns}, 1fr)`;

    const runtimeStyle = style as React.CSSProperties;
    return (
      <div
        style={{
          ...runtimeStyle,
          display: "grid",
          gridTemplateColumns,
          gridTemplateRows: `repeat(${rows}, auto)`,
          columnGap: `${columnGap}px`,
          rowGap: `${rowGap}px`,
          padding: `${padding}px`,
          width: runtimeStyle.width ?? "100%",
        }}
      >
        {children as React.ReactNode}
      </div>
    );
  },
};
