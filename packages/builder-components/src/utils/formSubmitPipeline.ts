/**
 * Form submit pipeline (roadmap 03/04) — runs when a runtime `<form>` fires its
 * native submit event. Order matters: this pipeline (validation, data
 * collection, webhook/emit) runs first; a node's `submit`-trigger interactions
 * run after (composed in `RuntimeRenderer.tsx`'s handler-merge step, not here —
 * this module has no dependency on builder-renderer/InteractionBinder to keep
 * builder-components independent of the renderer pipeline).
 *
 * Split into a DOM-facing entry point (`runFormSubmitPipeline`) and a pure
 * dispatch function (`dispatchFormSubmit`) so the webhook/emit/none branching
 * and state transitions are unit-testable without a real `HTMLFormElement`/
 * jsdom (this monorepo has neither — see `.claude` project memory).
 */
import { isSafeFetchEndpoint } from "@ui-builder/shared";

export type FormSubmitPhase = "idle" | "submitting" | "success" | "error";

export interface FormSubmitState {
  phase: FormSubmitPhase;
}

export interface FormSubmitCallbacks {
  onFormSubmit?: (formName: string, fields: Record<string, unknown>) => void;
}

/** Minimal fetch signature so tests can inject a mock without touching the global. */
export type FetchLike = typeof fetch;

/**
 * Collect `{ name: value }` from a FormData instance. Repeated `name`s (e.g.
 * two fields sharing a name, or a Repeater duplicating an Input) collect into
 * an array, matching plain HTML form semantics rather than silently dropping
 * data. The `_hp` honeypot field is never included in the returned payload.
 */
export function collectFormFields(data: FormData): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  // .forEach (not .entries()/for-of) — avoids requiring the "DOM.Iterable" lib
  // on top of this package's plain "DOM" lib.
  data.forEach((value, key) => {
    if (key === "_hp") return; // honeypot — never included in submitted payload
    const v = typeof value === "string" ? value : value.name;
    if (key in fields) {
      const existing = fields[key];
      fields[key] = Array.isArray(existing) ? [...existing, v] : [existing, v];
    } else {
      fields[key] = v;
    }
  });
  return fields;
}

/** True when the hidden honeypot field was filled in (a bot, not a real visitor). */
export function isHoneypotTripped(data: FormData): boolean {
  const value = data.get("_hp");
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Pure dispatch: given already-collected fields (honeypot already checked,
 * HTML5 validity already confirmed by the caller), send them per
 * `node.props.submitAction` and drive the state machine
 * (idle→submitting→success|error). Never throws — a failed webhook call
 * surfaces as `error` phase, never an unhandled rejection.
 */
export async function dispatchFormSubmit(
  fields: Record<string, unknown>,
  node: { id: string; props: Record<string, unknown> },
  setState: (state: FormSubmitState) => void,
  callbacks: FormSubmitCallbacks = {},
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const submitAction = String(node.props.submitAction ?? "none");
  const formName = String(node.props.name ?? node.id);

  if (submitAction === "none") {
    setState({ phase: "success" });
    return;
  }

  if (submitAction === "emit") {
    try {
      callbacks.onFormSubmit?.(formName, fields);
      setState({ phase: "success" });
    } catch (err) {
      console.warn("[form] onFormSubmit callback threw:", err);
      setState({ phase: "error" });
    }
    return;
  }

  // webhook
  const webhookUrl = String(node.props.webhookUrl ?? "");
  if (!isSafeFetchEndpoint(webhookUrl)) {
    console.warn(`[form] webhook submit rejected — unsafe or missing URL: "${webhookUrl}"`);
    setState({ phase: "error" });
    return;
  }

  setState({ phase: "submitting" });
  try {
    const method = String(node.props.method ?? "POST");
    const res = await fetchImpl(webhookUrl, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields, meta: { pageUrl: typeof window !== "undefined" ? window.location.href : "", timestamp: Date.now() } }),
      credentials: "omit",
    });
    if (!res.ok) throw new Error(`Webhook responded with ${res.status}`);
    setState({ phase: "success" });
  } catch (err) {
    console.warn("[form] webhook submit failed:", err);
    setState({ phase: "error" });
  }
}

/**
 * DOM-facing entry point: preventDefault → HTML5 `reportValidity()` →
 * honeypot check → collect fields → `dispatchFormSubmit` → reset the form on
 * success (unless `resetOnSuccess: false`).
 */
export async function runFormSubmitPipeline(
  event: React.FormEvent<HTMLFormElement>,
  node: { id: string; props: Record<string, unknown> },
  setState: (state: FormSubmitState) => void,
  callbacks: FormSubmitCallbacks = {},
): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;

  if (!form.reportValidity()) {
    return; // browser shows native validation UI; nothing else to do
  }

  const data = new FormData(form);

  if (isHoneypotTripped(data)) {
    // Silently "succeed" for the bot (don't reveal the trap) without sending
    // any data anywhere.
    setState({ phase: "success" });
    return;
  }

  const fields = collectFormFields(data);
  const lastState: FormSubmitState = { phase: "idle" };
  await dispatchFormSubmit(fields, node, (state) => {
    lastState.phase = state.phase;
    setState(state);
  }, callbacks);
  if (lastState.phase === "success" && node.props.resetOnSuccess !== false) form.reset();
}
