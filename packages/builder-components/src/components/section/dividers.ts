import type React from "react";
import { buildDecorativeMaskSvgUri, isDecorativeDividerType } from "./decorative-dividers";

export const DIVIDER_OPTIONS = [
  { value: "none", label: "None" },
  { value: "wave", label: "Wave" },
  { value: "wave2", label: "Wave 2" },
  { value: "arc", label: "Arc" },
  { value: "peak", label: "Peak" },
  { value: "scallop", label: "Scallop" },
  { value: "blocks", label: "Blocks" },
  { value: "slant", label: "Slant" },
  { value: "curve", label: "Curve" },
  { value: "zigzag", label: "Zigzag" },
  { value: "halftone", label: "Halftone" },
  { value: "radial-dots", label: "Dot Grid" },
  { value: "brush", label: "Brush" },
  { value: "fade", label: "Fade" },
];

interface DividerArgs {
  clipId: string;
  height: number;
  topType: string;
  topHeight: number;
  topFlip: boolean;
  bottomType: string;
  bottomHeight: number;
  bottomFlip: boolean;
}

export interface DividerRenderState {
  clipPathData: string | null;
  surfaceStyle: React.CSSProperties;
  padTop: number;
  padBottom: number;
  marginTop?: string;
  marginBottom?: string;
  zIndex?: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function cubicAt(a: number, b: number, c: number, d: number, t: number): number {
  const mt = 1 - t;
  return mt ** 3 * a + 3 * mt ** 2 * t * b + 3 * mt * t ** 2 * c + t ** 3 * d;
}

function quadAt(a: number, b: number, c: number, t: number): number {
  const mt = 1 - t;
  return mt ** 2 * a + 2 * mt * t * b + t ** 2 * c;
}

function invertIfNeeded(value: number, flip: boolean): number {
  return flip ? 1 - value : value;
}

function getBoundaryY(type: string, flip: boolean, t: number): number {
  let value = 0;

  switch (type) {
    case "wave":
      value = cubicAt(0.5, flip ? 1 : 0, flip ? 0 : 1, 0.5, t);
      break;
    case "wave2":
      if (t <= 0.5) {
        const localT = t / 0.5;
        value = cubicAt(1 / 3, flip ? 1 : 1 / 3, flip ? 1 / 3 : 1, 2 / 3, localT);
      } else {
        const localT = (t - 0.5) / 0.5;
        value = cubicAt(2 / 3, flip ? 1 : 1 / 3, flip ? 1 / 3 : 1, 1 / 3, localT);
      }
      break;
    case "arc":
      value = invertIfNeeded(quadAt(1, 0.12, 1, t), flip);
      break;
    case "peak":
      value = invertIfNeeded(Math.abs(2 * t - 1), flip);
      break;
    case "scallop": {
      const lobes = 6;
      const localT = (t * lobes) % 1;
      value = invertIfNeeded(1 - Math.sin(localT * Math.PI), flip);
      break;
    }
    case "blocks": {
      const blocks = 12;
      const raw = Math.floor(t * blocks) % 2 === 0 ? 0.18 : 0.82;
      value = invertIfNeeded(raw, flip);
      break;
    }
    case "slant":
      value = flip ? t : 1 - t;
      break;
    case "curve":
      value = flip ? quadAt(0.5, 1.5, 0.5, t) : quadAt(1, 0, 1, t);
      break;
    case "zigzag": {
      const steps = 12;
      const scaled = Math.min(t * steps, steps);
      const idx = Math.min(Math.floor(scaled), steps - 1);
      const localT = scaled - idx;
      const y0 = flip ? (idx % 2 === 0 ? 1 : 0) : (idx % 2 === 0 ? 0 : 1);
      const y1 = flip ? ((idx + 1) % 2 === 0 ? 1 : 0) : ((idx + 1) % 2 === 0 ? 0 : 1);
      value = y0 + (y1 - y0) * localT;
      break;
    }
    default:
      value = 0;
      break;
  }

  return clamp01(value);
}

function buildShapePathData(type: string, flip: boolean): string | null {
  if (type === "none" || type === "fade" || isDecorativeDividerType(type)) return null;

  const sampleCount = 48;
  const points = ["M0,0", "L1200,0"];
  for (let i = sampleCount; i >= 0; i--) {
    const t = i / sampleCount;
    const x = t * 1200;
    const y = getBoundaryY(type, flip, t) * 60;
    points.push(`L${x},${y}`);
  }
  points.push("Z");
  return points.join(" ");
}

function makeMaskSvgUri(type: string, position: "top" | "bottom", flip: boolean): string | null {
  const decorative = buildDecorativeMaskSvgUri(type, position);
  if (decorative) return decorative;

  const pathData = buildShapePathData(type, flip);
  if (!pathData) return null;

  const inner = position === "top"
    ? `<g transform="scale(1,-1) translate(0,-60)"><path d="${pathData}" fill="white"/></g>`
    : `<path d="${pathData}" fill="white"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 60" preserveAspectRatio="none">${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function buildClipPathData(args: DividerArgs): string | null {
  const { height, topType, topHeight, topFlip, bottomType, bottomHeight, bottomFlip } = args;
  const hasTop = topType !== "none";
  const hasBottom = bottomType !== "none";

  if (!hasTop && !hasBottom) return null;
  if (height <= 0) return null;

  const topRatio = clamp01(topHeight / height);
  const bottomRatio = clamp01(bottomHeight / height);
  const sampleCount = 48;
  const points: string[] = [];

  if (hasTop && topType !== "fade") {
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const y = topRatio * (1 - getBoundaryY(topType, topFlip, t));
      points.push(`${t} ${y}`);
    }
  } else {
    points.push("0 0", "1 0");
  }

  if (hasBottom && bottomType !== "fade") {
    for (let i = sampleCount; i >= 0; i--) {
      const t = i / sampleCount;
      const y = 1 - bottomRatio + bottomRatio * getBoundaryY(bottomType, bottomFlip, t);
      points.push(`${t} ${y}`);
    }
  } else {
    points.push("1 1", "0 1");
  }

  return `M ${points.join(" L ")} Z`;
}

function buildFadeMaskStyle(args: DividerArgs): React.CSSProperties {
  const { topType, topHeight, topFlip, bottomType, bottomHeight, bottomFlip } = args;
  const hasTop = topType !== "none";
  const hasBottom = bottomType !== "none";
  const fadeOnly =
    (topType === "none" || topType === "fade") &&
    (bottomType === "none" || bottomType === "fade") &&
    (topType === "fade" || bottomType === "fade");

  if (fadeOnly) {
    const stops: string[] = [];
    if (topType === "fade") {
      stops.push("transparent 0px", `black ${topHeight}px`);
    } else {
      stops.push("black 0px");
    }

    if (bottomType === "fade") {
      stops.push(`black calc(100% - ${bottomHeight}px)`, "transparent 100%");
    } else {
      stops.push("black 100%");
    }

    const gradient = `linear-gradient(to bottom, ${stops.join(", ")})`;
    return {
      maskImage: gradient,
      WebkitMaskImage: gradient,
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
      maskSize: "100% 100%",
      WebkitMaskSize: "100% 100%",
    };
  }

  const images: string[] = [];
  const sizes: string[] = [];
  const positions: string[] = [];
  const composites: string[] = [];
  const webkitComposites: string[] = [];

  const safeTop = hasTop ? topHeight : 0;
  const safeBottom = hasBottom ? bottomHeight : 0;
  images.push("linear-gradient(black, black)");
  sizes.push(`100% calc(100% - ${safeTop}px - ${safeBottom}px)`);
  positions.push(`0 ${safeTop}px`);
  composites.push("add");
  webkitComposites.push("source-over");

  if (hasBottom) {
    images.push(
      bottomType === "fade"
        ? "linear-gradient(to top, transparent, black)"
        : (makeMaskSvgUri(bottomType, "bottom", bottomFlip) ?? "linear-gradient(black,black)")
    );
    sizes.push(`100% ${bottomHeight}px`);
    positions.push(`0 calc(100% - ${bottomHeight}px)`);
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

  return {
    maskImage: images.join(", "),
    WebkitMaskImage: images.join(", "),
    maskSize: sizes.join(", "),
    WebkitMaskSize: sizes.join(", "),
    maskPosition: positions.join(", "),
    WebkitMaskPosition: positions.join(", "),
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskComposite: composites.join(", "),
    WebkitMaskComposite: webkitComposites.join(", "),
  };
}

export function buildDividerRenderState(args: DividerArgs): DividerRenderState {
  const { clipId, topType, topHeight, bottomType, bottomHeight } = args;
  const hasTop = topType !== "none";
  const hasBottom = bottomType !== "none";
  const usesDecorativeTop = isDecorativeDividerType(topType);
  const usesDecorativeBottom = isDecorativeDividerType(bottomType);
  const shapeOnly =
    (hasTop || hasBottom) &&
    topType !== "fade" &&
    bottomType !== "fade" &&
    !usesDecorativeTop &&
    !usesDecorativeBottom;
  const clipPathData = shapeOnly ? buildClipPathData(args) : null;
  const usesMaskPipeline =
    topType === "fade" ||
    bottomType === "fade" ||
    usesDecorativeTop ||
    usesDecorativeBottom;

  const surfaceStyle: React.CSSProperties = clipPathData
    ? { clipPath: `url(#${clipId})`, WebkitClipPath: `url(#${clipId})` }
    : usesMaskPipeline
      ? buildFadeMaskStyle(args)
      : {};

  return {
    clipPathData,
    surfaceStyle,
    padTop: hasTop ? topHeight : 0,
    padBottom: hasBottom ? bottomHeight : 0,
    marginTop: hasTop ? `-${topHeight}px` : undefined,
    marginBottom: hasBottom ? `-${bottomHeight}px` : undefined,
    zIndex: hasTop ? 2 : hasBottom ? 1 : undefined,
  };
}
