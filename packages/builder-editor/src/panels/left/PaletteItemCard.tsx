import React, { useMemo, useState } from "react";
import { GripHorizontal } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@ui-builder/ui";
import type { PaletteItem } from "@ui-builder/builder-core";
import { useTranslation } from "react-i18next";

// ── Helper to dynamically load lucide icons ─────────────────────────────────

function getLucideIcon(name: string): React.ElementType {
  const pascal = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return (LucideIcons as Record<string, unknown>)[pascal] as React.ElementType ?? LucideIcons.GripHorizontal;
}

// ── Simple-type live preview ───────────────────────────────────────────────

const SIMPLE_PREVIEW_TYPES = new Set([
  "Text",
  "TextMarquee",
  "TextMask",
  "CollapsibleText",
  "Button",
  "Divider",
  "Shape",
  "Anchor",
  "Image",
  "Container",
  "GalleryGrid",
  "GallerySlider",
  "GalleryPro",
  "Section",
]);

interface MiniPreviewProps {
  item: PaletteItem;
}

const MiniPreview: React.FC<MiniPreviewProps> = ({ item }) => {
  const [hovered, setHovered] = useState(false);
  const type = item.componentType;
  const s = item.style ?? {};
  const p = item.props ?? {};

  // Text-based components
  if (type === "Text" || type === "TextMarquee" || type === "TextMask" || type === "CollapsibleText") {
    const rawText = String(p.text ?? item.name).replace(/<[^>]+>/g, "");
    const text = rawText.length > 25 ? rawText.slice(0, 25) + "…" : rawText;
    const fontSize = s.fontSize as string | undefined;
    const fw = s.fontWeight as string | number | undefined;
    const color = s.color as string | undefined;
    const ff = s.fontFamily as string | undefined;

    return (
      <div
        className={cn(
          "flex items-center justify-center w-full h-full p-2 overflow-hidden",
          type === "TextMarquee" && "relative after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-transparent after:to-background/20",
        )}
      >
        <span
          style={{
            fontSize: fontSize ?? "18px",
            fontWeight: fw ?? (type === "CollapsibleText" ? 500 : 400),
            fontFamily: ff,
            color: color ?? "inherit",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
            transform: "scale(0.7)",
            transformOrigin: "center center",
            textDecoration: type === "CollapsibleText" ? "underline" : undefined,
            textDecorationColor: type === "CollapsibleText" ? "rgba(0,0,0,0.2)" : undefined,
            ...(type === "TextMask" ? {
              backgroundImage: (p.gradient as string) ?? "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            } : {}),
          }}
        >
          {text}
        </span>
      </div>
    );
  }

  if (type === "Button") {
    const label = String(p.label ?? item.name).replace(/<[^>]+>/g, "");
    const iconName = (p.icon as string | undefined) || (item.icon as string | undefined);
    const iconPosition = p.iconPosition === "end" ? "end" : "start";
    const showOnlyIcon = Boolean(iconName && !label.trim());
    const hoverStyle = (p.hoverStyle as React.CSSProperties | undefined) ?? {};
    const mergedStyle = {
      ...(s as React.CSSProperties),
      ...(hovered ? hoverStyle : {}),
    } satisfies React.CSSProperties;
    const parsedFontSize =
      typeof mergedStyle.fontSize === "string"
        ? parseFloat(mergedStyle.fontSize)
        : Number(mergedStyle.fontSize ?? 14);
    const previewFontSize = Number.isFinite(parsedFontSize) ? `${Math.max(12, Math.min(parsedFontSize, 16))}px` : "14px";
    const iconSize = showOnlyIcon ? 18 : 16;
    const previewButtonStyle: React.CSSProperties = {
      ...mergedStyle,
      background: mergedStyle.background ?? mergedStyle.backgroundColor ?? "#111827",
      color: mergedStyle.color ?? "#fff",
      borderRadius: mergedStyle.borderRadius ?? "4px",
      padding: showOnlyIcon ? (mergedStyle.padding ?? "0") : (mergedStyle.padding ?? "8px 16px"),
      fontSize: previewFontSize,
      fontWeight: mergedStyle.fontWeight ?? 600,
      fontStyle: mergedStyle.fontStyle,
      textTransform: mergedStyle.textTransform,
      letterSpacing: mergedStyle.letterSpacing,
      lineHeight: 1,
      whiteSpace: "nowrap",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: showOnlyIcon ? 0 : "6px",
      width: mergedStyle.width ?? undefined,
      height: mergedStyle.height ?? undefined,
      minWidth: showOnlyIcon ? (mergedStyle.width ?? "40px") : undefined,
      minHeight: showOnlyIcon ? (mergedStyle.height ?? "40px") : undefined,
      maxWidth: "100%",
      overflow: "visible",
      transition: "all 150ms ease",
    };

    if (mergedStyle.border) {
      previewButtonStyle.border = mergedStyle.border;
    }

    if (mergedStyle.borderBottom) {
      previewButtonStyle.borderBottom = mergedStyle.borderBottom;
    }

    return (
      <div
        className="flex items-center justify-center w-full h-full"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={previewButtonStyle}>
          {iconName && iconPosition === "start" && (() => {
            const Icon = getLucideIcon(iconName);
            return <Icon size={iconSize} />;
          })()}
          {!showOnlyIcon && (
            <span>
              {label.length > 16 ? label.slice(0, 16) + "…" : label}
            </span>
          )}
          {iconName && iconPosition === "end" && !showOnlyIcon && (() => {
            const Icon = getLucideIcon(iconName);
            return <Icon size={iconSize} />;
          })()}
        </div>
      </div>
    );
  }

  if (type === "Image") {
    const src = (p.src as string) || (item.thumbnail as string);
    if (src) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted/30">
          <img src={src} alt="" className="max-w-full max-h-full object-cover" draggable={false} />
        </div>
      );
    }
  }

  if (type === "Container" || type === "Section") {
    const bg = (s.background as string) || (s.backgroundColor as string);
    const border = s.border || (s.borderWidth ? `${s.borderWidth} ${s.borderStyle || "solid"} ${s.borderColor || "transparent"}` : undefined);
    return (
      <div className="flex items-center justify-center w-full h-full p-2">
        <div
          className={cn(
            "w-full h-full flex flex-col items-center justify-center gap-1 border rounded",
            type === "Section" ? "border-solid border-muted-foreground/30 bg-muted/5" : "border-dashed border-muted-foreground/20"
          )}
          style={{
            background: bg ?? "transparent",
            border: (border as string) ?? undefined,
            borderRadius: s.borderRadius as string ?? "4px",
            backdropFilter: (s.backdropFilter as string) ?? undefined,
          }}
        >
          <div className="w-4 h-0.5 bg-muted-foreground/20 rounded-full" />
          <div className="w-6 h-0.5 bg-muted-foreground/10 rounded-full" />
        </div>
      </div>
    );
  }

  if (type === "GalleryGrid") {
    const cols = Number(p.columns ?? 3);
    const gap = Number(p.gap ?? 8);
    return (
      <div
        className="flex items-center justify-center w-full h-full p-2"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(cols, 3)}, 1fr)`,
          gap: `${gap / 2}px`,
        }}
      >
        {Array.from({ length: Math.min(cols * 2, 6) }, (_, i) => (
          <div key={i} style={{ background: "#d1d5db", borderRadius: 2, aspectRatio: "1/1" }} />
        ))}
      </div>
    );
  }

  if (type === "GallerySlider" || type === "GalleryPro") {
    return (
      <div className="flex items-center justify-center w-full h-full p-2 bg-gradient-to-br from-muted to-muted-foreground/10 rounded">
        <div style={{ fontSize: 12, fontWeight: 500, color: "#6b7280", textAlign: "center" }}>
          {type === "GallerySlider" ? "🎬 Slider" : "🎨 Pro"}
        </div>
      </div>
    );
  }

  if (type === "Divider") {
    const color = p.color as string | undefined;
    const thickness = Math.min(Number(p.thickness ?? 1), 4);
    const orientation = p.orientation as string | undefined;
    return (
      <div className="flex items-center justify-center w-full h-full">
        {orientation === "vertical" ? (
          <div style={{ width: thickness, height: 40, backgroundColor: color ?? "#e5e7eb", borderRadius: "full" }} />
        ) : (
          <div style={{ width: "70%", height: thickness, backgroundColor: color ?? "#e5e7eb", borderRadius: "full" }} />
        )}
      </div>
    );
  }

  if (type === "Shape") {
    const fill = p.fill as string | undefined;
    const shape = p.shape as string | undefined;
    return (
      <div className="flex items-center justify-center w-full h-full p-2">
        <svg viewBox="0 0 40 40" width="32" height="32" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.1))" }}>
          {shape === "circle" ? (
            <circle cx="20" cy="20" r="16" fill={fill ?? "#111827"} />
          ) : shape === "triangle" ? (
            <polygon points="20,5 36,34 4,34" fill={fill ?? "#f59e0b"} />
          ) : shape === "star" ? (
            <path d="M20,2 25,14 38,14 28,22 32,35 20,28 8,35 12,22 2,14 15,14 Z" fill={fill ?? "#f59e0b"} />
          ) : shape === "heart" ? (
            <path d="M20,36 C20,36 4,24 4,14 C4,8 9,4 14,4 C17,4 19,6 20,8 C21,6 23,4 26,4 C31,4 36,8 36,14 C36,24 20,36 20,36 Z" fill={fill ?? "#ef4444"} />
          ) : shape === "hexagon" ? (
            <polygon points="20,2 38,11 38,29 20,38 2,29 2,11" fill={fill ?? "#10b981"} />
          ) : shape === "diamond" ? (
            <polygon points="20,4 36,20 20,36 4,20" fill={fill ?? "#3b82f6"} />
          ) : shape === "arrow-right" ? (
            <path d="M4,20 L36,20 M24,8 L36,20 L24,32" fill="none" stroke={fill ?? "#111827"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          ) : shape === "arrow-left" ? (
            <path d="M36,20 L4,20 M16,8 L4,20 L16,32" fill="none" stroke={fill ?? "#111827"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          ) : shape === "arrow-up" ? (
            <path d="M20,36 L20,4 M8,16 L20,4 L32,16" fill="none" stroke={fill ?? "#111827"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          ) : shape === "arrow-down" ? (
            <path d="M20,4 L20,36 M8,24 L20,36 L32,24" fill="none" stroke={fill ?? "#111827"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <rect x="4" y="8" width="32" height="24" rx="3" fill={fill ?? "#111827"} />
          )}
        </svg>
      </div>
    );
  }

  // Fallback icon
  return (
    <div className="flex items-center justify-center w-full h-full text-muted-foreground/30">
      <GripHorizontal className="w-5 h-5" />
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

  const effectiveThumbnail = item.thumbnail || (item.componentType === "Image" ? item.props?.src as string : undefined);
  const showThumbnail = Boolean(effectiveThumbnail);
  const showLivePreview = !showThumbnail && SIMPLE_PREVIEW_TYPES.has(item.componentType);

  // ── Preview layout — visual-only, no label ───────────────────────────────
  if (layout === "preview") {
    const s = item.style ?? {};
    const rawLabel = String(item.props?.label ?? displayName).replace(/<[^>]+>/g, "");
    const label = rawLabel.length > 40 ? rawLabel.slice(0, 40) + "…" : rawLabel;
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
          "min-h-16 flex items-center justify-center rounded-lg overflow-hidden cursor-grab active:cursor-grabbing",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none group",
          // !showThumbnail && "border border-border/40 bg-muted/10"
        )}
        title={displayName}
      >
        {showThumbnail ? (
          <img src={effectiveThumbnail!} alt={displayName} className="max-h-full max-w-full object-contain" draggable={false} />
        ) : SIMPLE_PREVIEW_TYPES.has(item.componentType) ? (
          item.componentType === "Text" ? (
            <div
              className="w-full flex items-center justify-center"
              style={{
                background: (s.backgroundColor as string | undefined) ?? (s.background as string | undefined) ?? "transparent",
                color: (s.color as string | undefined) ?? "#111827",
                borderRadius: (s.borderRadius as string | undefined) ?? "4px",
                border,
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: (s.fontWeight as string | number | undefined) ?? 500,
                fontFamily: s.fontFamily as string | undefined,
                fontStyle: (s as Record<string, unknown>).fontStyle as string | undefined,
                textTransform: s.textTransform as React.CSSProperties["textTransform"],
                letterSpacing: s.letterSpacing as string | undefined,
                textAlign: "center",
                width: "100%",
                boxShadow: s.boxShadow as string,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </div>
          ) : (
            <div className="w-full h-[72px]">
              <MiniPreview item={item} />
            </div>
          )
        ) : (
          <div className="flex items-center justify-center w-full h-12 text-muted-foreground/30">
            <GripHorizontal className="w-5 h-5" />
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
    "border border-border/0 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing",
    "bg-muted/20 hover:bg-accent/50 transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "group select-none",
  );

  // ── List layout — Text variant: full-row styled text preview ─────────
  // For Text-like items the styled text IS the preview — no separate thumbnail box.
  const isTextType = ["Text", "TextMarquee", "TextMask", "CollapsibleText"].includes(item.componentType);
  if (layout === "list" && isTextType) {
    const rawText = String(item.props?.text ?? displayName).replace(/<[^>]+>/g, "");
    const parsedPx = parseFloat((item.style?.fontSize as string | undefined) ?? "18");
    // Better scale: keep hierarchy but cap at 28px for headings, 14px min
    const previewPx = Math.max(14, Math.min(parsedPx * 0.65, 28));
    const fw = item.style?.fontWeight as string | number | undefined;
    const ff = item.style?.fontFamily as string | undefined;
    const color = item.style?.color as string | undefined;
    const fs = (item.style as Record<string, unknown> | undefined)?.fontStyle as string | undefined;

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
            fontStyle: fs,
            color: color ?? undefined,
            lineHeight: 1.2,
            whiteSpace: "normal",
            overflow: "visible",
            wordBreak: "break-word",
            ...(item.componentType === "TextMask" ? {
              backgroundImage: (item.props?.gradient as string) ?? "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              width: "fit-content"
            } : {}),
            ...(item.componentType === "CollapsibleText" ? { textDecoration: "underline", textDecorationColor: "rgba(0,0,0,0.2)" } : {})
          }}
        >
          {rawText}
          {item.componentType === "TextMarquee"}
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
              src={effectiveThumbnail!}
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
          <p className="text-xs font-medium text-foreground/80 group-hover:text-foreground line-clamp-2 whitespace-normal break-words leading-tight">
            {displayName}
          </p>
          {item.description && (
            <p className="text-[10px] text-muted-foreground/60 line-clamp-2 whitespace-normal break-words mt-0.5 leading-tight">
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
      <div className="relative h-16 w-full overflow-hidden">
        {showThumbnail ? (
          <img
            src={effectiveThumbnail!}
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
      <div className="px-2 pb-2 text-center">
        <p className="text-[11px] font-medium text-foreground/80 group-hover:text-foreground line-clamp-2 whitespace-normal break-words leading-tight">
          {displayName}
        </p>
      </div>
    </div>
  );
};
