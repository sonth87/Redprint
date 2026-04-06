import React, { useMemo } from "react";
import { GripHorizontal } from "lucide-react";
import { cn } from "@ui-builder/ui";
import type { PaletteItem } from "@ui-builder/builder-core";
import { useTranslation } from "react-i18next";

// ── Simple-type live preview ───────────────────────────────────────────────

const SIMPLE_PREVIEW_TYPES = new Set(["Text", "Button", "Divider", "Shape", "Anchor"]);

interface MiniPreviewProps {
  item: PaletteItem;
}

const MiniPreview: React.FC<MiniPreviewProps> = ({ item }) => {
  const type = item.componentType;

  if (type === "Text") {
    const text = String(item.props?.text ?? item.name).replace(/<[^>]+>/g, "");
    const fontSize = item.style?.fontSize as string | undefined;
    const fw = item.style?.fontWeight as string | number | undefined;
    return (
      <div
        className="flex items-center justify-center w-full h-full p-1 overflow-hidden"
        style={{ transform: "scale(0.55)", transformOrigin: "center center" }}
      >
        <span
          style={{ fontSize: fontSize ?? "18px", fontWeight: fw ?? 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}
          className="text-foreground"
        >
          {text.length > 20 ? text.slice(0, 20) + "…" : text}
        </span>
      </div>
    );
  }

  if (type === "Button") {
    const label = String(item.props?.label ?? item.name).replace(/<[^>]+>/g, "");
    const bg = item.style?.backgroundColor as string | undefined;
    const color = item.style?.color as string | undefined;
    const radius = item.style?.borderRadius as string | undefined;
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div
          style={{
            background: bg ?? "#111827",
            color: color ?? "#fff",
            borderRadius: radius ?? "4px",
            padding: "4px 10px",
            fontSize: "11px",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {label.length > 14 ? label.slice(0, 14) + "…" : label}
        </div>
      </div>
    );
  }

  if (type === "Divider") {
    const color = item.props?.color as string | undefined;
    const thickness = Number(item.props?.thickness ?? 1);
    const orientation = item.props?.orientation as string | undefined;
    return (
      <div className="flex items-center justify-center w-full h-full">
        {orientation === "vertical" ? (
          <div style={{ width: thickness, height: 40, backgroundColor: color ?? "#e5e7eb" }} />
        ) : (
          <div style={{ width: "70%", height: thickness, backgroundColor: color ?? "#e5e7eb" }} />
        )}
      </div>
    );
  }

  if (type === "Shape") {
    const fill = item.props?.fill as string | undefined;
    const shape = item.props?.shape as string | undefined;
    return (
      <div className="flex items-center justify-center w-full h-full">
        <svg viewBox="0 0 40 40" width="40" height="40">
          {shape === "circle" ? (
            <circle cx="20" cy="20" r="16" fill={fill ?? "#111827"} />
          ) : shape === "triangle" ? (
            <polygon points="20,5 38,36 2,36" fill={fill ?? "#f59e0b"} />
          ) : (
            <rect x="4" y="10" width="32" height="20" rx="2" fill={fill ?? "#111827"} />
          )}
        </svg>
      </div>
    );
  }

  // Anchor or fallback
  return (
    <div className="flex items-center justify-center w-full h-full text-muted-foreground/40">
      <GripHorizontal className="w-6 h-6" />
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────

export interface PaletteItemCardProps {
  item: PaletteItem;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
  locale?: string;
  /** Controls card orientation. "grid" = vertical card (default); "list" = horizontal row; "preview" = visual-only full-width card. */
  layout?: "grid" | "list" | "preview";
}

// ── Component ─────────────────────────────────────────────────────────────

export const PaletteItemCard: React.FC<PaletteItemCardProps> = ({
  item,
  onDragStart,
  onClick,
  locale,
  layout = "grid",
}) => {
  const { i18n } = useTranslation();
  const lang = locale ?? i18n.language ?? "en";

  const displayName = useMemo(() => {
    if (item.i18n) {
      const override = (item.i18n as Record<string, { name?: string }>)[lang];
      if (override?.name) return override.name;
    }
    return item.name;
  }, [item, lang]);

  const showThumbnail = Boolean(item.thumbnail);
  const showLivePreview = !showThumbnail && SIMPLE_PREVIEW_TYPES.has(item.componentType);

  // ── Preview layout — visual-only, no label ───────────────────────────────
  if (layout === "preview") {
    const s = item.style ?? {};
    const rawLabel = String(item.props?.label ?? displayName).replace(/<[^>]+>/g, "");
    const label = rawLabel.length > 20 ? rawLabel.slice(0, 20) + "…" : rawLabel;
    const border =
      (s.border as string | undefined) ??
      ((s.borderColor as string | undefined)
        ? `${(s.borderWidth as string | undefined) ?? "1px"} ${(s.borderStyle as string | undefined) ?? "solid"} ${s.borderColor as string}`
        : undefined);
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={displayName}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
        }}
        className={cn(
          "min-h-12 flex items-center justify-center rounded-lg overflow-hidden cursor-grab active:cursor-grabbing",
          "border border-border/30 hover:scale-105 transition-all",
          "bg-white dark:bg-zinc-950",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none group",
        )}
        title={displayName}
      >
        {showThumbnail ? (
          <img src={item.thumbnail!} alt={displayName} className="max-h-full max-w-full object-contain" draggable={false} />
        ) : (
          <div
            style={{
              background: (s.backgroundColor as string | undefined) ?? "transparent",
              color: (s.color as string | undefined) ?? "#111827",
              borderRadius: (s.borderRadius as string | undefined) ?? "4px",
              border,
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: (s.fontWeight as string | number | undefined) ?? 500,
              letterSpacing: (s.letterSpacing as string | undefined),
              fontFamily: (s.fontFamily as string | undefined) ?? "inherit",
              textTransform: (s.textTransform as React.CSSProperties["textTransform"]),
              whiteSpace: "nowrap" as const,
              width: "100%",
              textAlign: "center" as const,
              boxSizing: "border-box" as const,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </div>
        )}
      </div>
    );
  }

  const sharedInteractionProps = {
    draggable: true,
    onDragStart,
    onClick,
    role: "button" as const,
    tabIndex: 0,
    "aria-label": displayName,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
  };

  const sharedClasses = cn(
    "border border-border/50 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing",
    "bg-muted/20 hover:bg-accent/50 hover:border-border transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "group select-none",
  );

  // ── List layout — Text variant: full-row styled text preview ─────────
  // For Text items the styled text IS the preview — no separate thumbnail box.
  if (layout === "list" && item.componentType === "Text") {
    const rawText = String(item.props?.text ?? displayName).replace(/<[^>]+>/g, "");
    const parsedPx = parseFloat((item.style?.fontSize as string | undefined) ?? "18");
    // Scale proportionally so large headings (48px+) still fit in the row
    const previewPx = Math.min(parsedPx * 0.55, 22);
    const fw = item.style?.fontWeight as string | number | undefined;
    const ff = item.style?.fontFamily as string | undefined;
    const color = item.style?.color as string | undefined;

    return (
      <div
        {...sharedInteractionProps}
        className={cn(sharedClasses, "px-3 py-2.5")}
      >
        <span
          style={{
            display: "block",
            fontSize: `${previewPx}px`,
            fontWeight: fw ?? 400,
            fontFamily: ff,
            color: color ?? undefined,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {rawText.length > 40 ? rawText.slice(0, 40) + "…" : rawText}
        </span>
      </div>
    );
  }

  // ── List layout — default: small preview thumbnail + label ─────────────
  if (layout === "list") {
    return (
      <div
        {...sharedInteractionProps}
        className={cn(sharedClasses, "flex flex-row items-center gap-2.5 px-2 py-1.5")}
      >
        {/* Small preview */}
        <div className="w-14 h-9 flex-shrink-0 rounded-md overflow-hidden bg-background/60 border border-border/30">
          {showThumbnail ? (
            <img
              src={item.thumbnail!}
              alt={displayName}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : showLivePreview ? (
            <MiniPreview item={item} />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground/30">
              <GripHorizontal className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground/80 group-hover:text-foreground truncate leading-tight">
            {displayName}
          </p>
          {item.description && (
            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5 leading-tight">
              {item.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Grid layout (vertical card, default) ──────────────────────────────
  return (
    <div
      {...sharedInteractionProps}
      className={cn(sharedClasses, "flex flex-col gap-1")}
    >
      {/* Preview area */}
      <div className="relative h-16 w-full overflow-hidden bg-background/60 border-b border-border/30">
        {showThumbnail ? (
          <img
            src={item.thumbnail!}
            alt={displayName}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : showLivePreview ? (
          <MiniPreview item={item} />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground/30">
            <GripHorizontal className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Label */}
      <div className="px-2 pb-2">
        <p className="text-[11px] font-medium text-foreground/80 group-hover:text-foreground truncate leading-tight">
          {displayName}
        </p>
      </div>
    </div>
  );
};
