import React, { useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { ComponentDefinition, ComponentRenderer } from "@ui-builder/builder-core";

type RendererProps = Parameters<ComponentRenderer>[0];

type SlideItem = { label: string; bg: string };

const DEFAULT_SLIDES: SlideItem[] = [
  { label: "1", bg: "#cbd5e1" },
  { label: "2", bg: "#94a3b8" },
  { label: "3", bg: "#64748b" },
  { label: "4", bg: "#475569" },
  { label: "5", bg: "#334155" },
];

function getBorderRadius(shape: string) {
  if (shape === "circle") return "50%";
  if (shape === "oval") return "50% / 30%";
  return "8px";
}

// ── Editor renderer: static, shows first slide as preview ──────────────────
function EditorRenderer({ node, style }: RendererProps) {
  const aspect = (node.props.aspectRatio as string) ?? "16/9";
  const shape = String(node.props.shape ?? "rectangle");
  const slideCount = Number(node.props.slideCount ?? 5);
  const showArrows = Boolean(node.props.showArrows ?? true);
  const showDots = Boolean(node.props.showDots ?? true);

  const hasExplicitHeight = !!(style as React.CSSProperties)?.height;

  return (
    <div
      data-node-id={node.id}
      style={{
        position: "relative",
        ...(style as React.CSSProperties),
        overflow: "hidden",
        userSelect: "none",
        ...(!hasExplicitHeight && { aspectRatio: aspect }),
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: getBorderRadius(shape),
          overflow: "hidden",
          background: "#cbd5e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <span
          style={{
            fontSize: "clamp(24px, 10%, 48px)",
            fontWeight: 700,
            color: "#fff",
            opacity: 0.9,
            userSelect: "none",
          }}
        >
          1
        </span>
        {/* slide counter badge */}
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            background: "rgba(0,0,0,0.35)",
            color: "#fff",
            fontSize: 11,
            padding: "2px 7px",
            borderRadius: 99,
          }}
        >
          1 / {slideCount}
        </div>
      </div>

      {showArrows && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            pointerEvents: "none",
          }}
        >
          <button
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <button
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        </div>
      )}

      {showDots && slideCount > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {Array.from({ length: Math.min(slideCount, 7) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i === 0 ? "#fff" : "rgba(255,255,255,0.45)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Runtime renderer: fully interactive Embla carousel ─────────────────────
function RuntimeRenderer({ node, style }: RendererProps) {
  const aspect = (node.props.aspectRatio as string) ?? "16/9";
  const shape = String(node.props.shape ?? "rectangle");
  const slideCount = Number(node.props.slideCount ?? 5);
  const showArrows = Boolean(node.props.showArrows ?? true);
  const showDots = Boolean(node.props.showDots ?? true);
  const autoPlay = Boolean(node.props.autoPlay ?? false);
  const autoPlaySpeed = Number(node.props.autoPlaySpeed ?? 3000);
  const loop = Boolean(node.props.loop ?? true);

  const slides = DEFAULT_SLIDES.slice(0, slideCount).map((s, i) => ({
    ...DEFAULT_SLIDES[i % DEFAULT_SLIDES.length],
    label: String(i + 1),
  }));

  const plugins = autoPlay
    ? [Autoplay({ delay: autoPlaySpeed, stopOnInteraction: true })]
    : [];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop }, plugins);
  const [current, setCurrent] = React.useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrent(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const hasExplicitHeight = !!(style as React.CSSProperties)?.height;

  return (
    <div
      style={{
        position: "relative",
        ...(style as React.CSSProperties),
        overflow: "hidden",
        ...(!hasExplicitHeight && { aspectRatio: aspect }),
      }}
    >
      {/* viewport */}
      <div
        ref={emblaRef}
        style={{ overflow: "hidden", borderRadius: getBorderRadius(shape), height: "100%" }}
      >
        <div style={{ display: "flex", height: "100%" }}>
          {slides.map((slide, i) => (
            <div
              key={i}
              style={{
                flex: "0 0 100%",
                minWidth: 0,
                height: "100%",
                background: slide.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(28px, 12%, 56px)",
                  fontWeight: 700,
                  color: "#fff",
                  opacity: 0.9,
                  userSelect: "none",
                }}
              >
                {slide.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* arrows */}
      {showArrows && slides.length > 1 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            pointerEvents: "none",
          }}
        >
          <button
            onClick={scrollPrev}
            style={{
              pointerEvents: "all",
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <button
            onClick={scrollNext}
            style={{
              pointerEvents: "all",
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        </div>
      )}

      {/* dots */}
      {showDots && slides.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i === current ? "#fff" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── ComponentDefinition ─────────────────────────────────────────────────────
export const GallerySliderComponent: ComponentDefinition = {
  type: "GallerySlider",
  name: "Gallery Slider",
  category: "media",
  group: "gallery",
  subGroup: "gallery-slider",
  description: "A horizontal image slideshow powered by Embla Carousel.",
  version: "2.0.0",
  tags: ["gallery", "slider", "carousel", "slideshow"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "slideCount", label: "Number of Slides", type: "number", default: 5, min: 1, max: 20 },
    { key: "autoPlay", label: "Auto Play", type: "boolean", default: false },
    { key: "autoPlaySpeed", label: "Auto Play Speed (ms)", type: "number", default: 3000, min: 500, max: 10000 },
    { key: "loop", label: "Loop", type: "boolean", default: true },
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
        { value: "3/4", label: "3:4 (Portrait)" },
      ],
      default: "16/9",
    },
  ],
  defaultProps: {
    slideCount: 5,
    autoPlay: false,
    autoPlaySpeed: 3000,
    loop: true,
    showArrows: true,
    showDots: true,
    shape: "rectangle",
    aspectRatio: "16/9",
  },
  defaultStyle: { width: "100%", position: "relative" },
  editorRenderer: (props) => <EditorRenderer {...props} />,
  runtimeRenderer: (props) => <RuntimeRenderer {...props} />,
};
