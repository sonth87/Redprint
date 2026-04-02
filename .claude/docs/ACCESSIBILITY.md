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

### Resize & Drag Keyboard Alternative

For users unable to use mouse drag:

- **Ctrl+Arrow keys**: Resize selected node
- **Shift+Ctrl+Arrow**: Resize larger increments
- **Shift+Arrow**: Drag (move) selected node

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
