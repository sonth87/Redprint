import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import { sanitizeHtml } from "../utils/sanitize";

export const ButtonComponent: ComponentDefinition = {
  type: "Button",
  name: "Button",
  category: "interactive",
  group: "button",
  subGroup: "button-single",
  description: "A clickable button element.",
  version: "1.0.0",
  tags: ["button", "action", "cta"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
    inlineEditable: true,
  },
  propSchema: [
    {
      key: "label",
      label: "Label",
      type: "richtext",
      toolbar: { bold: true, italic: false, underline: false, strikethrough: false, link: false, align: false },
    },
    {
      key: "variant",
      label: "Variant",
      type: "select",
      options: [
        { value: "primary", label: "Primary" },
        { value: "secondary", label: "Secondary" },
        { value: "outline", label: "Outline" },
        { value: "ghost", label: "Ghost" },
        { value: "destructive", label: "Destructive" },
      ],
      default: "primary",
    },
    {
      key: "size",
      label: "Size",
      type: "select",
      options: [
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
        { value: "lg", label: "Large" },
      ],
      default: "md",
    },
    { key: "disabled", label: "Disabled", type: "boolean", default: false },
  ],
  defaultProps: { label: "<p>Click me</p>", variant: "primary", size: "md", disabled: false },
  defaultStyle: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    border: "none",
    backgroundColor: "#111827",
    color: "#ffffff",
  },
  editorRenderer: ({ node, style }) => (
    <button
      data-node-id={node.id}
      style={style as React.CSSProperties}
      disabled={Boolean(node.props.disabled)}
      className="select-none"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(node.props.label ?? "<p>Button</p>")) }}
    />
  ),
  runtimeRenderer: ({ node, style }) => (
    <button
      style={style as React.CSSProperties}
      disabled={Boolean(node.props.disabled)}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(node.props.label ?? "<p>Button</p>")) }}
    />
  ),
};
