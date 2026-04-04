# Rules & Conventions

> Shared across all projects. Do NOT add project-specific information — use `ARCHITECTURE.md`.
> **Version:** 2.0 | **Last updated:** 2025-07 | **Maintained by:** Tech Lead

---

## Override Policy

`RULES.md` = baseline defaults. `ARCHITECTURE.md` = project-specific overrides (takes precedence).

- `ARCHITECTURE.md` redefines a section → **replaces** it
- `ARCHITECTURE.md` doesn't mention a topic → `RULES.md` defaults apply
- Use `<!-- EXTENDS RULES.md -->` to add to a section
- Use `<!-- OVERRIDES RULES.md -->` to replace entirely

> **Who may modify ARCHITECTURE.md:** Only human developers (Tech Lead or above). AI agents must **never** modify `ARCHITECTURE.md` or `RULES.md` directly — propose changes via a dedicated PR with rationale documented in the PR description.

---

## Tech Stack

| Category            | Technology                    | Minimum Version         |
| ------------------- | ----------------------------- | ----------------------- |
| **Language**        | TypeScript (strict mode)      | 5.x                     |
| **Framework**       | React / Next.js               | React 19+ / Next.js 16+ |
| **Runtime**         | Node.js                       | 20 LTS+                 |
| **Styling**         | TailwindCSS (utility-first)   | 3.x                     |
| **Design System**   | shadcn (`packages/ui`)        | latest                  |
| **HTTP Client**     | Axios (with interceptors)     | 1.x                     |
| **Server State**    | TanStack Query (React Query)  | 5.x                     |
| **Client State**    | Zustand                       | 4.x                     |
| **i18n**            | `react-i18next`               | 14.x                    |
| **Package Manager** | pnpm (preferred)              | 9.x                     |

> **Version upgrade rule:** Before bumping any package version, check for breaking changes and flag to the Tech Lead. AI agents must never auto-upgrade dependencies — always annotate with `// UPGRADE: <reason>` and leave the final decision to the human reviewer.

---

## Project Structure

> Default: **Turborepo** + **pnpm workspaces**. `ARCHITECTURE.md` may override.

