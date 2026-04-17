import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const GallerySliderComponent: ComponentDefinition = {
  type: "GallerySlider",
  name: "Gallery Slider",
  category: "media",
  group: "gallery",
  subGroup: "gallery-slider",
  description: "A horizontal image slideshow with prev/next navigation.",
  version: "1.0.0",
  tags: ["gallery", "slider", "carousel", "slideshow", "images"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "images", label: "Images (JSON array of {src, alt})", type: "json" },
    { key: "autoPlay", label: "Auto Play", type: "boolean", default: false },
    { key: "autoPlaySpeed", label: "Auto Play Speed (ms)", type: "number", default: 3000, min: 500, max: 10000 },
    { key: "showArrows", label: "Show Arrows", type: "boolean", default: true },
    { key: "showDots", label: "Show Dots", type: "boolean", default: true },
    {
      key: "shape",
      label: "Shape",
      type: "select",
      options: [
        { value: "rectangle", label: "Rectangle" },
        { value: "circle", label: "Circle" },
        { value: "oval", label: "Oval" },
      ],
      default: "rectangle",
    },
    {
      key: "aspectRatio",
      label: "Aspect Ratio",
      type: "select",
      options: [
        { value: "16/9", label: "16:9" },
        { value: "4/3", label: "4:3" },
        { value: "1/1", label: "1:1" },
      ],
      default: "16/9",
    },
  ],
  defaultProps: {
    images: [
      { src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80", alt: "Slide 1" },
      { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", alt: "Slide 2" },
      { src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", alt: "Slide 3" },
    ],
    autoPlay: false,
    autoPlaySpeed: 3000,
    showArrows: true,
    showDots: true,
    shape: "rectangle",
    aspectRatio: "16/9",
  },
  defaultStyle: { width: "100%", position: "relative" },
  editorRenderer: ({ node, style }) => {
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];
    const aspect = String(node.props.aspectRatio ?? "16/9");
    const shape = String(node.props.shape ?? "rectangle");

    const getBorderRadius = () => {
      if (shape === "circle") return "50%";
      if (shape === "oval") return "50% / 30%";
      return "4px";
    };

    return (
      <div data-node-id={node.id} style={{ ...(style as React.CSSProperties), position: "relative", overflow: "hidden" }}>
        <div style={{ aspectRatio: aspect, overflow: "hidden", borderRadius: getBorderRadius(), background: "#f3f4f6" }}>
          {imgs[0] ? (
            <img src={imgs[0].src} alt={imgs[0].alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
              Add images
            </div>
          )}
        </div>
        {Boolean(node.props.showArrows) && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
            <button style={{ pointerEvents: "all", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer", fontSize: 16 }}>‹</button>
            <button style={{ pointerEvents: "all", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer", fontSize: 16 }}>›</button>
          </div>
        )}
        {Boolean(node.props.showDots) && imgs.length > 1 && (
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
            {imgs.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? "#fff" : "rgba(255,255,255,0.5)" }} />
            ))}
          </div>
        )}
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];
    const aspect = String(node.props.aspectRatio ?? "16/9");
    const shape = String(node.props.shape ?? "rectangle");
    const [current, setCurrent] = React.useState(0);

    const getBorderRadius = () => {
      if (shape === "circle") return "50%";
      if (shape === "oval") return "50% / 30%";
      return "4px";
    };

    return (
      <div style={{ ...(style as React.CSSProperties), position: "relative", overflow: "hidden" }}>
        <div style={{ aspectRatio: aspect, overflow: "hidden", borderRadius: getBorderRadius() }}>
          {imgs[current] && (
            <img src={imgs[current].src} alt={imgs[current].alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
        {Boolean(node.props.showArrows) && imgs.length > 1 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
            <button style={{ pointerEvents: "all", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer" }} onClick={() => setCurrent((c) => (c - 1 + imgs.length) % imgs.length)}>‹</button>
            <button style={{ pointerEvents: "all", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.8)", border: "none", cursor: "pointer" }} onClick={() => setCurrent((c) => (c + 1) % imgs.length)}>›</button>
          </div>
        )}
        {Boolean(node.props.showDots) && imgs.length > 1 && (
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
            {imgs.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === current ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer" }} onClick={() => setCurrent(i)} />
            ))}
          </div>
        )}
      </div>
    );
  },
};
