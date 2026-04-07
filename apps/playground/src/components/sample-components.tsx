/**
 * Custom component definitions for the playground.
 *
 * These are project-specific components that EXTEND the base library from
 * `@ui-builder/builder-components`. They demonstrate that you can compose your
 * own component types on top of the base set and register them alongside it.
 *
 * Pattern:
 *   import { extendComponent, TextComponent } from "@ui-builder/builder-components";
 *   export const MyComponent = extendComponent(TextComponent, { type: "my-component", ... });
 *
 * or build from scratch using defineComponent / ComponentDefinition directly.
 */
import React from "react";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import { extendComponent, TextComponent } from "@ui-builder/builder-components";

// ── Testimonial Card ─────────────────────────────────────────────────────
// A card showing a pull-quote, the author name, role and avatar initial.

export const TestimonialCardComponent: ComponentDefinition = {
  type: "TestimonialCard",
  name: "Testimonial Card",
  category: "content",
  group: "card",
  subGroup: "testimonial",
  description: "Displays a customer quote with author name, role and avatar initial.",
  version: "1.0.0",
  tags: ["testimonial", "quote", "review", "card", "social-proof"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: false,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "quote", label: "Quote", type: "string", default: "This product changed our workflow completely. Highly recommended!" },
    { key: "author", label: "Author Name", type: "string", default: "Jane Smith" },
    { key: "role", label: "Author Role", type: "string", default: "Product Manager, Acme Corp" },
    { key: "accentColor", label: "Accent Color", type: "color", default: "#4f46e5" },
    { key: "bgColor", label: "Background", type: "color", default: "#ffffff" },
    { key: "starCount", label: "Stars (0-5)", type: "number", default: 5, min: 0, max: 5 },
  ],
  defaultProps: {
    quote: "This product changed our workflow completely. Highly recommended!",
    author: "Jane Smith",
    role: "Product Manager, Acme Corp",
    accentColor: "#4f46e5",
    bgColor: "#ffffff",
    starCount: 5,
  },
  defaultStyle: { width: "320px", padding: "24px", borderRadius: "12px" },
  editorRenderer: ({ node, style }) => <TestimonialCardView node={node} style={style} />,
  runtimeRenderer: ({ node, style }) => <TestimonialCardView node={node} style={style} />,
};

function TestimonialCardView({ node, style }: { node: { id?: string; props: Record<string, unknown> }; style: unknown }) {
  const quote = String(node.props.quote ?? "");
  const author = String(node.props.author ?? "");
  const role = String(node.props.role ?? "");
  const accent = String(node.props.accentColor ?? "#4f46e5");
  const bg = String(node.props.bgColor ?? "#ffffff");
  const stars = Math.min(5, Math.max(0, Number(node.props.starCount ?? 5)));

  return (
    <div
      data-node-id={"id" in node ? String(node.id) : undefined}
      style={{
        ...(style as React.CSSProperties),
        background: bg,
        boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
        fontFamily: "inherit",
      }}
    >
      <div style={{ marginBottom: 12, letterSpacing: 2, color: accent, fontSize: 14 }}>
        {"★".repeat(stars)}{"☆".repeat(5 - stars)}
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: 1.6, color: "#374151", fontStyle: "italic" }}>
        &ldquo;{quote}&rdquo;
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: accent, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 14, flexShrink: 0,
        }}>
          {author.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{author}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{role}</div>
        </div>
      </div>
    </div>
  );
}

// ── Pricing Card ─────────────────────────────────────────────────────────
// A single pricing tier card with plan name, price, feature list, and CTA button.

export const PricingCardComponent: ComponentDefinition = {
  type: "PricingCard",
  name: "Pricing Card",
  category: "content",
  group: "card",
  subGroup: "pricing",
  description: "A pricing tier card with plan name, price, features list and a CTA button.",
  version: "1.0.0",
  tags: ["pricing", "plan", "tier", "card", "cta", "features"],
  capabilities: {
    canContainChildren: false,
    canResize: true,
    canTriggerEvents: true,
    canBindData: true,
    canBeHidden: true,
    canBeLocked: true,
  },
  propSchema: [
    { key: "planName", label: "Plan Name", type: "string", default: "Pro" },
    { key: "price", label: "Price", type: "string", default: "$49" },
    { key: "period", label: "Billing Period", type: "string", default: "/ month" },
    { key: "description", label: "Description", type: "string", default: "Everything you need to grow your business." },
    { key: "features", label: "Features (one per line)", type: "string", default: "Unlimited projects\n10 team members\nPriority support\nAdvanced analytics\nCustom domains" },
    { key: "ctaLabel", label: "CTA Button Label", type: "string", default: "Get started" },
    { key: "accentColor", label: "Accent Color", type: "color", default: "#4f46e5" },
    { key: "highlighted", label: "Highlighted (popular)", type: "boolean", default: false },
  ],
  defaultProps: {
    planName: "Pro",
    price: "$49",
    period: "/ month",
    description: "Everything you need to grow your business.",
    features: "Unlimited projects\n10 team members\nPriority support\nAdvanced analytics\nCustom domains",
    ctaLabel: "Get started",
    accentColor: "#4f46e5",
    highlighted: false,
  },
  defaultStyle: { width: "280px", padding: "28px 24px", borderRadius: "16px" },
  editorRenderer: ({ node, style }) => <PricingCardView node={node} style={style} />,
  runtimeRenderer: ({ node, style }) => <PricingCardView node={node} style={style} />,
};

