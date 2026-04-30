# Project Instructions for AI Agent

## Documentation

> **VS Code Copilot**: Core context is pre-loaded via `.github/copilot-instructions.md` — no need to read additional files for routine tasks.
> **Claude Code CLI**: Read the following files in order for full project context:

1. **`.claude/ARCHITECTURE.md`** — Project-specific architecture & type contracts (always read first)
2. **`.claude/RULES.md`** — Baseline rules & conventions (shared across all projects)
3. **`README.md`** — Full Technical Specification v2.1 (reference for detailed interface contracts)

> **Override rule**: `ARCHITECTURE.md` may **override or extend** sections from `RULES.md`. When conflicts exist, `ARCHITECTURE.md` takes precedence.

> **Language**: English (`.claude/`). Vietnamese translations available in `.claude.vi/`.

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
