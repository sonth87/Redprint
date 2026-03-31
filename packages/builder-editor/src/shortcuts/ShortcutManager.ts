import type { ShortcutDefinition } from "../types";

/**
 * ShortcutManager — registers, deregisters and dispatches keyboard shortcuts.
 *
 * Shortcuts are matched by key (lowercase) + modifiers.
 * Built-in shortcuts (per spec, Section 14.5):
 *   Ctrl/Cmd+Z    → undo
 *   Ctrl/Cmd+Y    → redo
 *   Ctrl/Cmd+D    → duplicate
 *   Backspace     → delete selected
 *   Escape        → deselect
 *   Ctrl/Cmd+A    → select all
 *   Ctrl/Cmd+G    → group
 *   Ctrl/Cmd+C    → copy
 *   Ctrl/Cmd+V    → paste
 *   Ctrl/Cmd+X    → cut
 *   ↑↓←→          → nudge (1px, or 10px with Shift)
 *   Ctrl/Cmd+=    → zoom in
 *   Ctrl/Cmd+-    → zoom out
 *   Ctrl/Cmd+0    → zoom to fit
 */
export class ShortcutManager {
  private readonly shortcuts = new Map<string, ShortcutDefinition>();
  private readonly handler: (e: KeyboardEvent) => void;
  private attached = false;

  constructor() {
    this.handler = this.handleKeyDown.bind(this);
  }

  /**
   * Register a keyboard shortcut.
   * Overwrites existing shortcuts with the same key combo.
   */
  register(shortcut: ShortcutDefinition): void {
    const key = this.makeKey(shortcut.key, shortcut.modifiers);
    this.shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a shortcut by ID.
   */
  unregister(id: string): void {
    for (const [key, def] of this.shortcuts.entries()) {
      if (def.id === id) {
        this.shortcuts.delete(key);
        return;
      }
    }
  }

  /**
   * Attach global keydown listener to the window.
   * Must be called once on mount.
   */
  attach(): void {
    if (this.attached) return;
    window.addEventListener("keydown", this.handler);
    this.attached = true;
  }

  /**
   * Detach global keydown listener.
   * Call on unmount.
   */
  detach(): void {
    window.removeEventListener("keydown", this.handler);
    this.attached = false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Skip if focus is inside an input/textarea/contenteditable
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      // Only allow Escape to work in inputs
      if (e.key !== "Escape") return;
    }

    const key = this.makeKey(e.key.toLowerCase(), this.getModifiers(e));
    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      e.preventDefault();
      shortcut.handler();
    }
  }

  private getModifiers(e: KeyboardEvent): ("meta" | "ctrl" | "alt" | "shift")[] {
    const mods: ("meta" | "ctrl" | "alt" | "shift")[] = [];
    if (e.metaKey) mods.push("meta");
    if (e.ctrlKey) mods.push("ctrl");
    if (e.altKey) mods.push("alt");
    if (e.shiftKey) mods.push("shift");
    return mods;
  }

  private makeKey(
    key: string,
    modifiers: ("meta" | "ctrl" | "alt" | "shift")[] = [],
  ): string {
    return [...modifiers.sort(), key].join("+");
  }

  listShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }
}
