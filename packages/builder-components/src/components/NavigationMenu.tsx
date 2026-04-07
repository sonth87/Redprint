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
    { key: "fontSize", label: "Font Size", type: "string", default: "14px" },
    { key: "gap", label: "Gap (px)", type: "number", default: 24, min: 4, max: 64 },
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
    fontSize: "14px",
    gap: 24,
  },
  defaultStyle: { width: "100%", padding: "0 16px", display: "flex", alignItems: "center" },
  editorRenderer: ({ node, style }) => {
    const items = Array.isArray(node.props.items) ? (node.props.items as { label: string; href: string }[]) : [];
    const layout = String(node.props.layout ?? "horizontal");
    const textColor = String(node.props.textColor ?? "#111827");
    const fontSize = String(node.props.fontSize ?? "14px");
    const gap = Number(node.props.gap ?? 24);

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

    return (
      <nav
        data-node-id={node.id}
        style={{
          ...(style as React.CSSProperties),
          display: "flex",
          flexDirection: layout === "vertical" ? "column" : "row",
          alignItems: layout === "vertical" ? "flex-start" : "center",
          gap: `${gap}px`,
        }}
      >
        {items.map((item, i) => (
          <a
            key={i}
            href={item.href}
            style={{ color: textColor, fontSize, fontWeight: "500", textDecoration: "none" }}
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
    const [open, setOpen] = React.useState(false);

    if (layout === "hamburger") {
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

    return (
      <nav style={{ ...(style as React.CSSProperties), display: "flex", flexDirection: layout === "vertical" ? "column" : "row", gap: `${gap}px` }}>
        {items.map((item, i) => (
          <a key={i} href={item.href} style={{ color: textColor, fontSize, fontWeight: "500", textDecoration: "none" }}>
            {item.label}
          </a>
        ))}
      </nav>
    );
  },
};
