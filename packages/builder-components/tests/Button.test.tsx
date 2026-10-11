import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ButtonComponent } from "../src/components/Button";
import type { BuilderNode } from "@ui-builder/builder-core";

function makeMockButtonNode(props: Record<string, unknown> = {}): BuilderNode {
  return {
    id: "button-1",
    type: "Button",
    props: {
      label: "<p>Click me</p>",
      variant: "primary",
      disabled: false,
      buttonType: "button",
      ...props,
    },
    children: [],
  };
}

describe("ButtonComponent", () => {
  it("renders default label in runtimeRenderer", () => {
    const node = makeMockButtonNode({ label: "<p>Submit Order</p>" });
    const Runtime = ButtonComponent.runtimeRenderer as React.FC<{ node: BuilderNode; style?: React.CSSProperties }>;

    render(<Runtime node={node} />);
    const button = screen.getByRole("button", { name: /submit order/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");
    expect(button).not.toBeDisabled();
  });

  it("renders disabled button when disabled prop is true", () => {
    const node = makeMockButtonNode({ label: "Disabled Button", disabled: true });
    const Runtime = ButtonComponent.runtimeRenderer as React.FC<{ node: BuilderNode; style?: React.CSSProperties }>;

    render(<Runtime node={node} />);
    const button = screen.getByRole("button", { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it("renders with buttonType='submit' in runtime mode", () => {
    const node = makeMockButtonNode({ label: "Send Message", buttonType: "submit" });
    const Runtime = ButtonComponent.runtimeRenderer as React.FC<{ node: BuilderNode; style?: React.CSSProperties }>;

    render(<Runtime node={node} />);
    const button = screen.getByRole("button", { name: /send message/i });
    expect(button).toHaveAttribute("type", "submit");
  });

  it("renders data-node-id and always type='button' in editorRenderer", () => {
    const node = makeMockButtonNode({ label: "Editor Button", buttonType: "submit" });
    const Editor = ButtonComponent.editorRenderer as React.FC<{ node: BuilderNode; style?: React.CSSProperties }>;

    render(<Editor node={node} />);
    const button = screen.getByRole("button", { name: /editor button/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-node-id", "button-1");
    // Editor mode must stay type="button" so canvas authoring never submits forms
    expect(button).toHaveAttribute("type", "button");
  });
});
