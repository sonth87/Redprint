import React from "react";
import type { ComponentDefinition, ComponentRenderer } from "@ui-builder/builder-core";

type RendererProps = Parameters<ComponentRenderer>[0];
type MenuItem = { label: string; href: string };

function buildItemStyle(
  isActive: boolean,
  itemStyle: string,
  textColor: string,
  activeColor: string,
  activeBg: string,
  itemBg: string,
  fontSize: string,
  letterSpacing: string,
): React.CSSProperties {
  const base: React.CSSProperties = {
    color: isActive ? activeColor : textColor,
    fontSize,
    fontWeight: "500",
    textDecoration: "none",
    padding: "8px 12px",
    borderRadius: "4px",
    transition: "all 0.2s",
    display: "inline-block",
    cursor: "pointer",
    ...(letterSpacing ? { letterSpacing } : {}),
    ...(itemBg && !isActive ? { backgroundColor: itemBg } : {}),
    ...(isActive && activeBg ? { backgroundColor: activeBg } : {}),
  };

  switch (itemStyle) {
    case "boxed":
      base.border = isActive ? `2px solid ${activeColor}` : "2px solid transparent";
      break;
    case "boxed-all":
      base.border = `2px solid ${isActive ? activeColor : textColor}`;
      break;
    case "pill":
      base.borderRadius = "24px";
      if (isActive) { base.backgroundColor = activeColor; base.color = "#fff"; }
      break;
    case "pill-outlined":
      base.borderRadius = "12px";
      base.border = isActive ? `2px solid ${activeColor}` : "2px solid transparent";
      if (isActive) { base.backgroundColor = activeBg || "#fff"; base.color = activeColor; }
      break;
    case "pill-all":
      base.borderRadius = "24px";
      if (itemBg) base.backgroundColor = itemBg;
      base.border = isActive ? `2px solid ${activeColor}` : "2px solid transparent";
      if (isActive) base.color = activeColor;
      break;
    case "underline":
      base.borderRadius = "0";
      base.padding = "8px 4px";
      if (isActive) base.borderBottom = `2px solid ${activeColor}`;
      break;
    case "underline-all":
      base.textDecoration = "underline";
      break;
    case "filled":
      if (isActive) { base.backgroundColor = activeColor; base.color = "#fff"; }
      break;
    case "button-all":
      base.backgroundColor = activeColor;
      base.color = "#fff";
      base.border = isActive ? "2px solid #fff" : "2px solid transparent";
      break;
  }

  return base;
}

function HamburgerBars({ color }: { color: string }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ display: "block", width: 22, height: 2, background: color, margin: "4px 0" }} />
      ))}
    </>
  );
}

