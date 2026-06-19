import React from "react";
import type { Breakpoint, BuilderNode, StyleConfig } from "@ui-builder/builder-core";
import { hasActiveDescendant, resolveMenuHref, type MenuItem } from "@ui-builder/shared";
import { readSettings } from "./settings";
import {
  alignmentToJustify,
  buildDropdownShadow,
  buildHamburgerButtonStyle,
  buildItemStyle,
  buildListStyle,
  buildMenuItemInteractiveStyle,
  buildNavStyle,
  HamburgerBars,
  MenuDropdownKeyframes,
} from "./styles";
import type { MenuSettings, RenderMode } from "./types";
import { useRuntimeActiveItem } from "./useRuntimeActiveItem";

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
  const interactive = mode !== "editor";
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
      draggable={interactive}
      onClick={handleClick}
      onDragStart={(event) => {
        if (!interactive) event.preventDefault();
      }}
      onMouseEnter={() => { if (interactive) setHovered(true); }}
      onMouseLeave={() => { if (interactive) setHovered(false); }}
      onFocus={() => { if (interactive) setHovered(true); }}
      onBlur={() => { if (interactive) setHovered(false); }}
      aria-current={active ? "page" : undefined}
      style={buildMenuItemInteractiveStyle(settings, active, compact, hovered, interactive)}
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
  if (mode === "editor") return null;
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

function HoverScrollArea({ children, interactive = true }: { children: React.ReactNode; interactive?: boolean }) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [activeButton, setActiveButton] = React.useState<"left" | "right" | null>(null);

  const updateScrollState = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setCanScrollLeft(scroller.scrollLeft > 1);
    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1);
  }, []);

  const scrollByStep = React.useCallback((direction: -1 | 1) => {
    if (!interactive) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({ left: direction * Math.max(140, Math.round(scroller.clientWidth * 0.55)), behavior: "smooth" });
    window.setTimeout(updateScrollState, 180);
  }, [interactive, updateScrollState]);

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
    background: "#fff",
    color: "#1f4fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    lineHeight: 1,
    cursor: interactive ? "pointer" : "default",
    zIndex: 8,
    boxShadow: "0 0 0 1px rgba(29,78,216,0.18)",
    transition: "background-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
  };
  const getButtonStyle = (side: "left" | "right"): React.CSSProperties => ({
    ...buttonBase,
    [side]: 0,
    ...(interactive && activeButton === side
      ? { background: "#1f4fff", color: "#fff", boxShadow: "0 0 0 1px rgba(29,78,216,0.28), 0 8px 18px rgba(29,78,216,0.18)" }
      : {}),
  });

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
          onFocus={() => { if (interactive) setActiveButton("left"); }}
          onBlur={() => setActiveButton(null)}
          onClick={() => scrollByStep(-1)}
          onPointerEnter={() => { if (interactive) setActiveButton("left"); }}
          onPointerLeave={() => setActiveButton(null)}
          style={getButtonStyle("left")}
        >
          ‹
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          aria-label="Scroll menu right"
          data-menu-scroll-button
          onFocus={() => { if (interactive) setActiveButton("right"); }}
          onBlur={() => setActiveButton(null)}
          onClick={() => scrollByStep(1)}
          onPointerEnter={() => { if (interactive) setActiveButton("right"); }}
          onPointerLeave={() => setActiveButton(null)}
          style={getButtonStyle("right")}
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
  const interactive = mode !== "editor";
  if (items.length === 0) return null;
  return (
    <li
      style={{ position: "relative", listStyle: "none" }}
      onMouseLeave={() => { if (interactive) setOpen(false); }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          if (interactive) setOpen((value) => !value);
        }}
        onMouseEnter={() => { if (interactive) setOpen(true); }}
        style={{
          ...buildItemStyle(settings, items.some((item) => item.id === activeItemId || hasActiveDescendant(item, activeItemId)), true),
          cursor: interactive ? "pointer" : "default",
        }}
        aria-haspopup="menu"
        aria-expanded={interactive && open}
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
              onMouseEnter={() => { if (interactive) setOpenChildId(item.id); }}
              onFocus={() => { if (interactive) setOpenChildId(item.id); }}
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
  const interactive = mode !== "editor";

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
            data-submenu-open={interactive && openSubmenuId === item.id ? "true" : undefined}
            key={item.id}
            ref={(el) => { itemRefs.current[item.id] = el; }}
            style={{
              position: "relative",
              listStyle: "none",
              flex: settings.fillItems ? "1 1 0" : "0 0 auto",
            }}
            onPointerEnter={() => { if (interactive) setOpenSubmenuId(item.id); }}
            onPointerMove={() => { if (interactive) setOpenSubmenuId(item.id); }}
            onFocus={() => { if (interactive) setOpenSubmenuId(item.id); }}
            onMouseLeave={() => { if (interactive) setOpenSubmenuId((current) => current === item.id ? null : current); }}
            onKeyDown={(event) => {
              if (interactive && event.key === "Escape") setOpenSubmenuId(null);
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
        <HoverScrollArea interactive={interactive}>{list}</HoverScrollArea>
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
  const interactive = mode !== "editor";

  React.useEffect(() => {
    if (!interactive || !open || typeof document === "undefined" || typeof window === "undefined") return undefined;
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
  }, [interactive, open, settings.hamburgerMode]);

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
          if (interactive) setOpen((value) => !value);
        }}
        aria-label="Toggle menu"
        aria-expanded={interactive && open}
        aria-controls={overlayId}
        style={{ ...buildHamburgerButtonStyle(settings), cursor: interactive ? "pointer" : "default" }}
      >
        <HamburgerBars color="currentColor" variant={settings.itemStyle} />
      </button>
      <MobileMenuOverlay id={overlayId} open={interactive && open} settings={settings} activeItemId={activeItemId} mode={mode} onClose={() => setOpen(false)} />
    </div>
  );
}

export function NavigationMenuRuntime({
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
