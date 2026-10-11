import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormComponent } from "../src/components/Form";
import { InputComponent } from "../src/components/Input";
import type { BuilderNode } from "@ui-builder/builder-core";

describe("Form and Input Validation Integration", () => {
  it("renders field error when submitted with invalid email and clears on input change", async () => {
    const onFormSubmit = vi.fn();

    const formNode: BuilderNode = {
      id: "form-1",
      type: "Form",
      props: {
        submitAction: "emit",
        name: "test-form",
      },
    };

    const inputNode: BuilderNode = {
      id: "input-email",
      type: "Input",
      props: {
        name: "email",
        label: "Your Email",
        inputType: "email",
        required: true,
      },
    };

    const rendered = FormComponent.runtimeRenderer({
      node: formNode,
      style: {},
      interactions: [],
      breakpoint: "desktop",
      onFormSubmit,
      children: (
        <>
          {InputComponent.runtimeRenderer({
            node: inputNode,
            style: {},
            interactions: [],
            breakpoint: "desktop",
          }) as React.ReactNode}
          <button type="submit">Submit Form</button>
        </>
      ),
    }) as React.ReactElement;

    render(rendered);

    const input = screen.getByLabelText(/Your Email/i);
    const submitBtn = screen.getByRole("button", { name: /Submit Form/i });

    // Submit while empty
    fireEvent.change(input, { target: { value: "invalid-email" } });
    fireEvent.click(submitBtn);

    // Error should be rendered
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain("valid email address");
    expect(onFormSubmit).not.toHaveBeenCalled();

    // Typing changes clears error
    fireEvent.change(input, { target: { value: "valid@example.com" } });
    expect(screen.queryByRole("alert")).toBeNull();

    // Submit again with valid email
    fireEvent.click(submitBtn);
    expect(onFormSubmit).toHaveBeenCalledWith("test-form", { email: "valid@example.com" });
  });

  it("triggers onOpenPopup when submitAction is openPopup", async () => {
    const onOpenPopup = vi.fn();

    const formNode: BuilderNode = {
      id: "form-popup",
      type: "Form",
      props: {
        submitAction: "openPopup",
        successPopupId: "popup-welcome",
      },
    };

    const rendered = FormComponent.runtimeRenderer({
      node: formNode,
      style: {},
      interactions: [],
      breakpoint: "desktop",
      onOpenPopup,
      children: <button type="submit">Open Modal</button>,
    }) as React.ReactElement;

    render(rendered);
    fireEvent.click(screen.getByRole("button", { name: /Open Modal/i }));

    expect(onOpenPopup).toHaveBeenCalledWith("popup-welcome");
  });
});
