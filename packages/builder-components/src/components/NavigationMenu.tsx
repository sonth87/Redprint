import React from "react";
import type { Breakpoint, BuilderNode, ComponentDefinition, StyleConfig } from "@ui-builder/builder-core";
import {
  findActiveMenuItem,
  flattenVisibleMenuItems,
  hasActiveDescendant,
  normalizeMenuItems,
  resolveMenuHref,
  type MenuAlignment,
  type MenuDropdownMode,
  type MenuDropdownWidthMode,
  type MenuHamburgerMode,
  type MenuItem,
  type MenuItemStyle,
  type MenuMobileBehavior,
  type MenuOrientation,
  type MenuOverflowMode,
  type MenuWidthMode,
} from "@ui-builder/shared";

type RenderMode = "editor" | "runtime";

interface MenuSettings {
  items: MenuItem[];
  orientation: MenuOrientation;
  mobileBehavior: MenuMobileBehavior;
  hamburgerMode: MenuHamburgerMode;
  dropdownMode: MenuDropdownMode;
  dropdownWidthMode: MenuDropdownWidthMode;
  dropdownColumns: number;
  dropdownAlignment: MenuAlignment;
  widthMode: MenuWidthMode;
  overflowMode: MenuOverflowMode;
  fillItems: boolean;
  alignment: MenuAlignment;
  itemStyle: MenuItemStyle;
  textColor: string;
  activeColor: string;
  activeBg: string;
  itemBg: string;
  navBg: string;
  navBorder: string;
  navBorderRadius: string;
  navPadding: string;
  fontSize: string;
  letterSpacing: string;
  itemGap: number;
  rowGap: number;
  dropdownGap: number;
  columnGap: number;
  dropdownMargin: number;
  dropdownPadding: number;
  dropdownRadius: number;
  dropdownMinWidth: number;
  dropdownShadow: "none" | "soft" | "deep";
  dropdownBg: string;
  dropdownBorderColor: string;
  dropdownItemHoverBg: string;
  dropdownOffsetX: number;
  dropdownOffsetY: number;
  activeMode: "auto" | "manual";
  activeItemId: string;
  activeIndex: number;
  floatingMode: "static" | "sticky" | "fixed";
}

const ITEM_STYLE_OPTIONS = [
  "plain",
  "underline",
  "underline-all",
  "boxed",
  "boxed-all",
  "pill",
  "pill-outlined",
  "pill-all",
  "filled",
  "button-all",
  "block-vertical",
  "serif-panel",
  "dark-panel",
  "pastel-panel",
  "icon-hamburger",
  "labeled-hamburger",
] as const;

const DEFAULT_ITEMS: MenuItem[] = [
  { id: "home", label: "Home", target: { type: "anchor", anchorId: "home", behavior: "smooth" } },
  { id: "about", label: "About", target: { type: "anchor", anchorId: "about", behavior: "smooth" } },
  {
    id: "services",
    label: "Services",
    target: { type: "anchor", anchorId: "services", behavior: "smooth" },
    children: [
      { id: "booking", label: "Book Online", target: { type: "page", path: "/booking" } },
    ],
  },
  { id: "contact", label: "Contact", target: { type: "anchor", anchorId: "contact", behavior: "smooth" } },
];

function asOption<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readSettings(node: BuilderNode): MenuSettings {
  const props = node.props;
  const legacyLayout = String(props.layout ?? "horizontal");
  const orientation = asOption(
    props.orientation ?? (legacyLayout === "vertical" ? "vertical" : "horizontal"),
    ["horizontal", "vertical"] as const,
    "horizontal",
  );
  const itemGap = asNumber(props.itemGap ?? props.gap, 24);
  const items = normalizeMenuItems(props.items);

  return {
    items: items.length > 0 ? items : DEFAULT_ITEMS,
    orientation,
    mobileBehavior: asOption(
      props.mobileBehavior ?? (props.mobileHamburger === false ? "keep" : "hamburger"),
      ["hamburger", "keep"] as const,
      "hamburger",
    ),
    hamburgerMode: asOption(props.hamburgerMode, ["fullscreen", "drawer", "dropdown"] as const, "fullscreen"),
    dropdownMode: asOption(props.dropdownMode, ["flyout", "columns"] as const, "flyout"),
    dropdownWidthMode: asOption(props.dropdownWidthMode, ["fitToMenu", "stretch"] as const, "fitToMenu"),
    dropdownColumns: Math.max(1, Math.min(6, asNumber(props.dropdownColumns, 3))),
    dropdownAlignment: asOption(props.dropdownAlignment, ["left", "center", "right", "justify"] as const, "left"),
    widthMode: asOption(props.widthMode, ["wrap", "fullWidth"] as const, "wrap"),
    overflowMode: asOption(props.overflowMode, ["wrap", "scroll", "collapse"] as const, "wrap"),
    fillItems: props.fillItems === true,
    alignment: asOption(props.alignment, ["left", "center", "right", "justify"] as const, "left"),
    itemStyle: asOption(props.itemStyle, ITEM_STYLE_OPTIONS, "plain"),
    textColor: String(props.textColor ?? "#111827"),
    activeColor: String(props.activeColor ?? "#2563eb"),
    activeBg: String(props.activeBg ?? ""),
    itemBg: String(props.itemBg ?? ""),
    navBg: String(props.navBg ?? ""),
    navBorder: String(props.navBorder ?? ""),
    navBorderRadius: String(props.navBorderRadius ?? ""),
    navPadding: String(props.navPadding ?? ""),
    fontSize: String(props.fontSize ?? "14px"),
    letterSpacing: String(props.letterSpacing ?? ""),
    itemGap,
    rowGap: asNumber(props.rowGap, 8),
    dropdownGap: asNumber(props.dropdownGap, 8),
    columnGap: asNumber(props.columnGap, 30),
    dropdownMargin: asNumber(props.dropdownMargin, 10),
    dropdownPadding: asNumber(props.dropdownPadding, 12),
    dropdownRadius: asNumber(props.dropdownRadius, 12),
    dropdownMinWidth: asNumber(props.dropdownMinWidth, 210),
    dropdownShadow: asOption(props.dropdownShadow, ["none", "soft", "deep"] as const, "soft"),
    dropdownBg: String(props.dropdownBg ?? ""),
    dropdownBorderColor: String(props.dropdownBorderColor ?? ""),
    dropdownItemHoverBg: String(props.dropdownItemHoverBg ?? ""),
    dropdownOffsetX: asNumber(props.dropdownOffsetX, 0),
    dropdownOffsetY: asNumber(props.dropdownOffsetY, 0),
    activeMode: props.activeMode === "manual" ? "manual" : "auto",
    activeItemId: String(props.activeItemId ?? ""),
    activeIndex: asNumber(props.activeIndex, 0),
    floatingMode: asOption(props.floatingMode, ["static", "sticky", "fixed"] as const, "static"),
  };
}

