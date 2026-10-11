import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormComponent } from "../src/components/Form";
import { InputComponent } from "../src/components/Input";
import type { BuilderNode } from "@ui-builder/builder-core";

function makeMockFormNode(props: Record<string, unknown> = {}): BuilderNode {
  return {
    id: "form-1",
    type: "Form",
    props: {
      formName: "lead-capture",
      submitAction: "emit",
      honeypot: true,
      ...props,
    },
    children: ["input-1"],
  };
}

function makeMockInputNode(props: Record<string, unknown> = {}): BuilderNode {
  return {
    id: "input-1",
    type: "Input",
    props: {
      name: "email",
      label: "Work Email",
      inputType: "email",
      placeholder: "you@company.com",
      required: true,
      ...props,
    },
    children: [],
  };
}

describe("FormComponent & InputComponent", () => {
  it("renders form shell with honeypot field in runtimeRenderer", () => {
    const formNode = makeMockFormNode({ honeypot: true });
    const inputNode = makeMockInputNode();
    const FormRuntime = FormComponent.runtimeRenderer as React.FC<{
      node: BuilderNode;
      children?: React.ReactNode;
      style?: React.CSSProperties;
    }>;
    const InputRuntime = InputComponent.runtimeRenderer as React.FC<{
      node: BuilderNode;
      style?: React.CSSProperties;
    }>;

    const { container } = render(
      <FormRuntime node={formNode}>
        <InputRuntime node={inputNode} />
      </FormRuntime>
    );

    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();

    // Honeypot field exists and is hidden
    const honeypot = container.querySelector("input[name='_hp']");
    expect(honeypot).toBeInTheDocument();
    expect(honeypot).toHaveStyle({ opacity: "0" });

    // Real input exists
    const input = screen.getByLabelText(/work email/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeRequired();
  });

  it("renders input in editorRenderer with readOnly and data-node-id", () => {
    const inputNode = makeMockInputNode();
    const InputEditor = InputComponent.editorRenderer as React.FC<{
      node: BuilderNode;
      style?: React.CSSProperties;
    }>;

    render(<InputEditor node={inputNode} />);

    const input = screen.getByPlaceholderText("you@company.com");
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAttribute("tabindex", "-1");
  });
});
