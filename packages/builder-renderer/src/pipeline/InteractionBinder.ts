import type { BuilderNode, InteractionConfig, InteractionAction } from "@ui-builder/builder-core";

/**
 * Evaluated interaction event handler type.
 */
export type InteractionHandler = (event: Event) => void;

/**
 * Bound interactions map: trigger → handler function.
 */
export type BoundInteractions = Partial<Record<string, InteractionHandler>>;

/**
 * InteractionBinder — converts InteractionConfig[] into React-compatible
 * event handler props (e.g. onClick, onMouseEnter).
 *
 * Trigger → React event prop mapping:
 * click        → onClick
 * dblclick     → onDoubleClick
 * mouseenter   → onMouseEnter
 * mouseleave   → onMouseLeave
 * focus        → onFocus
 * blur         → onBlur
 * submit       → onSubmit
 * change       → onChange
 * keydown      → onKeyDown
 * keyup        → onKeyUp
 * scroll       → onScroll
 */
export const TRIGGER_TO_REACT_EVENT: Record<string, string> = {
  click: "onClick",
  dblclick: "onDoubleClick",
  hover: "onMouseEnter",
  mouseenter: "onMouseEnter",
  mouseleave: "onMouseLeave",
  focus: "onFocus",
  blur: "onBlur",
  submit: "onSubmit",
  change: "onChange",
  keydown: "onKeyDown",
  keyup: "onKeyUp",
  scroll: "onScroll",
};

export class InteractionBinder {
  /**
   * Converts InteractionConfig[] into React event handler props.
   * Used by the runtime renderer to wire up interactions on rendered nodes.
   *
   * @param interactions - The interactions defined on the node
   * @param variables - Current variable state for condition evaluation
   * @param dispatch - State dispatch for setState actions
   * @returns Object with React event prop names as keys
   */
  static bindAll(
    interactions: InteractionConfig[],
    variables: Record<string, unknown>,
    dispatch: (type: string, payload: unknown) => void,
  ): Record<string, (event: Event) => void> {
    const handlers: Record<string, (event: Event) => void> = {};

    for (const interaction of interactions) {
      const propName = TRIGGER_TO_REACT_EVENT[interaction.trigger];
      if (!propName) continue;

      handlers[propName] = (event: Event) => {
        if (interaction.stopPropagation) event.stopPropagation();
        if (interaction.preventDefault) event.preventDefault();

        // Evaluate conditions
        if (interaction.conditions?.length) {
          const allMet = interaction.conditions.every((cond) =>
            InteractionBinder.evaluateCondition(cond, variables),
          );
          if (!allMet) return;
        }

        // Execute all actions
        for (const action of interaction.actions) {
          InteractionBinder.executeAction(action, variables, dispatch);
        }
      };
    }

    return handlers;
  }

  private static evaluateCondition(
    cond: import("@ui-builder/builder-core").Condition,
    variables: Record<string, unknown>,
  ): boolean {
    const value = variables[cond.variable];
    switch (cond.operator) {
      case "eq": return value === cond.value;
      case "neq": return value !== cond.value;
      case "gt": return (value as number) > (cond.value as number);
      case "lt": return (value as number) < (cond.value as number);
      case "gte": return (value as number) >= (cond.value as number);
      case "lte": return (value as number) <= (cond.value as number);
      case "contains": return String(value).includes(String(cond.value));
      case "truthy": return !!value;
      case "falsy": return !value;
      default: return false;
    }
  }

  private static executeAction(
    action: InteractionAction,
    _variables: Record<string, unknown>,
    dispatch: (type: string, payload: unknown) => void,
  ): void {
    switch (action.type) {
      case "navigate":
        if (typeof window !== "undefined") {
          window.open(action.url, action.target ?? "_self");
        }
        break;
      case "setState":
        dispatch("SET_VARIABLE", { key: action.key, value: action.value });
        break;
      case "toggleVisibility":
        dispatch("TOGGLE_VISIBILITY", { targetId: action.targetId });
        break;
      case "emit":
        dispatch("EMIT_EVENT", { event: action.event, payload: action.payload });
        break;
      case "custom":
        // Custom handlers resolved by consumer
        dispatch("CUSTOM_ACTION", action);
        break;
      default:
        break;
    }
  }
}