function alignmentToJustify(alignment: MenuAlignment): React.CSSProperties["justifyContent"] {
  if (alignment === "center") return "center";
  if (alignment === "right") return "flex-end";
  if (alignment === "justify") return "space-between";
  return "flex-start";
}

function buildNavStyle(settings: MenuSettings, style: Partial<StyleConfig> | undefined): React.CSSProperties {
  const navStyle: React.CSSProperties = {
    ...(style as React.CSSProperties),
    width: settings.widthMode === "fullWidth" ? "100%" : ((style as React.CSSProperties | undefined)?.width ?? "fit-content"),
    maxWidth: "100%",
    display: "flex",
    flexDirection: settings.orientation === "vertical" ? "column" : "row",
    alignItems: settings.orientation === "vertical" ? "stretch" : "center",
    justifyContent: alignmentToJustify(settings.alignment),
    gap: `${settings.rowGap}px ${settings.itemGap}px`,
    boxSizing: "border-box",
    overflow: "visible",
    isolation: "isolate",
    ...(settings.navBg ? { backgroundColor: settings.navBg } : {}),
    ...(settings.navBorder ? { border: settings.navBorder } : {}),
    ...(settings.navBorderRadius ? { borderRadius: settings.navBorderRadius } : {}),
    ...(settings.navPadding ? { padding: settings.navPadding } : {}),
  };

  if (settings.floatingMode === "sticky") {
    navStyle.position = "sticky";
    navStyle.top = 0;
    navStyle.zIndex = 50;
  } else if (settings.floatingMode === "fixed") {
    navStyle.position = "fixed";
    navStyle.top = 0;
    navStyle.left = 0;
    navStyle.right = 0;
    navStyle.zIndex = 50;
  }

  return navStyle;
}

function MenuDropdownKeyframes() {
  return (
    <style>
      {`
        @keyframes uiBuilderMenuDropdownIn { from { opacity: 0; transform: translateY(-4px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .ui-builder-menu-submenu,
        .ui-builder-menu-submenu-bridge { display: none; }
        .ui-builder-menu-item:hover > .ui-builder-menu-submenu,
        .ui-builder-menu-item:focus-within > .ui-builder-menu-submenu,
        .ui-builder-menu-item[data-submenu-open="true"] > .ui-builder-menu-submenu,
        .ui-builder-menu-item:hover > .ui-builder-menu-submenu-bridge,
        .ui-builder-menu-item:focus-within > .ui-builder-menu-submenu-bridge,
        .ui-builder-menu-item[data-submenu-open="true"] > .ui-builder-menu-submenu-bridge,
        .ui-builder-menu-dropdown-item:hover > .ui-builder-menu-submenu,
        .ui-builder-menu-dropdown-item:focus-within > .ui-builder-menu-submenu,
        .ui-builder-menu-dropdown-item[data-submenu-open="true"] > .ui-builder-menu-submenu,
        .ui-builder-menu-dropdown-item:hover > .ui-builder-menu-submenu-bridge,
        .ui-builder-menu-dropdown-item:focus-within > .ui-builder-menu-submenu-bridge { display: grid; }
        .ui-builder-menu-dropdown-item[data-submenu-open="true"] > .ui-builder-menu-submenu-bridge { display: grid; }
        .ui-builder-menu-submenu-bridge { pointer-events: auto; }
      `}
    </style>
  );
}

function buildListStyle(settings: MenuSettings): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: settings.orientation === "vertical" ? "column" : "row",
    flexWrap: settings.overflowMode === "wrap" ? "wrap" : "nowrap",
    alignItems: settings.orientation === "vertical" ? "stretch" : "center",
    justifyContent: alignmentToJustify(settings.alignment),
    gap: `${settings.rowGap}px ${settings.itemGap}px`,
    listStyle: "none",
    margin: 0,
    padding: 0,
    width: settings.overflowMode === "scroll" && settings.orientation === "horizontal"
      ? "max-content"
      : settings.widthMode === "fullWidth" ? "100%" : "auto",
    maxWidth: settings.overflowMode === "scroll" && settings.orientation === "horizontal" ? "none" : "100%",
    overflowX: "visible",
  };
}