```
/
├── apps/                # All applications
│   ├── web/             # Frontend (React/Next.js)
│   ├── api/             # Backend (if applicable)
│   └── [new-app]/       # New apps go here
├── packages/            # Shared packages
│   ├── shared/          # Shared types, utils, constants
│   ├── ui/              # Shared UI components (if needed)
│   └── config/          # Shared configs (ESLint, TS, Tailwind)
├── docs/                # AI Agent context files
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**Rules:**

- New apps go in `apps/` — never standalone outside this directory
- Shared code goes in `packages/`
- Each app has its own `package.json`, `.env`, and build config
- Modifying files in `packages/` requires noting downstream impact on **all consuming apps**

### App Types

**React SPA (Vite):** Vite + `react-router-dom`, output `dist/`

**Next.js:** App Router (`app/` directory), Server Components by default, `"use client"` only when needed. API routes in `app/api/`. Components in `components/` (NOT inside `app/`).

**Backend (Node.js):** Express or NestJS, `controller → service → repository` pattern, API versioning `/api/v1/...`

> **Bootstrapping a new project?** Refer to the **bootstrap-project skill** for step-by-step setup instructions.

---

## Code Organization

### File Naming Conventions

| Type                 | Convention                           | Example                  |
| -------------------- | ------------------------------------ | ------------------------ |
| React Components     | `PascalCase.tsx`                     | `UserProfile.tsx`        |
| Pages (React SPA)    | `PascalCase.tsx` + `Page` suffix     | `DashboardPage.tsx`      |
| Pages (Next.js)      | `page.tsx` in route folder           | `app/dashboard/page.tsx` |
| Hooks                | `camelCase.ts` + `use` prefix        | `useAuth.ts`             |
| Context Providers    | `PascalCase.tsx` + `Provider` suffix | `AuthProvider.tsx`       |
| Utilities / Services | `camelCase.ts`                       | `apiClient.ts`           |
| Types                | `*.type.ts` or `*.types.ts`          | `user.type.ts`           |
| Constants            | `*.constants.ts`                     | `routes.constants.ts`    |
| Stores               | `camelCase.ts` + `Store` suffix      | `authStore.ts`           |
| Tests                | `*.test.ts` or `*.spec.ts`           | `UserProfile.test.tsx`   |
| Schemas              | `*.schema.ts`                        | `loginForm.schema.ts`    |

### Folder Structure (React SPA)

```
src/
├── assets/          # Static assets
├── components/      # Shared/reusable components
│   ├── ui/          # Custom UI (beyond design system)
│   └── common/      # Layout components (Header, Footer)
├── features/        # Feature-based modules (own components, hooks, types)
├── hooks/           # Global custom hooks
├── lib/             # Library configs (axios, query client)
├── pages/           # Page/route components
├── services/        # API services
├── stores/          # Global state (Zustand)
├── types/           # Shared TypeScript types
├── utils/           # Utility functions
├── constants/       # Global constants and enums
├── locales/         # i18n translation files
└── schemas/         # Validation schemas (zod)
```

### Import Order

Organize imports in this order, separated by blank lines:

1. React / Framework imports
2. External libraries
3. Design system (`@ui/*` — from `packages/ui`)
4. Internal modules (absolute paths / aliases `@/`)
5. Relative imports (same feature/module)
6. Types (`import type`)
7. Styles / Assets

### Barrel Exports

- Use `index.ts` for **feature modules** and **component groups** only
- Keep barrel files thin — only re-exports, no logic
- **Never** `export * from` in deeply nested modules — hurts tree-shaking

```typescript
// ❌ Causes circular deps + kills tree-shaking
export * from "./components";
export * from "./hooks";
```

---

## TypeScript Rules

- **Strict mode** always (`"strict": true`)
- **No `any`** — use `unknown` + type guards when type is truly unknown
- **`interface`** for object shapes and props; **`type`** for unions/intersections/utilities
- **`import type`** for type-only imports
- **`as const`** for literal types and readonly objects
- Export shared types from `*.type.ts` files

---

## Component Rules

### Design System First

Always use the shadcn-based design system from `packages/ui` instead of building UI primitives. Components are added and managed via the `shadcn` CLI and customized within the monorepo.

```typescript
// Import from the internal UI package
import { Button } from "@ui/components/button";
import { Dialog } from "@ui/components/dialog";
```

Required CSS imports in app entry point (`main.tsx` or `app/layout.tsx`):

```typescript
import "@ui/styles/globals.css"; // design tokens + component styles
```

### Naming Conventions

| Pattern   | Suffix / Prefix   | Example         |
| --------- | ----------------- | --------------- |
| Pages     | `Page` suffix     | `DashboardPage` |
| Layouts   | `Layout` suffix   | `MainLayout`    |
| Providers | `Provider` suffix | `AuthProvider`  |
| Hooks     | `use` prefix      | `useAuth`       |
| HOCs      | `with` prefix     | `withAuth`      |

### Guidelines

- Extract complex logic into custom hooks — keep components focused on UI
- Props via `interface` in same file or co-located `.type.ts`
- Prefer **composition** (`children`, render props) over excessive prop-drilling
- Always accept `className` prop for styling flexibility, merge with `cn()`
- Separate UI components from business logic (container/presenter pattern)

---

## Error Handling

- Use **`react-error-boundary`** to wrap major app sections — provide user-friendly fallback UI
- Use **`toast.error()`** (from design system) for user-facing errors
- Handle **loading**, **error**, and **empty states** for every async operation
- Never silently swallow errors — always log or display feedback
- Use typed `catch` blocks: check `error instanceof AxiosError` before accessing response data

### Retry Strategy (TanStack Query)

```typescript
useQuery({
  retry: (failureCount, error) => {
    // Do not retry on 404 — resource doesn't exist
    if (error instanceof AxiosError && error.response?.status === 404)
      return false;
    return failureCount < 2; // max 2 retries for network/server errors
  },
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // exponential backoff
});
```

### Error Code Convention

Define in `types/errors.types.ts` and use across services:

```typescript
export const ErrorCode = {
  UNAUTHORIZED: "AUTH_001",
  FORBIDDEN: "AUTH_002",
  NOT_FOUND: "RESOURCE_001",
  VALIDATION: "VALIDATION_001",
  INTERNAL: "SERVER_001",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
```

> **Agent rule:** when catching errors, always log `error.code` or `error.response?.data?.code` — never rely solely on `error.message`, which is not standardized across APIs.

---

## Styling Rules

- **Utility-first** — TailwindCSS classes directly on elements, avoid inline styles
- **`cn()`** utility (from `packages/ui`) for conditional/merged classes
- **Mobile-first** responsive design — base styles for mobile, `md:` / `lg:` for larger screens
- **Dark mode** via `dark` class on root element
- **CSS variables** for theming (defined in `packages/ui/styles/globals.css`)
- Avoid `@apply` except in rare cases — prefer utility classes

---

## State Management

| State Type   | Solution                        | Example                          |
| ------------ | ------------------------------- | -------------------------------- |
| UI State     | `useState` / Zustand            | Modal open/close, sidebar toggle |
| Form State   | `useState` / React Hook Form    | Form inputs, validation          |
| Server State | TanStack Query                  | API data, cache, pagination      |
| URL State    | Router (React Router / Next.js) | Current page, query params       |
| Global State | Zustand                         | Auth user, language, theme       |

**Rules:**

- Keep state **as local as possible** — start with `useState`
- **Never duplicate server state** in client state — let TanStack Query manage caching
- Zustand only for truly global state shared across unrelated components
- Derive computed values instead of storing them

---

## Form & Validation Rules

- Use **React Hook Form** by default for form state management; heavily avoid using `useState` for multi-field forms.
- **MANDATORY**: Use schema validation with **Zod** to validate form data (paired with `@hookform/resolvers/zod`).
- Extract schemas into separate files within the `schemas/` directory (e.g., `loginForm.schema.ts`) or co-locate them for smaller forms. Always export the inferred type (`type LoginFormValues = z.infer<typeof loginSchema>`).
- Leverage form error display components provided by the Design System to maintain consistent UX.

---

## Library Usage Patterns

### Axios

- Configure a shared `apiClient` in `lib/axios.ts` with interceptors (auth token, error handling, token refresh)
- **Always use `apiClient`** — never raw `axios` directly
- Handle 401 (token refresh), 403 (access denied), 500 (generic error toast) in response interceptor
- Default timeout: 30s. Use `AbortController` for cancellable requests

```typescript
// lib/axios.ts — skeleton
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});
apiClient.interceptors.request.use(/* attach auth token */);
apiClient.interceptors.response.use(/* handle 401/403/500 */);
export default apiClient;
```

### TanStack Query

- **Query keys as arrays**: `['users']`, `['users', userId]`, `['users', { page, limit }]`
- **Custom hooks** for each query — don't use `useQuery` directly in components
- **`useMutation`** for all writes (POST, PUT, DELETE)
- **Invalidate related queries** after mutations
- Configure `staleTime` per query based on data volatility

```typescript
// Pattern: service → hook → component
// services/userService.ts
export const userService = {
  getAll: (params?) =>
    apiClient
      .get<ApiResponse<User[]>>("/users", { params })
      .then((r) => r.data),
};

