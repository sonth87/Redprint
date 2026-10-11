import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionComponent } from "../src/components/Section";
import type { BuilderNode } from "@ui-builder/builder-core";

function makeMockSectionNode(props: Record<string, unknown> = {}, children: BuilderNode[] = []): BuilderNode {
  return {
    id: "section-1",
    type: "Section",
    props: {
      backgroundColor: "#f3f4f6",
      ...props,
    },
    children: children.map((c) => c.id),
  };
}

describe("SectionComponent", () => {
  it("renders section with children in runtimeRenderer", () => {
    const node = makeMockSectionNode();
    const Runtime = SectionComponent.runtimeRenderer as React.FC<{
      node: BuilderNode;
      children?: React.ReactNode;
      style?: React.CSSProperties;
    }>;

    render(
      <Runtime node={node}>
        <div data-testid="section-child">Hero Content</div>
      </Runtime>
    );

    const child = screen.getByTestId("section-child");
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent("Hero Content");
  });

  it("renders in editorRenderer with data-node-id", () => {
    const node = makeMockSectionNode();
    const Editor = SectionComponent.editorRenderer as React.FC<{
      node: BuilderNode;
      children?: React.ReactNode;
      style?: React.CSSProperties;
    }>;

    const { container } = render(
      <Editor node={node}>
        <span>Editor Canvas Section</span>
      </Editor>
    );

    const sectionEl = container.querySelector("[data-node-id='section-1']");
    expect(sectionEl).toBeInTheDocument();
  });

  it("renders top divider SVG when dividerTopType is waves", () => {
    const node = makeMockSectionNode({
      dividerTopType: "waves",
      dividerTopHeight: 80,
    });
    const Runtime = SectionComponent.runtimeRenderer as React.FC<{
      node: BuilderNode;
      children?: React.ReactNode;
      style?: React.CSSProperties;
    }>;

    const { container } = render(<Runtime node={node} />);
    const svgEl = container.querySelector("svg");
    expect(svgEl).toBeInTheDocument();
  });
});
