import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, EyeOff, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import type { BuilderDocument, BuilderNode } from "@ui-builder/builder-core";
import {
  normalizeMenuItems,
  shortId,
  type MenuItem,
  type MenuTarget,
} from "@ui-builder/shared";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@ui-builder/ui";
import { lockDocumentSelection } from "../../utils/interactionLock";

type DispatchCommand = (command: { type: "UPDATE_PROPS" | "UPDATE_STYLE"; payload: Record<string, unknown>; description?: string }) => void;

interface MenuToolbarPanelProps {
  node: BuilderNode;
  document: BuilderDocument;
  dispatch: DispatchCommand;
}

interface AnchorOption {
  id: string;
  label: string;
  source: "section" | "anchor";
}

interface FlatMenuRow {
  item: MenuItem;
  parentId: string | null;
  index: number;
  depth: number;
}

type DropPosition = "before" | "inside" | "after";

interface DropIndicator {
  targetId: string | null;
  parentId: string | null;
  index: number;
  depth: number;
  position: DropPosition;
  top: number;
  height?: number;
}

interface DragSession {
  id: string;
  label: string;
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
  width: number;
}

const MAX_MENU_MANAGER_DEPTH = 2;
const MENU_TREE_INDENT = 22;
const MENU_ROW_PLACEHOLDER_HEIGHT = 42;

function getMenuItems(node: BuilderNode): MenuItem[] {
  return normalizeMenuItems(node.props.items);
}

function updateTree(items: MenuItem[], itemId: string, updater: (item: MenuItem) => MenuItem): MenuItem[] {
  return items.map((item) => {
    if (item.id === itemId) return updater(item);
    return item.children ? { ...item, children: updateTree(item.children, itemId, updater) } : item;
  });
}

function removeFromTree(items: MenuItem[], itemId: string): { items: MenuItem[]; removed: MenuItem | null; parentId: string | null; index: number } {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;
    if (item.id === itemId) {
      const next = [...items.slice(0, index), ...items.slice(index + 1)];
      return { items: next, removed: item, parentId: null, index };
    }
    if (item.children) {
      const childResult = removeFromTree(item.children, itemId);
      if (childResult.removed) {
        return {
          items: items.map((candidate) => candidate.id === item.id ? { ...candidate, children: childResult.items } : candidate),
          removed: childResult.removed,
          parentId: item.id,
          index: childResult.index,
        };
      }
    }
  }
  return { items, removed: null, parentId: null, index: -1 };
}

function insertIntoTree(items: MenuItem[], parentId: string | null, index: number, item: MenuItem): MenuItem[] {
  if (!parentId) {
    const next = [...items];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, item);
    return next;
  }
  return items.map((candidate) => {
    if (candidate.id === parentId) {
      const children = [...(candidate.children ?? [])];
      children.splice(Math.max(0, Math.min(index, children.length)), 0, item);
      return { ...candidate, children };
    }
    return candidate.children ? { ...candidate, children: insertIntoTree(candidate.children, parentId, index, item) } : candidate;
  });
}

function findParent(items: MenuItem[], itemId: string, parentId: string | null = null): string | null {
  for (const item of items) {
    if (item.id === itemId) return parentId;
    const childParent = findParent(item.children ?? [], itemId, item.id);
    if (childParent !== null) return childParent;
  }
  return null;
}

function flattenMenuItems(items: MenuItem[], parentId: string | null = null, depth = 0): FlatMenuRow[] {
  return items.flatMap((item, index) => [
    { item, parentId, index, depth },
    ...flattenMenuItems(item.children ?? [], item.id, depth + 1),
  ]);
}

function findMenuItem(items: MenuItem[], itemId: string): MenuItem | null {
  for (const item of items) {
    if (item.id === itemId) return item;
    const child = findMenuItem(item.children ?? [], itemId);
    if (child) return child;
  }
  return null;
}

function containsItem(items: MenuItem[] | undefined, itemId: string): boolean {
  return Boolean(items?.some((item) => item.id === itemId || containsItem(item.children, itemId)));
}

function getSiblings(items: MenuItem[], parentId: string | null): MenuItem[] {
  if (!parentId) return items;
  return findMenuItem(items, parentId)?.children ?? [];
}

function moveItem(items: MenuItem[], itemId: string, targetParentId: string | null, targetIndex: number): MenuItem[] {
  const removedResult = removeFromTree(items, itemId);
  if (!removedResult.removed) return items;
  const adjustedIndex = removedResult.parentId === targetParentId && removedResult.index < targetIndex ? targetIndex - 1 : targetIndex;
  return insertIntoTree(removedResult.items, targetParentId, adjustedIndex, removedResult.removed);
}

function isNoopMove(items: MenuItem[], itemId: string, targetParentId: string | null, targetIndex: number): boolean {
  const currentParentId = findParent(items, itemId);
  const siblings = getSiblings(items, currentParentId);
  const currentIndex = siblings.findIndex((item) => item.id === itemId);
  const adjustedIndex = currentParentId === targetParentId && currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
  return currentParentId === targetParentId && currentIndex === adjustedIndex;
}

