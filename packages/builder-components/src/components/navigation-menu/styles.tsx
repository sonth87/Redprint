import React from "react";
import type { StyleConfig } from "@ui-builder/builder-core";
import type { MenuAlignment, MenuItemStyle } from "@ui-builder/shared";
import type { MenuSettings } from "./types";

function alignmentToJustify(alignment: MenuAlignment): React.CSSProperties["justifyContent"] {
  if (alignment === "center") return "center";
  if (alignment === "right") return "flex-end";
  if (alignment === "justify") return "space-between";
  return "flex-start";
}

function buildNavStyle(settings: MenuSettings, style: Partial<StyleConfig> | undefined): React.CSSProperties {
  const shouldUseContentHeight = settings.orientation === "horizontal" && settings.overflowMode === "wrap";
  const styleWidth = (style as React.CSSProperties | undefined)?.width;
  const shouldUseViewportWidth = settings.widthMode === "fullWidth";
  const shouldUseIntrinsicVerticalWidth =
    settings.orientation === "vertical" &&
    settings.widthMode === "wrap" &&
    (styleWidth === undefined || styleWidth === "100%");
  const navStyle: React.CSSProperties = {
    ...(style as React.CSSProperties),
    width: shouldUseViewportWidth
      ? "100vw"
      : shouldUseIntrinsicVerticalWidth ? "fit-content" : (styleWidth ?? "fit-content"),
    ...(shouldUseViewportWidth
      ? {
          marginLeft: settings.floatingMode === "fixed" ? 0 : "calc(-50vw + 50%)",
          maxWidth: "none",
        }
      : {}),
    ...(shouldUseContentHeight ? { height: "auto" } : {}),
    maxWidth: shouldUseViewportWidth ? "none" : "100%",
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
  interactive = true,
): React.CSSProperties {
  const style = buildItemStyle(settings, active, compact);
  if (!interactive) {
    style.cursor = "default";
  }
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

export {
  alignmentToJustify,
  buildDropdownShadow,
  buildHamburgerButtonStyle,
  buildItemStyle,
  buildListStyle,
  buildMenuItemInteractiveStyle,
  buildNavStyle,
  HamburgerBars,
  MenuDropdownKeyframes,
};