// hooks/useUsers.ts
export function useUsers(params?) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => userService.getAll(params),
  });
}
```

---

## API Data Handling

### Standard Response Type

Define in `types/api.types.ts` (or `packages/shared` for monorepo):

```typescript
interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Defensive Access Rules

- **Optional chaining (`?.`)** on all API response data
- **Nullish coalescing (`??`)** for fallback display values
- **Default to `[]`** before `.map()`, `.filter()`, `.find()`
- Handle **loading → error → empty → data** states in every component consuming API data

---

## Internationalization (i18n)

- Use **`react-i18next`** for all i18n needs
- **Path-based** URL strategy: `/vi/about`, `/en/about` — default locale has no prefix
- Translation files in `locales/{lang}/{namespace}.json` (e.g., `locales/en/auth.json`)
- **Dot notation** for keys: `auth.login.submitButton`
- **Never hardcode user-facing strings** — always use `t('key')`
- When adding or modifying UI strings, update **all locale files simultaneously** — never leave a locale incomplete

---

## Security Rules

- **Never `dangerouslySetInnerHTML`** without `DOMPurify.sanitize()`
- **Never store tokens** in `localStorage`/`sessionStorage` — prefer `httpOnly` cookies
- **Never expose API keys** in client code — use env vars or server proxy
- **Validate all external data** (URL params, query strings, form inputs) with `zod`
- HTTPS for all API calls; CSRF protection for state-changing operations

### Backend Security (Node.js)

