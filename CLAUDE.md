# Project Instructions for AI Agent

## Documentation

> **VS Code Copilot**: Core context is pre-loaded via `.github/copilot-instructions.md` — no need to read additional files for routine tasks.
> **Claude Code CLI**: Read the following files in order for full project context:

1. **`.claude/ARCHITECTURE.md`** — Project-specific architecture & type contracts (always read first)
2. **`.claude/RULES.md`** — Baseline rules & conventions (shared across all projects)
3. **`README.md`** — Full Technical Specification v2.1 (reference for detailed interface contracts)

> **Override rule**: `ARCHITECTURE.md` may **override or extend** sections from `RULES.md`. When conflicts exist, `ARCHITECTURE.md` takes precedence.

### Documentation layers

| Layer | Location | Audience | Language |
| ----- | -------- | -------- | -------- |
| Technical spec | `.claude/docs/` (index: `.claude/docs/README.md`) | AI agents & maintainers — contracts, conventions, rules | English |
| User guide | `docs/user-guide/` (index: `docs/README.md`) | Users/PMs — features & flows, high-level | Vietnamese |
| Roadmap | `docs/roadmap/` | Planning — one file per improvement item, with status headers | Vietnamese |

- Spec files may link to user-guide pages for overview context; specs describe **current** behavior, roadmap describes **planned** work — never mix the two.
- When code behavior/APIs change, update the matching spec file (and the user-guide page if user-visible) **in the same task**.
- Do not edit `.claude/ARCHITECTURE.md` or `.claude/RULES.md` directly — write proposals to `docs/roadmap/05-docs-standardization/architecture-md-proposals.md` for the maintainer.
- Prefer pointing at code (file path) over copying interfaces/values into docs — the doc shouldn't need an edit every time a field changes.

### What-changed → what-docs matrix

| Code change | Docs to update in the same PR |
| ----------- | ------------------------------ |
| API/route/env in `apps/api` | `.claude/docs/AI_ASSISTANT.md` + the env table in `README.md` |
| New AI command / whitelist change | `apps/api/src/services/command-reference.ts` + `packages/builder-editor/src/ai/allowedCommands.ts` + `.claude/docs/AI_ASSISTANT.md` — three-way sync, enforced by `command-reference.test.ts` / `allowedCommands.test.ts` |
| Document schema change (node/popup/interaction) | `.claude/docs/DATA_MODEL.md` (+ `POPUPS.md` for popup fields) + a schema migration (see [COMMAND_SYSTEM.md](.claude/docs/COMMAND_SYSTEM.md#schema-versioning--migration) for `schemaVersion`, distinct from package version) |
| New component / `propSchema` change | `docs/user-guide/04-components-va-preset.md` + `aiHints` on the component definition |
| Any user-visible feature | the matching `docs/user-guide/*.md` page |
| Completed a `docs/roadmap/*` item | update its `> Trạng thái:` header + note the PR link at the bottom of the file |
| Any change to `packages/*` or `apps/*` worth a changelog entry | run `pnpm changeset` and commit the generated `.changeset/*.md` alongside the code — see [`.claude/docs/VERSIONING.md`](.claude/docs/VERSIONING.md) for bump-level rules |

Run `pnpm docs:check` before committing docs changes — it verifies internal links resolve and every
roadmap item still has a status header (also runs in CI on PRs touching docs; see
`.github/workflows/docs-check.yml`).

## Project Context

This is a **UI Builder Library** — a modular, extensible platform for drag-and-drop web interface building.

### Monorepo Structure

```
packages/builder-core       ← Framework-agnostic engine (NO React/DOM deps)
packages/builder-components ← 17 built-in ComponentDefinitions + extendComponent() (depends on builder-core only)
packages/builder-react      ← React adapter (hooks, context, provider)
packages/builder-editor     ← Visual editor (canvas, panels, drag-drop)
packages/builder-renderer   ← Production runtime renderer (no editor code)
packages/ui                 ← shadcn-based design system for editor UI
packages/shared             ← Shared types, utils, constants
packages/config             ← Shared configs (ESLint, TS, Tailwind)
```

### Key Constraints

- `builder-core` is **framework-agnostic** — never add React, DOM, or browser API dependencies
- All state changes go through the **Command pattern** — no direct state mutation
- Interface contracts in `README.md` are **immutable** unless version-bumped
- Uses **shadcn** (`packages/ui`) as design system — NOT `@sth87/shadcn-design-system`
- After any code change, explicitly review whether project docs and AI-facing docs/instructions also need updates. If behavior, APIs, workflows, constraints, or assumptions changed, update the relevant docs in the same task.
- After any code change worth a changelog entry, run `pnpm changeset` and commit the generated file with the code — see [`.claude/docs/VERSIONING.md`](.claude/docs/VERSIONING.md).

## Skills

<skills>
<skill>
<name>shadcn-design-system</name>
<description>Reference for shadcn component patterns. Use for guidance on component API design, but import from `packages/ui` (not from `@sth87/shadcn-design-system`).</description>
<file>.agents/skills/shadcn-design-system/SKILL.md</file>
</skill>
<skill>
<name>bootstrap-project</name>
<description>Step-by-step instructions for bootstrapping a new Turborepo project with the standard tech stack. Use when setting up workspace tooling (Prettier, ESLint, Husky).</description>
<file>.agents/skills/bootstrap-project/SKILL.md</file>
</skill>
</skills>
