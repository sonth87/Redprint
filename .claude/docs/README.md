# .claude/docs — Technical Specification Index

> **Audience: AI agents & maintainers.** This directory is the detailed, code-level specification layer:
> type contracts, conventions, rules, and guides. It is written in English.
>
> **User-facing documentation lives in [`/docs`](../../docs/README.md)** (Vietnamese): project overview,
> feature guides with flow diagrams. Improvement plans live in [`/docs/roadmap`](../../docs/roadmap/README.md).
> When a topic has both layers, spec files here should link to the user-guide page for overview context
> instead of duplicating it.

## Reading order for AI agents

1. `../ARCHITECTURE.md` — project-specific architecture & type contracts (**maintainer-owned; agents propose
   changes via `docs/roadmap/05-docs-standardization/architecture-md-proposals.md`, never edit directly**)
2. `../RULES.md` — baseline rules & conventions
3. [SPECIFICATION.md](./SPECIFICATION.md) — project overview & design principles
4. Domain files below, as needed for the task

## Domain specifications

| File | Domain | User-guide counterpart |
|------|--------|------------------------|
| [SPECIFICATION.md](./SPECIFICATION.md) | Project overview, architecture, design principles | [01-gioi-thieu-tong-quan](../../docs/user-guide/01-gioi-thieu-tong-quan.md) |
| [DATA_MODEL.md](./DATA_MODEL.md) | BuilderDocument, BuilderNode, ComponentDefinition, PropSchema | [04-components-va-preset](../../docs/user-guide/04-components-va-preset.md) |
| [COMMAND_SYSTEM.md](./COMMAND_SYSTEM.md) | Command execution, undo/redo, schema versioning | [10-phim-tat-thao-tac](../../docs/user-guide/10-phim-tat-thao-tac.md) |
| [EDITOR_UI.md](./EDITOR_UI.md) | Canvas, drag-drop, panels, selection, toolbar, shortcuts | [02-giao-dien-editor](../../docs/user-guide/02-giao-dien-editor.md), [10](../../docs/user-guide/10-phim-tat-thao-tac.md) |
| [RUNTIME.md](./RUNTIME.md) | Rendering pipeline, interactions binding, assets | [11-runtime-va-tich-hop](../../docs/user-guide/11-runtime-va-tich-hop.md) |
| [AI_ASSISTANT.md](./AI_ASSISTANT.md) | AI pipeline, context, command whitelist, SSE events | [09-ai-assistant](../../docs/user-guide/09-ai-assistant.md) |
| [PRESETS.md](./PRESETS.md) | Preset registry, palette catalog | [04-components-va-preset](../../docs/user-guide/04-components-va-preset.md) |
| [PROPERTY_SYSTEM.md](./PROPERTY_SYSTEM.md) | Property descriptors, panels, effects | [03-property-panel](../../docs/user-guide/03-property-panel.md), [05](../../docs/user-guide/05-styling-va-hieu-ung.md) |
| [PLUGINS.md](./PLUGINS.md) | Plugin system, lifecycle hooks | — |
| [MEDIA_MANAGEMENT.md](./MEDIA_MANAGEMENT.md) | Media manager, uploads | [06-media-tai-nguyen](../../docs/user-guide/06-media-tai-nguyen.md) |
| [IMAGE_FILTERS.md](./IMAGE_FILTERS.md) | Image filters & frames | [05-styling-va-hieu-ung](../../docs/user-guide/05-styling-va-hieu-ung.md) |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | A11y, keyboard navigation, diagnostics | [10-phim-tat-thao-tac](../../docs/user-guide/10-phim-tat-thao-tac.md) |
| [INTEGRATION.md](./INTEGRATION.md) | External services, event catalogue, performance targets | [11-runtime-va-tich-hop](../../docs/user-guide/11-runtime-va-tich-hop.md) |
| [POPUPS.md](./POPUPS.md) | Popup system V6 spec — data model, rules, campaigns, lifecycle, commands | [07-popup-modal](../../docs/user-guide/07-popup-modal.md) |

## Known drift (2026-07-20 audit)

A full code-vs-docs audit was performed on 2026-07-20. Confirmed drift items and their fixes are tracked in
[docs/roadmap/05-docs-standardization/README.md](../../docs/roadmap/05-docs-standardization/README.md).
Until [roadmap 05/02](../../docs/roadmap/05-docs-standardization/02-ai-docs-refresh.md) is completed, be aware:

- **AI_ASSISTANT.md**: the "Provider Adapters" / "Adding a New Provider" sections describe client-side adapters
  that no longer exist (providers live in `apps/api/src/services/llm-client.ts`); the command whitelist listed
  is outdated (see `usePageGenerator.ts`); "AI context includes existing popups" is not yet true in code.
- Legacy planning docs moved to [`docs/roadmap/legacy/`](../../docs/roadmap/legacy/README.md) — their
  "current state" sections describe the superseded v1 pipeline.

When a spec file conflicts with code, **code is the source of truth**; verify against the referenced files
before acting, and update the spec in the same change.
