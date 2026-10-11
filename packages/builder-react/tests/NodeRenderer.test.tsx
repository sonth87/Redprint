import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuilderProvider } from "../src/context/BuilderProvider";
import { NodeRenderer } from "../src/components/NodeRenderer";
import {
  createBuilder,
  type ComponentDefinition,
} from "@ui-builder/builder-core";

const MockBoxDef: ComponentDefinition = {
  type: "Box",
  name: "Box",
  category: "layout",
  capabilities: { canContainChildren: true },
  propSchema: [],
  defaultProps: {},
  editorRenderer: ({ children, style }) => (
    <div data-testid="box-editor" style={style as React.CSSProperties}>
      {children as React.ReactNode}
    </div>
  ),
  runtimeRenderer: ({ children, style }) => (
    <div data-testid="box-runtime" style={style as React.CSSProperties}>
      {children as React.ReactNode}
    </div>
  ),
};

const MockTextDef: ComponentDefinition = {
  type: "Text",
  name: "Text",
  category: "typography",
  capabilities: { canContainChildren: false },
  propSchema: [{ key: "content", label: "Content", type: "string" }],
  defaultProps: { content: "Sample text" },
  editorRenderer: ({ node }) => (
    <p data-testid="text-editor">{String(node.props.content ?? "")}</p>
  ),
  runtimeRenderer: ({ node }) => (
    <p data-testid="text-runtime">{String(node.props.content ?? "")}</p>
  ),
};

describe("NodeRenderer", () => {
  it("renders editorRenderer and attaches data-node-id in editor mode", () => {
    const builder = createBuilder({
      document: {
        rootNodeId: "node-text",
        nodes: {
          "node-text": {
            id: "node-text",
            type: "Text",
            parentId: null,
            order: 0,
            props: { content: "Hello Editor" },
            style: { color: "#333333" },
            responsiveStyle: {},
            interactions: [],
          },
        },
      },
    });
    builder.registry.registerComponent(MockTextDef);

    render(
      <BuilderProvider builder={builder}>
        <NodeRenderer nodeId="node-text" mode="editor" />
      </BuilderProvider>
    );

    const elem = screen.getByTestId("text-editor");
    expect(elem).toBeInTheDocument();
    expect(elem).toHaveTextContent("Hello Editor");
    expect(elem).toHaveAttribute("data-node-id", "node-text");
  });

  it("renders runtimeRenderer in runtime mode", () => {
    const builder = createBuilder({
      document: {
        rootNodeId: "node-text",
        nodes: {
          "node-text": {
            id: "node-text",
            type: "Text",
            parentId: null,
            order: 0,
            props: { content: "Hello Runtime" },
            style: {},
            responsiveStyle: {},
            interactions: [],
          },
        },
      },
    });
    builder.registry.registerComponent(MockTextDef);

    render(
      <BuilderProvider builder={builder}>
        <NodeRenderer nodeId="node-text" mode="runtime" />
      </BuilderProvider>
    );

    expect(screen.getByTestId("text-runtime")).toHaveTextContent("Hello Runtime");
    expect(screen.queryByTestId("text-editor")).toBeNull();
  });

  it("renders children nodes sorted by order", () => {
    const builder = createBuilder({
      document: {
        rootNodeId: "box-1",
        nodes: {
          "box-1": {
            id: "box-1",
            type: "Box",
            parentId: null,
            order: 0,
            props: {},
            style: {},
            responsiveStyle: {},
            interactions: [],
          },
          "text-b": {
            id: "text-b",
            type: "Text",
            parentId: "box-1",
            order: 2,
            props: { content: "Second Item" },
            style: {},
            responsiveStyle: {},
            interactions: [],
          },
          "text-a": {
            id: "text-a",
            type: "Text",
            parentId: "box-1",
            order: 1,
            props: { content: "First Item" },
            style: {},
            responsiveStyle: {},
            interactions: [],
          },
        },
      },
    });
    builder.registry.registerComponent(MockBoxDef);
    builder.registry.registerComponent(MockTextDef);

    render(
      <BuilderProvider builder={builder}>
        <NodeRenderer nodeId="box-1" mode="editor" />
      </BuilderProvider>
    );

    const textElements = screen.getAllByTestId("text-editor");
    expect(textElements).toHaveLength(2);
    expect(textElements[0]).toHaveTextContent("First Item");
    expect(textElements[1]).toHaveTextContent("Second Item");
  });

  it("dims hidden nodes in editor mode and completely hides in runtime mode", () => {
    const builder = createBuilder({
      document: {
        rootNodeId: "text-hidden",
        nodes: {
          "text-hidden": {
            id: "text-hidden",
            type: "Text",
            parentId: null,
            order: 0,
            props: { content: "Secret Text" },
            style: {},
            responsiveStyle: {},
            interactions: [],
            hidden: true,
          },
        },
      },
    });
    builder.registry.registerComponent(MockTextDef);

    const { rerender } = render(
      <BuilderProvider builder={builder}>
        <NodeRenderer nodeId="text-hidden" mode="editor" />
      </BuilderProvider>
    );

    const editorEl = screen.getByTestId("text-editor");
    expect(editorEl).toHaveAttribute("data-editor-hidden", "true");

    rerender(
      <BuilderProvider builder={builder}>
        <NodeRenderer nodeId="text-hidden" mode="runtime" />
      </BuilderProvider>
    );

    expect(screen.queryByTestId("text-runtime")).toBeNull();
    expect(screen.queryByTestId("text-editor")).toBeNull();
  });

  it("renders error placeholder for unregistered component type without crashing", () => {
    const builder = createBuilder({
      document: {
        rootNodeId: "missing-1",
        nodes: {
          "missing-1": {
            id: "missing-1",
            type: "NonExistentWidget",
            parentId: null,
            order: 0,
            props: {},
            style: {},
            responsiveStyle: {},
            interactions: [],
          },
        },
      },
    });

    render(
      <BuilderProvider builder={builder}>
        <NodeRenderer nodeId="missing-1" mode="editor" />
      </BuilderProvider>
    );

    expect(screen.getByText(/unknown component: NonExistentWidget/i)).toBeInTheDocument();
  });
});
