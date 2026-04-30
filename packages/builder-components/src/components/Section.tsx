import React from "react";
import type { Breakpoint, ComponentDefinition } from "@ui-builder/builder-core";
import { buildDividerRenderState, DIVIDER_OPTIONS } from "./section/dividers";

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

function SectionFrame({
  nodeId,
  props,
  style,
  children,
  editor,
  breakpoint,
}: {
  nodeId?: string;
  props: Record<string, unknown>;
  style: React.CSSProperties;
  children: React.ReactNode;
  editor: boolean;
  breakpoint: Breakpoint;
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
  const minHeight = containerStyle.minHeight ?? "400px";
  const bgStyle = { ...backgroundStyle, ...buildBackgroundStyle(props) };
  const fullWidth = !!props.fullWidthBackground && breakpoint === "desktop";
  const overlayColor = props.backgroundOverlay as string | undefined;
  const overlayOpacity = (props.backgroundOverlayOpacity as number) ?? 0.4;
  const hasOverlay = !!overlayColor;
  const hasBg = Object.keys(bgStyle).length > 0;

  const dividerState = buildDividerRenderState({
    clipId,
    height,
    topType: (props.dividerTopType as string) || "none",
    topHeight: (props.dividerTopHeight as number) ?? 60,
    topFlip: !!props.dividerTopFlip,
    bottomType: (props.dividerBottomType as string) || "none",
    bottomHeight: (props.dividerBottomHeight as number) ?? 60,
    bottomFlip: !!props.dividerBottomFlip,
  });

  const bleedFadeMask = "linear-gradient(to right, transparent, black 250px, black calc(100% - 250px), transparent)";

  const baseLayerStyle: React.CSSProperties = editor
    ? fullWidth
      ? {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "-250px",
          right: "-250px",
          zIndex: 0,
          pointerEvents: "none",
        }
      : {
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
        }
    : fullWidth
      ? {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100vw",
          zIndex: 0,
          pointerEvents: "none",
        }
      : {
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
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
        paddingTop: dividerState.padTop > 0 ? `${dividerState.padTop}px` : undefined,
        paddingBottom: dividerState.padBottom > 0 ? `${dividerState.padBottom}px` : undefined,
        marginTop: dividerState.marginTop,
        marginBottom: dividerState.marginBottom,
        zIndex: dividerState.zIndex,
        overflow: "visible",
      }}
    >
      {dividerState.clipPathData && (
        <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path d={dividerState.clipPathData} />
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
            ...dividerState.surfaceStyle,
          }}
        />
      )}

      {!fullWidth && hasBg && (
        <div
          style={{
            ...baseLayerStyle,
            ...bgStyle,
            ...dividerState.surfaceStyle,
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
            ...dividerState.surfaceStyle,
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}

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
    {
      key: "backgroundGroup",
      label: "Background",
      type: "group",
      collapsible: true,
      children: [
        { key: "backgroundColor", label: "Color", type: "color", allowTransparent: true },
        { key: "backgroundImage", label: "Image", type: "image" },
        {
          key: "backgroundSize",
          label: "Size",
          type: "select",
          options: [
            { value: "cover", label: "Cover" },
            { value: "contain", label: "Contain" },
            { value: "auto", label: "Auto" },
          ],
          default: "cover",
        },
        {
          key: "backgroundPosition",
          label: "Position",
          type: "select",
          options: [
            { value: "center", label: "Center" },
            { value: "top center", label: "Top" },
            { value: "bottom center", label: "Bottom" },
            { value: "left center", label: "Left" },
            { value: "right center", label: "Right" },
            { value: "top left", label: "Top Left" },
            { value: "top right", label: "Top Right" },
            { value: "bottom left", label: "Bottom Left" },
            { value: "bottom right", label: "Bottom Right" },
          ],
          default: "center",
        },
        { key: "backgroundOverlay", label: "Overlay Color", type: "color", allowTransparent: true },
        { key: "backgroundOverlayOpacity", label: "Overlay Opacity", type: "slider", min: 0, max: 1, step: 0.01, default: 0.4 },
        { key: "fullWidthBackground", label: "Full Width", type: "boolean", default: false, description: "Desktop only. Mobile and tablet render as normal section width." },
      ],
    },
    {
      key: "dividerGroup",
      label: "Dividers",
      type: "group",
      collapsible: true,
      children: [
        { key: "dividerTopType", label: "Top Style", type: "select", options: DIVIDER_OPTIONS, default: "none" },
        { key: "dividerTopHeight", label: "Top Height", type: "number", min: 10, max: 300, step: 2, unit: "px", default: 60 },
        { key: "dividerTopFlip", label: "Flip Top", type: "boolean", default: false },
        { key: "dividerBottomType", label: "Bottom Style", type: "select", options: DIVIDER_OPTIONS, default: "none" },
        { key: "dividerBottomHeight", label: "Bottom Height", type: "number", min: 10, max: 300, step: 2, unit: "px", default: 60 },
        { key: "dividerBottomFlip", label: "Flip Bottom", type: "boolean", default: false },
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
  editorRenderer: ({ node, children, style, breakpoint }) => (
    <SectionFrame
      nodeId={node.id}
      props={node.props as Record<string, unknown>}
      style={style as React.CSSProperties}
      editor
      breakpoint={breakpoint}
    >
      {children as React.ReactNode}
    </SectionFrame>
  ),
  runtimeRenderer: ({ node, children, style, breakpoint }) => (
    <SectionFrame
      props={node.props as Record<string, unknown>}
      style={style as React.CSSProperties}
      editor={false}
      breakpoint={breakpoint}
    >
      {children as React.ReactNode}
    </SectionFrame>
  ),
};
