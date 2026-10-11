import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BuilderProvider } from "../src/context/BuilderProvider";
import { useBuilder } from "../src/hooks/useBuilder";
import { createBuilder } from "@ui-builder/builder-core";

function TestConsumer() {
  const { state, dispatch, breakpoint } = useBuilder();
  return (
    <div>
      <span data-testid="doc-name">{state.document.name}</span>
      <span data-testid="breakpoint">{breakpoint}</span>
      <span data-testid="node-count">{Object.keys(state.document.nodes).length}</span>
      <button
        onClick={() => {
          dispatch({
            type: "SET_BREAKPOINT",
            payload: { breakpoint: "mobile" },
          });
        }}
      >
        Switch to Mobile
      </button>
    </div>
  );
}

describe("BuilderProvider & useBuilder", () => {
  it("throws descriptive error when useBuilder is used outside BuilderProvider", () => {
    // Suppress console.error from React error boundary during test
    const consoleError = console.error;
    console.error = () => {};

    expect(() => render(<TestConsumer />)).toThrow(
      /\[useBuilder\] Must be used inside a <BuilderProvider>/i
    );

    console.error = consoleError;
  });

  it("provides builder context and initial state to children", () => {
    const builder = createBuilder({
      document: { name: "Test Landing Page" },
    });

    render(
      <BuilderProvider builder={builder}>
        <TestConsumer />
      </BuilderProvider>
    );

    expect(screen.getByTestId("doc-name")).toHaveTextContent("Test Landing Page");
    expect(screen.getByTestId("breakpoint")).toHaveTextContent("desktop");
  });

  it("re-renders when a command is dispatched", async () => {
    const builder = createBuilder();

    render(
      <BuilderProvider builder={builder}>
        <TestConsumer />
      </BuilderProvider>
    );

    expect(screen.getByTestId("breakpoint")).toHaveTextContent("desktop");

    await act(async () => {
      screen.getByRole("button", { name: /switch to mobile/i }).click();
    });

    expect(screen.getByTestId("breakpoint")).toHaveTextContent("mobile");
  });
});
