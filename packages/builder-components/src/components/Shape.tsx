import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

function shapeSvgPath(shape: string, fill: string, stroke: string, sw: number): React.ReactNode {
  switch (shape) {
    case "circle":      return <ellipse cx="50" cy="50" rx="50" ry="50" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "triangle":    return <polygon points="50,0 100,100 0,100" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "star":        return <polygon points="50,5 61,35 95,35 68,57 80,90 50,70 20,90 32,57 5,35 39,35" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "heart":       return <path d="M50,85 C20,65 0,50 0,30 A25,25,0,0,1,50,20 A25,25,0,0,1,100,30 C100,50 80,65 50,85Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "hexagon":     return <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "diamond":     return <polygon points="50,0 100,50 50,100 0,50" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "arrow-right": return <polygon points="0,30 60,30 60,10 100,50 60,90 60,70 0,70" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "arrow-left":  return <polygon points="100,30 40,30 40,10 0,50 40,90 40,70 100,70" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "arrow-up":    return <polygon points="50,0 90,60 70,60 70,100 30,100 30,60 10,60" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "arrow-down":  return <polygon points="50,100 10,40 30,40 30,0 70,0 70,40 90,40" fill={fill} stroke={stroke} strokeWidth={sw} />;
    case "blob":        return <path d="M20,45 Q-5,20 20,5 Q50,-10 75,10 Q100,20 95,50 Q90,80 65,90 Q40,100 20,80 Q10,70 20,45Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
    default:            return <rect x="0" y="0" width="100" height="100" fill={fill} stroke={stroke} strokeWidth={sw} rx="4" />;
  }
}

export const ShapeComponent: ComponentDefinition = {
  type: "Shape",
  name: "Shape",
  category: "decorative",
  group: "decorative",
  subGroup: "basic-shapes",
  description: "A decorative SVG shape element.",
  version: "1.0.0",
  tags: ["shape", "decorative", "svg", "circle", "square", "triangle", "star"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: false,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    {
      key: "shape",
      label: "Shape",
      type: "select",
      options: [
        { value: "rectangle", label: "Rectangle" },
        { value: "circle", label: "Circle" },
        { value: "triangle", label: "Triangle" },
        { value: "star", label: "Star" },
        { value: "heart", label: "Heart" },
        { value: "hexagon", label: "Hexagon" },
        { value: "diamond", label: "Diamond" },
        { value: "arrow-right", label: "Arrow Right" },
        { value: "arrow-left", label: "Arrow Left" },
        { value: "arrow-up", label: "Arrow Up" },
        { value: "arrow-down", label: "Arrow Down" },
        { value: "blob", label: "Blob" },
      ],
      default: "rectangle",
    },
    { key: "fill", label: "Fill Color", type: "color", default: "#111827" },
    { key: "stroke", label: "Stroke Color", type: "color", default: "transparent" },
    { key: "strokeWidth", label: "Stroke Width", type: "number", default: 0, min: 0, max: 20 },
  ],
  defaultProps: { shape: "rectangle", fill: "#111827", stroke: "transparent", strokeWidth: 0 },
  defaultStyle: { width: "100px", height: "100px", display: "block" },
  editorRenderer: ({ node, style }) => {
    const fill = String(node.props.fill ?? "#111827");
    const stroke = String(node.props.stroke ?? "transparent");
    const sw = Number(node.props.strokeWidth ?? 0);

    return (
      <div data-node-id={node.id} style={{ ...(style as React.CSSProperties), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
          {shapeSvgPath(String(node.props.shape ?? "rectangle"), fill, stroke, sw)}
        </svg>
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const fill = String(node.props.fill ?? "#111827");
    const stroke = String(node.props.stroke ?? "transparent");
    const sw = Number(node.props.strokeWidth ?? 0);

    return (
      <div style={{ ...(style as React.CSSProperties), display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
          {shapeSvgPath(String(node.props.shape ?? "rectangle"), fill, stroke, sw)}
        </svg>
      </div>
    );
  },
};