function PricingCardView({ node, style }: { node: { id?: string; props: Record<string, unknown> }; style: unknown }) {
  const planName = String(node.props.planName ?? "Pro");
  const price = String(node.props.price ?? "$49");
  const period = String(node.props.period ?? "/ month");
  const description = String(node.props.description ?? "");
  const rawFeatures = String(node.props.features ?? "");
  const features = rawFeatures.split("\n").filter(Boolean);
  const ctaLabel = String(node.props.ctaLabel ?? "Get started");
  const accent = String(node.props.accentColor ?? "#4f46e5");
  const highlighted = Boolean(node.props.highlighted);

  return (
    <div
      data-node-id={"id" in node ? String(node.id) : undefined}
      style={{
        ...(style as React.CSSProperties),
        background: highlighted ? accent : "#ffffff",
        color: highlighted ? "#fff" : "#111827",
        border: highlighted ? "none" : "1px solid #e5e7eb",
        boxShadow: highlighted ? `0 8px 32px ${accent}50` : "0 2px 8px rgba(0,0,0,0.06)",
        fontFamily: "inherit",
      }}
    >
      {highlighted && (
        <div style={{
          display: "inline-block", marginBottom: 12, padding: "2px 10px",
          background: "rgba(255,255,255,0.25)", borderRadius: 999,
          fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
        }}>
          MOST POPULAR
        </div>
      )}
      <div style={{ marginBottom: 4, fontSize: 16, fontWeight: 700 }}>{planName}</div>
      <div style={{ marginBottom: 8, opacity: 0.7, fontSize: 13 }}>{description}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
        <span style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: 13, opacity: 0.65 }}>{period}</span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{
              width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
              background: highlighted ? "rgba(255,255,255,0.3)" : `${accent}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 900, color: highlighted ? "#fff" : accent,
            }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <button style={{
        width: "100%", padding: "10px 0", borderRadius: 8, border: "none", cursor: "pointer",
        fontWeight: 600, fontSize: 14,
        background: highlighted ? "rgba(255,255,255,0.2)" : accent,
        color: "#fff",
        transition: "opacity 0.15s",
      }}>
        {ctaLabel}
      </button>
    </div>
  );
}

// ── Hero Banner ─────────────────────────────────────────────────────────
// Extends the base TextComponent to create a large hero heading block with
// a gradient background -- demonstrates extendComponent() usage.

export const HeroBannerComponent: ComponentDefinition = extendComponent(TextComponent, {
  type: "HeroBanner",
  name: "Hero Banner",
  category: "content",
  group: "text",
  subGroup: "heading",
  description:
    "A large hero heading block with a configurable gradient background. " +
    "Built via extendComponent(TextComponent, ...) -- inherits all text props.",
  version: "1.0.0",
  defaultProps: {
    ...TextComponent.defaultProps,
    text: "Build faster,\nship smarter.",
    fontSize: "52px",
    fontWeight: "800",
    textAlign: "center",
    color: "#fff",
    lineHeight: "1.15",
    gradientFrom: "#4f46e5",
    gradientTo: "#7c3aed",
  },
  defaultStyle: {
    width: "100%",
    padding: "80px 40px",
    textAlign: "center",
  },
  propSchema: [
    ...(TextComponent.propSchema ?? []),
    { key: "gradientFrom", label: "Gradient Start", type: "color", default: "#4f46e5" },
    { key: "gradientTo", label: "Gradient End", type: "color", default: "#7c3aed" },
  ],
  editorRenderer: ({ node, style }) => <HeroBannerView node={node} style={style} />,
  runtimeRenderer: ({ node, style }) => <HeroBannerView node={node} style={style} />,
});

function HeroBannerView({ node, style }: { node: { id?: string; props: Record<string, unknown> }; style: unknown }) {
  const text = String(node.props.text ?? "");
  const fontSize = String(node.props.fontSize ?? "52px");
  const fontWeight = String(node.props.fontWeight ?? "800");
  const color = String(node.props.color ?? "#fff");
  const textAlign = String(node.props.textAlign ?? "center") as React.CSSProperties["textAlign"];
  const lineHeight = String(node.props.lineHeight ?? "1.15");
  const gradientFrom = String(node.props.gradientFrom ?? "#4f46e5");
  const gradientTo = String(node.props.gradientTo ?? "#7c3aed");

  return (
    <div
      data-node-id={"id" in node ? String(node.id) : undefined}
      style={{
        ...(style as React.CSSProperties),
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
      }}
    >
      <div style={{ fontSize, fontWeight, color, textAlign, lineHeight, whiteSpace: "pre-line" }}>
        {text}
      </div>
    </div>
  );
}

// ── Aggregated export ─────────────────────────────────────────────────────
// Register these alongside BASE_COMPONENTS in useBuilderSetup.ts / App.tsx.

export const CUSTOM_COMPONENTS: ComponentDefinition[] = [
  TestimonialCardComponent,
  PricingCardComponent,
  HeroBannerComponent,
];
