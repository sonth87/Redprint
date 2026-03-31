/**
 * Interaction system contracts.
 * Triggers and actions for component interactions.
 */

export type InteractionTrigger =
  | "click"
  | "dblclick"
  | "hover"
  | "mouseenter"
  | "mouseleave"
  | "focus"
  | "blur"
  | "submit"
  | "change"
  | "keydown"
  | "keyup"
  | "mount"
  | "unmount"
  | "scroll"
  | "intersect";

export type InteractionAction =
  | { type: "navigate"; url: string; target?: "_blank" | "_self" }
  | {
      type: "triggerApi";
      endpoint: string;
      method: string;
      headers?: Record<string, string>;
      body?: unknown;
    }
  | { type: "setState"; key: string; value: unknown }
  | { type: "toggleVisibility"; targetId: string }
  | { type: "addClass"; targetId: string; className: string }
  | { type: "removeClass"; targetId: string; className: string }
  | { type: "showModal"; targetId: string }
  | { type: "hideModal"; targetId: string }
  | { type: "scrollTo"; targetId: string; behavior?: ScrollBehavior }
  | { type: "emit"; event: string; payload?: unknown }
  | { type: "custom"; handler: string; params?: unknown };

export interface Condition {
  variable: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "truthy" | "falsy";
  value?: unknown;
}

export interface InteractionConfig {
  id: string;
  trigger: InteractionTrigger;
  conditions?: Condition[];
  actions: InteractionAction[];
  stopPropagation?: boolean;
  preventDefault?: boolean;
}
