import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const PopupContentComponent: ComponentDefinition = {
  type: "PopupContent",
  name: "Popup Content",
  category: "layout",
  group: "container",
  description: "Root content container for document-level popups.",
  version: "1.0.0",
  tags: ["popup", "modal", "overlay", "container"],
  capabilities: {
    canContainChildren: true,
    canResize: true,
    canTriggerEvents: false,
    canBindData: false,
    canBeHidden: false,
    canBeLocked: true,
  },
  aiHints: {
    purpose: "Root content container for document-level popups.",
    bestFor: [],
    fallbackTo: [],
    // Internal-only: never a candidate for page-generation content — popups are
    // created/managed through the popup system, not AI section generation.
    excludeFromAI: true,
  },
  containerConfig: {
    layoutType: "flex",
  },
  propSchema: [
    { key: "showPlaceholder", label: "Show Placeholder", type: "boolean", default: true },
  ],
  defaultProps: { showPlaceholder: true },
  defaultStyle: {
    width: "100%",
    minHeight: "220px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "32px",
    position: "relative",
    backgroundColor: "#ffffff",
    color: "#111827",
  },
  editorRenderer: ({ node, children, style }) => (
    <div data-node-id={node.id} style={style as React.CSSProperties}>
      {(children as React.ReactNode) ??
        (node.props.showPlaceholder !== false ? (
          <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-border bg-muted/25 text-xs text-muted-foreground">
            Drop popup content here
          </div>
        ) : null)}
    </div>
  ),
  runtimeRenderer: ({ children, style }) => (
    <div style={style as React.CSSProperties}>{children as React.ReactNode}</div>
  ),
};
