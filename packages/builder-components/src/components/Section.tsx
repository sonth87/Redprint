import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

// ── Background style helper ───────────────────────────────────────────────────

function buildBackgroundStyle(props: Record<string, unknown>): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (props.backgroundColor) style.backgroundColor = props.backgroundColor as string;
  if (props.backgroundImage) {
    style.backgroundImage = `url(${props.backgroundImage as string})`;
    style.backgroundSize = (props.backgroundSize as string) ?? "cover";
    style.backgroundPosition = (props.backgroundPosition as string) ?? "center";
    style.backgroundRepeat = "no-repeat";
  }
  return style;
}

function splitBackgroundStyles(style?: React.CSSProperties): {
  containerStyle: React.CSSProperties;
  backgroundStyle: React.CSSProperties;
} {
  if (!style) return { containerStyle: {}, backgroundStyle: {} };

  const containerStyle: React.CSSProperties = { ...style };
  const backgroundStyle: React.CSSProperties = {};
  const bgKeys: (keyof React.CSSProperties)[] = [
    "background",
    "backgroundAttachment",
    "backgroundBlendMode",
    "backgroundClip",
    "backgroundColor",
    "backgroundImage",
    "backgroundOrigin",
    "backgroundPosition",
    "backgroundRepeat",
    "backgroundSize",
  ];

  for (const key of bgKeys) {
    const value = containerStyle[key];
    if (value !== undefined) {
      (backgroundStyle as Record<string, unknown>)[key] = value;
      delete (containerStyle as Record<string, unknown>)[key];
    }
  }

  return { containerStyle, backgroundStyle };
}

// ── Divider mask helpers ──────────────────────────────────────────────────────
//
// Instead of colored overlays, dividers CLIP the section background using CSS
// mask-image. White = visible area, transparent = clipped (next section shows).
// All SVG paths use viewBox "0 0 1200 60".

const DIVIDER_PATHS: Record<string, { normal: string; flipped: string }> = {
  // Background kept ABOVE these wave curves (visible = above wave)
  wave: {
    normal:  "M0,0 L1200,0 L1200,30 C900,60 300,0 0,30 Z",
    flipped: "M0,0 L1200,0 L1200,30 C900,0 300,60 0,30 Z",
  },
  wave2: {
    normal:  "M0,0 L1200,0 L1200,20 C1050,60 850,20 600,40 C350,60 150,20 0,20 Z",
    flipped: "M0,20 C150,60 350,20 600,40 C850,60 1050,20 1200,20 L1200,0 L0,0 Z",
  },
  slant: {
    normal:  "M0,0 L1200,0 L0,60 Z",
    flipped: "M0,0 L1200,0 L1200,60 Z",
  },
  curve: {
    // concave bottom: full visible at edges, bows up at center
    normal:  "M0,0 L1200,0 L1200,60 Q600,0 0,60 Z",
    // convex bottom: full visible at center, bows up at edges
    flipped: "M0,0 L1200,0 L1200,30 Q600,90 0,30 Z",
  },
};

function buildZigzagPath(flipped: boolean): string {
  const steps = 12;
  const pts = ["M0,0 L1200,0"];
  for (let i = steps; i >= 0; i--) {
    const x = (i / steps) * 1200;
    const y = flipped ? (i % 2 === 0 ? 60 : 0) : (i % 2 === 0 ? 0 : 60);
    pts.push(`L${x},${y}`);
  }
  pts.push("Z");
  return pts.join(" ");
}

