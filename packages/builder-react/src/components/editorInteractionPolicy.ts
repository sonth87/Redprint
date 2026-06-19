import type {
  BuilderNode,
  ComponentDefinition,
  EditorInteractionPolicy,
} from "@ui-builder/builder-core";
import type {
  DragEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from "react";

export type ResolvedEditorInteractionPolicy = Exclude<EditorInteractionPolicy, "auto">;

export function resolveEditorInteractionPolicy(
  definition: ComponentDefinition,
  _node?: BuilderNode,
): ResolvedEditorInteractionPolicy {
  const configured = definition.editorConfig?.interactionPolicy ?? "auto";

  if (configured !== "auto") {
    return configured;
  }

  if (definition.capabilities.canContainChildren) {
    return "container";
  }

  if (definition.capabilities.inlineEditable) {
    return "inline-edit";
  }

  return "shielded";
}

export function isEditorInteractionShielded(
  policy: EditorInteractionPolicy | null | undefined,
): policy is "shielded" | "inline-edit" {
  return policy === "shielded" || policy === "inline-edit";
}

export interface EditorInteractionShieldProps {
  draggable: false;
  tabIndex: -1;
  onDragStartCapture: (event: DragEvent<HTMLElement>) => void;
  onClickCapture: (event: MouseEvent<HTMLElement>) => void;
  onAuxClickCapture: (event: MouseEvent<HTMLElement>) => void;
  onFocusCapture: (event: FocusEvent<HTMLElement>) => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
  onMouseDownCapture: (event: MouseEvent<HTMLElement>) => void;
  onPointerDownCapture: (event: PointerEvent<HTMLElement>) => void;
}

export function createEditorInteractionShieldProps(
  policy: EditorInteractionPolicy | null | undefined,
): EditorInteractionShieldProps | null {
  if (!isEditorInteractionShielded(policy)) {
    return null;
  }

  return {
    draggable: false,
    tabIndex: -1,
    onDragStartCapture: (event) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onClickCapture: (event) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onAuxClickCapture: (event) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onFocusCapture: (event) => {
      event.preventDefault();
      event.stopPropagation();
      (event.target as HTMLElement | null)?.blur();
    },
    onKeyDownCapture: (event) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onMouseDownCapture: (event) => {
      event.preventDefault();
    },
    onPointerDownCapture: (event) => {
      if (policy === "shielded") {
        event.preventDefault();
      }
    },
  };
}
