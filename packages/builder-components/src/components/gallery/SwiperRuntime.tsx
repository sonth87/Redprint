// ── Swiper-based runtime for slider / slideshow / carousel-3d modes ──────────
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

// Minimal CSS injected once per page for Swiper core + effects.
const SWIPER_CORE_CSS = `
.swiper{width:100%;height:100%;overflow:hidden;touch-action:pan-y}.swiper-wrapper{display:flex;align-items:stretch;box-sizing:content-box}.swiper-slide{flex-shrink:0;width:100%;height:100%;position:relative}.swiper-slide img{display:block;width:100%;height:100%;object-fit:cover}
.swiper-button-next,.swiper-button-prev{position:absolute;top:50%;z-index:10;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--swiper-navigation-color,#fff);width:var(--swiper-navigation-size,44px);height:var(--swiper-navigation-size,44px);margin-top:calc(-1 * var(--swiper-navigation-size,44px)/2)}.swiper-button-next{right:var(--swiper-navigation-sides-offset,4px)}.swiper-button-prev{left:var(--swiper-navigation-sides-offset,4px)}.swiper-button-next:after,.swiper-button-prev:after{font-size:calc(var(--swiper-navigation-size,44px)/2);font-weight:bold}.swiper-button-prev:after{content:'❮'}.swiper-button-next:after{content:'❯'}.swiper-button-disabled{opacity:.35;pointer-events:none}
.swiper-pagination{position:absolute;text-align:center;z-index:10;bottom:8px;left:0;width:100%}.swiper-pagination-bullet{display:inline-block;width:var(--swiper-pagination-bullet-width,8px);height:var(--swiper-pagination-bullet-height,8px);border-radius:50%;background:var(--swiper-pagination-bullet-inactive-color,#fff);opacity:var(--swiper-pagination-bullet-inactive-opacity,.2);margin:0 var(--swiper-pagination-bullet-horizontal-gap,4px);cursor:pointer;transition:opacity .2s}.swiper-pagination-bullet-active{opacity:1;background:var(--swiper-pagination-color,#fff)}.swiper-pagination-fraction{color:var(--swiper-pagination-fraction-color,#fff)}.swiper-pagination-progressbar{position:absolute;left:0;top:0;width:100%;height:4px;background:rgba(255,255,255,.25)}.swiper-pagination-progressbar .swiper-pagination-progressbar-fill{position:absolute;left:0;top:0;width:100%;height:100%;transform:scale(0);transform-origin:left top;background:var(--swiper-pagination-color,#fff);transition:transform .3s ease}
.swiper-slide-shadow,.swiper-slide-shadow-left,.swiper-slide-shadow-right,.swiper-slide-shadow-top,.swiper-slide-shadow-bottom{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:10}.swiper-slide-shadow{background:rgba(0,0,0,.15)}.swiper-slide-shadow-left{background:linear-gradient(to left,rgba(0,0,0,.5),rgba(0,0,0,0))}.swiper-slide-shadow-right{background:linear-gradient(to right,rgba(0,0,0,.5),rgba(0,0,0,0))}
.swiper-3d{perspective:1200px}.swiper-3d .swiper-wrapper{transform-style:preserve-3d}.swiper-3d .swiper-slide{transform-style:preserve-3d}
.swiper-fade .swiper-slide{pointer-events:none}.swiper-fade .swiper-slide-active{pointer-events:auto}.swiper-fade .swiper-slide{opacity:0 !important;transition-property:opacity}.swiper-fade .swiper-slide-active{opacity:1 !important}
.swiper-cards{overflow:visible}.swiper-cards .swiper-slide{transform-origin:center bottom;backface-visibility:hidden}.swiper-cards .swiper-slide-shadow{border-radius:inherit;background:rgba(0,0,0,.5)}
.swiper-scrollbar{border-radius:10px;background:rgba(0,0,0,.1);position:absolute;z-index:50}.swiper-scrollbar-drag{height:100%;width:100%;position:relative;left:0;top:0;border-radius:inherit;background:rgba(0,0,0,.5);cursor:grab}.swiper-horizontal>.swiper-scrollbar{position:absolute;left:1%;bottom:3px;z-index:50;height:5px;width:98%}
.swiper-vertical .swiper-button-prev{top:var(--swiper-navigation-sides-offset,4px);bottom:auto;left:50%;right:auto;transform:translateX(-50%) rotate(90deg);margin-top:0}.swiper-vertical .swiper-button-next{top:auto;bottom:var(--swiper-navigation-sides-offset,4px);left:50%;right:auto;transform:translateX(-50%) rotate(90deg);margin-top:0}
`;

let swiperStylesInjected = false;
function injectSwiperStyles() {
  if (swiperStylesInjected || typeof document === "undefined") return;
  const existing = document.getElementById("__swiper-gallery-css");
  if (existing) {
    swiperStylesInjected = true;
    return;
  }
  const style = document.createElement("style");
  style.id = "__swiper-gallery-css";
  style.textContent = SWIPER_CORE_CSS;
  document.head.appendChild(style);
  swiperStylesInjected = true;
}

/**
 * Unified Swiper component for slider / slideshow / carousel-3d modes.
 * isEditor=true disables all touch/drag so it doesn't conflict with canvas interactions.
 */
export function SwiperSliderRuntime({
  items,
  p,
  cc,
  isEditor = false,
}: {
  items: GalleryItem[];
  p: GalleryProps;
  cc: CarouselConfig;
  isEditor?: boolean;
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
        height: 0,
        paddingBottom: `calc(${heightPct}% + ${cardsPad}px)`,
        overflow: "visible",
        borderRadius: `${p.borderRadius}px`,
        ...(isEditor && { pointerEvents: "none" }),
        ...cssVars,
      }
    : {
        position: "relative",
        width: "100%",
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
        aspectRatio: aspectStr,
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
              } as Record<string, unknown>)
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
