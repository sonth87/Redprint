import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";

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
    { key: "textColor", label: "Text Color", type: "color", default: "#111827" },
    { key: "activeColor", label: "Active Color", type: "color", default: "#4f46e5" },
    { key: "activeBg", label: "Active Background", type: "color", default: "" },
    { key: "fontSize", label: "Font Size", type: "string", default: "14px" },
    { key: "gap", label: "Gap (px)", type: "number", default: 24, min: 4, max: 64 },
    { key: "activeIndex", label: "Active Item Index", type: "number", default: 0, min: 0, max: 10 },
    {
      key: "itemStyle",
      label: "Item Style",
      type: "select",
      options: [
        { value: "plain", label: "Plain" },
        { value: "boxed", label: "Boxed" },
        { value: "pill", label: "Pill" },
        { value: "underline", label: "Underline" },
        { value: "filled", label: "Filled" },
      ],
      default: "plain",
    },
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
    textColor: "#111827",
    activeColor: "#4f46e5",
    activeBg: "",
    fontSize: "14px",
    gap: 24,
    activeIndex: 0,
    itemStyle: "plain",
    floatingMode: "static",
  },
  defaultStyle: { width: "100%", padding: "0 16px", display: "flex", alignItems: "center" },
  editorRenderer: ({ node, style }) => {
    const items = Array.isArray(node.props.items) ? (node.props.items as { label: string; href: string }[]) : [];
    const layout = String(node.props.layout ?? "horizontal");
    const textColor = String(node.props.textColor ?? "#111827");
    const fontSize = String(node.props.fontSize ?? "14px");
    const gap = Number(node.props.gap ?? 24);
    const activeIndex = Number(node.props.activeIndex ?? 0);
    const itemStyle = String(node.props.itemStyle ?? "plain");
    const activeBg = String(node.props.activeBg ?? "");
    const activeColor = String(node.props.activeColor ?? "#4f46e5");
    const floatingMode = String(node.props.floatingMode ?? "static");

    const getItemStyle = (isActive: boolean, itemIdx: number): React.CSSProperties => {
      const base: React.CSSProperties = {
        color: isActive ? activeColor : textColor,
        fontSize,
        fontWeight: "500",
        textDecoration: "none",
        padding: "8px 12px",
        borderRadius: "4px",
        transition: "all 0.2s",
      };

      if (isActive && activeBg) {
        base.backgroundColor = activeBg;
      }

      if (itemStyle === "boxed" && isActive) {
        base.border = `2px solid ${activeColor}`;
      } else if (itemStyle === "boxed") {
        base.border = "2px solid transparent";
      }

      if (itemStyle === "pill" && isActive) {
        base.backgroundColor = activeColor;
        base.color = "#ffffff";
        base.borderRadius = "24px";
      } else if (itemStyle === "pill") {
        base.backgroundColor = "transparent";
      }

      if (itemStyle === "underline" && isActive) {
        base.borderBottom = `2px solid ${activeColor}`;
      }

      if (itemStyle === "filled" && isActive) {
        base.backgroundColor = activeColor;
        base.color = "#ffffff";
      }

      return base;
    };

    if (layout === "hamburger") {
      return (
        <div data-node-id={node.id} style={{ ...(style as React.CSSProperties), display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "20px", fontWeight: "700", color: textColor }}>LOGO</span>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
            <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
            <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
          </button>
        </div>
      );
    }

    const navStyle: React.CSSProperties = {
      ...(style as React.CSSProperties),
      display: "flex",
      flexDirection: layout === "vertical" ? "column" : "row",
      alignItems: layout === "vertical" ? "flex-start" : "center",
      gap: `${gap}px`,
    };

    if (floatingMode === "sticky") {
      navStyle.position = "sticky";
      navStyle.top = 0;
      navStyle.zIndex = 50;
    } else if (floatingMode === "fixed") {
      navStyle.position = "fixed";
      navStyle.top = 0;
      navStyle.left = 0;
      navStyle.right = 0;
      navStyle.zIndex = 50;
      navStyle.padding = "12px 24px";
    }

    return (
      <nav data-node-id={node.id} style={navStyle}>
        {items.map((item, i) => (
          <a
            key={i}
            href={item.href}
            style={getItemStyle(i === activeIndex, i)}
            onClick={(e) => e.preventDefault()}
          >
            {item.label}
          </a>
        ))}
      </nav>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const items = Array.isArray(node.props.items) ? (node.props.items as { label: string; href: string }[]) : [];
    const layout = String(node.props.layout ?? "horizontal");
    const textColor = String(node.props.textColor ?? "#111827");
    const fontSize = String(node.props.fontSize ?? "14px");
    const gap = Number(node.props.gap ?? 24);
    const activeIndex = Number(node.props.activeIndex ?? 0);
    const itemStyle = String(node.props.itemStyle ?? "plain");
    const activeBg = String(node.props.activeBg ?? "");
    const activeColor = String(node.props.activeColor ?? "#4f46e5");
    const floatingMode = String(node.props.floatingMode ?? "static");
    const [open, setOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);

    // Detect mobile screen size
    React.useEffect(() => {
      if (typeof window === "undefined") return undefined;
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Auto-switch to hamburger on mobile for horizontal layout
    const effectiveLayout = layout === "horizontal" && isMobile ? "hamburger" : layout;

    const getItemStyle = (isActive: boolean, itemIdx: number): React.CSSProperties => {
      const base: React.CSSProperties = {
        color: isActive ? activeColor : textColor,
        fontSize,
        fontWeight: "500",
        textDecoration: "none",
        padding: "8px 12px",
        borderRadius: "4px",
        transition: "all 0.2s",
      };

      if (isActive && activeBg) {
        base.backgroundColor = activeBg;
      }

      if (itemStyle === "boxed" && isActive) {
        base.border = `2px solid ${activeColor}`;
      } else if (itemStyle === "boxed") {
        base.border = "2px solid transparent";
      }

      if (itemStyle === "pill" && isActive) {
        base.backgroundColor = activeColor;
        base.color = "#ffffff";
        base.borderRadius = "24px";
      } else if (itemStyle === "pill") {
        base.backgroundColor = "transparent";
      }

      if (itemStyle === "underline" && isActive) {
        base.borderBottom = `2px solid ${activeColor}`;
      }

      if (itemStyle === "filled" && isActive) {
        base.backgroundColor = activeColor;
        base.color = "#ffffff";
      }

      return base;
    };

    if (effectiveLayout === "hamburger") {
      return (
        <div style={{ ...(style as React.CSSProperties), position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "700", color: textColor }}>LOGO</span>
            <button style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
              <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
              <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
              <span style={{ display: "block", width: 22, height: 2, background: textColor, margin: "4px 0" }} />
            </button>
          </div>
          {open && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, zIndex: 100 }}>
              {items.map((item, i) => (
                <a key={i} href={item.href} style={{ display: "block", color: textColor, fontSize, padding: "8px 0", textDecoration: "none" }}>
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    }

    const navStyle: React.CSSProperties = {
      ...(style as React.CSSProperties),
      display: "flex",
      flexDirection: effectiveLayout === "vertical" ? "column" : "row",
      gap: `${gap}px`,
      alignItems: effectiveLayout === "vertical" ? "flex-start" : "center",
    };

    if (floatingMode === "sticky") {
      navStyle.position = "sticky";
      navStyle.top = 0;
      navStyle.zIndex = 50;
    } else if (floatingMode === "fixed") {
      navStyle.position = "fixed";
      navStyle.top = 0;
      navStyle.left = 0;
      navStyle.right = 0;
      navStyle.zIndex = 50;
      navStyle.padding = "12px 24px";
    }

    return (
      <nav style={navStyle}>
        {items.map((item, i) => (
          <a key={i} href={item.href} style={getItemStyle(i === activeIndex, i)}>
            {item.label}
          </a>
        ))}
      </nav>
    );
  },
};
