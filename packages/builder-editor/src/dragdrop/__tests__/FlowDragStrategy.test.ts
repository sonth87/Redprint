// Phase 2 tests — implemented when FlowDragStrategy is complete
import { describe, it } from "vitest";

describe("FlowDragStrategy", () => {
  it.todo("canHandle returns false for multi-select");
  it.todo("canHandle returns false for position:absolute node");
  it.todo("canHandle returns true for static child in flex parent");
  it.todo("onMove returns flowDropTarget with correct containerId and insertIndex");
  it.todo("onMove returns flowDragOffset matching (clientX - startX) / zoom");
  it.todo("onDrop dispatches REORDER_NODE only when same container");
  it.todo("onDrop dispatches MOVE_NODE then REORDER_NODE when cross-container");
  it.todo("onCancel does not throw when preview was never attached");
});
