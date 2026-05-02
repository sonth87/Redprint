import React, { useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { ComponentDefinition, ComponentRenderer } from "@ui-builder/builder-core";

type RendererProps = Parameters<ComponentRenderer>[0];

const DEFAULT_SLIDES = [
  { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", alt: "Mountain peaks" },
  { src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80", alt: "Sunrise valley" },
  { src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&q=80", alt: "Waterfall" },
];

const MAX_SLIDES = 10;

type SlideData = { src: string; alt: string; caption?: string; linkUrl?: string };

function getSlides(props: Record<string, unknown>, count: number): SlideData[] {
  return Array.from({ length: count }, (_, i) => {
    const fallback = DEFAULT_SLIDES[i % DEFAULT_SLIDES.length] ?? DEFAULT_SLIDES[0]!;
    return {
      src: String(props[`slide${i}_src`] ?? fallback.src),
      alt: String(props[`slide${i}_alt`] ?? fallback.alt),
      caption: String(props[`slide${i}_caption`] ?? ""),
      linkUrl: String(props[`slide${i}_link`] ?? ""),
    };
  });
}

function buildSlideSchema(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    key: `slide${i}`,
    label: `Slide ${i + 1}`,
    type: "group" as const,
    children: [
      { key: `slide${i}_src`, label: "Image", type: "image" as const },
      { key: `slide${i}_alt`, label: "Alt text", type: "string" as const, default: "" },
      { key: `slide${i}_caption`, label: "Caption", type: "string" as const, default: "" },
      { key: `slide${i}_link`, label: "Link URL", type: "string" as const, default: "" },
    ],
  }));
}

// ── Editor renderer: static preview, shows first slide ─────────────────────
function EditorRenderer({ node, style }: RendererProps) {
  const aspect = String(node.props.aspectRatio ?? "16/9");
  const showArrows = Boolean(node.props.showArrows ?? true);
  const showDots = Boolean(node.props.showDots ?? true);
  const count = Math.max(1, Math.min(MAX_SLIDES, Number(node.props.slideCount ?? 3)));
  const slides = getSlides(node.props, count);
  const first = slides[0]!;
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
      {/* First slide preview */}
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        {first.src ? (
          <img
            src={first.src}
            alt={first.alt}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "clamp(24px,10%,48px)", fontWeight: 700, color: "#fff", opacity: 0.7 }}>1</span>
          </div>
        )}
        {first.caption && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 13, padding: "8px 12px" }}>
            {first.caption}
          </div>
        )}
      </div>

      {/* Slide count badge */}
      <div style={{ position: "absolute", top: 8, right: 10, background: "rgba(0,0,0,0.35)", color: "#fff", fontSize: 11, padding: "2px 7px", borderRadius: 99 }}>
        1 / {count}
      </div>

      {/* Arrow previews */}
      {showArrows && count > 1 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", pointerEvents: "none" }}>
          {["‹", "›"].map((ch) => (
            <button key={ch} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.85)", border: "none", fontSize: 18, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>{ch}</button>
          ))}
        </div>
      )}

      {/* Dots preview */}
      {showDots && count > 1 && (
        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
          {Array.from({ length: Math.min(count, 7) }).map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? "#fff" : "rgba(255,255,255,0.45)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Runtime renderer: fully interactive Embla carousel ─────────────────────
function RuntimeRenderer({ node, style }: RendererProps) {
  const aspect = String(node.props.aspectRatio ?? "16/9");
  const showArrows = Boolean(node.props.showArrows ?? true);
  const showDots = Boolean(node.props.showDots ?? true);
  const autoPlay = Boolean(node.props.autoPlay ?? false);
  const autoPlaySpeed = Number(node.props.autoPlaySpeed ?? 3000);
  const loop = Boolean(node.props.loop ?? true);
  const count = Math.max(1, Math.min(MAX_SLIDES, Number(node.props.slideCount ?? 3)));
  const slides = getSlides(node.props, count);

  const plugins = autoPlay ? [Autoplay({ delay: autoPlaySpeed, stopOnInteraction: true })] : [];
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
    <div style={{ position: "relative", ...(style as React.CSSProperties), overflow: "hidden", ...(!hasExplicitHeight && { aspectRatio: aspect }) }}>
      {/* Embla viewport */}
      <div ref={emblaRef} style={{ overflow: "hidden", height: "100%" }}>
        <div style={{ display: "flex", height: "100%" }}>
          {slides.map((slide, i) => {
            const inner = (
              <div style={{ flex: "0 0 100%", minWidth: 0, height: "100%", position: "relative" }}>
                {slide.src ? (
                  <img src={slide.src} alt={slide.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "clamp(28px,12%,56px)", fontWeight: 700, color: "#fff", opacity: 0.9 }}>{i + 1}</span>
                  </div>
                )}
                {slide.caption && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 13, padding: "8px 12px" }}>
                    {slide.caption}
                  </div>
                )}
              </div>
            );

            return slide.linkUrl ? (
              <a key={i} href={slide.linkUrl} target="_blank" rel="noopener noreferrer" style={{ flex: "0 0 100%", minWidth: 0, textDecoration: "none" }}>
                {inner}
              </a>
            ) : (
              <div key={i} style={{ flex: "0 0 100%", minWidth: 0 }}>{inner}</div>
            );
          })}
        </div>
      </div>

      {/* Arrows */}
      {showArrows && slides.length > 1 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", pointerEvents: "none" }}>
          {[{ fn: scrollPrev, ch: "‹" }, { fn: scrollNext, ch: "›" }].map(({ fn, ch }) => (
            <button
              key={ch}
              onClick={fn}
              style={{ pointerEvents: "all", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.85)", border: "none", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {ch}
            </button>
          ))}
        </div>
      )}

      {/* Dots */}
      {showDots && slides.length > 1 && (
        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              style={{ width: 8, height: 8, borderRadius: "50%", background: i === current ? "#fff" : "rgba(255,255,255,0.45)", cursor: "pointer", transition: "background 0.2s" }}
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
  description: "A horizontal image slideshow with per-slide image picker, caption, and link.",
  version: "3.0.0",
  deprecated: true,
  replacedBy: "GallerySliderPro",
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
    { key: "slideCount", label: "Number of Slides", type: "slider", min: 1, max: MAX_SLIDES, default: 3 },
    { key: "autoPlay", label: "Auto Play", type: "boolean", default: false },
    { key: "autoPlaySpeed", label: "Auto Play Speed", type: "number", default: 3000, min: 500, max: 10000, step: 500, unit: "ms" },
    { key: "loop", label: "Loop", type: "boolean", default: true },
    { key: "showArrows", label: "Show Arrows", type: "boolean", default: true },
    { key: "showDots", label: "Show Dots", type: "boolean", default: true },
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
    // Individual slide schemas
    ...buildSlideSchema(MAX_SLIDES),
  ],
  defaultProps: {
    slideCount: 3,
    autoPlay: false,
    autoPlaySpeed: 3000,
    loop: true,
    showArrows: true,
    showDots: true,
    aspectRatio: "16/9",
    // Pre-fill first 3 slides with real images
    ...Object.fromEntries(
      DEFAULT_SLIDES.flatMap((s, i) => [
        [`slide${i}_src`, s.src],
        [`slide${i}_alt`, s.alt],
        [`slide${i}_caption`, ""],
        [`slide${i}_link`, ""],
      ])
    ),
  },
  defaultStyle: { width: "100%" },
  editorRenderer: (props) => (
    <div data-node-id={props.node.id}>
      <div style={{ background: "#fef3c7", color: "#92400e", fontSize: 9, padding: "2px 8px", fontWeight: 600, letterSpacing: "0.02em" }}>
        Deprecated — use Gallery Slider
      </div>
      <EditorRenderer {...props} />
    </div>
  ),
  runtimeRenderer: (props) => <RuntimeRenderer {...props} />,
};
