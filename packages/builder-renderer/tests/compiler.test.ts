import { describe, expect, it } from "vitest";
import type { BuilderDocument } from "@ui-builder/builder-core";
import {
  compileDocumentStyles,
  compileNodeToHtml,
  exportDocumentToStaticHtml,
} from "../src/compiler";

describe("Static Compiler", () => {
  const sampleDoc: BuilderDocument = {
    id: "doc-1",
    version: "1.0.0",
    rootNodeId: "root-section",
    nodes: {
      "root-section": {
        id: "root-section",
        type: "Section",
        parentId: null,
        order: 0,
        props: {},
        interactions: [],
        style: {
          backgroundColor: "#f9fafb",
          padding: "40px 20px",
        },
        responsiveStyle: {
          mobile: {
            padding: "20px 10px",
          },
        },
      },
      "heading-1": {
        id: "heading-1",
        type: "Text",
        parentId: "root-section",
        order: 0,
        interactions: [],
        props: {
          tag: "h1",
          text: "Welcome to Our Platform",
        },
        style: {
          fontSize: "36px",
          color: "#111827",
        },
        responsiveStyle: {
          mobile: {
            fontSize: "24px",
          },
        },
      },
      "btn-cta": {
        id: "btn-cta",
        type: "Button",
        parentId: "root-section",
        order: 1,
        interactions: [],
        props: {
          text: "Get Started Free",
          href: "https://example.com/signup",
          target: "_blank",
        },
        style: {
          backgroundColor: "#2563eb",
          color: "#ffffff",
          borderRadius: "8px",
        },
      },
      "hero-img": {
        id: "hero-img",
        type: "Image",
        parentId: "root-section",
        order: 2,
        interactions: [],
        props: {
          src: "https://example.com/hero.webp",
          alt: "Platform Hero Image",
        },
        style: {
          width: "100%",
        },
      },
    },
  };

  it("compiles document styles with base and responsive media query blocks", () => {
    const css = compileDocumentStyles(sampleDoc);

    // Checks base selectors
    expect(css).toContain(".ub-node-root-section {");
    expect(css).toContain("background-color: #f9fafb;");
    expect(css).toContain(".ub-node-heading-1 {");
    expect(css).toContain("font-size: 36px;");
    expect(css).toContain("color: #111827;");

    // Checks mobile media query
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("padding: 20px 10px;");
    expect(css).toContain("font-size: 24px;");

    // Checks scoped reset
    expect(css).toContain(".ui-builder-scope");
  });

  it("compiles nodes to semantic HTML without React synthetic attributes", () => {
    const html = compileNodeToHtml("root-section", sampleDoc);

    // Section container
    expect(html).toContain('<section class="ub-node-root-section">');

    // Heading tag
    expect(html).toContain('<h1 class="ub-node-heading-1">Welcome to Our Platform</h1>');

    // Button with href compiled as link
    expect(html).toContain('<a href="https://example.com/signup" target="_blank" class="ub-node-btn-cta" role="button">Get Started Free</a>');

    // Image with SEO & CWV attributes
    expect(html).toContain('<img src="https://example.com/hero.webp" alt="Platform Hero Image" loading="lazy" decoding="async" class="ub-node-hero-img" />');

    // No React attributes
    expect(html).not.toContain("data-reactroot");
    expect(html).not.toContain("react-key");
  });

  it("exports full standalone HTML document ready for static hosting", () => {
    const result = exportDocumentToStaticHtml({
      document: sampleDoc,
      title: "Fast Landing Page",
      meta: {
        description: "Official landing page description",
      },
    });

    expect(result.html).toContain("<section");
    expect(result.css).toContain(".ub-node-root-section");
    expect(result.combinedHtml).toContain("<!DOCTYPE html>");
    expect(result.combinedHtml).toContain("<title>Fast Landing Page</title>");
    expect(result.combinedHtml).toContain('<meta name="description" content="Official landing page description" />');
    expect(result.combinedHtml).toContain('<div class="ui-builder-scope">');
    expect(result.combinedHtml).toContain("</html>");
  });
});
