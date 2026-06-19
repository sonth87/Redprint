export function lockDocumentSelection(cursor?: string): () => void {
  if (typeof document === "undefined") return () => {};

  const root = document.documentElement;
  const body = document.body;
  const rootStyle = root.style as CSSStyleDeclaration & { webkitUserSelect?: string };
  const bodyStyle = body.style as CSSStyleDeclaration & { webkitUserSelect?: string };
  const previous = {
    rootUserSelect: rootStyle.userSelect,
    rootWebkitUserSelect: rootStyle.webkitUserSelect,
    rootCursor: rootStyle.cursor,
    bodyUserSelect: bodyStyle.userSelect,
    bodyWebkitUserSelect: bodyStyle.webkitUserSelect,
    bodyCursor: bodyStyle.cursor,
  };

  const preventSelection = (event: Event) => {
    event.preventDefault();
    document.getSelection()?.removeAllRanges();
  };

  document.getSelection()?.removeAllRanges();
  rootStyle.userSelect = "none";
  rootStyle.webkitUserSelect = "none";
  bodyStyle.userSelect = "none";
  bodyStyle.webkitUserSelect = "none";
  if (cursor) {
    rootStyle.cursor = cursor;
    bodyStyle.cursor = cursor;
  }

  document.addEventListener("selectstart", preventSelection, true);
  document.addEventListener("dragstart", preventSelection, true);

  return () => {
    document.removeEventListener("selectstart", preventSelection, true);
    document.removeEventListener("dragstart", preventSelection, true);
    rootStyle.userSelect = previous.rootUserSelect;
    rootStyle.webkitUserSelect = previous.rootWebkitUserSelect;
    rootStyle.cursor = previous.rootCursor;
    bodyStyle.userSelect = previous.bodyUserSelect;
    bodyStyle.webkitUserSelect = previous.bodyWebkitUserSelect;
    bodyStyle.cursor = previous.bodyCursor;
    document.getSelection()?.removeAllRanges();
  };
}
