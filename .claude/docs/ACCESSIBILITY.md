# Accessibility & Error Handling

Reference for accessibility requirements, error boundaries, and developer diagnostics.

---

## Runtime Accessibility (A11y)

### Component A11y Configuration

```ts
interface ComponentA11yConfig {
  role?: string;
  ariaLabel?: string | ((props: Record<string, unknown>) => string);
  ariaDescribedBy?: string;
  focusable?: boolean;
}
```

### Generated HTML

Runtime renderer applies ARIA attributes from:
- `ComponentDefinition.a11y` configuration
- Node-level overrides
- Generated HTML must pass WCAG 2.1 Level AA for basic components

**Example:** Button component

```tsx
<button
  role="button"
  aria-label={ariaLabel}
  aria-pressed={isPressed}
  aria-disabled={isDisabled}
>
  Click me
</button>
```

---

## Editor Accessibility

### Keyboard Navigation

- **Tab / Shift+Tab**: Navigate between focusable elements
- **Enter**: Select item, enter container
- **Escape**: Deselect, exit container
- **Arrow keys**: Move between siblings, nudge selected node
- **Space+Drag**: Pan canvas (fallback to keyboard for users unable to drag)

### Canvas Navigation

```ts
interface CanvasKeyboardNav {
  // In canvas editing mode
  "Enter" → enter first child of selected container
  "Escape" → deselect, exit container
  "Tab" / "Shift+Tab" → select next/prev sibling
  "ArrowUp" / "ArrowDown" / "ArrowLeft" / "ArrowRight" → nudge or navigate
}
```

### Editor Interaction Shield

In editor mode, component DOM is visual by default. `builder-react` resolves each
component's `editorConfig.interactionPolicy` and applies an interaction shield at
`NodeRenderer` so native runtime behavior does not compete with canvas selection,
move, resize, or inline edit.

- `shielded` and normal `inline-edit` nodes suppress descendant pointer events,
  native text selection, link/image dragging, runtime clicks, and runtime
  focus/key activation.
- `inline-edit` nodes still allow canvas double-click handling to enter the rich-text
  editor for components such as Text and Button.
- `container` nodes such as Section, Container, Grid, Column, Row, and Repeater do
  not shield their subtree, so children remain selectable through `data-node-id`.
- `component-managed` nodes keep their own editor interactions. `GalleryPro`
  Freestyle currently uses this mode to preserve direct image dragging until that
  UX is redesigned as a separate edit mode.
- Runtime and preview modes do not receive shield attributes or shield event handlers.

### Resize & Drag Keyboard Alternative

For users unable to use mouse drag:

- **Ctrl+Arrow keys**: Resize selected node
- **Shift+Ctrl+Arrow**: Resize larger increments
- **Shift+Arrow**: Drag (move) selected node

### Navigation Menus

Runtime `NavigationMenu` output uses a labelled navigation landmark. Menu links must
remain keyboard reachable with normal Tab navigation. Items with submenu children
open their desktop submenu recursively on hover or keyboard focus. Desktop
submenus use hover/focus bridges so pointer movement into nested flyouts remains
stable; Escape closes the actively opened desktop submenu chain.

Hamburger menus must expose `aria-expanded` and `aria-controls`, close with Escape
or backdrop/close button, restore focus to the trigger when closed, and lock body
scroll for fullscreen/drawer modes. Mobile submenu children render as expandable
groups instead of hover-only flyouts.

On the editor canvas, `NavigationMenu` uses the general Editor Interaction Shield
and also keeps component-level guards as defense in depth. Hover, click, overflow
scroll buttons, dropdown submenus, and hamburger overlays are runtime behaviors
only. Native link dragging is disabled on editor-rendered menu links so drag
gestures belong to the editor selection system. Editor canvas interaction should
select, move, and resize the component; menu item and submenu edits happen in
Manage Menu.

Editor Manage Menu keeps hidden menu items visible in the management tree so they
can be reordered, nested, restored, or deleted without losing state. Dragging menu
items must show a visible placeholder for before/after/inside drops; indent,
outdent, reorder, hide/show, and target edits are committed as command-based prop
updates so undo/redo remains predictable.

### Screen Reader Announcements

Critical state changes broadcast to screen reader:

- "Node added: [node name]"
- "Node removed: [node name]"
- "Node selected: [node name]"
- "Breakpoint changed to: [breakpoint]"
- "[N] nodes selected"

### Focus Management

- Focus visible indicators on all interactive elements
- Focus outline: 2px solid primary color, 2px offset
- Never remove focus outlines without replacement
- Trapping focus in modals (import/export dialogs)

### Runtime Popups

Runtime popups that behave as modal surfaces must:

- Render with `role="dialog"` and `aria-modal="true"` where applicable
- Move focus into the popup when opened
- Trap Tab focus inside the popup while open
- Close with Escape when `behavior.closeOnEscape` is enabled
- Restore focus to the previously focused element when closed
- Lock body scroll when `behavior.lockBodyScroll` is enabled
- Keep backdrop click optional through `behavior.closeOnBackdropClick`

Announcement bars are not modal by default and should not trap focus unless the
consumer explicitly configures them to behave like a modal surface.

**V3 hardening (stacking + reduced motion):**

- With multiple popups open, **only the topmost interactive popup** responds to
  Escape and traps focus; lower popups are inert to keyboard.
