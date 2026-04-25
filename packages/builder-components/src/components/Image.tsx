import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import { IMAGE_FILTERS, getFilterDef, buildCssFilter, collectSvgFilterDefs, type SpecialFrameStyle } from "@ui-builder/shared";

/**
 * Tape corner decoration — four semi-transparent tape strips, one per corner.
 * Rendered when frameStyle === "tape". Container must have overflow: visible.
 */
function TapeDecoration() {
  const tapes: Array<React.CSSProperties & { rotate: string }> = [
    { top: "-10px", left: "18px",  rotate: "-20deg" },
    { top: "-10px", right: "18px", rotate: "20deg"  },
    { bottom: "-10px", left: "18px",  rotate: "15deg"  },
    { bottom: "-10px", right: "18px", rotate: "-15deg" },
  ];
  return (
    <>
      {tapes.map(({ rotate, ...pos }, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 36,
            height: 14,
            background: "rgba(215,205,165,0.72)",
            transform: `rotate(${rotate})`,
            pointerEvents: "none",
            zIndex: 2,
            ...pos,
          }}
        />
      ))}
    </>
  );
}

/**
 * Hidden SVG holding all filter defs so `filter: url(#id)` resolves at runtime.
 * Rendered as a sibling inside the image container.
 */
function SvgFilterDefs() {
  const defs = collectSvgFilterDefs();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: `<defs>${defs}</defs>` }}
    />
  );
}

