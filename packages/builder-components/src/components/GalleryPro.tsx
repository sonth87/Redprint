import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

export const GalleryProComponent: ComponentDefinition = {
  type: "GalleryPro",
  name: "Gallery Pro",
  category: "media",
  group: "gallery",
  subGroup: "pro-gallery",
  description: "Advanced gallery layouts with complex grid templates.",
  version: "1.0.0",
  tags: ["gallery", "pro", "collage", "mosaic", "magazine"],
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
    { key: "gap", label: "Gap (px)", type: "number", default: 12, min: 0, max: 48 },
    {
      key: "layout",
      label: "Layout",
      type: "select",
      options: [
        { value: "mosaic", label: "Mosaic Large" },
        { value: "magazine", label: "Magazine Grid" },
        { value: "strip", label: "Strip Layout" },
        { value: "editorial", label: "Editorial" },
        { value: "showcase", label: "Showcase" },
      ],
      default: "mosaic",
    },
  ],
  defaultProps: {
    images: [
      { src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&q=80", alt: "Image 1" },
      { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80", alt: "Image 2" },
      { src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80", alt: "Image 3" },
      { src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&q=80", alt: "Image 4" },
      { src: "https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=400&q=80", alt: "Image 5" },
      { src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80", alt: "Image 6" },
    ],
    layout: "mosaic",
    gap: 12,
  },
  defaultStyle: { width: "100%", padding: "16px" },
  editorRenderer: ({ node, style }) => {
    const gap = Number(node.props.gap ?? 12);
    const layout = String(node.props.layout ?? "mosaic");
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];

    const getGridStyle = (): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        ...(style as React.CSSProperties),
        display: "grid",
        gap: `${gap}px`,
      };

      if (layout === "mosaic") {
        return {
          ...baseStyle,
          gridTemplateColumns: "repeat(4, 1fr)",
          gridAutoRows: "200px",
        };
      }

      if (layout === "magazine") {
        return {
          ...baseStyle,
          gridTemplateColumns: "repeat(3, 1fr)",
          gridAutoRows: "200px",
        };
      }

      if (layout === "strip") {
        return {
          ...baseStyle,
          gridTemplateColumns: "2fr 1fr",
          gridAutoRows: "auto",
        };
      }

      if (layout === "editorial") {
        return {
          ...baseStyle,
          gridTemplateColumns: "repeat(2, 1fr)",
          gridAutoRows: "250px",
        };
      }

      if (layout === "showcase") {
        return {
          ...baseStyle,
          gridTemplateColumns: "repeat(3, 1fr)",
          gridAutoRows: "200px",
        };
      }

      return baseStyle;
    };

    const getItemStyle = (index: number): React.CSSProperties => {
      const baseItem: React.CSSProperties = {
        overflow: "hidden",
        borderRadius: 4,
        background: "#f3f4f6",
      };

      if (layout === "mosaic") {
        if (index === 0) return { ...baseItem, gridColumn: "span 2", gridRow: "span 2" };
        return baseItem;
      }

      if (layout === "magazine") {
        if (index === 0) return { ...baseItem, gridColumn: "span 2", gridRow: "span 2" };
        if (index === 3) return { ...baseItem, gridColumn: "span 2" };
        return baseItem;
      }

      if (layout === "strip") {
        if (index === 0) return { ...baseItem, gridRow: "span 2", minHeight: "420px" };
        return baseItem;
      }

      if (layout === "editorial") {
        if (index % 3 === 0) return { ...baseItem, gridColumn: "span 2" };
        return baseItem;
      }

      if (layout === "showcase") {
        if (index === 0) return { ...baseItem, gridColumn: "span 2", gridRow: "span 2" };
        return baseItem;
      }

      return baseItem;
    };

    return (
      <div data-node-id={node.id} style={getGridStyle()}>
        {imgs.map((img, i) => (
          <div key={i} style={getItemStyle(i)}>
            <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
          </div>
        ))}
        {imgs.length === 0 &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ ...getItemStyle(i), display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 11 }}>
              {i + 1}
            </div>
          ))}
      </div>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const gap = Number(node.props.gap ?? 12);
    const layout = String(node.props.layout ?? "mosaic");
    const imgs = Array.isArray(node.props.images) ? (node.props.images as { src: string; alt: string }[]) : [];

    const getGridStyle = (): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        ...(style as React.CSSProperties),
        display: "grid",
        gap: `${gap}px`,
      };

      if (layout === "mosaic") {
        return {
          ...baseStyle,
          gridTemplateColumns: "repeat(4, 1fr)",
          gridAutoRows: "200px",
        };
      }

      if (layout === "magazine") {
        return {
          ...baseStyle,
          gridTemplateColumns: "repeat(3, 1fr)",
          gridAutoRows: "200px",
        };
      }

      if (layout === "strip") {
        return {
          ...baseStyle,
          gridTemplateColumns: "2fr 1fr",
          gridAutoRows: "auto",
        };
      }

      if (layout === "editorial") {
        return {
          ...baseStyle,
          gridTemplateColumns: "repeat(2, 1fr)",
          gridAutoRows: "250px",
        };
      }

      if (layout === "showcase") {
        return {
          ...baseStyle,
          gridTemplateColumns: "repeat(3, 1fr)",
          gridAutoRows: "200px",
        };
      }

      return baseStyle;
    };

    const getItemStyle = (index: number): React.CSSProperties => {
      const baseItem: React.CSSProperties = {
        overflow: "hidden",
        borderRadius: 4,
      };

      if (layout === "mosaic") {
        if (index === 0) return { ...baseItem, gridColumn: "span 2", gridRow: "span 2" };
        return baseItem;
      }

      if (layout === "magazine") {
        if (index === 0) return { ...baseItem, gridColumn: "span 2", gridRow: "span 2" };
        if (index === 3) return { ...baseItem, gridColumn: "span 2" };
        return baseItem;
      }

      if (layout === "strip") {
        if (index === 0) return { ...baseItem, gridRow: "span 2", minHeight: "420px" };
        return baseItem;
      }

      if (layout === "editorial") {
        if (index % 3 === 0) return { ...baseItem, gridColumn: "span 2" };
        return baseItem;
      }

      if (layout === "showcase") {
        if (index === 0) return { ...baseItem, gridColumn: "span 2", gridRow: "span 2" };
        return baseItem;
      }

      return baseItem;
    };

    return (
      <div style={getGridStyle()}>
        {imgs.map((img, i) => (
          <div key={i} style={getItemStyle(i)}>
            <img src={img.src} alt={img.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>
    );
  },
};
