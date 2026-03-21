# Bootstrap Project Skill

Step-by-step instructions for creating a new project using the standard tech stack defined in `RULES.md`.

---

## Step 1 — Workspace Bootstrap (one-time per project)

Set up the Turborepo monorepo root:

```bash
mkdir my-project && cd my-project
pnpm init
pnpm add -D turbo
mkdir -p apps packages/shared packages/config
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {},
    "test": {}
  }
}
```

Add scripts to root `package.json`:

```json
{
  "name": "my-project",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,json,md,css}\""
  }
}
```

---

## Step 2 — Scaffold App in `apps/`

**React SPA (Vite):**

```bash
cd apps
pnpm create vite my-app --template react-ts
cd my-app && pnpm install
```

**Next.js:**

```bash
cd apps
pnpm dlx create-next-app@latest my-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-app
```

---

## Step 3 — Install Required Packages

Run inside the app directory (`apps/my-app`):

```bash
# Design system (required)
pnpm add @sth87/shadcn-design-system

# Core dependencies
pnpm add axios @tanstack/react-query zustand react-router-dom react-i18next i18next

# Dev dependencies
pnpm add -D typescript @types/react @types/react-dom
pnpm add -D tailwindcss prettier prettier-plugin-tailwindcss
pnpm add -D eslint typescript-eslint @eslint/js eslint-plugin-react eslint-plugin-react-hooks
```

---

## Step 4 — Import Design System CSS

Add to entry point (`main.tsx` or `app/layout.tsx`):

```tsx
import "@sth87/shadcn-design-system/theme.css";     // design tokens (colors, radius, etc.)
import "@sth87/shadcn-design-system/index.css";     // component base styles
import "@sth87/shadcn-design-system/animation.css"; // animation keyframes
```

> For Tailwind configuration and full setup details, refer to the **shadcn-design-system skill**.

---

## Step 5 — Prettier & ESLint Configuration

### Prettier (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "jsxSingleQuote": false,
  "bracketSameLine": false,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### ESLint (`eslint.config.js`)

```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "warn",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
      "no-duplicate-imports": "warn",
    },
  },
);
```

---

## Step 6 — Pre-commit Automation (Optional)

```bash
pnpm add -D husky lint-staged
npx husky init
echo "pnpm lint-staged" > .husky/pre-commit
echo "pnpm type-check && pnpm build" > .husky/pre-push
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

---

## Step 7 — Environment Setup

Create `.env.example` with all required variables:

```bash
# API
VITE_API_BASE_URL=http://localhost:3000/api  # Vite
# NEXT_PUBLIC_API_URL=http://localhost:3000/api  # Next.js

# App
VITE_APP_NAME=MyApp
```

Add `.env` to `.gitignore`. Create `.env.development` and `.env.production` as needed.

Validate at startup:

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_NAME: z.string().min(1),
});

export const env = envSchema.parse(import.meta.env);
```
