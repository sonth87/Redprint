/**
 * Carousel configuration types and presets.
 * Used by GalleryPro (slider/slideshow/carousel-3d modes) and CarouselSettingsPanel.
 * Zero React/DOM dependencies.
 */

// ── Sub-config interfaces ─────────────────────────────────────────────────────

export interface CarouselNavConfig {
  enabled: boolean;
  /** Arrow icon style shown on navigation buttons */
  iconStyle: "chevron" | "arrow" | "arrow-filled" | "arrow-outlined" | "caret" | "play";
  color: string;
  placement: "inside" | "outside";
  position: "start" | "center" | "end";
  size: number;
  offset: number;
  hideOnClick: boolean;
}

export interface CarouselPaginationConfig {
  enabled: boolean;
  type: "bullets" | "fraction" | "progressbar";
  color: string;
  placement: "inside" | "outside";
  position: "start" | "center" | "end";
  offset: number;
  hideOnClick: boolean;
  // bullets
  bulletSize: number;
  bulletGap: number;
  dynamicBullets: boolean;
  clickable: boolean;
  // progressbar
  progressbarSize: number;
}

export interface CarouselAutoplayConfig {
  enabled: boolean;
  delay: number;
  stopOnInteraction: boolean;
  pauseOnMouseEnter: boolean;
  reverseDirection: boolean;
  disableOnInteraction: boolean;
}

export interface CarouselCoverflowEffect {
  rotate: number;
  stretch: number;
  depth: number;
  modifier: number;
  scale: number;
  slideShadows: boolean;
}

export interface CarouselCubeEffect {
  shadow: boolean;
  slideShadows: boolean;
  shadowOffset: number;
  shadowScale: number;
}

export interface CarouselCardsEffect {
  perSlideOffset: number;
  perSlideRotate: number;
  rotate: boolean;
  slideShadows: boolean;
}

// ── Main config ───────────────────────────────────────────────────────────────

export interface CarouselConfig {
  /** ID of the last applied preset — used for selection highlight in CarouselSettingsPanel */
  presetId?: string;

  // Parameters
  direction: "horizontal" | "vertical";
  slidesPerView: number;
  slidesPerGroup: number;
  rows: number;
  spaceBetween: number;
  centeredSlides: boolean;
  initialSlide: number;
  autoHeight: boolean;
  grabCursor: boolean;
  slideToClickedSlide: boolean;
  loopMode: "off" | "loop" | "rewind";
  aspectRatio: string;

  // Effect
  effect: "slide" | "fade" | "cube" | "flip" | "cards" | "coverflow" | "creative";
  fadeCrossFade: boolean;
  coverflowEffect: CarouselCoverflowEffect;
  cubeEffect: CarouselCubeEffect;
  cardsEffect: CarouselCardsEffect;
  flipSlideShadows: boolean;

  // Navigation, Pagination, Autoplay
  navigation: CarouselNavConfig;
  pagination: CarouselPaginationConfig;
  autoplay: CarouselAutoplayConfig;