function sameDropIndicator(a: DropIndicator | null, b: DropIndicator | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.targetId === b.targetId &&
    a.parentId === b.parentId &&
    a.index === b.index &&
    a.depth === b.depth &&
    a.position === b.position &&
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.height ?? 0) === Math.round(b.height ?? 0)
  );
}

function clampMenuDepth(depth: number): number {
  return Math.max(0, Math.min(MAX_MENU_MANAGER_DEPTH, depth));
}

function itemDepth(items: MenuItem[], itemId: string, depth = 0): number {
  for (const item of items) {
    if (item.id === itemId) return depth;
    const childDepth = itemDepth(item.children ?? [], itemId, depth + 1);
    if (childDepth >= 0) return childDepth;
  }
  return -1;
}

function moveOut(items: MenuItem[], itemId: string): MenuItem[] {
  const parentId = findParent(items, itemId);
  if (!parentId) return items;
  const grandParentId = findParent(items, parentId);
  const siblings = getSiblings(items, grandParentId);
  const parentIndex = siblings.findIndex((item) => item.id === parentId);
  const removedResult = removeFromTree(items, itemId);
  if (!removedResult.removed) return items;
  return insertIntoTree(removedResult.items, grandParentId, parentIndex + 1, removedResult.removed);
}

function indentUnderPrevious(items: MenuItem[], itemId: string): MenuItem[] {
  const parentId = findParent(items, itemId);
  const siblings = getSiblings(items, parentId);
  const index = siblings.findIndex((item) => item.id === itemId);
  if (index <= 0) return items;
  const previousSibling = siblings[index - 1]!;
  if (itemDepth(items, previousSibling.id) >= MAX_MENU_MANAGER_DEPTH) return items;
  const removedResult = removeFromTree(items, itemId);
  if (!removedResult.removed) return items;
  const targetChildren = previousSibling.children?.length ?? 0;
  return insertIntoTree(removedResult.items, previousSibling.id, targetChildren, removedResult.removed);
}

function discoverAnchors(document: BuilderDocument): AnchorOption[] {
  const byId = new Map<string, AnchorOption>();
  const nodes = Object.values(document.nodes);

  nodes
    .filter((node) => node.type === "Section")
    .sort((a, b) => a.order - b.order)
    .forEach((node, index) => {
      const id = String(node.props.anchorId ?? node.props.htmlId ?? node.props.slug ?? node.id);
      const label = String(node.props.label ?? node.props.title ?? node.props.name ?? `Section ${index + 1}`);
      byId.set(id, { id, label, source: "section" });
    });

  nodes
    .filter((node) => node.type === "Anchor")
    .forEach((node) => {
      const id = String(node.props.anchorId ?? node.id);
      byId.set(id, {
        id,
        label: String(node.props.label ?? node.props.anchorId ?? node.id),
        source: "anchor",
      });
    });

  return Array.from(byId.values());
}

function createMenuItem(): MenuItem {
  const id = shortId("menu-");
  return { id, label: "New item", target: { type: "none" } };
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input
          className="h-8 w-20 text-right text-xs"
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(next) => onChange(next[0] ?? value)} />
    </div>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-background/80 p-3 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          className="h-8 w-9 cursor-pointer rounded-md border p-1"
          value={value || "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          className="h-8 w-24 font-mono text-xs"
          value={value}
          placeholder="#ffffff"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function OverflowModePreview({ mode }: { mode: "wrap" | "scroll" | "collapse" }) {
  if (mode === "wrap") {
    return (
      <div className="flex h-12 w-20 flex-col justify-center gap-1 rounded bg-current/10 px-2">
        <div className="flex gap-1">
          <span className="h-1.5 w-5 rounded bg-current/50" />
          <span className="h-1.5 w-7 rounded bg-current/50" />
        </div>
        <div className="flex gap-1">
          <span className="h-1.5 w-3 rounded bg-current/50" />
          <span className="h-1.5 w-4 rounded bg-current/50" />
          <span className="h-1.5 w-5 rounded bg-current/50" />
        </div>
      </div>
    );
  }

  if (mode === "scroll") {
    return (
      <div className="flex h-7 w-24 items-center rounded overflow-hidden">
        <div className="flex h-5 flex-1 items-center gap-2 rounded bg-current/10 px-2">
          <span className="h-1.5 w-4 rounded bg-current/50" />
          <span className="h-1.5 w-4 rounded bg-current/50" />
          <span className="" ><ChevronRight className="h-4 w-3.5" /></span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-8 w-24 items-center rounded border border-current/35 bg-background/50">      <div className="flex flex-1 items-center gap-1 px-2">
        <span className="h-1.5 w-4 rounded bg-current/50" />
        <span className="h-1.5 w-4 rounded bg-current/50" />
      </div>
      <span className="pr-2 text-sm font-bold leading-none">...</span>
    </div>
  );
}

function ModeCard({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-24 rounded-lg border p-3 text-xs transition-all hover:-translate-y-0.5 hover:shadow-md",
        active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-muted/35 hover:bg-background",
      )}
    >
      <div className="mb-2 flex h-10 items-center justify-center">{children}</div>
      <span>{label}</span>
    </button>
  );
}