function buildItemStyle(settings: MenuSettings, isActive: boolean, compact = false): React.CSSProperties {
  const activeBg = settings.activeBg || settings.activeColor;
  const base: React.CSSProperties = {
    color: isActive ? settings.activeColor : settings.textColor,
    fontSize: settings.fontSize,
    fontWeight: "500",
    textDecoration: "none",
    padding: compact ? "7px 10px" : "9px 14px",
    borderRadius: "4px",
    transition: "background-color 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    width: settings.fillItems ? "100%" : undefined,
    ...(settings.letterSpacing ? { letterSpacing: settings.letterSpacing } : {}),
    ...(settings.itemBg && !isActive ? { backgroundColor: settings.itemBg } : {}),
    ...(isActive && settings.activeBg ? { backgroundColor: settings.activeBg } : {}),
  };

  switch (settings.itemStyle) {
    case "boxed":
      base.border = isActive ? `2px solid ${settings.activeColor}` : "2px solid transparent";
      break;
    case "boxed-all":
      base.border = `1px solid ${isActive ? settings.activeColor : settings.textColor}`;
      base.padding = compact ? "7px 12px" : "10px 16px";
      break;
    case "pill":
      base.borderRadius = "999px";
      if (isActive) {
        base.backgroundColor = settings.activeColor;
        base.color = "#fff";
      }
      break;
    case "pill-outlined":
      base.borderRadius = "12px";
      base.border = isActive ? `1px solid ${settings.activeColor}` : "1px solid transparent";
      if (isActive) {
        base.backgroundColor = settings.activeBg || "#fff";
        base.color = settings.activeColor;
      }
      break;
    case "pill-all":
      base.borderRadius = "999px";
      base.backgroundColor = settings.itemBg || "rgba(0,0,0,0.05)";
      if (isActive) {
        base.border = `1px solid ${settings.activeColor}`;
        base.color = settings.activeColor;
      }
      break;
    case "underline":
      base.borderRadius = "0";
      base.padding = compact ? "7px 4px" : "9px 4px";
      base.borderBottom = isActive ? `2px solid ${settings.activeColor}` : "2px solid transparent";
      break;
    case "underline-all":
      base.textDecoration = "underline";
      base.textUnderlineOffset = "3px";
      break;
    case "filled":
      if (isActive) {
        base.backgroundColor = activeBg;
        base.color = "#fff";
      }
      break;
    case "button-all":
      base.backgroundColor = isActive ? settings.activeColor : (settings.itemBg || settings.activeColor);
      base.color = isActive ? "#fff" : (settings.textColor === "#ffffff" ? "#fff" : settings.textColor);
      base.border = isActive ? "2px solid rgba(255,255,255,0.9)" : "2px solid transparent";
      base.borderRadius = "0";
      break;
    case "block-vertical":
      base.width = "100%";
      base.borderRadius = "0";
      base.border = `1px solid ${settings.activeColor}`;
      base.backgroundColor = isActive ? settings.activeColor : (settings.itemBg || "transparent");
      base.color = isActive ? "#fff" : settings.textColor;
      base.fontWeight = "700";
      break;
    case "serif-panel":
      base.fontFamily = "Georgia, 'Times New Roman', serif";
      base.fontSize = compact ? "15px" : "22px";
      base.backgroundColor = isActive ? settings.activeColor : (settings.itemBg || "rgba(37,99,235,0.12)");
      base.color = isActive ? "#fff" : settings.textColor;
      base.borderRadius = "0";
      base.width = "100%";
      break;
    case "dark-panel":
      base.backgroundColor = isActive ? "#000" : (settings.itemBg || "transparent");
      base.color = isActive ? "#fff" : settings.textColor;
      base.fontFamily = "Georgia, 'Times New Roman', serif";
      base.fontStyle = "italic";
      base.fontWeight = "700";
      base.width = "100%";
      base.borderRadius = "0";
      base.borderBottom = "1px solid rgba(0,0,0,0.6)";
      break;
    case "pastel-panel":
      base.backgroundColor = isActive ? settings.activeBg || "#fbbf24" : settings.itemBg || "#fff7ed";
      base.color = settings.textColor;
      base.fontFamily = "Georgia, 'Times New Roman', serif";
      base.borderRadius = "0";
      base.width = "100%";
      break;
  }

  return base;
}

function buildDropdownShadow(settings: MenuSettings): string {
  if (settings.dropdownShadow === "none") return "none";
  if (settings.dropdownShadow === "deep") return "0 24px 70px rgba(15,23,42,0.22), 0 6px 18px rgba(15,23,42,0.10)";
  return "0 18px 42px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06)";
}

function buildMenuItemInteractiveStyle(
  settings: MenuSettings,
  active: boolean,
  compact: boolean | undefined,
  hovered: boolean,
): React.CSSProperties {
  const style = buildItemStyle(settings, active, compact);
  if (compact) {
    style.width = "100%";
    style.justifyContent = "space-between";
    style.textAlign = "left";
    style.borderRadius = `${Math.max(6, settings.dropdownRadius - 4)}px`;
    style.padding = "9px 11px";
    style.backgroundColor = active
      ? settings.activeBg || "rgba(37,99,235,0.11)"
      : hovered ? settings.dropdownItemHoverBg || "rgba(15,23,42,0.055)" : (style.backgroundColor as string | undefined);
    if (hovered && !active) {
      style.color = settings.activeColor || settings.textColor;
    }
  } else if (hovered && !active) {
    style.backgroundColor = settings.dropdownItemHoverBg || "rgba(15,23,42,0.055)";
  }
  return style;
}

