import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import * as LucideIcons from "lucide-react";
import { sanitizeHtml } from "../utils/sanitize";

function getLucideIcon(name: string): React.ElementType {
  const pascal = name
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");

  return (LucideIcons as Record<string, unknown>)[pascal] as React.ElementType ?? LucideIcons.Circle;
}

type ButtonIconPosition = "start" | "end";

function extractPlainText(html: string): string {
  return sanitizeHtml(html).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function renderButtonContent(labelHtml: string, iconName?: string, iconPosition: ButtonIconPosition = "start") {
  const plainLabel = extractPlainText(labelHtml);

  if (!iconName) {
    return (
      // eslint-disable-next-line react/no-danger
      <span
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(labelHtml) }}
      />
    );
  }

  const Icon = getLucideIcon(iconName);
  const hasLabel = plainLabel.length > 0;

  if (!hasLabel) {
    return (
      <span
        aria-hidden="true"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 0 }}
      >
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
      </span>
    );
  }

  return (
    <>
      {iconPosition === "start" ? <Icon size={16} strokeWidth={2} aria-hidden="true" /> : null}
      {hasLabel ? (
        // eslint-disable-next-line react/no-danger
        <span
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(labelHtml) }}
        />
      ) : null}
      {iconPosition === "end" && hasLabel ? <Icon size={16} strokeWidth={2} aria-hidden="true" /> : null}
    </>
  );
}

export const ButtonComponent: ComponentDefinition = {
  type: "Button",
  name: "Button",
  category: "interactive",
  group: "button",
  subGroup: "button-single",
  description: "A clickable button element.",
  version: "1.0.0",
  tags: ["button", "action", "cta"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: false,
    canBeHidden: true,
    canBeLocked: true,
    inlineEditable: true,
  },
  aiHints: {
    purpose: "Clickable call-to-action.",
    bestFor: ["primary CTA", "secondary CTA", "booking buttons"],
    sectionAffinity: ["header", "hero", "services", "pricing", "cta", "footer"],
    contentSlots: { ctaLabel: "label" },
    fallbackTo: ["Text"],
    examples: ["Primary hero CTA with variant=\"primary\"", "Secondary CTA with variant=\"outline\""],
  },
  propSchema: [
    {
      key: "label",
      label: "Label",
      type: "richtext",
      required: true,
      toolbar: { bold: true, italic: false, underline: false, strikethrough: false, link: false, align: false },
    },
    {
      key: "variant",
      label: "Variant",
      type: "select",
      options: [
        { value: "primary", label: "Primary" },
        { value: "secondary", label: "Secondary" },
        { value: "outline", label: "Outline" },
        { value: "ghost", label: "Ghost" },
        { value: "destructive", label: "Destructive" },
      ],
      default: "primary",
    },
    {
      key: "icon",
      label: "Icon",
      type: "icon",
    },
    {
      key: "iconPosition",
      label: "Icon Position",
      type: "select",
      options: [
        { value: "start", label: "Before text" },
        { value: "end", label: "After text" },
      ],
      default: "start",
    },
    {
      key: "size",
      label: "Size",
      type: "select",
      options: [
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
        { value: "lg", label: "Large" },
      ],
      default: "md",
    },
    { key: "disabled", label: "Disabled", type: "boolean", default: false },
    {
      key: "buttonType",
      label: "Button Type",
      type: "select",
      options: [
        { value: "button", label: "Button (default)" },
        { value: "submit", label: "Submit (inside a Form)" },
      ],
      default: "button",
      description: "Set to \"Submit\" for a Button placed inside a Form (roadmap 03/04) — it submits the form instead of just being clickable.",
    },
    { key: "hoverStyle", label: "Hover Style (JSON)", type: "json" },
  ],
  defaultProps: { label: "<p>Click me</p>", variant: "primary", iconPosition: "start", size: "md", disabled: false, buttonType: "button", hoverStyle: {} },
  defaultStyle: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "6px",
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    border: "none",
    backgroundColor: "#111827",
    color: "#ffffff",
    lineHeight: "1",
  },
  editorRenderer: ({ node, style }) => {
    const labelHtml = String(node.props.label ?? "<p>Button</p>");
    const iconName = typeof node.props.icon === "string" ? node.props.icon : undefined;
    const iconPosition = node.props.iconPosition === "end" ? "end" : "start";
    return (
      <button
        type="button"
        data-node-id={node.id}
        style={{ appearance: "none", WebkitAppearance: "none", ...(style as React.CSSProperties) }}
        disabled={Boolean(node.props.disabled)}
        className="select-none"
      >
        {renderButtonContent(labelHtml, iconName, iconPosition)}
      </button>
    );
  },
  runtimeRenderer: ({ node, style }) => {
    const [hovered, setHovered] = React.useState(false);
    const hs = (node.props.hoverStyle ?? {}) as React.CSSProperties;
    const labelHtml = String(node.props.label ?? "<p>Button</p>");
    const iconName = typeof node.props.icon === "string" ? node.props.icon : undefined;
    const iconPosition = node.props.iconPosition === "end" ? "end" : "start";
    // buttonType (roadmap 03/04): "submit" lets a Button inside a Form trigger
    // its onSubmit pipeline; editor mode always stays type="button" (see above)
    // so nothing submits while authoring on the canvas.
    const buttonType = node.props.buttonType === "submit" ? "submit" : "button";
    return (
      <button
        type={buttonType}
        style={{ appearance: "none", WebkitAppearance: "none", ...(style as React.CSSProperties), ...(hovered ? hs : {}) }}
        disabled={Boolean(node.props.disabled)}
        className="transition-all"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {renderButtonContent(labelHtml, iconName, iconPosition)}
      </button>
    );
  },
};