function makeMaskSvgUri(type: string, position: "top" | "bottom", flip: boolean): string | null {
  if (type === "none" || type === "fade") return null;

  const pathData = type === "zigzag"
    ? buildZigzagPath(flip)
    : (DIVIDER_PATHS[type]?.[flip ? "flipped" : "normal"] ?? null);

  if (!pathData) return null;

  // For "top" position: vertical-flip the path so white = area BELOW the wave
  const inner = position === "top"
    ? `<g transform="scale(1,-1) translate(0,-60)"><path d="${pathData}" fill="white"/></g>`
    : `<path d="${pathData}" fill="white"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 60" preserveAspectRatio="none">${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function cubicAt(a: number, b: number, c: number, d: number, t: number): number {
  const mt = 1 - t;
  return mt ** 3 * a + 3 * mt ** 2 * t * b + 3 * mt * t ** 2 * c + t ** 3 * d;
}

function quadAt(a: number, b: number, c: number, t: number): number {
  const mt = 1 - t;
  return mt ** 2 * a + 2 * mt * t * b + t ** 2 * c;
}

function getBaseBoundaryY(type: string, flip: boolean, t: number): number {
  if (type === "wave") {
    return cubicAt(0.5, flip ? 1 : 0, flip ? 0 : 1, 0.5, t);
  }

  if (type === "wave2") {
    if (t <= 0.5) {
      const localT = t / 0.5;
      return cubicAt(1 / 3, flip ? 1 : 1 / 3, flip ? 1 / 3 : 1, 2 / 3, localT);
    }
    const localT = (t - 0.5) / 0.5;
    return cubicAt(2 / 3, flip ? 1 : 1 / 3, flip ? 1 / 3 : 1, 1 / 3, localT);
  }

  if (type === "slant") {
    return flip ? t : 1 - t;
  }

  if (type === "curve") {
    return flip
      ? quadAt(0.5, 1.5, 0.5, t)
      : quadAt(1, 0, 1, t);
  }

  if (type === "zigzag") {
    const steps = 12;
    const scaled = Math.min(t * steps, steps);
    const idx = Math.min(Math.floor(scaled), steps - 1);
    const localT = scaled - idx;
    const y0 = flip ? (idx % 2 === 0 ? 1 : 0) : (idx % 2 === 0 ? 0 : 1);
    const y1 = flip ? ((idx + 1) % 2 === 0 ? 1 : 0) : ((idx + 1) % 2 === 0 ? 0 : 1);
    return y0 + (y1 - y0) * localT;
  }

  return 0;
}

function buildClipPathData(
  height: number,
  topType: string, topHeight: number, topFlip: boolean,
  btmType: string, btmHeight: number, btmFlip: boolean,
): string | null {
  const hasTop = topType !== "none";
  const hasBtm = btmType !== "none";
  if (!hasTop && !hasBtm) return null;
  if (height <= 0) return null;

  const topRatio = Math.min(Math.max(topHeight / height, 0), 1);
  const btmRatio = Math.min(Math.max(btmHeight / height, 0), 1);
  const sampleCount = 48;
  const points: string[] = [];

  if (hasTop && topType !== "fade") {
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const baseY = getBaseBoundaryY(topType, topFlip, t);
      const y = topRatio * (1 - baseY);
      points.push(`${t} ${y}`);
    }
  } else {
    points.push("0 0", "1 0");
  }

  if (hasBtm && btmType !== "fade") {
    for (let i = sampleCount; i >= 0; i--) {
      const t = i / sampleCount;
      const baseY = getBaseBoundaryY(btmType, btmFlip, t);
      const y = 1 - btmRatio + btmRatio * baseY;
      points.push(`${t} ${y}`);
    }
  } else {
    points.push("1 1", "0 1");
  }

  return `M ${points.join(" L ")} Z`;
}

function SectionFrame({
  nodeId,
  props,
  style,
  children,
  editor,
}: {
  nodeId?: string;
  props: Record<string, unknown>;
  style: React.CSSProperties;
  children: React.ReactNode;
  editor: boolean;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const clipId = React.useId().replace(/:/g, "_");
  const [height, setHeight] = React.useState(0);

  React.useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const update = () => setHeight(el.getBoundingClientRect().height);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { containerStyle, backgroundStyle } = splitBackgroundStyles(style);
  const minHeight    = containerStyle.minHeight ?? "400px";
  const bgStyle      = { ...backgroundStyle, ...buildBackgroundStyle(props) };
  const fullWidth    = !!props.fullWidthBackground;
  const overlayColor = props.backgroundOverlay as string | undefined;
  const overlayOpacity = (props.backgroundOverlayOpacity as number) ?? 0.4;
  const hasOverlay   = !!overlayColor;
  const hasBg        = Object.keys(bgStyle).length > 0;

  const topType   = (props.dividerTopType as string) || "none";
  const topHeight = (props.dividerTopHeight as number) ?? 60;
  const topFlip   = !!props.dividerTopFlip;
  const btmType   = (props.dividerBottomType as string) || "none";
  const btmHeight = (props.dividerBottomHeight as number) ?? 60;
  const btmFlip   = !!props.dividerBottomFlip;

  const hasTop = topType !== "none";
  const hasBtm = btmType !== "none";
  const hasClipPath = (hasTop || hasBtm) && topType !== "fade" && btmType !== "fade";
  const clipPathData = buildClipPathData(height, topType, topHeight, topFlip, btmType, btmHeight, btmFlip);
  const clipPathStyle = hasClipPath && clipPathData
    ? { clipPath: `url(#${clipId})`, WebkitClipPath: `url(#${clipId})` }
    : {};

  const fadeMaskStyle: React.CSSProperties = {};
  const fadeOnly =
    (topType === "none" || topType === "fade") &&
    (btmType === "none" || btmType === "fade") &&
    (topType === "fade" || btmType === "fade");

  if (fadeOnly) {
    const stops: string[] = [];
    if (topType === "fade") {
      stops.push("transparent 0px", `black ${topHeight}px`);
    } else {
      stops.push("black 0px");
    }

    if (btmType === "fade") {
      stops.push(`black calc(100% - ${btmHeight}px)`, "transparent 100%");
    } else {
      stops.push("black 100%");
    }

    const gradient = `linear-gradient(to bottom, ${stops.join(", ")})`;
    fadeMaskStyle.maskImage = gradient;
    fadeMaskStyle.WebkitMaskImage = gradient;
    fadeMaskStyle.maskRepeat = "no-repeat";
    fadeMaskStyle.WebkitMaskRepeat = "no-repeat";
    fadeMaskStyle.maskSize = "100% 100%";
    fadeMaskStyle.WebkitMaskSize = "100% 100%";
  } else if (topType === "fade" || btmType === "fade") {
    const images: string[] = [];
    const sizes: string[] = [];
    const positions: string[] = [];
    const composites: string[] = [];
    const webkitComposites: string[] = [];

    const safeTop = hasTop ? topHeight : 0;
    const safeBtm = hasBtm ? btmHeight : 0;
    images.push("linear-gradient(black, black)");
    sizes.push(`100% calc(100% - ${safeTop}px - ${safeBtm}px)`);
    positions.push(`0 ${safeTop}px`);
    composites.push("add");
    webkitComposites.push("source-over");

    if (hasBtm) {
      images.push(
        btmType === "fade"
          ? "linear-gradient(to top, transparent, black)"
          : (makeMaskSvgUri(btmType, "bottom", btmFlip) ?? "linear-gradient(black,black)")
      );
      sizes.push(`100% ${btmHeight}px`);
      positions.push(`0 calc(100% - ${btmHeight}px)`);
      composites.push("add");
      webkitComposites.push("source-over");
    }

    if (hasTop) {
      images.push(
        topType === "fade"
          ? "linear-gradient(to bottom, transparent, black)"
          : (makeMaskSvgUri(topType, "top", topFlip) ?? "linear-gradient(black,black)")
      );
      sizes.push(`100% ${topHeight}px`);
      positions.push("0 0");
      composites.push("add");
      webkitComposites.push("source-over");
    }

    if (images.length > 0) {
      fadeMaskStyle.maskImage = images.join(", ");
      fadeMaskStyle.WebkitMaskImage = images.join(", ");
      fadeMaskStyle.maskSize = sizes.join(", ");
      fadeMaskStyle.WebkitMaskSize = sizes.join(", ");
      fadeMaskStyle.maskPosition = positions.join(", ");
      fadeMaskStyle.WebkitMaskPosition = positions.join(", ");
      fadeMaskStyle.maskRepeat = "no-repeat";
      fadeMaskStyle.WebkitMaskRepeat = "no-repeat";
      fadeMaskStyle.maskComposite = composites.join(", ");
      fadeMaskStyle.WebkitMaskComposite = webkitComposites.join(", ");
    }
  }

  const sectionSurfaceStyle = { ...(hasClipPath ? clipPathStyle : fadeMaskStyle) };

  const padTop = hasTop ? topHeight : 0;
  const padBtm = hasBtm ? btmHeight : 0;
  const marginTopVal = hasTop ? `-${topHeight}px` : undefined;
  const marginBottomVal = hasBtm ? `-${btmHeight}px` : undefined;
  const zIdx = hasTop ? 2 : hasBtm ? 1 : undefined;
  const bleedFadeMask = "linear-gradient(to right, transparent, black 250px, black calc(100% - 250px), transparent)";

  const baseLayerStyle: React.CSSProperties = editor
    ? fullWidth
      ? {
          position: "absolute", top: 0, bottom: 0, left: "-250px", right: "-250px",
          zIndex: 0, pointerEvents: "none",
        }
      : {
          position: "absolute", inset: 0,
          zIndex: 0, pointerEvents: "none",
        }
    : fullWidth
      ? {
          position: "absolute", top: 0, bottom: 0,
          left: "50%", transform: "translateX(-50%)",
          width: "100vw",
          zIndex: 0, pointerEvents: "none",
        }
      : {
          position: "absolute", inset: 0,
          zIndex: 0, pointerEvents: "none",
        };

  return (
    <div
      ref={rootRef}
      data-node-id={nodeId}
      data-section={editor ? true : undefined}
      style={{
        position: "relative",
        ...containerStyle,
        width: "100%",
        minHeight,
        paddingTop: padTop > 0 ? `${padTop}px` : undefined,
        paddingBottom: padBtm > 0 ? `${padBtm}px` : undefined,
        marginTop: marginTopVal,
        marginBottom: marginBottomVal,
        zIndex: zIdx,
        overflow: "visible",
      }}
    >
      {hasClipPath && clipPathData && (
        <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path d={clipPathData} />
            </clipPath>
          </defs>
        </svg>
      )}

      {fullWidth && hasBg && (
        <div
          style={{
            ...baseLayerStyle,
            ...bgStyle,
            ...(editor ? { WebkitMaskImage: bleedFadeMask, maskImage: bleedFadeMask } : {}),
            ...sectionSurfaceStyle,
          }}
        />
      )}

      {!fullWidth && hasBg && (
        <div
          style={{
            ...baseLayerStyle,
            ...bgStyle,
            ...sectionSurfaceStyle,
          }}
        />
      )}

      {hasOverlay && (
        <div
          style={{
            ...baseLayerStyle,
            ...(editor && fullWidth ? { WebkitMaskImage: bleedFadeMask, maskImage: bleedFadeMask } : {}),
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
            zIndex: 1,
            ...sectionSurfaceStyle,
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}

// ── Divider options ───────────────────────────────────────────────────────────

const DIVIDER_OPTIONS = [
  { value: "none",   label: "None"    },
  { value: "wave",   label: "Wave"    },
  { value: "wave2",  label: "Wave 2"  },
  { value: "slant",  label: "Slant"   },
  { value: "curve",  label: "Curve"   },
  { value: "zigzag", label: "Zigzag"  },
  { value: "fade",   label: "Fade"    },
];

// ── Component definition ──────────────────────────────────────────────────────

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
    // ── Background ──────────────────────────────────────────────────────────
    {
      key: "backgroundGroup",
      label: "Background",
      type: "group",
      collapsible: true,
      children: [
        { key: "backgroundColor",          label: "Color",           type: "color",  allowTransparent: true },
        { key: "backgroundImage",          label: "Image",           type: "image" },
        {
          key: "backgroundSize", label: "Size", type: "select",
          options: [
            { value: "cover",   label: "Cover"   },
            { value: "contain", label: "Contain" },
            { value: "auto",    label: "Auto"    },
          ],
          default: "cover",
        },
        {
          key: "backgroundPosition", label: "Position", type: "select",
          options: [
            { value: "center",        label: "Center"       },
            { value: "top center",    label: "Top"          },
            { value: "bottom center", label: "Bottom"       },
            { value: "left center",   label: "Left"         },
            { value: "right center",  label: "Right"        },
            { value: "top left",      label: "Top Left"     },
            { value: "top right",     label: "Top Right"    },
            { value: "bottom left",   label: "Bottom Left"  },
            { value: "bottom right",  label: "Bottom Right" },
          ],
          default: "center",
        },
        { key: "backgroundOverlay",        label: "Overlay Color",   type: "color",  allowTransparent: true },
        { key: "backgroundOverlayOpacity", label: "Overlay Opacity", type: "slider", min: 0, max: 1, step: 0.01, default: 0.4 },
        { key: "fullWidthBackground",      label: "Full Width",      type: "boolean", default: false },
      ],
    },
    // ── Dividers ────────────────────────────────────────────────────────────
    {
      key: "dividerGroup",
      label: "Dividers",
      type: "group",
      collapsible: true,
      children: [
        { key: "dividerTopType",      label: "Top Style",     type: "select",  options: DIVIDER_OPTIONS, default: "none" },
        { key: "dividerTopHeight",    label: "Top Height",    type: "number",  min: 10, max: 300, step: 2, unit: "px", default: 60 },
        { key: "dividerTopFlip",      label: "Flip Top",      type: "boolean", default: false },
        { key: "dividerBottomType",   label: "Bottom Style",  type: "select",  options: DIVIDER_OPTIONS, default: "none" },
        { key: "dividerBottomHeight", label: "Bottom Height", type: "number",  min: 10, max: 300, step: 2, unit: "px", default: 60 },
        { key: "dividerBottomFlip",   label: "Flip Bottom",   type: "boolean", default: false },
      ],
    },
  ],
  defaultProps: {
    backgroundSize: "cover",
    backgroundPosition: "center",
    fullWidthBackground: false,
    backgroundOverlayOpacity: 0.4,
    dividerTopType: "none",
    dividerTopHeight: 60,
    dividerTopFlip: false,
    dividerBottomType: "none",
    dividerBottomHeight: 60,
    dividerBottomFlip: false,
  },
  defaultStyle: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: "400px",
    position: "relative",
  },

  // ── Editor renderer ───────────────────────────────────────────────────────
  editorRenderer: ({ node, children, style }) => (
    <SectionFrame
      nodeId={node.id}
      props={node.props as Record<string, unknown>}
      style={style as React.CSSProperties}
      editor
    >
      {children as React.ReactNode}
    </SectionFrame>
  ),

  // ── Runtime renderer ──────────────────────────────────────────────────────
  runtimeRenderer: ({ node, children, style }) => (
    <SectionFrame
      props={node.props as Record<string, unknown>}
      style={style as React.CSSProperties}
      editor={false}
    >
      {children as React.ReactNode}
    </SectionFrame>
  ),
};