export function MenuStretchPopover({ node, dispatch }: Pick<MenuToolbarPanelProps, "node" | "dispatch">) {
  const { t } = useTranslation();
  const widthMode = String(node.props.widthMode ?? "wrap");
  const setWidthMode = (mode: "wrap" | "fullWidth") => {
    dispatch({
      type: "UPDATE_PROPS",
      payload: { nodeId: node.id, props: { widthMode: mode } },
      description: "Set menu width mode",
    });
    dispatch({
      type: "UPDATE_STYLE",
      payload: { nodeId: node.id, style: { width: mode === "fullWidth" ? "100%" : "fit-content" } },
      description: "Set menu width",
    });
  };

  return (
    <div className="grid gap-3 p-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{t("menuToolbar.stretch.title", "Stretch")}</p>
          <p className="text-xs text-muted-foreground">{t("menuToolbar.stretch.description", "Choose how the menu uses available width.")}</p>
        </div>
        <Switch checked={widthMode === "fullWidth"} onCheckedChange={(checked) => setWidthMode(checked ? "fullWidth" : "wrap")} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={widthMode === "wrap" ? "default" : "outline"} size="sm" onClick={() => setWidthMode("wrap")}>
          {t("menuToolbar.stretch.wrap", "Wrap")}
        </Button>
        <Button variant={widthMode === "fullWidth" ? "default" : "outline"} size="sm" onClick={() => setWidthMode("fullWidth")}>
          {t("menuToolbar.stretch.fullWidth", "Full width")}
        </Button>
      </div>
    </div>
  );
}

