import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const TextMaskComponent: ComponentDefinition = {
  type: "TextMask",
  name: "Text Mask",
  category: "content",
  group: "text",
  subGroup: "text-mask",
  description: "Text used as a mask over a background image or gradient.",
  version: "1.0.0",
  tags: ["text-mask", "clip-path", "background-clip", "decorative", "typography"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: false,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "text", label: "Text", type: "string", default: "HELLO" },
    { key: "backgroundImage", label: "Background Image URL", type: "string", default: "" },
    { key: "gradient", label: "Gradient (CSS)", type: "string", default: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { key: "fontSize", label: "Font Size", type: "string", default: "120px" },
    {
      key: "fontWeight",
      label: "Font Weight",
      type: "select",
      options: [{ value: "700", label: "Bold" }, { value: "900", label: "Black" }],
      default: "900",
    },
  ],
  defaultProps: {
    text: "HELLO",
    backgroundImage: "",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontSize: "120px",
    fontWeight: "900",
  },
  defaultStyle: { display: "inline-block", width: "100%", padding: "16px 0", textAlign: "center" },
  editorRenderer: ({ node, style }) => {
    const text = String(node.props.text ?? "HELLO");
    const bg = node.props.backgroundImage
      ? `url(${String(node.props.backgroundImage)})`
      : String(node.props.gradient ?? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)");

    return (
      <div data-node-id={node.id} style={style as React.CSSProperties}>
        <span
          style={{
            fontSize: String(node.props.fontSize ?? "120px"),
            fontWeight: String(node.props.fontWeight ?? "900"),
            background: bg,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            display: "inline-block",
          }}
        >
          {text}
        </span>
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const text = String(node.props.text ?? "HELLO");
    const bg = node.props.backgroundImage
      ? `url(${String(node.props.backgroundImage)})`
      : String(node.props.gradient ?? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)");

    return (
      <div style={style as React.CSSProperties}>
        <span
          style={{
            fontSize: String(node.props.fontSize ?? "120px"),
            fontWeight: String(node.props.fontWeight ?? "900"),
            background: bg,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            display: "inline-block",
          }}
        >
          {text}
        </span>
      </div>
    );
  },
};