- Set security headers via **`helmet`** on all Express/NestJS apps
- Configure **CORS** explicitly — never use `origin: '*'` in production
- Apply **rate limiting** (`express-rate-limit` or equivalent) on all public endpoints, especially auth routes
- Sanitize and validate all request bodies at the controller level before passing to service layer
- Log security-relevant events (failed auth, forbidden access) with structured logging — never log sensitive fields (passwords, tokens, PII)

---

## Environment Variables

| Framework   | Client-side Prefix | Example               |
| ----------- | ------------------ | --------------------- |
| Vite        | `VITE_`            | `VITE_API_BASE_URL`   |
| Next.js     | `NEXT_PUBLIC_`     | `NEXT_PUBLIC_API_URL` |
| Server-only | (no prefix)        | `DATABASE_URL`        |

- Always provide **`.env.example`** with all variable names (no real values)
- Never commit `.env` files — add to `.gitignore`
- Validate env vars at startup with `zod`
- Separate files per environment: `.env.development`, `.env.production`

---

## Code Size & Complexity

> Soft guidelines — use judgment for complex business logic.

| Metric                | Recommended | Review Threshold         |
| --------------------- | ----------- | ------------------------ |
| File length           | < 300 lines | > 500 lines              |
| Function length       | < 30 lines  | > 50 lines               |
| Component size        | < 200 lines | > 300 lines              |
| Nesting depth         | ≤ 3 levels  | > 4 levels               |
| Function params       | ≤ 4         | > 4 → use options object |
| Cyclomatic complexity | < 10        | > 10                     |

**When files/functions grow too large:** extract sub-components, custom hooks, utility functions, or `.type.ts` files. Prefer lookup tables over long if-else/switch chains. Use early returns to flatten nesting.

---

## Git Conventions

- **Conventional commits**:
  ```
  feat: add user profile page
  fix: resolve dialog close animation
  refactor: extract auth logic into custom hook
  docs: update API integration guide
  chore: upgrade dependencies
  ```
- Keep commits focused on actual code changes
- **Never** commit sensitive information (API keys, credentials, tokens)
- **Never** auto-add AI attribution signatures to commits

---

## Linting, Formatting & Git Hooks

- Use **ESLint** and **Prettier** by default to maintain code quality and consistent formatting.
- Mandatory installation and configuration of **Husky** and **lint-staged** to automatically run linters and format code before each commit (`pre-commit` hook).
- Configure the `commit-msg` hook (e.g., using `commitlint`) to enforce Conventional Commits messaging format.
- Require `lint` and `format` scripts configured in `package.json` to ensure consistency across environments.
- **Never** bypass git hooks using `--no-verify` when committing, unless in an absolute emergency.

---

## Testing Rules

> Can be overridden by `ARCHITECTURE.md`. If `ARCHITECTURE.md` explicitly states no unit tests are required, it may be bypassed. If no declaration exists, **unit tests are MANDATORY by default.**

- **Testing Convention**: Prefer Vitest/Jest combined with React Testing Library. Write tests for `utils`, `hooks`, `services`, and any shared/complex UI components.
- **Updating Tests**: Whenever code (logic or UI) is modified, developers/AI Agents MUST examine and update corresponding unit tests to ensure the entire test suite still passes.
- **Running Tests**: A local script (e.g., `pnpm test`) MUST be available to execute the test suite. All tests must pass fully before code can be committed, pushed, or a Pull Request created.

### Test Naming Convention

Use the `describe / it` pattern consistently. Test names must read as full English sentences expressing **intent**, not implementation.

```typescript
// ❌ Bad — vague, describes implementation not behavior
describe("formatDate", () => {
  it("works correctly", () => { ... });
  it("handles edge case", () => { ... });
});

// ✅ Good — reads as a sentence, describes expected behavior
describe("formatDate", () => {
  it("returns DD/MM/YYYY format for a valid date string", () => { ... });
  it("returns an empty string when given an invalid date", () => { ... });
  it("handles timezone offset without shifting the displayed date", () => { ... });
});
```

> **Agent rule:** Every `it()` block must have a name that completes the sentence: _"it [name]"_. Never use `it('works')`, `it('handles it')`, or `it('test 1')`.

### Mock Strategy

- **API calls** → mock at `apiClient` level using `vi.mock('@/lib/axios')`
- **External libraries** → mock at module level (in `vi.mock()`), not per-test
- **Browser APIs** → `vi.stubGlobal()` in `beforeEach`, restore in `afterEach`
- **Date/time** → use `vi.useFakeTimers()` — never mock `Date` directly

### Coverage Thresholds (minimum)

