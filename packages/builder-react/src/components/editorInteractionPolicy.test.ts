import { describe, expect, it } from "vitest";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import {
  createEditorInteractionShieldProps,
  type EditorInteractionShieldProps,
  resolveEditorInteractionPolicy,
} from "./editorInteractionPolicy";

function createDefinition(
  overrides: Partial<ComponentDefinition> = {},
): ComponentDefinition {
  return {
    type: "TestComponent",
    name: "Test Component",
    category: "test",
    version: "1.0.0",
    capabilities: {
      canContainChildren: false,
      canResize: true,
      canTriggerEvents: false,
      canBindData: false,
      canBeHidden: true,
      canBeLocked: true,
    },
    propSchema: [],
    defaultProps: {},
    editorRenderer: () => null,
    runtimeRenderer: () => null,
    ...overrides,
  };
}

describe("resolveEditorInteractionPolicy", () => {
  it("resolves containers from child containment capability", () => {
    const definition = createDefinition({
      capabilities: {
        ...createDefinition().capabilities,
        canContainChildren: true,
      },
    });

    expect(resolveEditorInteractionPolicy(definition)).toBe("container");
  });

  it("resolves inline editable leaf components", () => {
    const definition = createDefinition({
      capabilities: {
        ...createDefinition().capabilities,
        inlineEditable: true,
      },
    });

    expect(resolveEditorInteractionPolicy(definition)).toBe("inline-edit");
  });

  it("resolves leaf components as shielded by default", () => {
    expect(resolveEditorInteractionPolicy(createDefinition())).toBe("shielded");
  });

  it("lets editorConfig interactionPolicy override auto resolution", () => {
    const definition = createDefinition({
      capabilities: {
        ...createDefinition().capabilities,
        canContainChildren: true,
      },
      editorConfig: {
        interactionPolicy: "component-managed",
      },
    });

    expect(resolveEditorInteractionPolicy(definition)).toBe("component-managed");
  });
});

interface MockEvent {
  preventDefault: () => void;
  stopPropagation: () => void;
  target?: { blur: () => void };
}

function createMockEvent() {
  const calls = {
    preventDefault: 0,
    stopPropagation: 0,
    blur: 0,
  };

  const event: MockEvent = {
    preventDefault: () => {
      calls.preventDefault += 1;
    },
    stopPropagation: () => {
      calls.stopPropagation += 1;
    },
    target: {
      blur: () => {
        calls.blur += 1;
      },
    },
  };

  return { event, calls };
}

function invokeShieldHandler(
  props: EditorInteractionShieldProps,
  key: keyof EditorInteractionShieldProps,
  event: MockEvent,
) {
  const handler = props[key];
  if (typeof handler === "function") {
    (handler as unknown as (event: MockEvent) => void)(event);
  }
}

describe("createEditorInteractionShieldProps", () => {
  it("returns no handlers for non-shielded policies", () => {
    expect(createEditorInteractionShieldProps("container")).toBeNull();
    expect(createEditorInteractionShieldProps("component-managed")).toBeNull();
    expect(createEditorInteractionShieldProps("native")).toBeNull();
    expect(createEditorInteractionShieldProps(null)).toBeNull();
  });

  it("suppresses runtime drag, click, focus, and key activation", () => {
    const props = createEditorInteractionShieldProps("shielded");
    expect(props).not.toBeNull();
    if (!props) return;

    expect(props.draggable).toBe(false);
    expect(props.tabIndex).toBe(-1);

    for (const key of [
      "onDragStartCapture",
      "onClickCapture",
      "onAuxClickCapture",
      "onKeyDownCapture",
    ] satisfies Array<keyof EditorInteractionShieldProps>) {
      const { event, calls } = createMockEvent();
      invokeShieldHandler(props, key, event);
      expect(calls.preventDefault).toBe(1);
      expect(calls.stopPropagation).toBe(1);
    }

    const { event: focusEvent, calls: focusCalls } = createMockEvent();
    invokeShieldHandler(props, "onFocusCapture", focusEvent);
    expect(focusCalls.preventDefault).toBe(1);
    expect(focusCalls.stopPropagation).toBe(1);
    expect(focusCalls.blur).toBe(1);
  });

  it("keeps pointerdown available for inline-edit double-click while blocking shielded pointer defaults", () => {
    const shieldedProps = createEditorInteractionShieldProps("shielded");
    const inlineProps = createEditorInteractionShieldProps("inline-edit");
    expect(shieldedProps).not.toBeNull();
    expect(inlineProps).not.toBeNull();
    if (!shieldedProps || !inlineProps) return;

    const { event: shieldedEvent, calls: shieldedCalls } = createMockEvent();
    invokeShieldHandler(shieldedProps, "onPointerDownCapture", shieldedEvent);
    expect(shieldedCalls.preventDefault).toBe(1);
    expect(shieldedCalls.stopPropagation).toBe(0);

    const { event: inlineEvent, calls: inlineCalls } = createMockEvent();
    invokeShieldHandler(inlineProps, "onPointerDownCapture", inlineEvent);
    expect(inlineCalls.preventDefault).toBe(0);
    expect(inlineCalls.stopPropagation).toBe(0);
  });

  it("prevents mouse text selection without stopping editor selection bubbling", () => {
    const props = createEditorInteractionShieldProps("inline-edit");
    expect(props).not.toBeNull();
    if (!props) return;

    const { event, calls } = createMockEvent();
    invokeShieldHandler(props, "onMouseDownCapture", event);
    expect(calls.preventDefault).toBe(1);
    expect(calls.stopPropagation).toBe(0);
  });
});
