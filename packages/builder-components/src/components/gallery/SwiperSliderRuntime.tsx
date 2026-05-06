import React, { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import type { NavigationOptions } from "swiper/types";
import {
  Navigation,
  Pagination,
  Autoplay as SwiperAutoplay,
  Scrollbar,
  FreeMode,
  EffectFade,
  EffectCube,
  EffectFlip,
  EffectCards,
  EffectCoverflow,
  EffectCreative,
  Keyboard,
  Mousewheel,
  A11y,
  Grid,
  Zoom,
  Virtual,
  HashNavigation,
  Parallax,
} from "swiper/modules";
import type { GalleryItem, CarouselConfig } from "@ui-builder/shared";
import type { GalleryProps } from "./types";
import { injectSwiperStyles } from "./swiperStyles";

// ── SVG icon paths (24×24 viewBox) ────────────────────────────────────────────

const NAV_ICON_PATHS: Record<
  NonNullable<CarouselConfig["navigation"]["iconStyle"]>,
  { prev: string; next: string }
> = {
  chevron: {
    prev: "M15 18l-6-6 6-6",
    next: "M9 18l6-6-6-6",
  },
  "chevron-thin": {
    prev: "M15.5 19l-7-7 7-7",
    next: "M8.5 19l7-7-7-7",
  },
  "chevron-double": {
    prev: "M18 18l-6-6 6-6M12 18l-6-6 6-6",
    next: "M6 18l6-6-6-6M12 18l6-6-6-6",
  },
  arrow: {
    prev: "M19 12H5M12 5l-7 7 7 7",
    next: "M5 12h14M12 19l7-7-7-7",
  },
  "arrow-fat": {
    prev: "M12 4L2 12l10 8V4z",
    next: "M12 4l10 8-10 8V4z",
  },
  "arrow-outline": {
    prev: "M12 4L2 12l10 8V4zM2 12h20",
    next: "M12 4l10 8-10 8V4zM22 12H2",
  },
  caret: {
    prev: "M14 17l-5-5 5-5",
    next: "M10 17l5-5-5-5",
  },
  triangle: {
    prev: "M8 12L16 6v12z",
    next: "M16 12L8 6v12z",
  },
  "triangle-outline": {
    prev: "M8 12L16 5.5v13z",
    next: "M16 12L8 5.5v13z",
  },
  "circle-arrow": {
    prev: "M19 12H5M12 5l-7 7 7 7M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 0 0-18 0",
    next: "M5 12h14M12 19l7-7-7-7M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 0 0-18 0",
  },
  "circle-chevron": {
    prev: "M14 16l-4-4 4-4",
    next: "M10 16l4-4-4-4",
  },
  play: {
    prev: "M6 12l11-7v14L6 12z",
    next: "M18 12L7 5v14l11-7z",
  },
};

// For circle-chevron we want a circle background, handled via wrapperStyle
const CIRCLE_BG_STYLES: Partial<Record<string, React.CSSProperties>> = {
  "circle-arrow": { borderRadius: "50%", border: "2px solid currentColor" },
  "circle-chevron": { borderRadius: "50%", background: "currentColor" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SwiperSliderRuntime({
  items,
  p,
  cc,
  isEditor = false,
  hasExplicitHeight = false,
}: {
  items: GalleryItem[];
  p: GalleryProps;
  cc: CarouselConfig;
  isEditor?: boolean;
  hasExplicitHeight?: boolean;
}): React.ReactElement {
  useEffect(() => {
    injectSwiperStyles();
  }, []);

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const swiperRef = useRef<SwiperType | null>(null);

  const modules = [
    Navigation,
    Pagination,
    SwiperAutoplay,
    Scrollbar,
    FreeMode,
    EffectFade,
    EffectCube,
    EffectFlip,
    EffectCards,
    EffectCoverflow,
    EffectCreative,
    Keyboard,
    Mousewheel,
    A11y,
    ...(cc.rows > 1 ? [Grid] : []),
    ...(cc.zoom ? [Zoom] : []),
    ...(cc.parallax ? [Parallax] : []),
    ...(cc.virtualSlides ? [Virtual] : []),
    ...(cc.hashNavigation ? [HashNavigation] : []),
  ];

  const navColor = cc.navigation.color || "#ffffff";
  const pagColor = cc.pagination.color || "#ffffff";

  const isCards = cc.effect === "cards";
  const isCoverflow = cc.effect === "coverflow";
  const cardsPad = isCards ? Math.max(cc.cardsEffect.perSlideOffset * 6, 24) : 0;
  const coverflowPad = isCoverflow ? 0 : 100;

  const aspectStr = cc.aspectRatio || p.aspectRatio || "16/9";
  const ratioParts = aspectStr.split("/").map(Number);
  const heightPct =
    ratioParts.length === 2 && ratioParts[0]! > 0 && ratioParts[1]! > 0
      ? (ratioParts[1]! / ratioParts[0]!) * 100
      : 56.25;

  const isNavOutside = cc.navigation.placement === "outside";
  const isPagOutside = cc.pagination.enabled && cc.pagination.placement === "outside";

  const cssVars = {
    "--swiper-navigation-color": navColor,
    "--swiper-navigation-size": `${cc.navigation.size}px`,
    "--swiper-navigation-sides-offset": `${cc.navigation.offset}px`,
    "--swiper-pagination-color": pagColor,
    "--swiper-pagination-bullet-inactive-color": pagColor,
    "--swiper-pagination-bullet-inactive-opacity": "0.35",
    "--swiper-pagination-bullet-size": `${cc.pagination.bulletSize}px`,
    "--swiper-pagination-bullet-gap": `${cc.pagination.bulletGap}px`,
    "--swiper-pagination-progressbar-size": `${cc.pagination.progressbarSize}px`,
    "--swiper-pagination-bottom": isPagOutside
      ? `-${cc.pagination.offset + 24}px`
      : `${cc.pagination.offset}px`,
  };

  const navBtnBaseStyle = (side: "prev" | "next"): React.CSSProperties => {
    const isCircle = cc.navigation.iconStyle === "circle-arrow" || cc.navigation.iconStyle === "circle-chevron";
    const isChevronCircle = cc.navigation.iconStyle === "circle-chevron";
    const iconOffset = isNavOutside ? -(cc.navigation.size + cc.navigation.offset) : cc.navigation.offset;

    return {
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      [side === "prev" ? "left" : "right"]: `${iconOffset}px`,
      width: `${cc.navigation.size}px`,
      height: `${cc.navigation.size}px`,
      zIndex: 10,
      cursor: "pointer",
      background: "transparent",
      border: "none",
      padding: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: isChevronCircle ? "#00000000" : navColor,
      pointerEvents: isEditor ? "none" : "auto",
      borderRadius: isCircle ? "50%" : undefined,
      outline: "none",
      ...(CIRCLE_BG_STYLES[cc.navigation.iconStyle] && {
        ...CIRCLE_BG_STYLES[cc.navigation.iconStyle],
        color: isChevronCircle ? navColor : undefined,
        borderColor: cc.navigation.iconStyle === "circle-arrow" ? navColor : undefined,
        background: isChevronCircle ? navColor : undefined,
      }),
    };
  };

  const iconStyle = cc.navigation.iconStyle || "chevron";
  const paths = NAV_ICON_PATHS[iconStyle] ?? NAV_ICON_PATHS.chevron;
  const isFilled = iconStyle === "arrow-fat" || iconStyle === "triangle" || iconStyle === "play";
  const isChevronCircle = iconStyle === "circle-chevron";

  const NavIcon = ({ side }: { side: "prev" | "next" }) => (
    <svg
      viewBox="0 0 24 24"
      width="60%"
      height="60%"
      fill={isFilled ? navColor : "none"}
      stroke={isChevronCircle ? (cc.navigation.color === "#ffffff" ? "#000000" : "#ffffff") : navColor}
      strokeWidth={iconStyle === "chevron-thin" || iconStyle === "caret" ? 1.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={side === "prev" ? paths.prev : paths.next} />
    </svg>
  );

  const wrapperStyle: React.CSSProperties = isCards
    ? {
        position: "relative",
        width: "100%",
        height: hasExplicitHeight ? "100%" : 0,
        paddingBottom: hasExplicitHeight
          ? undefined
          : `calc(${heightPct}% + ${cardsPad}px)`,
        overflow: "visible",
        borderRadius: `${p.borderRadius}px`,
        ...(isPagOutside && { paddingBottom: `${cc.pagination.offset + 28}px` }),
        ...(isEditor && { pointerEvents: "none" }),
        ...cssVars,
      }
    : {
        position: "relative",
        width: "100%",
        ...(hasExplicitHeight && { height: "100%" }),
        overflow: "visible",
        borderRadius: `${p.borderRadius}px`,
        ...(isCoverflow && { paddingInline: `${coverflowPad}px` }),
        ...(isPagOutside && { paddingBottom: `${cc.pagination.offset + 28}px` }),
        ...(isEditor && { pointerEvents: "none" }),
        ...cssVars,
      };

  const swiperStyle: React.CSSProperties = isCards
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        padding: "0 100px",
      }
    : {
        width: "100%",
        ...(hasExplicitHeight ? { height: "100%" } : { aspectRatio: aspectStr }),
        ...(isCoverflow && { overflow: "hidden" }),
      };

  return (
    <div style={wrapperStyle as React.CSSProperties}>
      <Swiper
        key={`${cc.effect}-${cc.direction}-${cc.navigation.enabled}-${cc.pagination.enabled}-${cc.pagination.type}-${isEditor ? "ed" : "rt"}`}
        modules={modules}
        speed={cc.speed}
        style={swiperStyle}
        direction={cc.direction}
        slidesPerView={cc.slidesPerView}
        slidesPerGroup={cc.slidesPerGroup}
        grid={cc.rows > 1 ? { rows: cc.rows, fill: "row" } : undefined}
        spaceBetween={cc.spaceBetween}
        centeredSlides={cc.centeredSlides}
        initialSlide={cc.initialSlide}
        autoHeight={cc.autoHeight && !isEditor}
        grabCursor={isEditor ? false : cc.grabCursor}
        slideToClickedSlide={isEditor ? false : cc.slideToClickedSlide}
        allowTouchMove={!isEditor}
        simulateTouch={!isEditor}
        loop={!isEditor && cc.loopMode === "loop"}
        rewind={!isEditor && cc.loopMode === "rewind"}
        effect={cc.effect}
        fadeEffect={cc.effect === "fade" ? { crossFade: cc.fadeCrossFade } : undefined}
        cubeEffect={cc.effect === "cube" ? cc.cubeEffect : undefined}
        flipEffect={cc.effect === "flip" ? { slideShadows: cc.flipSlideShadows } : undefined}
        cardsEffect={cc.effect === "cards" ? cc.cardsEffect : undefined}
        coverflowEffect={cc.effect === "coverflow" ? cc.coverflowEffect : undefined}
        navigation={
          cc.navigation.enabled
            ? { prevEl: prevRef.current, nextEl: nextRef.current }
            : false
        }
        onBeforeInit={(swiper) => {
          if (cc.navigation.enabled) {
            (swiper.params.navigation as NavigationOptions).prevEl = prevRef.current;
            (swiper.params.navigation as NavigationOptions).nextEl = nextRef.current;
          }
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        pagination={
          cc.pagination.enabled
            ? {
                type: cc.pagination.type as "bullets" | "fraction" | "progressbar",
                clickable: cc.pagination.clickable,
                dynamicBullets: cc.pagination.dynamicBullets,
              }
            : undefined
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        autoplay={
          !isEditor && cc.autoplay.enabled
            ? ({
                delay: cc.autoplay.delay,
                stopOnInteraction: cc.autoplay.stopOnInteraction,
                pauseOnMouseEnter: cc.autoplay.pauseOnMouseEnter,
                reverseDirection: cc.autoplay.reverseDirection,
                disableOnInteraction: cc.autoplay.disableOnInteraction,
              } as any)
            : undefined
        }
        scrollbar={!isEditor && cc.scrollbar ? { draggable: cc.scrollbarDraggable } : undefined}
        freeMode={!isEditor && cc.freeMode ? { sticky: cc.freeModeSticky } : undefined}
        keyboard={!isEditor && cc.keyboard ? { enabled: true } : undefined}
        mousewheel={!isEditor && cc.mousewheel ? { enabled: true } : undefined}
        zoom={!isEditor && cc.zoom ? { maxRatio: cc.zoomMax } : undefined}
        parallax={cc.parallax}
        a11y={cc.accessibility ? { enabled: true } : undefined}
        virtual={!isEditor && cc.virtualSlides}
        hashNavigation={!isEditor && cc.hashNavigation}
      >
        {items.map((img, i) => (
          <SwiperSlide
            key={img.id ?? i}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: cc.slideRadius > 0 ? `${cc.slideRadius}px` : undefined,
            }}
          >
            <div
              data-swiper-parallax={cc.parallax ? "-150" : undefined}
              style={{
                width: cc.parallax ? "150%" : "100%",
                height: "100%",
                transform: cc.parallax ? "translateX(-10%)" : undefined,
              }}
            >
              {img.link ? (
                <a
                  href={img.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", width: "100%", height: "100%" }}
                >
                  <img
                    src={img.src}
                    alt={img.alt ?? ""}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: p.imageFit,
                      display: "block",
                    }}
                  />
                </a>
              ) : (
                <img
                  src={img.src}
                  alt={img.alt ?? ""}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: p.imageFit,
                    display: "block",
                  }}
                />
              )}
              {(img.title || img.description) && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.65))",
                    color: "#fff",
                    padding: "48px 20px 16px",
                    pointerEvents: "none",
                  }}
                >
                  {img.title && (
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{img.title}</p>
                  )}
                  {img.description && (
                    <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>
                      {img.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {cc.navigation.enabled && (
        <>
          <button ref={prevRef} style={navBtnBaseStyle("prev")} aria-label="Previous slide">
            <NavIcon side="prev" />
          </button>
          <button ref={nextRef} style={navBtnBaseStyle("next")} aria-label="Next slide">
            <NavIcon side="next" />
          </button>
        </>
      )}
    </div>
  );
}
