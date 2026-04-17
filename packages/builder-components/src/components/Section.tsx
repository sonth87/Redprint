import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const SectionComponent: ComponentDefinition = {
  type: "Section",
  name: "Section",
  category: "layout",
  group: "layout",
  description: "A full-width page section. Sections stack vertically and can be resized.",
  version: "1.0.0",
  tags: ["section", "page", "layout", "block"],
  capabilities: {
    canContainChildren: true,
    canResize: false,
    canTriggerEvents: false,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    {
      key: "minHeight",
      label: "Min Height (px)",
      type: "number",
      default: 400,
      min: 100,
      max: 4000,
      step: 8,
      unit: "px",
    },
  ],
  defaultProps: { minHeight: 400 },
  defaultStyle: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: "400px",
    position: "relative",
  },
  editorRenderer: ({ node, children, style }) => (
    <div
      data-node-id={node.id}
      data-section
      style={{
        ...(style as React.CSSProperties),
        width: "100%",
        minHeight: `${node.props.minHeight ?? 400}px`,
        position: "relative",
      }}
    >
      {(children as React.ReactNode)}
    </div>
  ),
  runtimeRenderer: ({ node, children, style }) => (
    <div
      style={{
        ...(style as React.CSSProperties),
        width: "100%",
        minHeight: `${node.props.minHeight ?? 400}px`,
        position: "relative",
      }}
    >
      {children as React.ReactNode}
    </div>
  ),
};
