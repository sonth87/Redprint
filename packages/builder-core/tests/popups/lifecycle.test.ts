import { describe, expect, it } from "vitest";
import {
  applyOpen as applyPopupOpen,
  applyClose as applyPopupClose,
  applyOpened as applyPopupOpened,
  applyClosed as applyPopupClosed,
  applyRemove as applyPopupRemove,
  topmostInteractive as topmostInteractivePopup,
  computeZIndex,
  shouldReduceMotion as shouldReducePopupMotion,
  DEFAULT_POPUP_Z_INDEX_BASE,
  POPUP_Z_INDEX_STEP,
  type PopupStackEntry,
} from "../../src/popups/lifecycle";

const open = (id: string, opts: Partial<Parameters<typeof applyPopupOpen>[1]> = {}) =>
  ({ popupId: id, kind: "modal" as const, now: Date.now(), ...opts });

describe("popup lifecycle state machine", () => {
  it("opens a popup into the 'opening' state", () => {
    const stack = applyPopupOpen([], open("a"));
    expect(stack).toHaveLength(1);
    expect(stack[0]).toMatchObject({ popupId: "a", state: "opening" });
  });

  it("promotes opening → open", () => {
    let stack = applyPopupOpen([], open("a"));
    stack = applyPopupOpened(stack, "a");
    expect(stack[0]!.state).toBe("open");
  });

  it("marks closing then removes on closed (exit animation can play in between)", () => {
    let stack = applyPopupOpen([], open("a"));
    stack = applyPopupOpened(stack, "a");
    stack = applyPopupClose(stack, "a");
    expect(stack[0]!.state).toBe("closing"); // still mounted
    stack = applyPopupClosed(stack, "a");
    expect(stack).toHaveLength(0); // unmounted after exit
  });

  it("reopening during 'closing' cancels the close and returns to opening", () => {
    let stack = applyPopupOpen([], open("a"));
    stack = applyPopupOpened(stack, "a");
    stack = applyPopupClose(stack, "a");
    expect(stack[0]!.state).toBe("closing");
    stack = applyPopupOpen(stack, open("a"));
    expect(stack).toHaveLength(1);
    expect(stack[0]!.state).toBe("opening");
  });

  it("closing during 'opening' transitions to closing", () => {
    let stack = applyPopupOpen([], open("a"));
    expect(stack[0]!.state).toBe("opening");
    stack = applyPopupClose(stack, "a");
    expect(stack[0]!.state).toBe("closing");
  });

  describe("stack policies", () => {
    it("single mode closes other popups", () => {
      let stack = applyPopupOpen([], open("a", { stackMode: "single" }));
      stack = applyPopupOpened(stack, "a");
      stack = applyPopupOpen(stack, open("b", { stackMode: "single" }));
      const a = stack.find((e) => e.popupId === "a")!;
      const b = stack.find((e) => e.popupId === "b")!;
      expect(a.state).toBe("closing");
      expect(b.state).toBe("opening");
    });

    it("multiple mode keeps others open", () => {
      let stack = applyPopupOpen([], open("a", { stackMode: "multiple" }));
      stack = applyPopupOpened(stack, "a");
      stack = applyPopupOpen(stack, open("b", { stackMode: "multiple" }));
      const a = stack.find((e) => e.popupId === "a")!;
      expect(a.state).toBe("open");
      expect(stack).toHaveLength(2);
    });

    it("replace-same-kind closes only popups of the same kind", () => {
      let stack = applyPopupOpen([], open("a", { kind: "modal", stackMode: "replace-same-kind" }));
      stack = applyPopupOpened(stack, "a");
      stack = applyPopupOpen(
        stack,
        open("d", { kind: "drawer", stackMode: "replace-same-kind" }),
      );
      stack = applyPopupOpened(stack, "d");
      stack = applyPopupOpen(
        stack,
        open("b", { kind: "modal", stackMode: "replace-same-kind" }),
      );
      expect(stack.find((e) => e.popupId === "a")!.state).toBe("closing");
      expect(stack.find((e) => e.popupId === "d")!.state).toBe("open");
      expect(stack.find((e) => e.popupId === "b")!.state).toBe("opening");
    });
  });

  describe("z-index ordering", () => {
    it("assigns increasing z-index by stack depth; latest is topmost", () => {
      let stack = applyPopupOpen([], open("a", { stackMode: "multiple" }));
      stack = applyPopupOpened(stack, "a");
      stack = applyPopupOpen(stack, open("b", { stackMode: "multiple" }));
      const a = stack.find((e) => e.popupId === "a")!;
      const b = stack.find((e) => e.popupId === "b")!;
      expect(b.zIndex).toBeGreaterThan(a.zIndex);
    });

    it("respects a custom zIndexBase", () => {
      const stack = applyPopupOpen([], open("a", { zIndexBase: 50000 }));
      expect(stack[0]!.zIndex).toBe(50000);
    });

    it("computeZIndex uses default base + step", () => {
      expect(computeZIndex(undefined, 0)).toBe(DEFAULT_POPUP_Z_INDEX_BASE);
      expect(computeZIndex(undefined, 1)).toBe(DEFAULT_POPUP_Z_INDEX_BASE + POPUP_Z_INDEX_STEP);
    });
  });

  describe("topmostInteractive", () => {
    it("returns the topmost opening/open entry, skipping closing", () => {
      const stack: PopupStackEntry[] = [
        { popupId: "a", kind: "modal", state: "open", zIndex: 10000, openedAt: 1 },
        { popupId: "b", kind: "modal", state: "closing", zIndex: 10010, openedAt: 2 },
      ];
      expect(topmostInteractivePopup(stack)?.popupId).toBe("a");
    });

    it("returns null when nothing is interactive", () => {
      const stack: PopupStackEntry[] = [
        { popupId: "a", kind: "modal", state: "closing", zIndex: 10000, openedAt: 1 },
      ];
      expect(topmostInteractivePopup(stack)).toBeNull();
    });
  });

  it("applyRemove drops an entry immediately (deleted/disabled while open)", () => {
    let stack = applyPopupOpen([], open("a"));
    stack = applyPopupRemove(stack, "a");
    expect(stack).toHaveLength(0);
  });

  describe("shouldReduceMotion", () => {
    it("reduces when system prefers reduced motion and behavior respects it", () => {
      expect(shouldReducePopupMotion("respect", true)).toBe(true);
      expect(shouldReducePopupMotion(undefined, true)).toBe(true);
    });
    it("ignores reduced motion when behavior says ignore", () => {
      expect(shouldReducePopupMotion("ignore", true)).toBe(false);
    });
    it("does not reduce when system does not prefer it", () => {
      expect(shouldReducePopupMotion("respect", false)).toBe(false);
    });
  });
});