```typescript
// vitest.config.ts
coverage: {
  thresholds: { lines: 70, functions: 70, branches: 60 }
}
```

### Test File Co-location Rule

- Tests live **next to the file they test** for feature-specific code
- Shared utility tests go in `src/__tests__/`
- Each test file covers: happy path + at least one error/edge case per exported function

### Agent-verifiable vs Human-verifiable

When completing a task, clearly distinguish:

| Check                     | Who verifies                 |
| ------------------------- | ---------------------------- |
| `pnpm typecheck` passes   | Agent (must run and confirm) |
| `pnpm lint` passes        | Agent (must run and confirm) |
| `pnpm test` passes        | Agent (must run and confirm) |
| UI visually correct       | Human reviewer               |
| UX flow makes sense       | Human reviewer               |
| Business logic is correct | Human reviewer               |

> AI agents must **not** declare a task "done" based on code review alone. The three agent-verifiable checks must actually be executed and pass.

---

## Code Commenting Rules

- **Self-Explanatory Code**: Use explicit and descriptive variable and function names to minimize the need for comments explaining "What" the code does.
- **Inline Comments (`// ...`)**: Use strictly to explain **WHY** a specific approach was taken (Why), complex business logic, or necessary workarounds (Hacks/Tricks). NEVER use them to simply translate code into English.
- **Mandatory JSDoc (`/** ... \*/`)**: Required for all shared functions, hooks, and custom utilities (especially in `utils/`, `hooks/`, and `services/`).
- **JSDoc Format**: Briefly describe the function's purpose, use `@param` tags to explain the meaning of parameters (types are handled by TypeScript), and `@returns` for non-obvious return values. Proper JSDoc empowers AI agents and IDE IntelliSense to understand the code's intent accurately.

### JSDoc Example (AI-readable format)

The `@example` tag is the most important field for AI agents — it communicates intent without requiring the agent to read the full implementation.

```typescript
/**
 * Fetches a paginated user list with optional server-side filters.
 * Used by the admin dashboard and the user picker component.
 *
 * @param filters - Optional filters applied before pagination (e.g. role, status)
 * @param page - 1-indexed page number
 * @returns Paginated response containing users and total count
 *
 * @example
 * const { data } = useUsers({ role: 'admin' }, 1);
 * // data.data → User[]
 * // data.pagination.total → number
 */
export function useUsers(filters?: UserFilters, page = 1) { ... }
```

---

## Performance Rules

> Prevent common AI-generated performance regressions that only appear at scale.

- **Memoization** — use `useMemo` and `useCallback` only when there is a measurable re-render cost; do not over-memoize trivial values
- **Lazy loading** — all page-level components must use `React.lazy()` + `Suspense`; never import pages eagerly in the router
- **Image optimization** — always specify `width` and `height` on `<img>` tags or use Next.js `<Image>` to prevent CLS (Cumulative Layout Shift)
- **List rendering** — always provide stable, unique `key` props; never use array index as key for lists that can reorder or filter
- **Bundle size** — prefer named imports from large libraries (e.g. `import { debounce } from 'lodash-es'`) over default imports; never import an entire library for one utility
- **Avoid unnecessary re-renders** — do not create new object/array literals or inline functions inside JSX props unless wrapped in `useMemo`/`useCallback`

---

## Accessibility Rules (a11y)

> Minimum viable accessibility — enforceable by agent.

- All interactive elements (`button`, `a`, custom controls) must have a visible label or `aria-label`
- Images must have descriptive `alt` text; decorative images use `alt=""`
- Use semantic HTML elements (`nav`, `main`, `section`, `header`, `footer`) — never use `div` for interactive roles without `role` + `aria-*` attributes
- Keyboard navigation must work for all interactive flows — verify `Tab`, `Enter`, `Escape` behave correctly
- Color contrast must meet WCAG AA minimum (4.5:1 for normal text, 3:1 for large text)
- Never rely on color alone to convey state (error, success, warning) — always pair with icon or text label

---

## Documentation Rules

```
/
├── docs/              # AI Agent context files (English)
│   ├── RULES.md       # Shared rules (this file)
│   └── ARCHITECTURE.md
├── docs.vi/           # Vietnamese translations
├── readme/            # Feature docs & technical guides
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── FEATURES.md
│   └── CHANGELOG.md
└── README.md          # Project overview (concise, links to readme/)
```