export function MenuManagerPanel({ node, document, dispatch }: MenuToolbarPanelProps) {
  const { t } = useTranslation();
  const anchors = discoverAnchors(document);
  const items = getMenuItems(node);
  const [editingId, setEditingId] = React.useState<string | null>(items[0]?.id ?? null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const dragIdRef = React.useRef<string | null>(null);
  const [dropIndicator, setDropIndicator] = React.useState<DropIndicator | null>(null);
  const dropIndicatorRef = React.useRef<DropIndicator | null>(null);
  const [dragSession, setDragSession] = React.useState<DragSession | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const rowRefs = React.useRef(new Map<string, HTMLDivElement>());
  const flatRows = React.useMemo(() => flattenMenuItems(items), [items]);
  const editingItem = flatRows.find(({ item }) => item.id === editingId)?.item ?? items[0] ?? null;

  const commit = (next: MenuItem[], description: string) => {
    dispatch({ type: "UPDATE_PROPS", payload: { nodeId: node.id, props: { items: next } }, description });
  };

  const setItem = (id: string, patch: Partial<MenuItem>) => {
    commit(updateTree(items, id, (item) => ({ ...item, ...patch })), "Update menu item");
  };

  const setTarget = (id: string, target: MenuTarget) => {
    commit(updateTree(items, id, (item) => ({ ...item, target })), "Update menu item target");
  };

  const clearDragState = () => {
    dragIdRef.current = null;
    setDragId(null);
    setDragSession(null);
    dropIndicatorRef.current = null;
    setDropIndicator(null);
  };

  const setStableDropIndicator = (next: DropIndicator | null) => {
    dropIndicatorRef.current = next;
    setDropIndicator((current) => sameDropIndicator(current, next) ? current : next);
  };

  const getRowRect = (itemId: string) => rowRefs.current.get(itemId)?.getBoundingClientRect() ?? null;

  const getPointerDepth = (clientX: number, listRect: DOMRect) => (
    clampMenuDepth(Math.round((clientX - listRect.left - 18) / MENU_TREE_INDENT))
  );

  const buildLineIndicator = (
    row: FlatMenuRow,
    rect: DOMRect,
    listRect: DOMRect,
    position: "before" | "after",
    targetParentId: string | null,
    targetIndex: number,
    targetDepth: number,
  ): DropIndicator => ({
    targetId: row.item.id,
    parentId: targetParentId,
    index: targetIndex,
    depth: targetDepth,
    position,
    top: (position === "before" ? rect.top : rect.bottom) - listRect.top,
  });

  const buildInsideIndicator = (row: FlatMenuRow, rect: DOMRect, listRect: DOMRect): DropIndicator => ({
    targetId: row.item.id,
    parentId: row.item.id,
    index: row.item.children?.length ?? 0,
    depth: Math.min(row.depth + 1, MAX_MENU_MANAGER_DEPTH),
    position: "inside",
    top: rect.top - listRect.top,
    height: rect.height,
  });

  const getLineTarget = (
    row: FlatMenuRow,
    rect: DOMRect,
    listRect: DOMRect,
    position: "before" | "after",
    wantsSubmenuDepth: boolean,
  ): DropIndicator | null => {
    const currentDragId = dragIdRef.current ?? dragId;
    const dragged = currentDragId ? findMenuItem(items, currentDragId) : null;
    if (!currentDragId || !dragged) return null;

    if (wantsSubmenuDepth) {
      if (row.depth < MAX_MENU_MANAGER_DEPTH) {
        if (row.item.id !== currentDragId && !containsItem(dragged.children, row.item.id)) {
          return buildInsideIndicator(row, rect, listRect);
        }
      }
      return buildLineIndicator(row, rect, listRect, position, row.parentId, row.index + (position === "after" ? 1 : 0), Math.min(row.depth, MAX_MENU_MANAGER_DEPTH));
    }

    if (row.depth > 0 && row.parentId) {
      const grandParentId = findParent(items, row.parentId);
      const parentSiblings = getSiblings(items, grandParentId);
      const parentIndex = parentSiblings.findIndex((item) => item.id === row.parentId);
      return buildLineIndicator(row, rect, listRect, "after", grandParentId, parentIndex + 1, Math.max(0, row.depth - 1));
    }

    return buildLineIndicator(row, rect, listRect, position, row.parentId, row.index + (position === "after" ? 1 : 0), row.depth);
  };

  const getDropIndicatorAtPoint = (clientX: number, clientY: number): DropIndicator | null => {
    const currentDragId = dragIdRef.current ?? dragId;
    const dragged = currentDragId ? findMenuItem(items, currentDragId) : null;
    const listElement = listRef.current;
    if (!currentDragId || !dragged || !listElement) return null;
    const listRect = listElement.getBoundingClientRect();
    const measuredRows = flatRows
      .filter(({ item }) => item.id !== currentDragId && !containsItem(dragged.children, item.id))
      .map((row) => ({ row, rect: getRowRect(row.item.id) }))
      .filter((entry): entry is { row: FlatMenuRow; rect: DOMRect } => Boolean(entry.rect));

    if (measuredRows.length === 0) return null;

    const pointerY = clientY;
    const pointerDepth = getPointerDepth(clientX, listRect);
    const hovered = measuredRows.find(({ rect }) => pointerY >= rect.top && pointerY <= rect.bottom);
    if (!hovered) {
      const nextRowIndex = measuredRows.findIndex(({ rect }) => pointerY < rect.top);
      if (nextRowIndex === 0) {
        const first = measuredRows[0]!;
        return getLineTarget(first.row, first.rect, listRect, "before", false);
      }
      if (nextRowIndex > 0) {
        const previous = measuredRows[nextRowIndex - 1]!;
        const next = measuredRows[nextRowIndex]!;
        const gapMidpoint = previous.rect.bottom + ((next.rect.top - previous.rect.bottom) / 2);
        return pointerY <= gapMidpoint
          ? getLineTarget(previous.row, previous.rect, listRect, "after", pointerDepth > previous.row.depth)
          : getLineTarget(next.row, next.rect, listRect, "before", pointerDepth > next.row.depth);
      }
      const last = measuredRows[measuredRows.length - 1]!;
      return getLineTarget(last.row, last.rect, listRect, "after", pointerDepth > last.row.depth);
    }

    const ratio = (pointerY - hovered.rect.top) / Math.max(hovered.rect.height, 1);
    const wantsSubmenuDepth = pointerDepth > hovered.row.depth;
    if (hovered.row.depth < MAX_MENU_MANAGER_DEPTH && wantsSubmenuDepth && ratio > 0.18) {
      return buildInsideIndicator(hovered.row, hovered.rect, listRect);
    }

    return getLineTarget(hovered.row, hovered.rect, listRect, ratio < 0.5 ? "before" : "after", wantsSubmenuDepth);
  };

  const autoScrollList = (clientY: number) => {
    const viewport = listRef.current?.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const edge = 36;
    if (clientY < rect.top + edge) viewport.scrollTop -= 14;
    else if (clientY > rect.bottom - edge) viewport.scrollTop += 14;
  };

  const applyDrop = (indicator: DropIndicator | null = dropIndicatorRef.current) => {
    const currentDragId = dragIdRef.current ?? dragId;
    if (!currentDragId || !indicator) {
      clearDragState();
      return;
    }
    const dragged = findMenuItem(items, currentDragId);
    if (!dragged || (indicator.targetId && containsItem(dragged.children, indicator.targetId))) {
      clearDragState();
      return;
    }

    if (!isNoopMove(items, currentDragId, indicator.parentId, indicator.index)) {
      commit(
        moveItem(items, currentDragId, indicator.parentId, indicator.index),
        indicator.position === "inside" ? "Nest menu item" : "Reorder menu item",
      );
    }
    clearDragState();
  };

  const startMenuItemDrag = (event: React.PointerEvent<HTMLButtonElement>, item: MenuItem) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    const rowRect = rowRefs.current.get(item.id)?.getBoundingClientRect();
    const offsetX = rowRect ? event.clientX - rowRect.left : 12;
    const offsetY = rowRect ? event.clientY - rowRect.top : 10;
    const width = rowRect?.width ?? 220;

    dragIdRef.current = item.id;
    setDragId(item.id);
    setDragSession({ id: item.id, label: item.label, pointerX: event.clientX, pointerY: event.clientY, offsetX, offsetY, width });
    setStableDropIndicator(null);

    const unlockSelection = lockDocumentSelection("grabbing");

    const removeListeners = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      unlockSelection();
    };

    function handleMove(pointerEvent: PointerEvent) {
      pointerEvent.preventDefault();
      setDragSession((current) => current && current.id === item.id
        ? { ...current, pointerX: pointerEvent.clientX, pointerY: pointerEvent.clientY }
        : current);
      autoScrollList(pointerEvent.clientY);
      setStableDropIndicator(getDropIndicatorAtPoint(pointerEvent.clientX, pointerEvent.clientY));
    }

    function handleUp(pointerEvent: PointerEvent) {
      pointerEvent.preventDefault();
      removeListeners();
      applyDrop(getDropIndicatorAtPoint(pointerEvent.clientX, pointerEvent.clientY) ?? dropIndicatorRef.current);
    }

    function handleCancel() {
      removeListeners();
      clearDragState();
    }

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
  };

  const renderDropIndicator = () => {
    if (!dropIndicator || !dragId) return null;
    const left = 8 + dropIndicator.depth * MENU_TREE_INDENT;
    if (dropIndicator.position === "inside") {
      return (
        <div
          className="pointer-events-none absolute right-2 rounded-lg border border-primary/60 bg-primary/15 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.12),0_6px_18px_rgba(37,99,235,0.10)]"
          style={{
            top: dropIndicator.top,
            left,
            height: dropIndicator.height ?? 32,
          }}
        />
      );
    }
    const height = Math.max(MENU_ROW_PLACEHOLDER_HEIGHT, dropIndicator.height ?? 0);
    return (
      <div
        className="pointer-events-none absolute right-2 rounded-lg border border-primary/60 bg-primary/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.70),0_8px_20px_rgba(37,99,235,0.12)]"
        style={{
          top: Math.max(0, dropIndicator.top - height / 2),
          left,
          height,
        }}
      />
    );
  };

  const renderRows = (rows: MenuItem[], depth = 0) => rows.map((item) => {
    const children = item.children ?? [];
    return (
      <React.Fragment key={item.id}>
        <div
          ref={(element) => {
            if (element) rowRefs.current.set(item.id, element);
            else rowRefs.current.delete(item.id);
          }}
          className={cn(
            "group relative mb-1.5 flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            editingId === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted/70",
            dropIndicator?.targetId === item.id && dropIndicator.position === "inside" && "bg-primary/5",
            dragId === item.id && "opacity-35",
            item.hidden && "opacity-45",
          )}
          data-menu-row-id={item.id}
          style={{ paddingLeft: 8 + depth * MENU_TREE_INDENT }}
        >
          {depth > 0 ? (
            <>
              {Array.from({ length: depth }).map((_, index) => (
                <span
                  key={index}
                  className="pointer-events-none absolute -top-1 -bottom-1 w-px bg-border"
                  style={{ left: 14 + index * MENU_TREE_INDENT }}
                />
              ))}
              <span
                className="pointer-events-none absolute top-1/2 h-px -translate-y-1/2 bg-border"
                style={{ left: 14 + (depth - 1) * MENU_TREE_INDENT, width: 12 }}
              />
            </>
          ) : null}
          <button
            type="button"
            className="relative z-10 flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
            onPointerDown={(event) => startMenuItemDrag(event, item)}
            aria-label={t("menuToolbar.manager.dragHandle", "Drag menu item")}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="relative z-10 min-w-0 flex-1 truncate text-left" onClick={() => setEditingId(item.id)}>
            {item.label}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditingId(item.id)}>{t("menuToolbar.manager.rename", "Rename / edit")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => commit(indentUnderPrevious(items, item.id), "Nest menu item")}>{t("menuToolbar.manager.indent", "Move into previous")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => commit(moveOut(items, item.id), "Move menu item out")}>{t("menuToolbar.manager.outdent", "Move out")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setItem(item.id, { hidden: !item.hidden })}>
                {item.hidden ? t("menuToolbar.manager.show", "Show in menu") : t("menuToolbar.manager.hide", "Hide from menu")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  const removed = removeFromTree(items, item.id);
                  commit(removed.items, "Remove menu item");
                  if (editingId === item.id) setEditingId(removed.items[0]?.id ?? null);
                }}
              >
                {t("common.delete", "Delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {children.length > 0 && renderRows(children, depth + 1)}
      </React.Fragment>
    );
  });

  return (
    <div className="flex h-[520px] flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col border-r">
          <ScrollArea className="flex-1">
            <div
              ref={listRef}
              className="relative min-h-full p-3"
            >
              {items.length > 0 ? renderRows(items) : (
                <div className="py-10 text-center text-sm text-muted-foreground">{t("menuToolbar.manager.empty", "No menu items yet")}</div>
              )}
              {renderDropIndicator()}
            </div>
          </ScrollArea>
          <div className="border-t p-3">
            <Button
              className="w-full gap-2"
              size="sm"
              onClick={() => {
                const nextItem = createMenuItem();
                commit([...items, nextItem], "Add menu item");
                setEditingId(nextItem.id);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("menuToolbar.manager.add", "Add Menu Item")}
            </Button>
          </div>
        </div>

        <div className="w-64 shrink-0 p-3">
          {editingItem ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">{t("menuToolbar.manager.label", "Label")}</Label>
                <Input className="h-8 text-sm" value={editingItem.label} onChange={(event) => setItem(editingItem.id, { label: event.target.value })} />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">{t("menuToolbar.manager.targetType", "Target type")}</Label>
                <Select
                  value={editingItem.target.type}
                  onValueChange={(type) => {
                    if (type === "anchor") setTarget(editingItem.id, { type: "anchor", anchorId: anchors[0]?.id ?? "section-1", behavior: "smooth" });
                    else if (type === "page") setTarget(editingItem.id, { type: "page", path: "/" });
                    else if (type === "url") setTarget(editingItem.id, { type: "url", url: "https://", target: "_self" });
                    else setTarget(editingItem.id, { type: "none" });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anchor">{t("menuToolbar.manager.anchor", "Anchor")}</SelectItem>
                    <SelectItem value="page">{t("menuToolbar.manager.page", "Page path")}</SelectItem>
                    <SelectItem value="url">{t("menuToolbar.manager.url", "URL")}</SelectItem>
                    <SelectItem value="none">{t("menuToolbar.manager.none", "None")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingItem.target.type === "anchor" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">{t("menuToolbar.manager.anchorTarget", "Anchor")}</Label>
                  <Select value={editingItem.target.anchorId} onValueChange={(anchorId) => setTarget(editingItem.id, { type: "anchor", anchorId, behavior: "smooth" })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {anchors.length > 0 ? anchors.map((anchor) => (
                        <SelectItem key={anchor.id} value={anchor.id}>{anchor.label}</SelectItem>
                      )) : <SelectItem value="section-1">section-1</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editingItem.target.type === "page" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">{t("menuToolbar.manager.pagePath", "Page path")}</Label>
                  <Input
                    className="h-8 text-sm font-mono"
                    value={editingItem.target.path}
                    onChange={(event) => setTarget(editingItem.id, { type: "page", path: event.target.value, pageId: editingItem.target.type === "page" ? editingItem.target.pageId : undefined })}
                  />
                </div>
              )}

              {editingItem.target.type === "url" && (
                <>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">{t("menuToolbar.manager.url", "URL")}</Label>
                    <Input
                      className="h-8 text-sm"
                      value={editingItem.target.url}
                      onChange={(event) => setTarget(editingItem.id, { type: "url", url: event.target.value, target: editingItem.target.type === "url" ? editingItem.target.target : "_self" })}
                    />
                  </div>
                  <Select value={editingItem.target.target ?? "_self"} onValueChange={(target) => setTarget(editingItem.id, { type: "url", url: editingItem.target.type === "url" ? editingItem.target.url : "", target: target === "_blank" ? "_blank" : "_self" })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_self">{t("menuToolbar.manager.sameTab", "Same tab")}</SelectItem>
                      <SelectItem value="_blank">{t("menuToolbar.manager.newTab", "New tab")}</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              <div className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2 text-sm">
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  {t("menuToolbar.manager.hidden", "Hide from menu")}
                </div>
                <Switch checked={editingItem.hidden === true} onCheckedChange={(hidden) => setItem(editingItem.id, { hidden })} />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              {t("menuToolbar.manager.select", "Select an item to edit")}
            </div>
          )}
        </div>
      </div>
      {dragSession && globalThis.document?.body ? createPortal(
        <div
          className="pointer-events-none fixed z-[10000] flex h-9 items-center gap-2 truncate rounded-md border border-primary/45 bg-primary/15 px-2 text-sm font-medium text-slate-600 shadow-xl"
          style={{
            left: dragSession.pointerX - dragSession.offsetX,
            top: dragSession.pointerY - dragSession.offsetY,
            width: Math.min(300, Math.max(180, dragSession.width)),
            transform: "rotate(-4deg)",
            transformOrigin: "24px 50%",
          }}
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span className="min-w-0 truncate">{dragSession.label}</span>
        </div>,
        globalThis.document.body,
      ) : null}
    </div>
  );
}

export function MenuLayoutPanel({ node, dispatch }: Pick<MenuToolbarPanelProps, "node" | "dispatch">) {
  const { t } = useTranslation();
  const props = node.props;
  const update = (patch: Record<string, unknown>) => {
    dispatch({ type: "UPDATE_PROPS", payload: { nodeId: node.id, props: patch }, description: "Menu layout settings" });
  };
  const numberProp = (key: string, fallback: number) => Number(props[key] ?? fallback);

  return (
    <Tabs defaultValue="menu" className="w-full">
      <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-background p-0">
        <TabsTrigger value="menu" className="rounded-none">{t("menuToolbar.layout.menu", "Menu")}</TabsTrigger>
        <TabsTrigger value="dropdown" className="rounded-none">{t("menuToolbar.layout.dropdown", "Dropdown")}</TabsTrigger>
      </TabsList>

      <TabsContent value="menu" className="mt-0">
        <div className="grid gap-5 p-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("menuToolbar.layout.overflow", "Overflow items")}</p>
            <div className="grid grid-cols-3 gap-2">
              {(["wrap", "scroll", "collapse"] as const).map((mode) => (
                <ModeCard key={mode} label={t(`menuToolbar.layout.${mode}`, mode)} active={String(props.overflowMode ?? "wrap") === mode} onClick={() => update({ overflowMode: mode })}>
                  <OverflowModePreview mode={mode} />
                </ModeCard>
              ))}
            </div>
          </div>

          <NumberSlider label={t("menuToolbar.layout.itemGap", "Horizontal spacing between items")} value={numberProp("itemGap", numberProp("gap", 24))} min={0} max={96} step={2} onChange={(itemGap) => update({ itemGap })} />
          <NumberSlider label={t("menuToolbar.layout.rowGap", "Vertical spacing between items")} value={numberProp("rowGap", 8)} min={0} max={80} step={2} onChange={(rowGap) => update({ rowGap })} />

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{t("menuToolbar.layout.fill", "Items fill the whole menu")}</p>
              <p className="text-xs text-muted-foreground">{t("menuToolbar.layout.fillDescription", "Distribute items when menu has extra width.")}</p>
            </div>
            <Switch checked={props.fillItems === true} onCheckedChange={(fillItems) => update({ fillItems })} />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("menuToolbar.layout.alignment", "Alignment")}</p>
            <div className="grid grid-cols-4 gap-2">
              {(["left", "center", "right", "justify"] as const).map((alignment) => (
                <Button key={alignment} size="sm" variant={String(props.alignment ?? "left") === alignment ? "default" : "outline"} onClick={() => update({ alignment })}>
                  {t(`menuToolbar.layout.${alignment}`, alignment)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="dropdown" className="mt-0">
        <div className="grid gap-4 bg-muted/20 p-4">
          <SettingSection title={t("menuToolbar.layout.dropdownOpen", "How do dropdown menus open?")}>
            <div className="grid grid-cols-2 gap-2">
              <ModeCard label={t("menuToolbar.layout.flyout", "Flyout")} active={String(props.dropdownMode ?? "flyout") === "flyout"} onClick={() => update({ dropdownMode: "flyout" })}>
                <div className="h-9 w-14 rounded bg-current/15 p-1">
                  <div className="h-1 w-10 rounded bg-current/50" />
                  <div className="mt-2 h-5 w-7 rounded bg-current/50" />
                </div>
              </ModeCard>
              <ModeCard label={t("menuToolbar.layout.columns", "Columns")} active={String(props.dropdownMode ?? "flyout") === "columns"} onClick={() => update({ dropdownMode: "columns" })}>
                <div className="grid h-9 w-16 grid-cols-2 gap-1 rounded bg-current/15 p-1">
                  <div className="rounded bg-current/50" />
                  <div className="rounded bg-current/50" />
                </div>
              </ModeCard>
            </div>
          </SettingSection>

          <SettingSection title={t("menuToolbar.layout.dropdownWidth", "Dropdown container")}>
            <div className="grid grid-cols-2 gap-2">
              <ModeCard label={t("menuToolbar.layout.fitToMenu", "Fit to menu")} active={String(props.dropdownWidthMode ?? "fitToMenu") === "fitToMenu"} onClick={() => update({ dropdownWidthMode: "fitToMenu" })}>
                <div className="h-8 w-12 rounded bg-current/50" />
              </ModeCard>
              <ModeCard label={t("menuToolbar.layout.stretch", "Stretch")} active={String(props.dropdownWidthMode ?? "fitToMenu") === "stretch"} onClick={() => update({ dropdownWidthMode: "stretch" })}>
                <div className="h-8 w-16 rounded bg-current/50" />
              </ModeCard>
            </div>
            <NumberSlider label={t("menuToolbar.layout.dropdownMinWidth", "Minimum width")} value={numberProp("dropdownMinWidth", 210)} min={120} max={420} step={10} onChange={(dropdownMinWidth) => update({ dropdownMinWidth })} />
            <NumberSlider label={t("menuToolbar.layout.dropdownPadding", "Container padding")} value={numberProp("dropdownPadding", 12)} min={0} max={40} onChange={(dropdownPadding) => update({ dropdownPadding })} />
            <NumberSlider label={t("menuToolbar.layout.dropdownRadius", "Corner radius")} value={numberProp("dropdownRadius", 12)} min={0} max={32} onChange={(dropdownRadius) => update({ dropdownRadius })} />
          </SettingSection>

          <SettingSection title={t("menuToolbar.layout.dropdownAppearance", "Dropdown appearance")}>
            <ColorField label={t("menuToolbar.layout.dropdownBg", "Background")} value={String(props.dropdownBg ?? "")} onChange={(dropdownBg) => update({ dropdownBg })} />
            <ColorField label={t("menuToolbar.layout.dropdownBorderColor", "Border")} value={String(props.dropdownBorderColor ?? "")} onChange={(dropdownBorderColor) => update({ dropdownBorderColor })} />
            <ColorField label={t("menuToolbar.layout.dropdownItemHoverBg", "Item hover")} value={String(props.dropdownItemHoverBg ?? "")} onChange={(dropdownItemHoverBg) => update({ dropdownItemHoverBg })} />
            <div>
              <p className="mb-2 text-xs text-muted-foreground">{t("menuToolbar.layout.dropdownShadow", "Shadow")}</p>
              <div className="grid grid-cols-3 gap-2">
                {(["none", "soft", "deep"] as const).map((dropdownShadow) => (
                  <Button key={dropdownShadow} size="sm" variant={String(props.dropdownShadow ?? "soft") === dropdownShadow ? "default" : "outline"} onClick={() => update({ dropdownShadow })}>
                    {t(`menuToolbar.layout.shadow.${dropdownShadow}`, dropdownShadow)}
                  </Button>
                ))}
              </div>
            </div>
          </SettingSection>

          <SettingSection title={t("menuToolbar.layout.dropdownPosition", "Position and nesting")}>
            <NumberSlider label={t("menuToolbar.layout.dropdownMargin", "Space between menu and dropdown")} value={numberProp("dropdownMargin", 10)} min={0} max={80} step={2} onChange={(dropdownMargin) => update({ dropdownMargin })} />
            <NumberSlider label={t("menuToolbar.layout.dropdownOffsetX", "Horizontal offset")} value={numberProp("dropdownOffsetX", 0)} min={-80} max={80} onChange={(dropdownOffsetX) => update({ dropdownOffsetX })} />
            <NumberSlider label={t("menuToolbar.layout.dropdownOffsetY", "Vertical offset")} value={numberProp("dropdownOffsetY", 0)} min={-40} max={80} onChange={(dropdownOffsetY) => update({ dropdownOffsetY })} />
            <NumberSlider label={t("menuToolbar.layout.dropdownGap", "Space between dropdown items")} value={numberProp("dropdownGap", 8)} min={0} max={48} onChange={(dropdownGap) => update({ dropdownGap })} />
          </SettingSection>

          <SettingSection title={t("menuToolbar.layout.columns", "Columns")}>
            <NumberSlider label={t("menuToolbar.layout.dropdownColumns", "Number of columns")} value={numberProp("dropdownColumns", 3)} min={1} max={6} onChange={(dropdownColumns) => update({ dropdownColumns })} />
            <NumberSlider label={t("menuToolbar.layout.columnGap", "Spacing between columns")} value={numberProp("columnGap", 30)} min={0} max={100} step={2} onChange={(columnGap) => update({ columnGap })} />
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t("menuToolbar.layout.columnAlignment", "Column alignment")}</p>
              <div className="grid grid-cols-4 gap-2">
                {(["left", "center", "right", "justify"] as const).map((dropdownAlignment) => (
                  <Button key={dropdownAlignment} size="sm" variant={String(props.dropdownAlignment ?? "left") === dropdownAlignment ? "default" : "outline"} onClick={() => update({ dropdownAlignment })}>
                    {t(`menuToolbar.layout.${dropdownAlignment}`, dropdownAlignment)}
                  </Button>
                ))}
              </div>
            </div>
          </SettingSection>

          <SettingSection title={t("menuToolbar.layout.mobile", "Mobile hamburger layout")}>
            <div className="grid grid-cols-3 gap-2">
              {(["fullscreen", "drawer", "dropdown"] as const).map((hamburgerMode) => (
                <Button key={hamburgerMode} size="sm" variant={String(props.hamburgerMode ?? "fullscreen") === hamburgerMode ? "default" : "outline"} onClick={() => update({ hamburgerMode })}>
                  {t(`menuToolbar.layout.${hamburgerMode}`, hamburgerMode)}
                </Button>
              ))}
            </div>
          </SettingSection>
        </div>
      </TabsContent>
    </Tabs>
  );
}