function HamburgerBars({ color, variant }: { color: string; variant: MenuItemStyle }) {
  if (variant === "labeled-hamburger") {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Menu <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} /></span>;
  }
  if (variant === "icon-hamburger") {
    return <span style={{ fontSize: 30, lineHeight: 1 }}>+</span>;
  }
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ display: "block", width: 24, height: 2, background: color }} />
      ))}
    </span>
  );
}

function buildHamburgerButtonStyle(settings: MenuSettings): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 40,
    border: "none",
    background: "transparent",
    color: settings.textColor,
    cursor: "pointer",
    padding: "8px 10px",
    borderRadius: 8,
    font: "inherit",
  };
  if (settings.itemStyle === "pill" || settings.itemStyle === "labeled-hamburger") {
    base.borderRadius = 999;
    base.background = settings.itemBg || "#e5e1dc";
    base.padding = "10px 28px";
    base.fontWeight = "700";
  }
  if (settings.itemStyle === "filled" || settings.itemStyle === "icon-hamburger") {
    base.borderRadius = "999px";
    base.background = settings.activeColor;
    base.color = "#fff";
    base.boxShadow = "0 12px 28px rgba(79,70,229,0.25)";
  }
  if (settings.itemStyle === "boxed" || settings.itemStyle === "boxed-all") {
    base.border = `2px solid ${settings.textColor}`;
    base.borderRadius = "999px";
    base.background = "#fff";
  }
  if (settings.itemStyle === "button-all") {
    base.background = settings.activeColor;
    base.color = "#fff";
    base.borderRadius = 8;
  }
  return base;
}

function useRuntimeActiveItem(settings: MenuSettings): string | null {
  const [activeAnchorId, setActiveAnchorId] = React.useState("");
  const [pathname, setPathname] = React.useState("");

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    setPathname(window.location.pathname);
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return undefined;
    const anchors = flattenVisibleMenuItems(settings.items)
      .map(({ item }) => item.target.type === "anchor" ? item.target.anchorId.replace(/^#/, "") : "")
      .filter(Boolean);
    const elements = anchors
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return undefined;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
        else visible.delete(id);
      });
      const [best] = [...visible.entries()].sort((a, b) => b[1] - a[1]);
      if (best) setActiveAnchorId(best[0]);
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.25, 0.5, 0.75] });

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [settings.items]);

  if (settings.activeMode === "manual") {
    const flat = flattenVisibleMenuItems(settings.items);
    return settings.activeItemId || (flat[settings.activeIndex]?.item.id ?? null);
  }

  const active = findActiveMenuItem(settings.items, { activeAnchorId, pathname });
  return active?.id ?? null;
}