export const ImageComponent: ComponentDefinition = {
  type: "Image",
  name: "Image",
  category: "media",
  group: "image",
  description: "An image with focal point, overlay, filters, and link support.",
  version: "2.0.0",
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
    { key: "src", label: "Image", type: "image", required: true },
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
    {
      key: "focalPoint",
      label: "Focal Point",
      type: "group",
      children: [
        { key: "focalX", label: "Horizontal (%)", type: "slider", min: 0, max: 100, default: 50 },
        { key: "focalY", label: "Vertical (%)", type: "slider", min: 0, max: 100, default: 50 },
      ],
    },
    {
      key: "filter",
      label: "Filter",
      type: "select",
      options: IMAGE_FILTERS.map((f) => ({ value: f.value, label: f.label })),
      default: "none",
    },
    { key: "overlayColor", label: "Overlay Color", type: "color", allowTransparent: true, default: "#000000" },
    { key: "overlayOpacity", label: "Overlay Opacity (%)", type: "slider", min: 0, max: 100, default: 0 },
    {
      key: "link",
      label: "Link",
      type: "group",
      children: [
        { key: "linkUrl", label: "URL", type: "string", placeholder: "https://…" },
        {
          key: "linkTarget",
          label: "Open in",
          type: "select",
          options: [
            { value: "_blank", label: "New tab" },
            { value: "_self", label: "Same tab" },
          ],
          default: "_blank",
        },
      ],
    },
  ],
  defaultProps: {
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
    alt: "Sample image",
    objectFit: "cover",
    focalX: 50,
    focalY: 50,
    filter: "none",
    overlayColor: "#000000",
    overlayOpacity: 0,
    linkUrl: "",
    linkTarget: "_blank",
  },
  defaultStyle: { width: "100%", height: "200px", borderRadius: "8px" },

  editorRenderer: ({ node, style }) => {
    const src = String(node.props.src ?? "");
    const alt = String(node.props.alt ?? "");
    const objectFit = (node.props.objectFit as React.CSSProperties["objectFit"]) ?? "cover";
    const focalX = Number(node.props.focalX ?? 50);
    const focalY = Number(node.props.focalY ?? 50);
    const filterKey = String(node.props.filter ?? "none");
    const overlayColor = String(node.props.overlayColor ?? "#000000");
    const overlayOpacity = Number(node.props.overlayOpacity ?? 0);
    const frameStyle = String(node.props.frameStyle ?? "none") as SpecialFrameStyle;
    const isTape = frameStyle === "tape";
    const isPolaroid = frameStyle === "polaroid";

    const filterDef = getFilterDef(filterKey);
    const cssFilter = buildCssFilter(filterDef);
    const hasSvgFilter = filterDef?.mode === "svg";
    const hasColorOverlay = filterDef?.mode === "overlay" && !!filterDef.overlayColor;

    const containerStyle: React.CSSProperties = {
      ...(style as React.CSSProperties),
      position: "relative",
      overflow: isTape ? "visible" : "hidden",
      display: "block",
      ...(isPolaroid ? {
        background: "#ffffff",
        padding: "8px 8px 40px 8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        transform: "rotate(-1.5deg)",
      } : {}),
    };

    return (
      <div data-node-id={node.id} style={containerStyle}>
        {hasSvgFilter && <SvgFilterDefs />}
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit,
            objectPosition: `${focalX}% ${focalY}%`,
            display: "block",
            filter: cssFilter,
          }}
        />
        {/* Image filter color overlay */}
        {hasColorOverlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: filterDef!.overlayColor,
              opacity: filterDef!.overlayOpacity ?? 0.3,
              mixBlendMode: (filterDef!.overlayBlend ?? "multiply") as React.CSSProperties["mixBlendMode"],
              pointerEvents: "none",
            }}
          />
        )}
        {/* User-defined overlay */}
        {overlayOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: overlayColor,
              opacity: overlayOpacity / 100,
              pointerEvents: "none",
            }}
          />
        )}
        {/* Special frame decorations */}
        {isTape && <TapeDecoration />}
      </div>
    );
  },

  runtimeRenderer: ({ node, style }) => {
    const src = String(node.props.src ?? "");
    const alt = String(node.props.alt ?? "");
    const objectFit = (node.props.objectFit as React.CSSProperties["objectFit"]) ?? "cover";
    const focalX = Number(node.props.focalX ?? 50);
    const focalY = Number(node.props.focalY ?? 50);
    const filterKey = String(node.props.filter ?? "none");
    const overlayColor = String(node.props.overlayColor ?? "#000000");
    const overlayOpacity = Number(node.props.overlayOpacity ?? 0);
    const linkUrl = String(node.props.linkUrl ?? "");
    const linkTarget = String(node.props.linkTarget ?? "_blank");
    const frameStyle = String(node.props.frameStyle ?? "none") as SpecialFrameStyle;
    const isTape = frameStyle === "tape";
    const isPolaroid = frameStyle === "polaroid";

    const filterDef = getFilterDef(filterKey);
    const cssFilter = buildCssFilter(filterDef);
    const hasSvgFilter = filterDef?.mode === "svg";
    const hasColorOverlay = filterDef?.mode === "overlay" && !!filterDef.overlayColor;

    const containerStyle: React.CSSProperties = {
      ...(style as React.CSSProperties),
      position: "relative",
      overflow: isTape ? "visible" : "hidden",
      display: "block",
      ...(isPolaroid ? {
        background: "#ffffff",
        padding: "8px 8px 40px 8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        transform: "rotate(-1.5deg)",
      } : {}),
    };

    const content = (
      <div style={containerStyle}>
        {hasSvgFilter && <SvgFilterDefs />}
        <img
          src={src}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit,
            objectPosition: `${focalX}% ${focalY}%`,
            display: "block",
            filter: cssFilter,
          }}
        />
        {hasColorOverlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: filterDef!.overlayColor,
              opacity: filterDef!.overlayOpacity ?? 0.3,
              mixBlendMode: (filterDef!.overlayBlend ?? "multiply") as React.CSSProperties["mixBlendMode"],
              pointerEvents: "none",
            }}
          />
        )}
        {overlayOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: overlayColor,
              opacity: overlayOpacity / 100,
              pointerEvents: "none",
            }}
          />
        )}
        {/* Special frame decorations */}
        {isTape && <TapeDecoration />}
      </div>
    );

    if (linkUrl) {
      return (
        <a
          href={linkUrl}
          target={linkTarget}
          rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
          style={{ display: "block", textDecoration: "none" }}
        >
          {content}
        </a>
      );
    }

    return content;
  },
};
