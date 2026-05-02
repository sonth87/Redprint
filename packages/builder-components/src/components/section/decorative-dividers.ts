const DECORATIVE_TYPES = new Set(["halftone", "radial-dots", "brush"]);

function createSvgUri(inner: string, position: "top" | "bottom"): string {
  const oriented = position === "top"
    ? `<g transform="scale(1,-1) translate(0,-60)">${inner}</g>`
    : inner;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 60" preserveAspectRatio="none">${oriented}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function buildHalftoneSvg(): string {
  const dots: string[] = [];
  const cols = 54;
  const rows = 10;
  for (let row = 0; row < rows; row++) {
    const rowT = row / (rows - 1);
    const y = 18 + row * 4.1;
    const maxRadius = 4.8 - rowT * 2.4;
    const minRadius = 1.1 - rowT * 0.4;
    for (let col = 0; col <= cols; col++) {
      const colT = col / cols;
      const x = colT * 1200;
      const wave = (Math.sin(colT * Math.PI * 3) + 1) * 0.08;
      const radius = Math.max(0.35, minRadius + (1 - colT * 0.18) * (maxRadius - minRadius) + wave);
      dots.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="white"/>`);
    }
  }

  return [
    `<rect x="0" y="0" width="1200" height="22" fill="white"/>`,
    dots.join(""),
  ].join("");
}

function buildDotGridSvg(): string {
  const dots: string[] = [];
  const cols = 64;
  const rows = 14;
  for (let row = 0; row < rows; row++) {
    const rowT = row / (rows - 1);
    const y = 4 + row * 4;
    for (let col = 0; col <= cols; col++) {
      const colT = col / cols;
      const x = colT * 1200;
      const strength = Math.max(0, 1 - colT * 0.92 - rowT * 0.72);
      const radius = Math.max(0.2, 0.3 + strength * 5.4);
      dots.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="white"/>`);
    }
  }

  return [
    `<rect x="0" y="0" width="1200" height="10" fill="white"/>`,
    dots.join(""),
  ].join("");
}

function buildBrushSvg(): string {
  const streaks: string[] = [];
  const points = [
    [20, 16], [74, 25], [116, 39], [162, 18], [212, 32], [256, 46], [302, 21],
    [346, 30], [392, 47], [438, 24], [484, 38], [532, 19], [584, 44], [628, 26],
    [676, 37], [726, 16], [774, 34], [824, 48], [872, 22], [924, 28], [974, 42],
    [1022, 18], [1076, 36], [1126, 26], [1176, 40],
  ] as const;

  for (const [x, y] of points) {
    streaks.push(`<rect x="${x}" y="${y}" width="18" height="${60 - y}" rx="7" fill="white" fill-opacity="0.86"/>`);
  }

  return [
    `<rect x="0" y="0" width="1200" height="18" fill="white"/>`,
    `<path d="M0,10 C84,12 142,31 220,22 C306,12 380,4 470,11 C578,20 646,40 730,36 C822,31 886,10 970,12 C1058,14 1128,30 1200,26 L1200,60 L0,60 Z" fill="white"/>`,
    `<path d="M0,22 C66,38 130,47 208,40 C292,32 370,18 454,22 C548,26 624,48 710,50 C804,52 882,22 966,18 C1056,14 1128,32 1200,42 L1200,60 L0,60 Z" fill="white" fill-opacity="0.68"/>`,
    streaks.join(""),
  ].join("");
}

export function isDecorativeDividerType(type: string): boolean {
  return DECORATIVE_TYPES.has(type);
}

export function buildDecorativeMaskSvgUri(type: string, position: "top" | "bottom"): string | null {
  if (!isDecorativeDividerType(type)) return null;

  switch (type) {
    case "halftone":
      return createSvgUri(buildHalftoneSvg(), position);
    case "radial-dots":
      return createSvgUri(buildDotGridSvg(), position);
    case "brush":
      return createSvgUri(buildBrushSvg(), position);
    default:
      return null;
  }
}
