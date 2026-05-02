export interface GalleryProps {
  gap: number;
  columns: number;
  aspectRatio: string;
  showArrows: boolean;
  showDots: boolean;
  autoPlay: boolean;
  autoPlaySpeed: number;
  loop: boolean;
  imageFit: "cover" | "contain" | "fill";
  borderRadius: number;
}

export function extractProps(props: Record<string, unknown>): GalleryProps {
  return {
    gap: Number(props["gap"] ?? 12),
    columns: Math.max(1, Math.min(6, Number(props["columns"] ?? 3))),
    aspectRatio: String(props["aspectRatio"] ?? "1/1"),
    showArrows: props["showArrows"] !== false,
    showDots: props["showDots"] !== false,
    autoPlay: Boolean(props["autoPlay"]),
    autoPlaySpeed: Number(props["autoPlaySpeed"] ?? 3000),
    loop: props["loop"] !== false,
    imageFit: (props["imageFit"] as GalleryProps["imageFit"]) ?? "cover",
    borderRadius: Number(props["borderRadius"] ?? 4),
  };
}
