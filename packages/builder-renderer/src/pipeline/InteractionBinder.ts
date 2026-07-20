import type { InteractionConfig, InteractionAction, Condition } from "@ui-builder/builder-core";
import { isSafeFetchEndpoint } from "@ui-builder/shared";

/**
 * Evaluated interaction event handler type.
 */
export type InteractionHandler = (event: Event) => void;

/**
 * Bound interactions map: trigger → handler function.
 */
export type BoundInteractions = Partial<Record<string, InteractionHandler>>;

/**
 * Dispatch a runtime-level side effect out of executeAction. Handlers that need
 * React state (toggleVisibility, addClass/removeClass, showModal/hideModal,
 * setState) live in RuntimeRenderer/RuntimeNode — the binder stays framework-light
 * and only owns DOM-only actions (navigate, scrollTo, triggerApi) directly.
 */
export type InteractionDispatch = (type: string, payload: unknown) => void;

/**
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
 *
 * `mount`, `unmount`, and `intersect` are NOT DOM events — they are handled by
 * RuntimeNode via useEffect/IntersectionObserver (see docs/roadmap/01-interactions-events/02-lifecycle-triggers.md)
 * and are intentionally absent from this map.
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
   * Multiple interactions sharing the same trigger (and therefore the same React
   * prop, e.g. two `click` interactions on one node) all run, in declaration
   * order — previously only the last one silently won because handlers were
   * keyed by propName with a plain assignment. See roadmap 01/01, corner case 6.
   *
   * @param interactions - The interactions defined on the node
   * @param variables - Current variable state for condition evaluation
   * @param dispatch - State dispatch for actions that need renderer-owned state
   * @returns Object with React event prop names as keys
   */
  static bindAll(
    interactions: InteractionConfig[],
    variables: Record<string, unknown>,
    dispatch: InteractionDispatch,
  ): Record<string, (event: Event) => void> {
    const byPropName = new Map<string, InteractionConfig[]>();

    for (const interaction of interactions) {
      const propName = TRIGGER_TO_REACT_EVENT[interaction.trigger];
      if (!propName) continue;
      const list = byPropName.get(propName);
      if (list) list.push(interaction);
      else byPropName.set(propName, [interaction]);
    }

    const handlers: Record<string, (event: Event) => void> = {};
    for (const [propName, group] of byPropName) {
      handlers[propName] = (event: Event) => {
        for (const interaction of group) {
          if (interaction.stopPropagation) event.stopPropagation();
          if (interaction.preventDefault) event.preventDefault();
          InteractionBinder.runInteraction(interaction, variables, dispatch);
        }
      };
    }

    return handlers;
  }

  /**
   * Evaluate one interaction's conditions and, if met, run all of its actions.
   * Shared by bindAll (DOM events) and RuntimeNode's lifecycle handling (mount/
   * unmount/intersect — see docs/roadmap/01-interactions-events/02-lifecycle-triggers.md),
   * so condition/action semantics never diverge between the two call sites.
   */
  static runInteraction(
    interaction: InteractionConfig,
    variables: Record<string, unknown>,
    dispatch: InteractionDispatch,
  ): void {
    if (interaction.conditions?.length) {
      const allMet = interaction.conditions.every((cond) =>
        InteractionBinder.evaluateCondition(cond, variables),
      );
      if (!allMet) return;
    }

    for (const action of interaction.actions) {
      InteractionBinder.executeAction(action, variables, dispatch);
    }
  }

  private static evaluateCondition(
    cond: Condition,
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
    dispatch: InteractionDispatch,
  ): void {
    switch (action.type) {
      case "navigate":
        if (typeof window !== "undefined") {
          if ((action.target ?? "_self") === "_blank") {
            window.open(action.url, "_blank", "noopener,noreferrer");
          } else {
            // location.assign (not window.open(url, "_self")) avoids popup-blocker
            // false positives and preserves normal browser history semantics.
            window.location.assign(action.url);
          }
        }
        break;
      case "setState":
        dispatch("SET_VARIABLE", { key: action.key, value: action.value });
        break;
      case "toggleVisibility":
        dispatch("TOGGLE_VISIBILITY", { targetId: action.targetId });
        break;
      case "addClass":
        dispatch("ADD_CLASS", { targetId: action.targetId, className: action.className });
        break;
      case "removeClass":
        dispatch("REMOVE_CLASS", { targetId: action.targetId, className: action.className });
        break;
      case "showModal":
        dispatch("SHOW_MODAL", { targetId: action.targetId });
        break;
      case "hideModal":
        dispatch("HIDE_MODAL", { targetId: action.targetId });
        break;
      case "scrollTo":
        InteractionBinder.executeScrollTo(action.targetId, action.behavior);
        break;
      case "triggerApi":
        InteractionBinder.executeTriggerApi(action);
        break;
      case "emit":
        dispatch("EMIT_EVENT", { event: action.event, payload: action.payload });
        break;
      case "custom":
        dispatch("CUSTOM_ACTION", { handler: action.handler, params: action.params });
        break;
      default:
        break;
    }
  }

  private static executeScrollTo(
    targetId: string,
    behavior: "auto" | "smooth" | "instant" | undefined,
  ): void {
    if (typeof document === "undefined") return; // SSR guard
    // Prefer a real DOM id (Section/Anchor anchorId — see roadmap 00/02) so scrollTo
    // works even when attachNodeIds is off; data-node-id is the fallback when the
    // renderer was configured to attach it.
    const el =
      document.getElementById(targetId) ??
      document.querySelector(`[data-node-id="${CSS.escape(targetId)}"]`);
    if (!el) {
      console.warn(`[interactions] scrollTo: no element found for targetId "${targetId}"`);
      return;
    }
    el.scrollIntoView({ behavior: behavior ?? "smooth", block: "start" });
  }

  private static executeTriggerApi(action: Extract<InteractionAction, { type: "triggerApi" }>): void {
    if (typeof fetch === "undefined") return; // SSR guard
    if (!isSafeFetchEndpoint(action.endpoint)) {
      console.warn(`[interactions] triggerApi: rejected unsafe endpoint "${action.endpoint}"`);
      return;
    }
    // Fire-and-forget: an interaction is a fire-once side effect, not a request
    // the page should block on. No retry — a failed tracking/webhook call should
    // never make the interaction feel broken to the user.
    void fetch(action.endpoint, {
      method: action.method || "POST",
      headers: { "Content-Type": "application/json", ...action.headers },
      body: action.body !== undefined ? JSON.stringify(action.body) : undefined,
      credentials: "omit",
    }).catch((err) => {
      console.warn("[interactions] triggerApi failed:", err);
    });
  }
}
