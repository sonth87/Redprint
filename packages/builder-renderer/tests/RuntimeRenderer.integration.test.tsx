import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RuntimeRenderer } from "../src/RuntimeRenderer";
import { ComponentRegistry, type BuilderDocument, type ComponentDefinition } from "@ui-builder/builder-core";

const MockButtonComponent: ComponentDefinition = {
  type: "Button",
  name: "Button",
  category: "interactive",
  capabilities: { canContainChildren: false },
  propSchema: [{ key: "label", label: "Label", type: "string" }],
  defaultProps: { label: "Click here" },
  runtimeRenderer: ({ node, style }) => (
    <button style={style as React.CSSProperties}>
      {String(node.props.label ?? "Default")}
    </button>
  ),
};

const MockSectionComponent: ComponentDefinition = {
  type: "Section",
  name: "Section",
  category: "layout",
  capabilities: { canContainChildren: true },
  propSchema: [],
  defaultProps: {},
  runtimeRenderer: ({ children, style }) => (
    <section style={style as React.CSSProperties}>
      {children as React.ReactNode}
    </section>
  ),
};

function createMockDocument(): BuilderDocument {
  return {
    id: "doc-1",
    name: "Production Page",
    schemaVersion: "2.7.0",
    rootNodeId: "section-1",
    nodes: {
      "section-1": {
        id: "section-1",
        type: "Section",
        parentId: null,
        order: 0,
        props: {},
        style: { backgroundColor: "#ffffff", padding: "32px" },
        responsiveStyle: {},
        interactions: [],
      },
      "button-1": {
        id: "button-1",
        type: "Button",
        parentId: "section-1",
        order: 0,
        props: { label: "Explore Platform" },
        style: { color: "#ffffff", backgroundColor: "#2563eb" },
        responsiveStyle: {},
        interactions: [],
      },
    },
    variables: {},
    metadata: { createdAt: "2026-01-01", updatedAt: "2026-01-01" },
  };
}

describe("RuntimeRenderer Integration", () => {
  it("renders a full document tree using registered components", () => {
    const registry = new ComponentRegistry();
    registry.registerComponent(MockSectionComponent);
    registry.registerComponent(MockButtonComponent);

    const doc = createMockDocument();

    render(<RuntimeRenderer document={doc} registry={registry} />);

    const button = screen.getByRole("button", { name: /explore platform/i });
    expect(button).toBeInTheDocument();
  });

  it("attaches data-node-id when attachNodeIds is true in config", () => {
    const registry = new ComponentRegistry();
    registry.registerComponent(MockSectionComponent);
    registry.registerComponent(MockButtonComponent);

    const doc = createMockDocument();

    const { container } = render(
      <RuntimeRenderer
        document={doc}
        registry={registry}
        config={{ attachNodeIds: true }}
      />
    );

    const button = container.querySelector("[data-node-id='button-1']");
    expect(button).toBeInTheDocument();
  });

  it("renders fallback placeholder for unregistered components without throwing", () => {
    const registry = new ComponentRegistry();
    // Do NOT register MockButtonComponent

    const doc = createMockDocument();

    expect(() => {
      render(<RuntimeRenderer document={doc} registry={registry} />);
    }).not.toThrow();

    // Default missing component fallback text
    expect(screen.getByText(/unknown component/i)).toBeInTheDocument();
  });
});