  // Modules
  scrollbar: boolean;
  scrollbarDraggable: boolean;
  freeMode: boolean;
  freeModeSticky: boolean;
  keyboard: boolean;
  mousewheel: boolean;
  parallax: boolean;
  lazyLoad: boolean;
  accessibility: boolean;
  zoom: boolean;
  zoomMax: number;
  virtualSlides: boolean;
  hashNavigation: boolean;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_CAROUSEL_CONFIG: CarouselConfig = {
  direction: "horizontal",
  slidesPerView: 1,
  slidesPerGroup: 1,
  rows: 1,
  spaceBetween: 0,
  centeredSlides: false,
  initialSlide: 0,
  autoHeight: false,
  grabCursor: true,
  slideToClickedSlide: false,
  loopMode: "loop",
  aspectRatio: "16/9",

  effect: "slide",
  fadeCrossFade: true,
  coverflowEffect: { rotate: 50, stretch: 0, depth: 100, modifier: 1, scale: 1, slideShadows: true },
  cubeEffect: { shadow: true, slideShadows: true, shadowOffset: 20, shadowScale: 0.94 },
  cardsEffect: { perSlideOffset: 8, perSlideRotate: 2, rotate: true, slideShadows: true },
  flipSlideShadows: true,

  navigation: {
    enabled: true,
    iconStyle: "chevron",
    color: "#ffffff",
    placement: "inside",
    position: "center",
    size: 44,
    offset: 4,
    hideOnClick: false,
  },
  pagination: {
    enabled: true,
    type: "bullets",
    color: "#ffffff",
    placement: "inside",
    position: "center",
    offset: 8,
    hideOnClick: false,
    bulletSize: 8,
    bulletGap: 8,
    dynamicBullets: false,
    clickable: true,
    progressbarSize: 4,
  },
  autoplay: {
    enabled: false,
    delay: 3000,
    stopOnInteraction: true,
    pauseOnMouseEnter: false,
    reverseDirection: false,
    disableOnInteraction: false,
  },

  scrollbar: false,
  scrollbarDraggable: true,
  freeMode: false,
  freeModeSticky: false,
  keyboard: false,
  mousewheel: false,
  parallax: false,
  lazyLoad: true,
  accessibility: true,
  zoom: false,
  zoomMax: 3,
  virtualSlides: false,
  hashNavigation: false,
};

// ── Presets ───────────────────────────────────────────────────────────────────

export interface CarouselPreset {
  id: string;
  label: string;
  description: string;
  config: Partial<CarouselConfig>;
}

export const CAROUSEL_PRESETS: CarouselPreset[] = [
  {
    id: "basic",
    label: "Basic Slider",
    description: "1 slide, arrows + bullets",
    config: { effect: "slide", slidesPerView: 1, spaceBetween: 0 },
  },
  {
    id: "fade",
    label: "Fade",
    description: "Smooth crossfade transition",
    config: { effect: "fade", fadeCrossFade: true },
  },
  {
    id: "peek",
    label: "Peek",
    description: "Shows edge of adjacent slides",
    config: { effect: "slide", slidesPerView: 1.15, centeredSlides: true, spaceBetween: 16 },
  },
  {
    id: "multi",
    label: "Multi-Slide",
    description: "2–3 slides visible at once",
    config: { effect: "slide", slidesPerView: 2.5, spaceBetween: 16, centeredSlides: true },
  },
  {
    id: "cards",
    label: "Cards",
    description: "Stacked card effect",
    config: { effect: "cards", centeredSlides: true },
  },
  {
    id: "coverflow",
    label: "Coverflow",
    description: "iTunes-style 3D flow",
    config: {
      effect: "coverflow",
      centeredSlides: true,
      slidesPerView: 3,
      spaceBetween: 0,
      coverflowEffect: { rotate: 50, stretch: 0, depth: 100, modifier: 1, scale: 1, slideShadows: true },
    },
  },
  {
    id: "cube",
    label: "Cube",
    description: "Rotating cube transitions",
    config: { effect: "cube", cubeEffect: { shadow: true, slideShadows: true, shadowOffset: 20, shadowScale: 0.94 } },
  },
  {
    id: "flip",
    label: "Flip",
    description: "Card flip transition",
    config: { effect: "flip", flipSlideShadows: true },
  },
  {
    id: "autoplay",
    label: "Autoplay",
    description: "Auto-advances on a timer",
    config: {
      effect: "slide",
      autoplay: { enabled: true, delay: 3000, stopOnInteraction: true, pauseOnMouseEnter: true, reverseDirection: false, disableOnInteraction: false },
    },
  },
  {
    id: "grid",
    label: "Grid Rows",
    description: "2 rows of slides at once",
    config: { effect: "slide", rows: 2, slidesPerView: 2, spaceBetween: 12 },
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────

export function mergeCarouselConfig(base: CarouselConfig, partial: Partial<CarouselConfig>): CarouselConfig {
  return {
    ...base,
    ...partial,
    navigation: partial.navigation ? { ...base.navigation, ...partial.navigation } : base.navigation,
    pagination: partial.pagination ? { ...base.pagination, ...partial.pagination } : base.pagination,
    autoplay: partial.autoplay ? { ...base.autoplay, ...partial.autoplay } : base.autoplay,
    coverflowEffect: partial.coverflowEffect ? { ...base.coverflowEffect, ...partial.coverflowEffect } : base.coverflowEffect,
    cubeEffect: partial.cubeEffect ? { ...base.cubeEffect, ...partial.cubeEffect } : base.cubeEffect,
    cardsEffect: partial.cardsEffect ? { ...base.cardsEffect, ...partial.cardsEffect } : base.cardsEffect,
  };
}

export function normalizeCarouselConfig(raw: unknown): CarouselConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_CAROUSEL_CONFIG;
  return mergeCarouselConfig(DEFAULT_CAROUSEL_CONFIG, raw as Partial<CarouselConfig>);
}
