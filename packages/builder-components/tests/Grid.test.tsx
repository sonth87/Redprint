import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridComponent } from "../src/components/Grid";
import type { BuilderNode } from "@ui-builder/builder-core";

function makeMockGridNode(props: Record<string, unknown> = {}): BuilderNode {
  return {
    id: "grid-1",
    type: "Grid",
    props: {
      columns: 3,
      rows: 1,
      columnTemplate: "equal",
      columnGap: 16,
      rowGap: 16,
      ...props,
    },
    children: [],
  };
}

describe("GridComponent", () => {
  it("renders grid with repeat columns in runtimeRenderer", () => {
    const node = makeMockGridNode({ columns: 4 });
    const Runtime = GridComponent.runtimeRenderer as React.FC<{
      node: BuilderNode;
      children?: React.ReactNode;
      style?: React.CSSProperties;
    }>;

    const { container } = render(
      <Runtime node={node}>
        <div>Card 1</div>
        <div>Card 2</div>
      </Runtime>
    );

    const gridEl = container.firstElementChild as HTMLElement;
    expect(gridEl).toBeInTheDocument();
    expect(gridEl.style.display).toBe("grid");
    expect(gridEl.style.gridTemplateColumns).toBe("repeat(4, 1fr)");
  });

  it("applies sidebar-left template correctly", () => {
    const node = makeMockGridNode({ columnTemplate: "sidebar-left" });
    const Runtime = GridComponent.runtimeRenderer as React.FC<{
      node: BuilderNode;
      children?: React.ReactNode;
      style?: React.CSSProperties;
    }>;

    const { container } = render(<Runtime node={node} />);
    const gridEl = container.firstElementChild as HTMLElement;
    expect(gridEl.style.gridTemplateColumns).toBe("1fr 2fr");
  });

  it("renders empty placeholders in editorRenderer when empty", () => {
    const node = makeMockGridNode({ columns: 2, rows: 2 });
    const Editor = GridComponent.editorRenderer as React.FC<{
      node: BuilderNode;
      children?: React.ReactNode;
      style?: React.CSSProperties;
    }>;

    const { container } = render(<Editor node={node} />);
    const gridEl = container.firstElementChild as HTMLElement;
    expect(gridEl).toHaveAttribute("data-node-id", "grid-1");
    // Should have 4 placeholder boxes (2 columns * 2 rows)
    expect(gridEl.children.length).toBe(4);
  });
});
