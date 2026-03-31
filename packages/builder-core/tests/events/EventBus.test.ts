import { describe, it, expect, vi } from "vitest";
import { EventBus } from "../../src/events/EventBus";

describe("EventBus", () => {
  it("calls handler when event is emitted", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("selection:changed", handler);
    bus.emit("selection:changed", { selectedIds: ["a"] });
    expect(handler).toHaveBeenCalledWith({ selectedIds: ["a"] });
  });

  it("stops calling handler after unsubscribe", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on("selection:changed", handler);
    unsub();
    bus.emit("selection:changed", { selectedIds: [] });
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls multiple handlers for the same event", () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("node:added", h1);
    bus.on("node:added", h2);
    const node = {
      id: "1", type: "text", parentId: null, order: 0, props: {}, style: {},
      responsiveStyle: {}, interactions: [], metadata: { createdAt: "", updatedAt: "" },
    };
    bus.emit("node:added", { node });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("does not throw if handler throws (error isolation)", () => {
    const bus = new EventBus();
    bus.on("selection:changed", () => { throw new Error("oops"); });
    expect(() => bus.emit("selection:changed", { selectedIds: [] })).not.toThrow();
  });

  it("listenerCount returns correct count", () => {
    const bus = new EventBus();
    expect(bus.listenerCount("node:removed")).toBe(0);
    const unsub = bus.on("node:removed", vi.fn());
    expect(bus.listenerCount("node:removed")).toBe(1);
    unsub();
    expect(bus.listenerCount("node:removed")).toBe(0);
  });

  it("off() clears all listeners", () => {
    const bus = new EventBus();
    bus.on("node:removed", vi.fn());
    bus.off("node:removed");
    expect(bus.listenerCount("node:removed")).toBe(0);
  });
});
