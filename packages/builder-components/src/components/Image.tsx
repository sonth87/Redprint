import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const ImageComponent: ComponentDefinition = {
  type: "Image",
  name: "Image",
  category: "media",
  group: "image",
  description: "An image element with configurable src and alt text.",
  version: "1.0.0",
  tags: ["image", "photo", "media", "asset"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "src", label: "Image URL", type: "image", required: true, accept: ["image/*"] },
    { key: "alt", label: "Alt text", type: "string", default: "" },
    {
      key: "objectFit",
      label: "Object Fit",
      type: "select",
      options: [
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
        { value: "fill", label: "Fill" },
        { value: "none", label: "None" },
      ],
      default: "cover",
    },
  ],
  defaultProps: {
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    alt: "Sample image",
    objectFit: "cover",
  },
  defaultStyle: { width: "100%", height: "200px", borderRadius: "8px" },
  editorRenderer: ({ node, style }) => (
    <img
      data-node-id={node.id}
      src={String(node.props.src ?? "")}
      alt={String(node.props.alt ?? "")}
      style={{
        ...(style as React.CSSProperties),
        objectFit: (node.props.objectFit as React.CSSProperties["objectFit"]) ?? "cover",
        display: "block",
      }}
      draggable={false}
    />
  ),
  runtimeRenderer: ({ node, style }) => (
    <img
      src={String(node.props.src ?? "")}
      alt={String(node.props.alt ?? "")}
      style={{
        ...(style as React.CSSProperties),
        objectFit: (node.props.objectFit as React.CSSProperties["objectFit"]) ?? "cover",
        display: "block",
      }}
    />
  ),
};