- When the topmost modal-like popup sets `behavior.inertBackground`, the page
  root behind it is marked `inert` + `aria-hidden` so assistive tech and keyboard
  navigation stay within the dialog. Non-backdrop popups (bars) never block page
  pointer events.
- `behavior.reducedMotion` (default `"respect"`) honors
  `prefers-reduced-motion: reduce` by skipping enter/exit animations; lifecycle
  states transition immediately so the popup still opens/closes correctly.
- A popup with no focusable children does not throw; focus trapping no-ops.

**V4 (A/B variants):** an assigned variant renders alternate content but keeps the
same surface a11y contract — `role="dialog"`/`aria-modal`, focus trap, ESC, and
focus restore apply identically regardless of which variant is shown. Variant
content must independently satisfy modal a11y (focusable close path, labelled
controls).

### ARIA Landmarks

Editor shell structure:

```html
<header role="banner">
  <!-- top toolbar -->
</header>

<aside role="complementary" aria-label="Component palette">
  <!-- left panel -->
</aside>

<main role="main">
  <!-- canvas -->
</main>

<aside role="complementary" aria-label="Property panel">
  <!-- right panel -->
</aside>
```

---

## Error Boundary Contracts

### Render Errors

When component's `renderer` throws:

```ts
try {
  const result = componentRenderer(node, context);
} catch (error) {
  // 1. Catch at node boundary
  // 2. Render ErrorPlaceholder instead
  // 3. Emit 'component:render-error' event
  // 4. Continue rendering remaining nodes
  // → Document tree not broken, degraded display
}
```

**Error Placeholder:**

```tsx
<div className="error-boundary" style={{ border: "2px solid red", padding: "16px" }}>
  <p>Error rendering component</p>
  <details>
    <summary>Details</summary>
    <pre>{error.message}</pre>
  </details>
</div>
```

### Command Errors

When command handler throws:

```ts
try {
  const newState = handler(currentState, payload);
} catch (error) {
  // 1. Do NOT apply command to state
  // 2. Add error to diagnostic log
  // 3. Emit 'command:error' event
  // 4. Notify user (toast notification)
  // → State unchanged (all-or-nothing semantics)
}
```

### Plugin Errors

When plugin installation/operation fails:

```ts
try {
  plugin.install(api);
} catch (error) {
  // 1. Catch at plugin level
  // 2. Emit 'plugin:error' event
  // 3. Log diagnostic
  // 4. Continue with remaining plugins
  // → Builder continues in degraded state
}
```

**Error Details:**

```ts
interface DiagnosticEvent {
  timestamp: string;
  level: "error" | "warn" | "info";
  category: "component" | "command" | "plugin" | "rendering";
  message: string;
  context?: unknown;
  stackTrace?: string;
}
```

### Remote Component Errors

**Manifest fetch fail:**
- Show error state in palette
- Retry available (manual or auto)

**Bundle load fail:**
- Render `RemoteComponentErrorPlaceholder` on canvas
- Emit diagnostic event
- Palette shows "Failed to load"

**Runtime render error:**
- Catch at component boundary
- Render `ErrorPlaceholder` or fallback component

---

## Development Mode Diagnostics

In development mode, builder logs:

| Issue                                    | Message                              |
| ---------------------------------------- | ------------------------------------ |
| Missing component registration           | "Unknown component type: xyz"        |
| Schema validation failure                | "Props do not match schema: ..."     |
| Plugin dependency conflict               | "Conflicting versions of plugin-x"   |
| Slow render (>16ms)                      | "Slow render: [component] 45ms"      |
| Direct state mutation                    | "Direct state mutation detected"     |
| Snap calculation time >8ms               | "Slow snap calc: 12ms for 200 nodes" |
| Remote component load failure            | "Failed to load component-xyz: 404"  |

**Severity Levels:**

- **Error**: Breaks functionality, must fix
- **Warning**: Degraded behavior, should fix
- **Info**: Informational, performance notes

---

## Fallback Strategies

| Scenario                    | Strategy                                    |
| --------------------------- | ------------------------------------------- |
| Component type missing      | Render `UnknownComponentPlaceholder`         |
| Component render errors     | Catch and render `ErrorPlaceholder`         |
| Element bounding box fails  | Use viewport dimensions as fallback         |
| Font load timeout           | Fall back to system fonts                    |
| Asset URL broken            | Show broken-image icon or placeholder        |
| Snap calculation too slow   | Skip snap, continue interaction              |
| History too large           | Prune oldest entries                         |

---

## User Error Prevention

### Confirmation Dialogs

Before destructive actions:

| Action          | Confirmation Required | Message                          |
| --------------- | --------------------- | -------------------------------- |
| Delete node     | Multi-child node      | "Delete [name] and X children?"  |
| Delete all      | Ctrl+A then Delete    | "Delete all nodes?"              |
| Discard changes | Exit unsaved          | "Discard unsaved changes?"       |

### Warnings

Display non-blocking warnings for:

- Pasting incompatible component type
- Responsive style override conflicts
- Deprecated component usage
- Large document (>5000 nodes) performance hint

---

_For component A11y in rendering pipeline, see `RUNTIME.md`._
_For keyboard shortcuts, see `EDITOR_UI.md`._
_For plugin error handling, see `PLUGINS.md`._
