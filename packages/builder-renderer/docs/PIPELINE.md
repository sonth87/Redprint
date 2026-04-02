# Runtime Rendering Pipeline

Complete reference for the production runtime renderer architecture.

> **Overview:** See [.claude/docs/RUNTIME.md](../../../.claude/docs/RUNTIME.md) for rendering specifications and asset management. This file covers implementation architecture and performance optimization strategies.

---

## Rendering Pipeline

Production renderer transforms `BuilderDocument` → DOM with zero editor code.

### Stage 1: Parse & Validate

```ts
function parseDocument(schema: BuilderDocument) {
  // Validate schema version
  // Load migrations if needed
  // Validate all node types exist in registry
  return validatedDocument;
}
```

### Stage 2: Style Resolution

For each node, resolve final styles:

```ts
function resolveStyle(node: BuilderNode, breakpoint: Breakpoint) {
  const base = node.style;
  const responsive = node.responsiveStyle?.[breakpoint] ?? {};
  return { ...base, ...responsive };
}
```

### Stage 3: Component Resolution

Resolve component definition, with fallback:

```ts
function resolveComponent(type: string, registry: ComponentRegistry) {
  return registry.get(type) ?? FallbackComponent;
}
```

### Stage 4: Render

Depth-first traversal, apply runtimeRenderer:

```ts
function renderNode(node: BuilderNode, context: RenderContext) {
  const Component = resolveComponent(node.type);
  const style = resolveStyle(node, context.breakpoint);
  const children = node.children?.map(id => renderNode(nodes[id]));
  
  return Component.runtimeRenderer({
    node,
    style,
    children,
    context,
  });
}
```

---

## Component Resolution Order

1. **Registry lookup**: `registry.get(type)`
2. **Remote cache**: Check `componentCache[type]`
3. **Fallback**: `UnknownComponentPlaceholder`

---

## Interaction Binding

Each interaction config is compiled to event listeners:

```ts
function bindInteractions(node: BuilderNode, element: HTMLElement) {
  for (const interaction of node.interactions) {
    element.addEventListener(interaction.trigger, (event) => {
      if (interaction.conditions && !evaluateConditions(interaction.conditions)) {
        return;
      }
      executeActions(interaction.actions, context);
    });
  }
}
```

---

## Performance Optimization

### Memoization

```ts
const memoizedRender = useMemo(
  () => renderNode(node, context),
  [node, context, breakpoint]
);
```

### Lazy Loading

Remote components load asynchronously, non-blocking:

```ts
const RemoteComponent = React.lazy(() =>
  loadComponentBundle(componentType)
);
```

### Tree Shaking

Runtime code is separately bundled to allow tree-shaking of unused components:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./renderer": "./dist/renderer.js"
  }
}
```

---

## Error Boundaries

Render errors caught per-node:

```tsx
function renderNodeWithErrorBoundary(node) {
  try {
    return renderNode(node);
  } catch (error) {
    emit('render-error', { nodeId: node.id, error });
    return <ErrorPlaceholder error={error} />;
  }
}
```

---

## SSR Considerations

Runtime renderer is compatible with SSR:

```ts
// Works in both client and server
const html = renderToString(<RuntimeRenderer document={doc} />);
```

---

_For rendering specifications, see [.claude/docs/RUNTIME.md](../../../.claude/docs/RUNTIME.md)._
_For dynamic component loading, see [.claude/docs/RUNTIME.md](../../../.claude/docs/RUNTIME.md) (Dynamic Component Loading section)._
