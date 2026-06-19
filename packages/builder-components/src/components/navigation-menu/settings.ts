import type { BuilderNode } from "@ui-builder/builder-core";
import { normalizeMenuItems } from "@ui-builder/shared";
import { DEFAULT_ITEMS, ITEM_STYLE_OPTIONS, type MenuSettings } from "./types";

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

export { readSettings };
