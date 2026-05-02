import React from "react";
import type { Breakpoint, ComponentDefinition } from "@ui-builder/builder-core";
import { buildDividerRenderState, DIVIDER_OPTIONS } from "./section/dividers";

function findScrollContainer(el: Element): Element | null {
  let parent = el.parentElement;
  while (parent && parent !== document.documentElement) {
    const { overflow, overflowY } = getComputedStyle(parent);
    if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
}

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
  const bgRef = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef<number | undefined>(undefined);
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
  const parallaxSpeed = Number(props.backgroundParallaxSpeed ?? 0);
  const parallaxEnabled = !editor && parallaxSpeed > 0 && !!bgStyle.backgroundImage;

  // Debug state
  const [debugText, setDebugText] = React.useState("Waiting for scroll...");
  // When parallax is active, remove backgroundPosition from React's control so the
  // scroll handler can manage it exclusively — prevents React re-renders from resetting it.
  const bgRenderStyle: React.CSSProperties =
    parallaxEnabled
      ? {
          ...bgStyle,
          backgroundPosition: "50% 50%",
          backgroundSize:
            typeof bgStyle.backgroundSize === "string" && bgStyle.backgroundSize !== "auto"
              ? "110%"
              : bgStyle.backgroundSize,
          willChange: "transform",
        }
      : bgStyle;
  const overlayColor = props.backgroundOverlay as string | undefined;
  const overlayOpacity = (props.backgroundOverlayOpacity as number) ?? 0.4;
  const hasOverlay = !!overlayColor;
  const hasBg = Object.keys(bgStyle).length > 0;

  const parallaxBleed = parallaxEnabled ? Math.max(80, Math.ceil(parallaxSpeed * 120)) : 0;

  React.useEffect(() => {
    if (!parallaxEnabled || !bgRef.current || !rootRef.current) return;
    const sectionEl = rootRef.current;
    const bgEl = bgRef.current;
    const baseTransform = "translate3d(0, 0, 0)";
    
    const scrollTarget = findScrollContainer(sectionEl) ?? window;

    const handleScroll = (e?: Event) => {
      if (rafRef.current !== undefined) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = undefined;
        try {
          const activeScrollTarget = e?.target instanceof Element 
            ? e.target 
            : scrollTarget;

          const rect = sectionEl.getBoundingClientRect();
          
          let vh: number;
          let relativeTop: number;
          if (activeScrollTarget === window || activeScrollTarget === (document as unknown as Element)) {
            vh = window.innerHeight;
            relativeTop = rect.top;
          } else {
            const targetRect = (activeScrollTarget as Element).getBoundingClientRect();
            vh = targetRect.height;
            relativeTop = rect.top - targetRect.top;
          }

          const progress = (vh / 2 - (relativeTop + rect.height / 2)) / (vh + rect.height);
          const offset = progress * parallaxSpeed * 240;
          
          bgEl.style.transform = `translate3d(0, ${offset}px, 0)`;
        } catch (err) {
          console.error("Parallax error:", err);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      scrollTarget.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== undefined) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      bgEl.style.transform = baseTransform;
    };
  }, [parallaxEnabled, parallaxSpeed]);

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

  const clipContainerStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 0,
    pointerEvents: "none",
    overflow: "hidden",
    ...dividerState.surfaceStyle,
  };

  if (editor) {
    if (fullWidth) {
      clipContainerStyle.top = 0;
      clipContainerStyle.bottom = 0;
      clipContainerStyle.left = "-250px";
      clipContainerStyle.right = "-250px";
      clipContainerStyle.WebkitMaskImage = bleedFadeMask;
      clipContainerStyle.maskImage = bleedFadeMask;
    } else {
      clipContainerStyle.inset = 0;
    }
  } else {
    if (fullWidth) {
      clipContainerStyle.top = 0;
      clipContainerStyle.bottom = 0;
      clipContainerStyle.left = "50%";
      clipContainerStyle.transform = "translateX(-50%)";
      clipContainerStyle.width = "100vw";
    } else {
      clipContainerStyle.inset = 0;
    }
  }

  const innerBgStyle: React.CSSProperties = {
    position: "absolute",
    top: -parallaxBleed,
    bottom: -parallaxBleed,
    left: 0,
    right: 0,
    ...bgRenderStyle,
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
      {/* Background layer */}
      {(hasBg || hasOverlay) && (
        <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path d={dividerState.clipPathData ?? undefined} />
            </clipPath>
          </defs>
        </svg>
      )}

      {(hasBg || hasOverlay) && (
        <div style={clipContainerStyle}>
          {hasBg && <div ref={bgRef} style={innerBgStyle} />}
          {hasOverlay && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: overlayColor,
                opacity: overlayOpacity,
                zIndex: 1,
              }}
            />
          )}
        </div>
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
      key: "sectionOptionsGroup",
      label: "Section Options",
      type: "group",
      collapsible: true,
      children: [
        { key: "fullWidthBackground", label: "Full Width", type: "boolean", default: false, description: "Desktop only. Mobile and tablet render as normal section width." },
        { key: "backgroundOverlay", label: "Overlay Color", type: "color", allowTransparent: true },
        { key: "backgroundOverlayOpacity", label: "Overlay Opacity", type: "slider", min: 0, max: 1, step: 0.01, default: 0.4 },
        { key: "backgroundParallaxSpeed", label: "Parallax Speed", type: "slider", min: 0, max: 1, step: 0.05, default: 0 },
      ],
    },
    {
      key: "dividerGroup",
      label: "Dividers",
      type: "group",
      collapsible: true,
      children: [
        {
          key: "row1",
          type: "row",
          children: [
            { key: "dividerTopType", label: "Top Style", type: "select", options: DIVIDER_OPTIONS, default: "none" },
            { key: "dividerTopHeight", label: "Top Height", type: "number", min: 10, max: 300, step: 2, unit: "px", default: 60 },
          ],
        },
        { key: "dividerTopFlip", label: "Flip Top", type: "boolean", default: false },
        {
          key: "row2",
          type: "row",
          children: [
            { key: "dividerBottomType", label: "Bottom Style", type: "select", options: DIVIDER_OPTIONS, default: "none" },
            { key: "dividerBottomHeight", label: "Bottom Height", type: "number", min: 10, max: 300, step: 2, unit: "px", default: 60 },
          ],
        },
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
    backgroundParallaxSpeed: 0,
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
