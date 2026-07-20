import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractionBinder } from "./InteractionBinder";
import type { InteractionConfig } from "@ui-builder/builder-core";

/**
 * `InteractionBinder` is a framework-light class (no React, no real DOM) — these
 * tests stub the minimal global surface it touches (document/window/fetch) instead
 * of pulling in jsdom, matching the "SSR-safe, DOM-only in builder-renderer" design
 * in docs/roadmap/01-interactions-events/01-runtime-dead-actions.md.
 */

function interaction(overrides: Partial<InteractionConfig> & Pick<InteractionConfig, "actions">): InteractionConfig {
  return {
    id: "int-1",
    trigger: "click",
    ...overrides,
  };
}

describe("InteractionBinder.runInteraction — conditions", () => {
  it("runs actions when all conditions are met", () => {
    const dispatch = vi.fn();
    InteractionBinder.runInteraction(
      interaction({
        conditions: [{ variable: "submitted", operator: "falsy" }],
        actions: [{ type: "setState", key: "x", value: 1 }],
      }),
      { submitted: false },
      dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith("SET_VARIABLE", { key: "x", value: 1 });
  });

  it("skips actions when a condition fails", () => {
    const dispatch = vi.fn();
    InteractionBinder.runInteraction(
      interaction({
        conditions: [{ variable: "submitted", operator: "truthy" }],
        actions: [{ type: "setState", key: "x", value: 1 }],
      }),
      { submitted: false },
      dispatch,
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("InteractionBinder.bindAll — multiple interactions sharing a trigger", () => {
  it("runs every interaction bound to the same React prop, in order (no silent overwrite)", () => {
    const dispatch = vi.fn();
    const interactions: InteractionConfig[] = [
      interaction({ id: "a", actions: [{ type: "setState", key: "a", value: 1 }] }),
      interaction({ id: "b", actions: [{ type: "setState", key: "b", value: 2 }] }),
    ];
    const handlers = InteractionBinder.bindAll(interactions, {}, dispatch);
    expect(Object.keys(handlers)).toEqual(["onClick"]);

    handlers.onClick!({ stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as Event);

    expect(dispatch).toHaveBeenNthCalledWith(1, "SET_VARIABLE", { key: "a", value: 1 });
    expect(dispatch).toHaveBeenNthCalledWith(2, "SET_VARIABLE", { key: "b", value: 2 });
  });

  it("calls stopPropagation/preventDefault per-interaction based on its own flags", () => {
    const dispatch = vi.fn();
    const stopPropagation = vi.fn();
    const preventDefault = vi.fn();
    const interactions: InteractionConfig[] = [
      interaction({ preventDefault: true, actions: [{ type: "setState", key: "x", value: 1 }] }),
    ];
    const handlers = InteractionBinder.bindAll(interactions, {}, dispatch);
    handlers.onClick!({ stopPropagation, preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it("ignores triggers with no DOM event mapping (lifecycle triggers handled elsewhere)", () => {
    const dispatch = vi.fn();
    const interactions: InteractionConfig[] = [
      interaction({ trigger: "mount", actions: [{ type: "setState", key: "x", value: 1 }] }),
    ];
    const handlers = InteractionBinder.bindAll(interactions, {}, dispatch);
    expect(handlers).toEqual({});
  });
});

describe("InteractionBinder — navigate action", () => {
  const originalWindow = globalThis.window;
  let assign: ReturnType<typeof vi.fn>;
  let open: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    assign = vi.fn();
    open = vi.fn();
    vi.stubGlobal("window", { location: { assign }, open });
  });

  afterEach(() => {
    vi.stubGlobal("window", originalWindow);
  });

  it("uses location.assign for _self (default) navigation", () => {
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "navigate", url: "https://example.com" }] }),
      {},
      vi.fn(),
    );
    expect(assign).toHaveBeenCalledWith("https://example.com");
    expect(open).not.toHaveBeenCalled();
  });

  it("uses window.open with noopener,noreferrer for _blank navigation", () => {
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "navigate", url: "https://example.com", target: "_blank" }] }),
      {},
      vi.fn(),
    );
    expect(open).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("InteractionBinder — scrollTo action", () => {
  const originalDocument = globalThis.document;
  let scrollIntoView: ReturnType<typeof vi.fn>;
  let getElementById: ReturnType<typeof vi.fn>;
  let querySelector: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoView = vi.fn();
    getElementById = vi.fn();
    querySelector = vi.fn();
    vi.stubGlobal("document", { getElementById, querySelector });
    vi.stubGlobal("CSS", { escape: (s: string) => s });
  });

  afterEach(() => {
    vi.stubGlobal("document", originalDocument);
  });

  it("scrolls to the element found by real DOM id (anchorId) with smooth default", () => {
    getElementById.mockReturnValue({ scrollIntoView });
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "scrollTo", targetId: "services" }] }),
      {},
      vi.fn(),
    );
    expect(getElementById).toHaveBeenCalledWith("services");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("falls back to [data-node-id] when no real id matches", () => {
    getElementById.mockReturnValue(null);
    querySelector.mockReturnValue({ scrollIntoView });
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "scrollTo", targetId: "node-123", behavior: "auto" }] }),
      {},
      vi.fn(),
    );
    expect(querySelector).toHaveBeenCalledWith('[data-node-id="node-123"]');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("no-ops with a warning when no element matches either id", () => {
    getElementById.mockReturnValue(null);
    querySelector.mockReturnValue(null);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "scrollTo", targetId: "missing" }] }),
      {},
      vi.fn(),
    );
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("InteractionBinder — triggerApi action (SSRF guard)", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.stubGlobal("fetch", originalFetch);
  });

  it("fetches https endpoints with credentials omitted", async () => {
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "triggerApi", endpoint: "https://api.example.com/track", method: "POST" }] }),
      {},
      vi.fn(),
    );
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/track",
      expect.objectContaining({ method: "POST", credentials: "omit" }),
    );
  });

  it("allows http://localhost for local dev backends", async () => {
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "triggerApi", endpoint: "http://localhost:3002/api", method: "POST" }] }),
      {},
      vi.fn(),
    );
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("rejects http:// to a real host (SSRF guard)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "triggerApi", endpoint: "http://169.254.169.254/latest/meta-data", method: "GET" }] }),
      {},
      vi.fn(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("rejects javascript: scheme", () => {
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "triggerApi", endpoint: "javascript:alert(1)", method: "GET" }] }),
      {},
      vi.fn(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects private IP ranges", () => {
    for (const endpoint of ["https://10.0.0.5/x", "https://192.168.1.1/x", "https://172.16.0.1/x", "https://127.0.0.1/x"]) {
      InteractionBinder.runInteraction(
        interaction({ actions: [{ type: "triggerApi", endpoint, method: "GET" }] }),
        {},
        vi.fn(),
      );
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("InteractionBinder — state-owned actions dispatch, don't touch DOM directly", () => {
  it("toggleVisibility/addClass/removeClass/showModal/hideModal/emit/custom all dispatch typed payloads", () => {
    const dispatch = vi.fn();
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "toggleVisibility", targetId: "n1" }] }),
      {}, dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith("TOGGLE_VISIBILITY", { targetId: "n1" });

    dispatch.mockClear();
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "addClass", targetId: "n1", className: "active" }] }),
      {}, dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith("ADD_CLASS", { targetId: "n1", className: "active" });

    dispatch.mockClear();
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "removeClass", targetId: "n1", className: "active" }] }),
      {}, dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith("REMOVE_CLASS", { targetId: "n1", className: "active" });

    dispatch.mockClear();
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "showModal", targetId: "popup-1" }] }),
      {}, dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith("SHOW_MODAL", { targetId: "popup-1" });

    dispatch.mockClear();
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "hideModal", targetId: "popup-1" }] }),
      {}, dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith("HIDE_MODAL", { targetId: "popup-1" });

    dispatch.mockClear();
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "emit", event: "cta_clicked", payload: { id: 1 } }] }),
      {}, dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith("EMIT_EVENT", { event: "cta_clicked", payload: { id: 1 } });

    dispatch.mockClear();
    InteractionBinder.runInteraction(
      interaction({ actions: [{ type: "custom", handler: "myHandler", params: { a: 1 } }] }),
      {}, dispatch,
    );
    expect(dispatch).toHaveBeenCalledWith("CUSTOM_ACTION", { handler: "myHandler", params: { a: 1 } });
  });
});
