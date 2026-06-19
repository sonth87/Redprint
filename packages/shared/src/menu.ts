export type MenuTarget =
  | { type: "anchor"; anchorId: string; behavior?: "smooth" | "auto" }
  | { type: "page"; path: string; pageId?: string }
  | { type: "url"; url: string; target?: "_self" | "_blank" }
  | { type: "none" };

export interface MenuItem {
  id: string;
  label: string;
  target: MenuTarget;
  hidden?: boolean;
  children?: MenuItem[];
}

export type MenuOrientation = "horizontal" | "vertical";
export type MenuOverflowMode = "wrap" | "scroll" | "collapse";
export type MenuWidthMode = "wrap" | "fullWidth";
export type MenuAlignment = "left" | "center" | "right" | "justify";
export type MenuMobileBehavior = "hamburger" | "keep";
export type MenuHamburgerMode = "fullscreen" | "drawer" | "dropdown";
export type MenuDropdownMode = "flyout" | "columns";
export type MenuDropdownWidthMode = "fitToMenu" | "stretch";
export type MenuItemStyle =
  | "plain"
  | "underline"
  | "underline-all"
  | "boxed"
  | "boxed-all"
  | "pill"
  | "pill-outlined"
  | "pill-all"
  | "filled"
  | "button-all"
  | "block-vertical"
  | "serif-panel"
  | "dark-panel"
  | "pastel-panel"
  | "icon-hamburger"
  | "labeled-hamburger";

type RawMenuTarget = MenuTarget | string | null | undefined;

interface LegacyMenuItem {
  id?: unknown;
  label?: unknown;
  href?: unknown;
  target?: RawMenuTarget;
  hidden?: unknown;
  children?: unknown;
}

export interface FlatMenuItem {
  item: MenuItem;
  depth: number;
  parentId?: string;
}

export interface ActiveMenuMatchOptions {
  activeAnchorId?: string;
  pathname?: string;
  activeItemId?: string;
}

const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function slugPart(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "item";
}

function normalizePath(path: string): string {
  if (!path.trim()) return "/";
  const [pathname] = path.trim().split(/[?#]/);
  if (!pathname) return "/";
  const withSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/";
}

export function normalizeMenuPath(path: string): string {
  return normalizePath(path);
}

export function targetFromHref(href: unknown): MenuTarget {
  const value = typeof href === "string" ? href.trim() : "";
  if (!value || value === "#") return { type: "none" };
  if (value.startsWith("#")) return { type: "anchor", anchorId: value.slice(1), behavior: "smooth" };
  if (value.startsWith("/")) return { type: "page", path: normalizePath(value) };
  return { type: "url", url: value, target: "_self" };
}

function normalizeTarget(target: RawMenuTarget, href: unknown): MenuTarget {
  if (typeof target === "string") return targetFromHref(target);
  if (!target || typeof target !== "object") return targetFromHref(href);

  if (target.type === "anchor") {
    const anchorId = String(target.anchorId ?? "").replace(/^#/, "").trim();
    return anchorId ? { type: "anchor", anchorId, behavior: target.behavior === "auto" ? "auto" : "smooth" } : { type: "none" };
  }
  if (target.type === "page") {
    const path = normalizePath(String(target.path ?? ""));
    return { type: "page", path, ...(target.pageId ? { pageId: String(target.pageId) } : {}) };
  }
  if (target.type === "url") {
    const url = String(target.url ?? "").trim();
    return { type: "url", url, target: target.target === "_blank" ? "_blank" : "_self" };
  }
  return { type: "none" };
}

export function normalizeMenuItems(rawItems: unknown, parentPath = "menu"): MenuItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") return null;
      const item = raw as LegacyMenuItem;
      const label = String(item.label ?? "Menu item").trim() || "Menu item";
      const id = typeof item.id === "string" && item.id.trim()
        ? item.id.trim()
        : `${parentPath}-${index}-${slugPart(label)}`;
      const children = normalizeMenuItems(item.children, id);
      const normalized: MenuItem = {
        id,
        label,
        target: normalizeTarget(item.target, item.href),
        ...(item.hidden === true ? { hidden: true } : {}),
        ...(children.length > 0 ? { children } : {}),
      };
      return normalized;
    })
    .filter((item): item is MenuItem => item !== null);
}

export function flattenVisibleMenuItems(items: MenuItem[], depth = 0, parentId?: string): FlatMenuItem[] {
  return items.flatMap((item) => {
    if (item.hidden) return [];
    const children = flattenVisibleMenuItems(item.children ?? [], depth + 1, item.id);
    return [{ item, depth, parentId }, ...children];
  });
}

export function isSafeMenuHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (value.startsWith("#") || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return true;
  try {
    const parsed = new URL(value);
    return SAFE_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function resolveMenuHref(target: MenuTarget): string {
  if (target.type === "anchor") {
    const anchorId = target.anchorId.replace(/^#/, "").trim();
    return anchorId ? `#${anchorId}` : "#";
  }
  if (target.type === "page") return normalizePath(target.path);
  if (target.type === "url") return isSafeMenuHref(target.url) ? target.url.trim() : "#";
  return "#";
}

function itemMatches(item: MenuItem, options: ActiveMenuMatchOptions): boolean {
  if (options.activeItemId && item.id === options.activeItemId) return true;
  if (item.target.type === "anchor" && options.activeAnchorId) {
    return item.target.anchorId.replace(/^#/, "") === options.activeAnchorId.replace(/^#/, "");
  }
  if (item.target.type === "page" && options.pathname) {
    return normalizePath(item.target.path) === normalizePath(options.pathname);
  }
  return false;
}

export function findActiveMenuItem(items: MenuItem[], options: ActiveMenuMatchOptions): MenuItem | null {
  for (const item of items) {
    if (item.hidden) continue;
    const childMatch = findActiveMenuItem(item.children ?? [], options);
    if (childMatch) return childMatch;
    if (itemMatches(item, options)) return item;
  }
  return null;
}

export function hasActiveDescendant(item: MenuItem, activeItemId: string | null): boolean {
  if (!activeItemId) return false;
  return (item.children ?? []).some((child) => child.id === activeItemId || hasActiveDescendant(child, activeItemId));
}