- `docs/` is reserved for **AI Agent context** only
- Feature docs and generated documentation go in `readme/`
- Update docs **before** refactoring; add docs **after** new features
- Use JSDoc for exported functions, hooks, and complex logic
- `ARCHITECTURE.md` and `RULES.md` may only be modified by human developers — **never by AI agents**

---

## AI Agent Behavior

> This section governs how AI agents (Claude, Copilot, Cursor, etc.) should behave when working on this codebase. Human developers should also follow these protocols when acting as reviewers.

### Codebase Navigation — Onboarding Order

When starting any task, read files in this order before writing any code:

1. `docs/ARCHITECTURE.md` — project-specific overrides (always read first)
2. `docs/RULES.md` — this file (baseline conventions)
3. Feature folder's `index.ts` — understand the public API of the feature
4. Relevant `*.type.ts` files — understand data shapes before touching logic
5. Sibling `*.test.ts` file — understand expected behavior before changing implementation

### File Lookup Cheatsheet

| Looking for        | Go to                                             |
| ------------------ | ------------------------------------------------- |
| Global types       | `packages/shared/src/types/` or `src/types/`      |
| API endpoints      | `src/services/` + `src/lib/axios.ts`              |
| Route definitions  | `src/constants/routes.constants.ts`               |
| Auth logic         | `src/features/auth/` or `src/stores/authStore.ts` |
| i18n keys          | `src/locales/{lang}/{namespace}.json`             |
| Validation schemas | `src/schemas/` or co-located `*.schema.ts`        |
| Environment config | `.env.example` + `src/lib/env.ts`                 |

### Context Loading Priority

When context window is limited, load files in this priority order:

1. `ARCHITECTURE.md` (always — contains project-specific overrides)
2. `*.type.ts` / `api.types.ts` — understand data contracts first
3. The file being modified + its direct imports
4. Sibling test file (`*.test.ts`) — understand intent
5. Related service or hook — understand data flow

> Never load `node_modules`, lock files (`pnpm-lock.yaml`), or auto-generated files into context. Prefer reading `index.ts` barrel exports over traversing every file in a folder.

### Task Intake Protocol

1. **Read before write** — Always read `ARCHITECTURE.md` and relevant feature files before making any changes
2. **Scope check** — If a task touches more than 3 files, list all affected files before proceeding
3. **One task, one concern** — Never bundle unrelated changes in a single task or PR
4. **Verify file existence** — Never assume a file or export exists without confirming it in the provided context

### Decision Rules

| Situation                                               | Agent behavior                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `RULES.md` conflicts with `ARCHITECTURE.md`             | `ARCHITECTURE.md` wins — log the conflict in a comment                            |
| Missing design spec for UI                              | Default to design system components — never invent new UI patterns                |
| No coverage target specified                            | Write tests for happy path + one error/edge case per exported function            |
| Ambiguous requirement                                   | State the ambiguity, propose the safer/smaller interpretation, ask ONE question   |
| Instruction to refactor with no criteria given          | Apply only naming and structure rules from this file — no logic changes           |
| Task requires modifying `RULES.md` or `ARCHITECTURE.md` | Propose the change in a comment or PR description — do NOT edit the file directly |
| Stack version appears outdated vs codebase              | Flag the discrepancy in a comment — do NOT auto-upgrade                           |

### Handling Ambiguity

When a task description is unclear, the agent must:

1. **Name the ambiguity explicitly** — "This could mean X or Y"
2. **Propose the safer interpretation** — default to the less destructive path
3. **Ask ONE clarifying question** — never send a list of multiple questions at once
4. **Never guess silently** — making wrong assumptions on ambiguous tasks causes more damage than pausing

### Task Completion Contract

A task is considered **done** only when all of the following are true:

**Agent must execute and confirm:**

