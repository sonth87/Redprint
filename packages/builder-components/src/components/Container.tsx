import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

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