function MenuItemLink({
  item,
  settings,
  active,
  mode,
  compact,
  onNavigate,
}: {
  item: MenuItem;
  settings: MenuSettings;
  active: boolean;
  mode: RenderMode;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const href = resolveMenuHref(item.target);
  const target = item.target.type === "url" ? item.target.target : undefined;
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (mode === "editor") {
      event.preventDefault();
      return;
    }
    if (item.target.type === "none") {
      event.preventDefault();
      return;
    }
    if (item.target.type === "anchor") {
      const el = document.getElementById(item.target.anchorId.replace(/^#/, ""));
      if (el) {
        event.preventDefault();
        el.scrollIntoView({ behavior: item.target.behavior ?? "smooth", block: "start" });
        window.history.replaceState(null, "", href);
      }
    }
    onNavigate?.();
  };

  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-current={active ? "page" : undefined}
      style={buildMenuItemInteractiveStyle(settings, active, compact, hovered)}
    >
      <span>{item.label}</span>
      {item.children?.length ? <span aria-hidden="true" style={{ fontSize: 12, lineHeight: 1, opacity: 0.72 }}>{compact ? ">" : "v"}</span> : null}
    </a>
  );
}

function DesktopSubMenu({
  item,
  settings,
  activeItemId,
  mode,
  level = 0,
  inline = false,
}: {
  item: MenuItem;
  settings: MenuSettings;
  activeItemId: string | null;
  mode: RenderMode;
  level?: number;
  inline?: boolean;
}) {
  const [openChildId, setOpenChildId] = React.useState<string | null>(null);
  const children = (item.children ?? []).filter((child) => !child.hidden);
  if (children.length === 0) return null;

  const isNested = level > 0;
  const isColumns = settings.dropdownMode === "columns" && !isNested;
  const nestedOffsetX = settings.dropdownMargin + settings.dropdownOffsetX;
  const nestedOffsetY = settings.dropdownOffsetY;
  const topLevelOffsetX = settings.dropdownOffsetX;
  const topLevelOffsetY = settings.dropdownMargin + settings.dropdownOffsetY;
  const panelBackground = settings.dropdownBg || settings.navBg || "rgba(255,255,255,0.98)";
  const panelBorder = settings.dropdownBorderColor || "rgba(148,163,184,0.34)";
  const submenuStyle: React.CSSProperties = {
    position: inline ? "static" : "absolute",
    top: inline ? undefined : isNested ? nestedOffsetY : settings.orientation === "vertical" ? settings.dropdownOffsetY : `calc(100% + ${topLevelOffsetY}px)`,
    left: inline ? undefined : isNested ? `calc(100% + ${nestedOffsetX}px)` : settings.orientation === "vertical" ? `calc(100% + ${nestedOffsetX}px)` : topLevelOffsetX,
    minWidth: settings.dropdownWidthMode === "stretch" && !isNested ? Math.max(280, settings.dropdownMinWidth) : settings.dropdownMinWidth,
    width: isColumns ? Math.max(260, settings.dropdownColumns * 160) : undefined,
    gridTemplateColumns: isColumns ? `repeat(${settings.dropdownColumns}, minmax(120px, 1fr))` : "1fr",
    gap: `${settings.dropdownGap}px ${settings.columnGap}px`,
    listStyle: "none",
    margin: 0,
    padding: inline ? 0 : settings.dropdownPadding,
    background: panelBackground,
    border: inline ? "none" : `1px solid ${panelBorder}`,
    borderRadius: inline ? 0 : settings.dropdownRadius,
    boxShadow: inline ? "none" : buildDropdownShadow(settings),
    zIndex: 3000 + level,
    backdropFilter: inline ? undefined : "saturate(1.18) blur(10px)",
    transformOrigin: isNested ? "left top" : "top left",
    overflow: "visible",
  };

  const bridgeStyle: React.CSSProperties = isNested || settings.orientation === "vertical"
    ? {
        position: "absolute",
        top: 0,
        left: "100%",
        width: Math.max(8, nestedOffsetX),
        height: "100%",
      }
    : {
        position: "absolute",
        top: "100%",
        left: 0,
        width: "100%",
        height: Math.max(8, topLevelOffsetY),
      };

  return (
    <>
      {!inline && settings.dropdownMargin > 0 && <div className="ui-builder-menu-submenu-bridge" aria-hidden="true" style={bridgeStyle} />}
      <ul className="ui-builder-menu-submenu" style={submenuStyle}>
        {children.map((child) => {
          const active = activeItemId === child.id || hasActiveDescendant(child, activeItemId);
          const hasChildren = Boolean(child.children?.some((descendant) => !descendant.hidden));
          return (
            <li
              className="ui-builder-menu-dropdown-item"
              data-submenu-open={openChildId === child.id ? "true" : undefined}
              key={child.id}
              style={{ minWidth: 0, position: "relative", listStyle: "none" }}
              onPointerEnter={() => setOpenChildId(child.id)}
              onPointerMove={() => setOpenChildId(child.id)}
              onFocus={() => setOpenChildId(child.id)}
              onMouseLeave={() => setOpenChildId((current) => current === child.id ? null : current)}
            >
              <MenuItemLink item={child} settings={settings} active={active} mode={mode} compact />
              {hasChildren ? (
                isColumns ? (
                  <div style={{ marginTop: settings.dropdownGap }}>
                    <DesktopSubMenu item={child} settings={settings} activeItemId={activeItemId} mode={mode} level={level + 1} inline />
                  </div>
                ) : (
                  <DesktopSubMenu item={child} settings={settings} activeItemId={activeItemId} mode={mode} level={level + 1} />
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function HoverScrollArea({ children }: { children: React.ReactNode }) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setCanScrollLeft(scroller.scrollLeft > 1);
    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1);
  }, []);

  const scrollByStep = React.useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * Math.max(140, Math.round(scroller.clientWidth * 0.55)), behavior: "smooth" });
    window.setTimeout(updateScrollState, 180);
  }, [updateScrollState]);

  React.useEffect(() => {
    updateScrollState();
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    if (typeof ResizeObserver === "undefined") {
      return () => scroller.removeEventListener("scroll", updateScrollState);
    }
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState]);

  const buttonBase: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 40,
    border: 0,
    borderRadius: 0,
    background: "#1f4fff",
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    lineHeight: 1,
    zIndex: 8,
    boxShadow: "0 0 0 1px rgba(29,78,216,0.12)",
  };

  return (
    <div
      style={{ position: "relative", maxWidth: "100%", width: "100%", overflow: "hidden", border: "1px solid rgba(15,23,42,0.85)" }}
    >
      <div
        ref={scrollerRef}
        onScroll={updateScrollState}
        style={{
          overflowX: "hidden",
          overflowY: "visible",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingLeft: canScrollLeft ? 40 : 0,
          paddingRight: canScrollRight ? 40 : 0,
        }}
      >
        {children}
      </div>
      {canScrollLeft ? (
        <button
          type="button"
          aria-label="Scroll menu left"
          data-menu-scroll-button
          onClick={() => scrollByStep(-1)}
          style={{ ...buttonBase, left: 0 }}
        >
          ‹
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          aria-label="Scroll menu right"
          data-menu-scroll-button
          onClick={() => scrollByStep(1)}
          style={{ ...buttonBase, right: 0 }}
        >
          ›
        </button>
      ) : null}
    </div>
  );
}

function MoreOverflowMenu({
  items,
  settings,
  activeItemId,
  mode,
}: {
  items: MenuItem[];
  settings: MenuSettings;
  activeItemId: string | null;
  mode: RenderMode;
}) {
  const [open, setOpen] = React.useState(false);
  const [openChildId, setOpenChildId] = React.useState<string | null>(null);
  if (items.length === 0) return null;
  return (
    <li
      style={{ position: "relative", listStyle: "none" }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen((value) => !value); }}
        onMouseEnter={() => setOpen(true)}
        style={buildItemStyle(settings, items.some((item) => item.id === activeItemId || hasActiveDescendant(item, activeItemId)), true)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ...
      </button>
      {open && (
        <ul
          style={{
            position: "absolute",
            top: `calc(100% + ${settings.dropdownMargin}px)`,
            right: 0,
            minWidth: 180,
            listStyle: "none",
            margin: 0,
            padding: settings.dropdownPadding,
            background: settings.dropdownBg || settings.navBg || "rgba(255,255,255,0.98)",
            border: `1px solid ${settings.dropdownBorderColor || "rgba(148,163,184,0.34)"}`,
            borderRadius: settings.dropdownRadius,
            boxShadow: buildDropdownShadow(settings),
            zIndex: 3000,
            backdropFilter: "saturate(1.18) blur(10px)",
          }}
        >
          {items.map((item) => (
            <li
              key={item.id}
              style={{ position: "relative" }}
              onMouseEnter={() => setOpenChildId(item.id)}
              onFocus={() => setOpenChildId(item.id)}
            >
              <MenuItemLink item={item} settings={settings} active={activeItemId === item.id || hasActiveDescendant(item, activeItemId)} mode={mode} compact />
              {openChildId === item.id && item.children?.some((child) => !child.hidden) ? (
                <DesktopSubMenu item={item} settings={settings} activeItemId={activeItemId} mode={mode} level={1} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function DesktopMenu({
  settings,
  style,
  nodeId,
  mode,
  activeItemId,
}: {
  settings: MenuSettings;
  style?: Partial<StyleConfig>;
  nodeId?: string;
  mode: RenderMode;
  activeItemId: string | null;
}) {
  const navRef = React.useRef<HTMLElement | null>(null);
  const itemRefs = React.useRef<Record<string, HTMLLIElement | null>>({});
  const [visibleCount, setVisibleCount] = React.useState(settings.items.length);
  const [openSubmenuId, setOpenSubmenuId] = React.useState<string | null>(null);
  const visibleItems = settings.items.filter((item) => !item.hidden);

  React.useEffect(() => {
    if (mode === "editor" || settings.overflowMode !== "collapse" || settings.orientation === "vertical") {
      setVisibleCount(visibleItems.length);
      return undefined;
    }
    const measure = () => {
      const nav = navRef.current;
      if (!nav) return;
      const available = nav.clientWidth - 52;
      if (available <= 0) return;
      let used = 0;
      let count = visibleItems.length;
      for (let i = 0; i < visibleItems.length; i += 1) {
        const el = itemRefs.current[visibleItems[i]!.id];
        const width = el?.offsetWidth ?? 0;
        used += width + settings.itemGap;
        if (used > available) {
          count = Math.max(1, i);
          break;
        }
      }
      setVisibleCount(count);
    };
    measure();
    if (typeof ResizeObserver === "undefined" || !navRef.current) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(navRef.current);
    return () => observer.disconnect();
  }, [mode, settings.itemGap, settings.orientation, settings.overflowMode, visibleItems]);

  const shown = settings.overflowMode === "collapse" ? visibleItems.slice(0, visibleCount) : visibleItems;
  const overflow = settings.overflowMode === "collapse" ? visibleItems.slice(visibleCount) : [];
  const list = (
    <ul style={buildListStyle(settings)}>
      {shown.map((item) => {
        const active = activeItemId === item.id || hasActiveDescendant(item, activeItemId);
        return (
          <li
            className="ui-builder-menu-item"
            data-submenu-open={openSubmenuId === item.id ? "true" : undefined}
            key={item.id}
            ref={(el) => { itemRefs.current[item.id] = el; }}
            style={{
              position: "relative",
              listStyle: "none",
              flex: settings.fillItems ? "1 1 0" : "0 0 auto",
            }}
            onPointerEnter={() => setOpenSubmenuId(item.id)}
            onPointerMove={() => setOpenSubmenuId(item.id)}
            onFocus={() => setOpenSubmenuId(item.id)}
            onMouseLeave={() => setOpenSubmenuId((current) => current === item.id ? null : current)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpenSubmenuId(null);
            }}
          >
            <MenuItemLink item={item} settings={settings} active={active} mode={mode} />
            <DesktopSubMenu item={item} settings={settings} activeItemId={activeItemId} mode={mode} />
          </li>
        );
      })}
      <MoreOverflowMenu items={overflow} settings={settings} activeItemId={activeItemId} mode={mode} />
    </ul>
  );

  return (
    <nav
      ref={navRef}
      data-node-id={nodeId}
      aria-label="Site navigation"
      style={buildNavStyle(settings, style)}
    >
      <MenuDropdownKeyframes />
      {settings.overflowMode === "scroll" && settings.orientation === "horizontal" ? (
        <HoverScrollArea>{list}</HoverScrollArea>
      ) : list}
    </nav>
  );
}

function MobileMenuOverlay({
  id,
  open,
  settings,
  activeItemId,
  onClose,
  mode,
}: {
  id: string;
  open: boolean;
  settings: MenuSettings;
  activeItemId: string | null;
  onClose: () => void;
  mode: RenderMode;
}) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  if (!open) return null;

  const renderItems = (items: MenuItem[], depth = 0) => (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
      {items.filter((item) => !item.hidden).map((item) => {
        const hasChildren = Boolean(item.children?.some((child) => !child.hidden));
        const active = activeItemId === item.id || hasActiveDescendant(item, activeItemId);
        return (
          <li key={item.id} style={{ paddingLeft: depth * 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <MenuItemLink item={item} settings={settings} active={active} mode={mode} onNavigate={onClose} />
              </div>
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => setExpanded((value) => ({ ...value, [item.id]: !value[item.id] }))}
                  aria-expanded={expanded[item.id] === true}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(255,255,255,0.78)",
                    cursor: "pointer",
                  }}
                >
                  {expanded[item.id] ? "-" : "+"}
                </button>
              )}
            </div>
            {hasChildren && expanded[item.id] && (
              <div style={{ marginTop: 8 }}>{renderItems(item.children ?? [], depth + 1)}</div>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (settings.hamburgerMode === "dropdown") {
    return (
      <div
        id={id}
        style={{
          position: "absolute",
          top: "100%",
          right: 0,
          minWidth: 260,
          zIndex: 100,
          padding: 12,
          background: settings.navBg || "#fff",
          border: settings.navBorder || "1px solid #e5e7eb",
          borderRadius: settings.navBorderRadius || 12,
          boxShadow: "0 22px 50px rgba(15,23,42,0.18)",
        }}
      >
        {renderItems(settings.items)}
      </div>
    );
  }

  const panelStyle: React.CSSProperties = settings.hamburgerMode === "drawer"
    ? {
        position: "fixed",
        top: 0,
        bottom: 0,
        right: 0,
        width: "min(360px, 88vw)",
      }
    : {
        position: "fixed",
        inset: 0,
      };

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      style={{ position: "fixed", inset: 0, zIndex: 1000 }}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, border: 0, background: "rgba(15,23,42,0.42)", cursor: "default" }}
      />
      <div
        style={{
          ...panelStyle,
          background: settings.navBg || "#fff",
          color: settings.textColor,
          padding: "26px",
          boxShadow: "0 28px 80px rgba(15,23,42,0.28)",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <strong style={{ fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>Menu</strong>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            style={{ border: 0, background: "transparent", fontSize: 28, lineHeight: 1, cursor: "pointer", color: settings.textColor }}
          >
            x
          </button>
        </div>
        {renderItems(settings.items)}
      </div>
    </div>
  );
}

function HamburgerMenu({
  settings,
  style,
  nodeId,
  mode,
  activeItemId,
}: {
  settings: MenuSettings;
  style?: Partial<StyleConfig>;
  nodeId?: string;
  mode: RenderMode;
  activeItemId: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const overlayId = React.useId();

  React.useEffect(() => {
    if (!open || typeof document === "undefined" || typeof window === "undefined") return undefined;
    const triggerEl = triggerRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = settings.hamburgerMode === "dropdown" ? previousOverflow : "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      triggerEl?.focus();
    };
  }, [mode, open, settings.hamburgerMode]);

  return (
    <div
      data-node-id={nodeId}
      style={{
        ...buildNavStyle(settings, style),
        position: settings.hamburgerMode === "dropdown" ? "relative" : (buildNavStyle(settings, style).position ?? "relative"),
        isolation: "isolate",
        zIndex: 1200,
        justifyContent: alignmentToJustify(settings.alignment === "left" ? "right" : settings.alignment),
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
        aria-label="Toggle menu"
        aria-expanded={open}
        aria-controls={overlayId}
        style={buildHamburgerButtonStyle(settings)}
      >
        <HamburgerBars color="currentColor" variant={settings.itemStyle} />
      </button>
      <MobileMenuOverlay id={overlayId} open={open} settings={settings} activeItemId={activeItemId} mode={mode} onClose={() => setOpen(false)} />
    </div>
  );
}

function NavigationMenuRuntime({
  node,
  style,
  mode,
  breakpoint,
}: {
  node: BuilderNode;
  style?: Partial<StyleConfig>;
  mode: RenderMode;
  breakpoint: Breakpoint;
}) {
  const settings = readSettings(node);
  const [isMobile, setIsMobile] = React.useState(false);
  const activeItemId = useRuntimeActiveItem(settings);

  React.useEffect(() => {
    if (mode !== "runtime" || typeof window === "undefined") return undefined;
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [mode]);

  const legacyLayout = String(node.props.layout ?? "");
  const forceHamburger = legacyLayout === "hamburger";
  const shouldUseHamburger = forceHamburger || ((isMobile || breakpoint === "mobile") && settings.mobileBehavior === "hamburger");
  const editorHamburgerPreview = mode === "editor" && (forceHamburger || node.props.mobilePreview === true);

  if (shouldUseHamburger || editorHamburgerPreview) {
    return <HamburgerMenu settings={settings} style={style} nodeId={node.id} mode={mode} activeItemId={activeItemId} />;
  }

  return <DesktopMenu settings={settings} style={style} nodeId={node.id} mode={mode} activeItemId={activeItemId} />;
}

export const NavigationMenuComponent: ComponentDefinition = {
  type: "NavigationMenu",
  name: "Navigation Menu",
  category: "navigation",
  group: "menu",
  subGroup: "menu-horizontal",
  description: "Responsive navigation with anchors, page links, submenu items, overflow handling, and hamburger menus.",
  version: "2.0.0",
  tags: ["menu", "navigation", "nav", "header", "hamburger", "responsive", "submenu", "anchor"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "items", label: "Menu Items (tree JSON)", type: "json" },
    {
      key: "orientation",
      label: "Orientation",
      type: "select",
      options: [
        { value: "horizontal", label: "Horizontal" },
        { value: "vertical", label: "Vertical" },
      ],
      default: "horizontal",
    },
    {
      key: "mobileBehavior",
      label: "Mobile Behavior",
      type: "select",
      options: [
        { value: "hamburger", label: "Hamburger" },
        { value: "keep", label: "Keep menu" },
      ],
      default: "hamburger",
    },
    {
      key: "hamburgerMode",
      label: "Hamburger Mode",
      type: "select",
      options: [
        { value: "fullscreen", label: "Full screen" },
        { value: "drawer", label: "Side drawer" },
        { value: "dropdown", label: "Dropdown" },
      ],
      default: "fullscreen",
    },
    {
      key: "itemStyle",
      label: "Item Style",
      type: "select",
      options: ITEM_STYLE_OPTIONS.map((value) => ({ value, label: value.split("-").map((part) => part[0]!.toUpperCase() + part.slice(1)).join(" ") })),
      default: "plain",
    },
    { key: "textColor", label: "Text Color", type: "color", default: "#111827" },
    { key: "activeColor", label: "Active Color", type: "color", default: "#2563eb" },
    { key: "activeBg", label: "Active Item Background", type: "color", default: "" },
    { key: "itemBg", label: "Item Background", type: "color", default: "" },
    { key: "navBg", label: "Nav Background", type: "color", default: "" },
    { key: "navBorder", label: "Nav Border (CSS)", type: "string", default: "" },
    { key: "navBorderRadius", label: "Nav Border Radius", type: "string", default: "" },
    { key: "navPadding", label: "Nav Padding", type: "string", default: "" },
    { key: "fontSize", label: "Font Size", type: "string", default: "14px" },
    { key: "letterSpacing", label: "Letter Spacing", type: "string", default: "" },
    { key: "itemGap", label: "Horizontal Spacing", type: "number", default: 24, min: 0, max: 96, step: 2, unit: "px" },
    { key: "rowGap", label: "Vertical Spacing", type: "number", default: 8, min: 0, max: 80, step: 2, unit: "px" },
    { key: "dropdownPadding", label: "Dropdown Padding", type: "number", default: 12, min: 0, max: 40, step: 1, unit: "px" },
    { key: "dropdownRadius", label: "Dropdown Radius", type: "number", default: 12, min: 0, max: 32, step: 1, unit: "px" },
    { key: "dropdownMinWidth", label: "Dropdown Min Width", type: "number", default: 210, min: 120, max: 420, step: 10, unit: "px" },
    { key: "dropdownBg", label: "Dropdown Background", type: "color", default: "" },
    { key: "dropdownBorderColor", label: "Dropdown Border", type: "color", default: "" },
    { key: "dropdownItemHoverBg", label: "Dropdown Hover", type: "color", default: "" },
    {
      key: "dropdownShadow",
      label: "Dropdown Shadow",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "soft", label: "Soft" },
        { value: "deep", label: "Deep" },
      ],
      default: "soft",
    },
    { key: "dropdownOffsetX", label: "Dropdown Offset X", type: "number", default: 0, min: -80, max: 80, step: 1, unit: "px" },
    { key: "dropdownOffsetY", label: "Dropdown Offset Y", type: "number", default: 0, min: -40, max: 80, step: 1, unit: "px" },
    { key: "fillItems", label: "Fill Whole Menu", type: "boolean", default: false },
    {
      key: "overflowMode",
      label: "Overflow Mode",
      type: "select",
      options: [
        { value: "wrap", label: "Wrap" },
        { value: "scroll", label: "Scroll" },
        { value: "collapse", label: "More menu" },
      ],
      default: "wrap",
    },
    {
      key: "widthMode",
      label: "Width Mode",
      type: "select",
      options: [
        { value: "wrap", label: "Wrap" },
        { value: "fullWidth", label: "Full width" },
      ],
      default: "wrap",
    },
    {
      key: "alignment",
      label: "Alignment",
      type: "select",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
        { value: "justify", label: "Justify" },
      ],
      default: "left",
    },
  ],
  defaultProps: {
    items: DEFAULT_ITEMS,
    orientation: "horizontal",
    layout: "horizontal",
    mobileBehavior: "hamburger",
    mobileHamburger: true,
    hamburgerMode: "fullscreen",
    dropdownMode: "flyout",
    dropdownWidthMode: "fitToMenu",
    dropdownColumns: 3,
    dropdownAlignment: "left",
    widthMode: "wrap",
    overflowMode: "wrap",
    fillItems: false,
    alignment: "left",
    textColor: "#111827",
    activeColor: "#2563eb",
    activeBg: "",
    itemBg: "",
    navBg: "",
    navBorder: "",
    navBorderRadius: "",
    navPadding: "",
    fontSize: "14px",
    letterSpacing: "",
    itemGap: 24,
    rowGap: 8,
    dropdownGap: 8,
    columnGap: 30,
    dropdownMargin: 10,
    dropdownPadding: 12,
    dropdownRadius: 12,
    dropdownMinWidth: 210,
    dropdownShadow: "soft",
    dropdownBg: "",
    dropdownBorderColor: "",
    dropdownItemHoverBg: "",
    dropdownOffsetX: 0,
    dropdownOffsetY: 0,
    activeMode: "auto",
    activeItemId: "",
    activeIndex: 0,
    itemStyle: "plain",
    floatingMode: "static",
  },
  defaultStyle: { width: "100%", padding: "0 16px", display: "flex", alignItems: "center" },
  a11y: {
    role: "navigation",
    ariaLabel: "Site navigation",
    focusable: false,
  },
  editorRenderer: ({ node, style, breakpoint }) => <NavigationMenuRuntime node={node} style={style} mode="editor" breakpoint={breakpoint} />,
  runtimeRenderer: ({ node, style, breakpoint }) => <NavigationMenuRuntime node={node} style={style} mode="runtime" breakpoint={breakpoint} />,
};