- [ ] `pnpm typecheck` — zero TypeScript errors
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm lint` — zero linting errors

**Human reviewer must confirm:**

- [ ] Code changes follow all conventions in this file
- [ ] If UI strings changed → translation keys added to **all** locale files
- [ ] `readme/CHANGELOG.md` updated for any user-facing changes
- [ ] UI visually correct and UX flow makes sense
- [ ] Business logic matches the original requirement

### Output Format for Code Changes

When proposing or explaining changes, always structure the response as:

1. **Why** — reason for the change (1–2 sentences)
2. **What** — list of files changed and what changed in each
3. **Risk** — potential side effects or breaking changes (or "none")

---

## Documentation Standards

### Organization

**Principle:** Centralized core docs with per-package details.

All documentation follows a **hybrid approach**:

```
.claude/docs/               ← Core documentation (centralized)
├── SPECIFICATION.md       ← Project overview, architecture, design principles
├── DATA_MODEL.md          ← BuilderDocument, types, component protocol
├── COMMAND_SYSTEM.md      ← Commands, state, history, versioning
├── EDITOR_UI.md           ← Canvas, panels, selection, snap, shortcuts
├── RUNTIME.md             ← Rendering, dynamic loading, assets
├── PLUGINS.md             ← Plugin system, PluginAPI, lifecycle
├── ACCESSIBILITY.md       ← A11y, error handling, diagnostics
└── INTEGRATION.md         ← Integration points, events, API catalogue

