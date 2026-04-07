import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const TextMarqueeComponent: ComponentDefinition = {
  type: "TextMarquee",
  name: "Text Marquee",
  category: "content",
  group: "text",
  subGroup: "text-marquee",
  description: "Scrolling ticker-tape text with configurable speed and direction.",
  version: "1.0.0",
  tags: ["marquee", "scrolling", "ticker", "animation", "text"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: false,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "text", label: "Text", type: "string", default: "Let's Talk 👋  Let's Talk 👋  Let's Talk 👋" },
    { key: "speed", label: "Speed (s)", type: "number", default: 20, min: 2, max: 120, step: 1, unit: "s" },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ],
      default: "left",
    },
    { key: "separator", label: "Separator", type: "string", default: "  •  " },
  ],
  defaultProps: { text: "Let's Talk 👋", speed: 20, direction: "left", separator: "  •  " },
  defaultStyle: {
    width: "100%",
    overflow: "hidden",
    whiteSpace: "nowrap",
    fontSize: "18px",
    fontWeight: "500",
    color: "#111827",
    padding: "12px 0",
  },
  editorRenderer: ({ node, style }) => {
    const text = String(node.props.text ?? "Marquee Text");
    const separator = String(node.props.separator ?? "  •  ");
    const speed = Number(node.props.speed ?? 20);
    const direction = node.props.direction === "right" ? "normal" : "reverse";
    const repeated = Array.from({ length: 6 }, () => `${text}${separator}`).join("");

    return (
      <div
        data-node-id={node.id}
        style={{ ...(style as React.CSSProperties), overflow: "hidden" }}
      >
        <div
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            animation: `marquee ${speed}s linear infinite ${direction}`,
          }}
        >
          {repeated}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const text = String(node.props.text ?? "Marquee Text");
    const separator = String(node.props.separator ?? "  •  ");
    const speed = Number(node.props.speed ?? 20);
    const direction = node.props.direction === "right" ? "normal" : "reverse";
    const repeated = Array.from({ length: 6 }, () => `${text}${separator}`).join("");

    return (
      <div style={{ ...(style as React.CSSProperties), overflow: "hidden" }}>
        <div
          style={{
            display: "inline-block",
            whiteSpace: "nowrap",
            animation: `marquee ${speed}s linear infinite ${direction}`,
          }}
        >
          {repeated}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>
    );
  },
};
