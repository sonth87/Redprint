# Project Architecture

> **This file is project-specific.** It describes the architecture, features, and technical decisions of this project.
> It may **override or extend** sections from `RULES.md` — see the override mechanism in [Rules Reference](#rules-reference).
>
> **Version:** 1.0 | **Last updated:** YYYY-MM | **Updated by:** [Name]
> **Changelog:** [Brief description of last change — e.g. "Added Payment module, updated Auth flow"]

---

<!--

HOW TO USE THIS TEMPLATE

FOR DEVELOPERS (filling in the template):

- Describe the project in natural language → the AI Agent will populate the correct sections
- Or fill in each section manually where marked [TODO]
- Remove sections that don't apply to this project
- Add new sections for anything unique to this project
- Bump "Last updated" and write a short "Changelog" entry every time this file is modified

FOR AI AGENTS (when asked to update this file):

- Only fill in project-specific information — do NOT copy content from RULES.md
- The "Rules Reference" section must only be updated when a real override/extension is requested by the developer
- NEVER modify RULES.md for any reason — all overrides go here
- When adding a new section, place it in a logical position — do not blindly append to the end
- After updating, bump "Last updated" and write a short entry in "Changelog"
-->

---

## Project Overview

**Project Name:** `[TODO: Project name]`
**App Type:** `[TODO: React SPA (Vite) | Next.js | Backend Node.js | Monorepo]`
**Description:** [TODO: Brief description — what the project does, who it serves, what problem it solves]

### Target Users

[TODO: Who are the end users? e.g. internal admin staff, B2C end-users, developers via API]

### Key Features

[TODO: List 3–7 main features. One per line, descriptive enough for the agent to understand scope.]

- **[Feature name]:** [Brief description — what it does, which modules it touches]
- **[Feature name]:** [Brief description]

### Brand Assets

- **Favicon & Logo**: Always use the `favicon` and `logo` files located in the `assets` folder as the official favicon and logo for the project.

| File                      | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `docs/assets/favicon.ico` | Browser tab icon                                |
| `docs/assets/logo.svg`    | Project logo — used in header, login page, etc. |

---

## Rules Reference

<!--
  PURPOSE: Let the agent immediately know where this project deviates from RULES.md baseline.
  - If the project fully complies with RULES.md → leave the table empty or write "No overrides"
  - Only document things that are ACTUALLY different — do not re-explain the original rules
  - Agent MUST NOT add rows here unless the developer explicitly requests an override
-->

**RULES.md version in use:** `2.0`
**Source:** `docs/RULES.md`

### Active Overrides & Extensions

| Section in RULES.md  | Type                | Override / Extension detail             |
| -------------------- | ------------------- | --------------------------------------- |
| [TODO: Section name] | OVERRIDES / EXTENDS | [Short description of what's different] |

> If there are no overrides: remove the table above and write **"This project fully complies with RULES.md v2.0 — no overrides."**

---

## Architecture

### App Type & Pattern

**App type:** [TODO: React SPA / Next.js App Router / Express API / NestJS API / Monorepo]

**Architecture pattern:** [TODO: Component-based / Feature-sliced / Module-based / MVC / etc.]

```
[TODO: Draw a layered architecture diagram — example:]

┌─────────────────────────────────────────┐
│              Pages / Routes             │
├─────────────────────────────────────────┤
│           Features / Modules            │
├─────────────────────────────────────────┤
│      Shared Components / Hooks          │
├─────────────────────────────────────────┤
│          Services / API Layer           │
├─────────────────────────────────────────┤
│           State Management              │
└─────────────────────────────────────────┘
```

### Data Flow

```
[TODO: Describe the main data flow — example:]
User Action → Component → Custom Hook → Service → apiClient → API
                                    ↓
                            TanStack Query Cache → UI Re-render
```

---

## Folder Structure

<!-- OVERRIDES RULES.md — only if the actual structure differs from the RULES.md default -->

<!--
  Only describe the actual structure of this project.
  - If it matches the RULES.md default → delete this section entirely, no need to repeat it
  - If it differs → describe only the differences, not the full structure
  - Show top-level directories only — do not list individual files
-->

```
[TODO: Actual project folder structure]
```

---

## Feature Modules

<!--
  IMPORTANT for Agent: Lists existing features to prevent creating duplicates.
  Each row = one directory under src/features/
  Always check this table BEFORE creating a new feature.
-->

| Feature              | Description                             | Key entities       |
| -------------------- | --------------------------------------- | ------------------ |
| `auth`               | Login, registration, session management | `User`, `Session`  |
| [TODO: feature name] | [Brief description]                     | [Related entities] |

---

## Authentication Flow

<!--
  Auth is the area agents touch most often and get wrong most often without context.
  Fill this in completely so the agent never has to guess.
-->

- **Method:** [TODO: JWT / OAuth2 / Session Cookie / API Key]
- **Token storage:** [TODO: httpOnly cookie / in-memory / etc.]
- **Refresh token:** [TODO: Yes / No — if yes, what is the endpoint]
- **Login endpoint:** `[TODO: POST /api/v1/auth/login]`
- **Route guard:** [TODO: where is it implemented — e.g. `src/features/auth/components/ProtectedRoute.tsx`]
- **Post-login redirect:** [TODO: where does the user land after login]

---

## Key Dependencies

<!-- EXTENDS RULES.md — additional packages beyond the base stack -->

<!--
  Only list packages BEYOND the base stack already defined in RULES.md.
  Do not re-list React, Axios, Zustand, TanStack Query, etc.
-->

| Package              | Version | Purpose                        |
| -------------------- | ------- | ------------------------------ |
| [TODO: package-name] | x.x     | [What it's used for and where] |

---

## State Management

<!--
  List the actual Zustand stores in this project.
  TanStack Query handles server state — no need to list query hooks here.
  Agent: check this table before creating a new store to avoid duplicates.
-->

| Store file     | Purpose             | Key state                 |
| -------------- | ------------------- | ------------------------- |
| `authStore.ts` | Logged-in user info | `user`, `isAuthenticated` |
| [TODO: store]  | [Purpose]           | [Important state keys]    |

---

## API Integration

### Configuration

- **Base URL env var:** `[TODO: VITE_API_BASE_URL / NEXT_PUBLIC_API_URL]`
- **Authentication header:** `[TODO: Bearer token / Cookie / etc.]`
- **Format:** `[TODO: REST / GraphQL]`
- **API versioning:** `[TODO: /api/v1/... / none]`

### Key Endpoints

<!--
  List important or non-standard endpoints only.
  Standard CRUD endpoints don't need to be listed — the agent can infer them from convention.
  Focus on: auth endpoints, endpoints with special behavior, endpoints with complex payloads.
-->

```
[TODO: Example]
POST  /api/v1/auth/login          # Body: { email, password } → { accessToken, user }
POST  /api/v1/auth/refresh        # Cookie: refreshToken → { accessToken }
POST  /api/v1/auth/logout         # Clears session

GET   /api/v1/[resource]          # Supports pagination: ?page=1&limit=20
```

### Known API Constraints

<!--
  IMPORTANT: Real limitations of the current API.
  Agent MUST read this before generating API-related code.
  Without this, the agent generates "correct by the book" code that breaks against the real backend.
-->

[TODO: Examples:]

- [ ] `/users` endpoint does not support pagination — returns the full list
- [ ] No refresh token implemented — when token expires, redirect to login
- [ ] File upload limit is 5MB — backend returns 413 if exceeded

---

## Routing

```typescript
// [TODO: Actual route constants for this project]
const routes = {
  home: "/",
  auth: {
    login: "/login",
    register: "/register",
  },
  dashboard: "/dashboard",
};
```

### Route Access Levels

- **Public** (no auth required): [TODO: e.g. `/`, `/login`, `/register`]
- **Protected** (login required): [TODO: e.g. `/dashboard`, `/settings`]
- **Role-based:** [TODO: e.g. `/admin` — `admin` role only]

---

## Environment Variables

```env
# .env.example — [TODO: list all actual env variables for this project]

# API
VITE_API_BASE_URL=

# App
VITE_APP_NAME=
VITE_APP_VERSION=

# [TODO: add more variables]
```

---

## Testing Strategy

<!-- OVERRIDES RULES.md — only if this project differs from the default -->

<!--
  RULES.md default: unit tests are MANDATORY, using Vitest + React Testing Library.
  Only fill in this section if the project has an EXCEPTION — e.g. no unit tests required, or a different framework.
  If the project follows the default → DELETE this section entirely.
-->

[TODO: Describe the exception if any. Example: "This project does not require unit tests — E2E tests with Playwright only."]

---

## Deployment

| Environment | Branch    | URL    | Notes                |
| ----------- | --------- | ------ | -------------------- |
| Development | `develop` | [TODO] | Auto-deploy on merge |
| Staging     | `staging` | [TODO] | Manual trigger       |
| Production  | `main`    | [TODO] | Requires PR approval |

### Build & Deploy Commands

```bash
# [TODO: Add required commands]
pnpm build          # Production build
pnpm db:migrate     # Run migrations (if applicable)
```

### CI/CD

[TODO: Brief description of the pipeline — e.g. GitHub Actions, runs lint + test + build before merge]

---

## Known Constraints & Tech Debt

<!--
  IMPORTANT for Agent: Things the agent MUST know before writing code.
  Without this section, the agent generates "correct by the book" code that conflicts with reality.
-->

### Current Constraints

[TODO: Examples:]

- Backend does not yet have endpoint X → using mock data at `src/mocks/` for now
- Module Y is using legacy library [name] due to [reason] — migration not yet planned

### Known Tech Debt

[TODO: Examples:]

- `src/features/legacy-module/` — old code, not yet refactored — do not touch unless necessary
- `/orders` API response does not follow the standard `ApiResponse<T>` shape — has a custom wrapper in `services/orderService.ts`

---

## Agent Quick Reference

<!--
  Project-specific file lookup table.
  Overrides the default File Lookup Cheatsheet in RULES.md if folder structure differs.
  Agent: read this table BEFORE searching for files — saves unnecessary lookup loops.
-->

| Looking for                        | Go to                               |
| ---------------------------------- | ----------------------------------- |
| Auth logic                         | `src/features/auth/`                |
| Route constants                    | `src/constants/routes.constants.ts` |
| API client config                  | `src/lib/axios.ts`                  |
| Global stores                      | `src/stores/`                       |
| i18n keys                          | `src/locales/{lang}/`               |
| Validation schemas                 | `src/schemas/`                      |
| Env config                         | `.env.example` + `src/lib/env.ts`   |
| [TODO: add project-specific paths] | [TODO]                              |

---

## Additional Notes

<!--
  Supplementary information that doesn't belong in any section above.
  Examples: rationale behind a library choice, third-party integrations, important architectural decisions.

  Agent: if you receive information from the developer that doesn't clearly belong to any section,
  place it here temporarily and flag it so the developer can decide the appropriate section.
-->

[TODO: Add if needed]