export const NavigationMenuComponent: ComponentDefinition = {
  type: "NavigationMenu",
  name: "Navigation Menu",
  category: "navigation",
  group: "menu",
  subGroup: "menu-horizontal",
  description: "Responsive navigation: horizontal on desktop, hamburger on mobile.",
  version: "1.0.0",
  tags: ["menu", "navigation", "nav", "header", "hamburger", "responsive"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "items", label: "Menu Items (JSON array of {label, href})", type: "json" },
    {
      key: "layout",
      label: "Layout",
      type: "select",
      options: [
        { value: "horizontal", label: "Horizontal" },
        { value: "vertical", label: "Vertical" },
        { value: "hamburger", label: "Hamburger" },
      ],
      default: "horizontal",
    },
    {
      key: "mobileHamburger",
      label: "Hamburger on Mobile",
      type: "boolean",
      default: true,
      description: "Auto-switch to hamburger menu on mobile screens (<768px)",
    },
    {
      key: "itemStyle",
      label: "Item Style",
      type: "select",
      options: [
        { value: "plain", label: "Plain" },
        { value: "underline", label: "Underline (active)" },
        { value: "underline-all", label: "Underline All" },
        { value: "boxed", label: "Boxed (active)" },
        { value: "boxed-all", label: "Boxed All" },
        { value: "pill", label: "Pill (active filled)" },
        { value: "pill-outlined", label: "Pill Outlined (active)" },
        { value: "pill-all", label: "Pill All" },
        { value: "filled", label: "Filled (active)" },
        { value: "button-all", label: "Button All" },
      ],
      default: "plain",
    },
    { key: "textColor", label: "Text Color", type: "color", default: "#111827" },
    { key: "activeColor", label: "Active Color", type: "color", default: "#4f46e5" },
    { key: "activeBg", label: "Active Item Background", type: "color", default: "" },
    { key: "itemBg", label: "Item Background", type: "color", default: "" },
    { key: "navBg", label: "Nav Background", type: "color", default: "" },
    { key: "navBorder", label: "Nav Border (CSS)", type: "string", default: "" },
    { key: "navBorderRadius", label: "Nav Border Radius", type: "string", default: "" },
    { key: "navPadding", label: "Nav Padding", type: "string", default: "" },
    { key: "fontSize", label: "Font Size", type: "string", default: "14px" },
    { key: "letterSpacing", label: "Letter Spacing", type: "string", default: "" },
    { key: "gap", label: "Gap", type: "number", default: 24, min: 4, max: 64, step: 4, unit: "px" },
    { key: "activeIndex", label: "Active Item Index", type: "number", default: 0, min: 0, max: 20 },
    {
      key: "floatingMode",
      label: "Floating Mode",
      type: "select",
      options: [
        { value: "static", label: "Static" },
        { value: "sticky", label: "Sticky (top)" },
        { value: "fixed", label: "Fixed (top)" },
      ],
      default: "static",
    },
  ],
  defaultProps: {
    items: [
      { label: "Home", href: "#" },
      { label: "About", href: "#" },
      { label: "Services", href: "#" },
      { label: "Contact", href: "#" },
    ],
    layout: "horizontal",
    mobileHamburger: true,
    textColor: "#111827",
    activeColor: "#4f46e5",
    activeBg: "",
    itemBg: "",
    navBg: "",
    navBorder: "",
    navBorderRadius: "",
    navPadding: "",
    fontSize: "14px",
    letterSpacing: "",
    gap: 24,
    activeIndex: 0,
    itemStyle: "plain",
    floatingMode: "static",
  },
  defaultStyle: { width: "100%", padding: "0 16px", display: "flex", alignItems: "center" },
  editorRenderer: ({ node, style }) => {
    const items = Array.isArray(node.props.items) ? (node.props.items as MenuItem[]) : [];
    const layout = String(node.props.layout ?? "horizontal");
    const textColor = String(node.props.textColor ?? "#111827");
    const fontSize = String(node.props.fontSize ?? "14px");
    const letterSpacing = String(node.props.letterSpacing ?? "");
    const gap = Number(node.props.gap ?? 24);
    const activeIndex = Number(node.props.activeIndex ?? 0);
    const itemStyle = String(node.props.itemStyle ?? "plain");
    const activeBg = String(node.props.activeBg ?? "");
    const itemBg = String(node.props.itemBg ?? "");
    const activeColor = String(node.props.activeColor ?? "#4f46e5");
    const navBg = String(node.props.navBg ?? "");
    const navBorder = String(node.props.navBorder ?? "");
    const navBorderRadius = String(node.props.navBorderRadius ?? "");
    const navPadding = String(node.props.navPadding ?? "");
    const floatingMode = String(node.props.floatingMode ?? "static");

    const getItemStyle = (isActive: boolean) =>
      buildItemStyle(isActive, itemStyle, textColor, activeColor, activeBg, itemBg, fontSize, letterSpacing);

    const containerStyle: React.CSSProperties = {
      ...(style as React.CSSProperties),
      ...(navBg ? { backgroundColor: navBg } : {}),
      ...(navBorder ? { border: navBorder } : {}),
      ...(navBorderRadius ? { borderRadius: navBorderRadius } : {}),
      ...(navPadding ? { padding: navPadding } : {}),
    };

    if (layout === "hamburger") {
      return (
        <div data-node-id={node.id} style={{ ...containerStyle, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <HamburgerBars color={textColor} />
          </button>
        </div>
      );
    }

    const navStyle: React.CSSProperties = {
      ...containerStyle,
      display: "flex",
      flexDirection: layout === "vertical" ? "column" : "row",
      alignItems: layout === "vertical" ? "flex-start" : "center",
      gap: `${gap}px`,
    };

    if (floatingMode === "sticky") { navStyle.position = "sticky"; navStyle.top = 0; navStyle.zIndex = 50; }
    else if (floatingMode === "fixed") { navStyle.position = "fixed"; navStyle.top = 0; navStyle.left = 0; navStyle.right = 0; navStyle.zIndex = 50; }

    return (
      <nav data-node-id={node.id} style={navStyle}>
        {items.map((item, i) => (
          <a key={i} href={item.href} style={getItemStyle(i === activeIndex)} onClick={(e) => e.preventDefault()}>
            {item.label}
          </a>
        ))}
      </nav>
    );
  },
  runtimeRenderer: (props) => <NavigationMenuRuntime {...props} />,
};

function NavigationMenuRuntime({ node, style }: RendererProps) {
    const items = Array.isArray(node.props.items) ? (node.props.items as MenuItem[]) : [];
    const layout = String(node.props.layout ?? "horizontal");
    const mobileHamburger = node.props.mobileHamburger !== false;
    const textColor = String(node.props.textColor ?? "#111827");
    const fontSize = String(node.props.fontSize ?? "14px");
    const letterSpacing = String(node.props.letterSpacing ?? "");
    const gap = Number(node.props.gap ?? 24);
    const activeIndex = Number(node.props.activeIndex ?? 0);
    const itemStyle = String(node.props.itemStyle ?? "plain");
    const activeBg = String(node.props.activeBg ?? "");
    const itemBg = String(node.props.itemBg ?? "");
    const activeColor = String(node.props.activeColor ?? "#4f46e5");
    const navBg = String(node.props.navBg ?? "");
    const navBorder = String(node.props.navBorder ?? "");
    const navBorderRadius = String(node.props.navBorderRadius ?? "");
    const navPadding = String(node.props.navPadding ?? "");
    const floatingMode = String(node.props.floatingMode ?? "static");

    const [open, setOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }, []);

    const effectiveLayout = layout === "horizontal" && isMobile && mobileHamburger ? "hamburger" : layout;

    const getItemStyle = (isActive: boolean) =>
      buildItemStyle(isActive, itemStyle, textColor, activeColor, activeBg, itemBg, fontSize, letterSpacing);

    const containerStyle: React.CSSProperties = {
      ...(style as React.CSSProperties),
      ...(navBg ? { backgroundColor: navBg } : {}),
      ...(navBorder ? { border: navBorder } : {}),
      ...(navBorderRadius ? { borderRadius: navBorderRadius } : {}),
      ...(navPadding ? { padding: navPadding } : {}),
    };

    if (effectiveLayout === "hamburger") {
      const dropdownStyle: React.CSSProperties = {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: `${gap}px`,
        ...(navBg ? { backgroundColor: navBg } : { backgroundColor: "#fff" }),
        ...(navBorder ? { border: navBorder } : { border: "1px solid #e5e7eb" }),
        ...(navBorderRadius ? { borderRadius: navBorderRadius } : { borderRadius: "8px" }),
      };

      return (
        <div style={{ position: "relative", ...containerStyle, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <HamburgerBars color={textColor} />
          </button>
          {open && (
            <div style={dropdownStyle} role="menu">
              {items.map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  role="menuitem"
                  style={{ ...getItemStyle(i === activeIndex), display: "block", textDecoration: "none" }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    }

    const navStyle: React.CSSProperties = {
      ...containerStyle,
      display: "flex",
      flexDirection: effectiveLayout === "vertical" ? "column" : "row",
      gap: `${gap}px`,
      alignItems: effectiveLayout === "vertical" ? "flex-start" : "center",
    };

    if (floatingMode === "sticky") { navStyle.position = "sticky"; navStyle.top = 0; navStyle.zIndex = 50; }
    else if (floatingMode === "fixed") { navStyle.position = "fixed"; navStyle.top = 0; navStyle.left = 0; navStyle.right = 0; navStyle.zIndex = 50; }

    return (
      <nav style={navStyle}>
        {items.map((item, i) => (
          <a key={i} href={item.href} style={getItemStyle(i === activeIndex)}>
            {item.label}
          </a>
        ))}
      </nav>
    );
}
