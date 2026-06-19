import type {
  MenuAlignment,
  MenuDropdownMode,
  MenuDropdownWidthMode,
  MenuHamburgerMode,
  MenuItem,
  MenuItemStyle,
  MenuMobileBehavior,
  MenuOrientation,
  MenuOverflowMode,
  MenuWidthMode,
} from "@ui-builder/shared";

export type RenderMode = "editor" | "runtime";

export interface MenuSettings {
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

export const ITEM_STYLE_OPTIONS = [
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

export const DEFAULT_ITEMS: MenuItem[] = [
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

