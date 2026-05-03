import React, { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
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

  const cssVars = {
    "--swiper-navigation-color": navColor,
    "--swiper-navigation-size": `${cc.navigation.size}px`,
    "--swiper-navigation-sides-offset": `${cc.navigation.offset}px`,
    "--swiper-pagination-color": pagColor,
    "--swiper-pagination-bullet-inactive-color": pagColor,
    "--swiper-pagination-bullet-inactive-opacity": "0.35",
  };

  const wrapperStyle: React.CSSProperties = isCards
    ? {
        position: "relative",
        width: "100%",
        height: hasExplicitHeight ? "100%" : 0,
        paddingBottom: hasExplicitHeight ? undefined : `calc(${heightPct}% + ${cardsPad}px)`,
        overflow: "visible",
        borderRadius: `${p.borderRadius}px`,
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
        key={`${cc.effect}-${cc.direction}-${isEditor ? "ed" : "rt"}`}
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
        navigation={cc.navigation.enabled}
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
    </div>
  );
}
