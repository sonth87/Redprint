// Phase 2 tests — implemented when AbsoluteDragStrategy is complete
import { describe, it } from "vitest";

describe("AbsoluteDragStrategy", () => {
  it.todo("canHandle always returns true");
  it.todo("onMove returns correct snapGuides structure");
  it.todo("onMove dispatches UPDATE_STYLE with position:absolute + left/top");
  it.todo("onMove sets flowDropTarget when cursor is over a flow container");
  it.todo("onDrop dispatches section reparenting when dropSectionId !== node.parentId");
  it.todo("onDrop dispatches REORDER_NODE when lastReorderIndex is set and parent is not absolute");
  it.todo("onCancel restores dragOriginalTransform from dataset");
});