packages/*/docs/          ← Per-package implementation details (optional)
├── API.md                ← Deep-dive API reference
├── INTERNALS.md          ← Internal architecture, state machines
└── ...
```

**AI Agents MUST follow this structure** when adding or modifying documentation.

### Where to Document

When adding a new feature, determine the right `.claude/docs/*.md` file:

| Feature Type | Location | Reference |
| ------------ | -------- | --------- |
| New command type | `COMMAND_SYSTEM.md` | Built-in Commands table |
| New component capability | `DATA_MODEL.md` | ComponentCapabilities interface |
| New UI panel or toolbar button | `EDITOR_UI.md` | Relevant panel section |
| New rendering behavior | `RUNTIME.md` | Rendering pipeline section |
| New plugin hook or API method | `PLUGINS.md` | PluginAPI interface |
| New keyboard shortcut | `EDITOR_UI.md` | Keyboard Shortcut section |
| New event emission | `INTEGRATION.md` | Event Catalogue table |
| New error boundary scenario | `ACCESSIBILITY.md` | Error Boundary Contracts section |
| Integration with external service | `INTEGRATION.md` | Integration Points table |
| AI provider or model change | `AI_ASSISTANT.md` | Provider Adapters section |
| New preset or preset category | `PRESETS.md` | Preset Palette UI section |
| New shared property descriptor | `PROPERTY_SYSTEM.md` | Pre-built Descriptors section |

### Feature Implementation Checklist

Every time a new feature is added to the UI Builder, the implementer must complete **all** of
the following steps before the task is considered done. This checklist applies to both human
developers and AI agents.

#### 1. New UI Component or Panel

- [ ] Component is exported from the package `index.ts`
- [ ] All user-facing strings use `t('key')` — no hardcoded strings
- [ ] Translation keys added to **both** `en.json` and `vi.json` simultaneously
- [ ] Component renders correctly with no selected node (empty/placeholder state handled)
- [ ] Keyboard navigation works (Tab order, Escape closes overlays)

#### 2. New Builder Component Type

- [ ] `ComponentDefinition` JSON created with complete `propSchema`, `defaultProps`,
  `defaultStyle`, `capabilities`, `editorRenderer`, and `runtimeRenderer`
- [ ] Component registered in the component registry
- [ ] Props documented in `propSchema.label` fields
- [ ] At least one preset created for the component (optional but recommended)
- [ ] `DATA_MODEL.md` updated if the component introduces new `ComponentCapabilities` flags

#### 3. New Command

- [ ] Command type added to the `CommandType` union in `builder-core`
- [ ] Forward handler implemented in `handlers.ts`
- [ ] Inverse (undo) handler implemented in `handlers.ts`
- [ ] Handler registered in `registerAllHandlers()`
- [ ] `COMMAND_SYSTEM.md` — Built-in Commands table updated
- [ ] Unit test added to `commands.integration.test.ts`

#### 4. New Spec Feature (AI, Auth, Rendering change, etc.)

- [ ] Spec document in `.claude/docs/` created or updated
- [ ] `README.md` documentation table updated to include new doc
- [ ] `ARCHITECTURE.md` updated if the feature introduces a new package or cross-cutting contract
- [ ] All events emitted by the feature added to `INTEGRATION.md` Event Catalogue

#### 5. i18n Additions

- [ ] Keys added to `en.json` first
- [ ] Same keys added to `vi.json` with correct Vietnamese translations
- [ ] No key in `en.json` is missing from `vi.json` (keep both files in sync)
- [ ] Dot-notation key follows convention: `{namespace}.{feature}.{label}` (e.g.
  `ai.providers.openai`, `events.click`)

#### 6. Verification (Mandatory Before Marking Done)

- [ ] `pnpm typecheck` — zero TypeScript errors across all packages
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm lint` — zero linting errors

All `.claude/docs/*.md` files follow this format:

```markdown
# Section Title

One-liner description of scope.

---

## Subsection

### Code Examples

TypeScript/JSX examples with clear context.

### Lists & Tables

Use tables for specifications, lists for concepts.

---

_For related info, see `OTHER_FILE.md` (section name)._
```

**Rules:**

- Every interface/type must have JSDoc comment above definition
- Every table must have column headers ('Name', 'Description', 'Required', etc.)
- Code blocks must specify language: ` ```ts ` or ` ```tsx `
- Cross-references use markdown links: `[PLUGINS.md](./PLUGINS.md)`
- No duplicate information across files — reference instead of repeat
- Line length max 100 characters for readability

### Maintenance

- Update docs when:
  - Adding new command types
  - Changing component/state contracts
  - Adding/removing plugin API methods
  - Adding keyboard shortcuts
  - Emitting new events
  - Changing integration requirements

- **Update README.md ONLY FOR:**
  - Quick start samples
  - High-level architecture diagrams
  - Design system overview
  - Link updates to `.claude/docs/` files

- **Never put detailed specs in README.md** — keep it <100 lines, gateway only

---

## Anti-patterns

> A consolidated list of patterns the AI agent (and all developers) must never produce. These complement the per-section rules above.

### Code Anti-patterns

| Anti-pattern                                      | Correct alternative                            |
| ------------------------------------------------- | ---------------------------------------------- |
| `any` type                                        | `unknown` + type guard                         |
| `useEffect` for data fetching                     | TanStack Query (`useQuery`)                    |
| Inline API calls inside components                | Service layer (`src/services/`)                |
| `localStorage` / `sessionStorage` for auth tokens | `httpOnly` cookies                             |
| `console.log` in production code                  | Structured logger or remove before committing  |
| Hardcoded user-facing strings in JSX              | `t('key')` via `react-i18next`                 |
| `dangerouslySetInnerHTML` without sanitization    | `DOMPurify.sanitize()` first                   |
| Raw `axios` calls                                 | Always use the shared `apiClient`              |
| `export * from` in deeply nested modules          | Explicit named exports only                    |
| Array index as `key` prop in dynamic lists        | Stable unique ID from data                     |
| Eager import of all page components in router     | `React.lazy()` + `Suspense`                    |
| `it('works correctly')` or `it('test 1')`         | Descriptive sentence: `it('returns X when Y')` |
| `CORS origin: '*'` in production backend          | Explicit allowlist of trusted origins          |

### Architecture Anti-patterns

- ❌ Business logic inside UI components → extract to custom hooks or service layer
- ❌ Direct state mutation outside Zustand store actions
- ❌ Circular imports between feature modules
- ❌ Importing from `apps/` inside `packages/` — dependency must flow one way only
- ❌ Duplicating server state in Zustand — TanStack Query is the source of truth for remote data
- ❌ Storing derived/computed values in state — derive them at render time instead
- ❌ Missing `loading`, `error`, and `empty` states in components that consume async data

### AI-specific Anti-patterns

- ❌ **Generating placeholder data shaped like real data** (e.g. fake UUIDs, mock email addresses in production code)
- ❌ **Assuming a file or export exists** without verifying it in the provided codebase context
- ❌ **Copying patterns from older code** without checking whether they conform to the current `RULES.md`
- ❌ **Generating `// TODO` comments** without a linked issue reference or named owner
- ❌ **Auto-fixing linting errors that change behavior** — only formatting changes are safe to auto-apply
- ❌ **Deleting or renaming files** without an explicit instruction to do so
- ❌ **Changing package versions** without flagging potential breaking changes to the developer
- ❌ **Modifying files in `packages/`** without noting downstream impact on all consuming apps
- ❌ **Bundling unrelated changes** in a single task or PR
- ❌ **Declaring a task done** without actually running `typecheck`, `test`, and `lint`
- ❌ **Modifying `RULES.md` or `ARCHITECTURE.md`** directly — propose via PR description only
- ❌ **Writing vague test names** — every `it()` must express clear, observable behavior
- ❌ **Generating backend routes without rate limiting or input validation** on public endpoints
