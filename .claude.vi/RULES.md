# Quy tắc & Quy ước

> Dùng chung cho tất cả dự án. KHÔNG thêm thông tin đặc thù của từng dự án vào đây — hãy dùng `ARCHITECTURE.md`.
> **Phiên bản:** 2.0 | **Cập nhật lần cuối:** 2025-07 | **Người duy trì:** Tech Lead

---

## Chính sách ghi đè (Override Policy)

`RULES.md` = chuẩn mặc định chung. `ARCHITECTURE.md` = ghi đè theo từng dự án (ưu tiên cao hơn).

- `ARCHITECTURE.md` định nghĩa lại một section → **thay thế hoàn toàn** section đó
- `ARCHITECTURE.md` không đề cập một chủ đề → áp dụng mặc định từ `RULES.md`
- Dùng `<!-- EXTENDS RULES.md -->` để bổ sung thêm vào một section
- Dùng `<!-- OVERRIDES RULES.md -->` để thay thế hoàn toàn một section

> **Ai được phép sửa ARCHITECTURE.md:** Chỉ developer là người thật (Tech Lead trở lên). AI agent **tuyệt đối không được** sửa trực tiếp `ARCHITECTURE.md` hoặc `RULES.md` — chỉ được đề xuất thay đổi qua PR với lý do ghi rõ trong phần mô tả PR.

---

## Tech Stack

| Danh mục            | Công nghệ                     | Phiên bản tối thiểu     |
| ------------------- | ----------------------------- | ----------------------- |
| **Ngôn ngữ**        | TypeScript (strict mode)      | 5.x                     |
| **Framework**       | React / Next.js               | React 19+ / Next.js 16+ |
| **Runtime**         | Node.js                       | 20 LTS+                 |
| **Styling**         | TailwindCSS (utility-first)   | 3.x                     |
| **Design System**   | shadcn (`packages/ui`)        | latest                  |
| **HTTP Client**     | Axios (with interceptors)     | 1.x                     |
| **Server State**    | TanStack Query (React Query)  | 5.x                     |
| **Client State**    | Zustand                       | 4.x                     |
| **i18n**            | `react-i18next`               | 14.x                    |
| **Package Manager** | pnpm (ưu tiên dùng)           | 9.x                     |

> **Quy tắc nâng cấp phiên bản:** Trước khi nâng version bất kỳ package nào, phải kiểm tra breaking changes và báo cáo Tech Lead. AI agent không được tự động nâng cấp dependency — luôn ghi chú `// UPGRADE: <lý do>` và để người review quyết định cuối cùng.

---

## Cấu trúc dự án

> Mặc định: **Turborepo** + **pnpm workspaces**. `ARCHITECTURE.md` có thể ghi đè.

```
/
├── apps/                # Tất cả các ứng dụng
│   ├── web/             # Frontend (React/Next.js)
│   ├── api/             # Backend (nếu có)
│   └── [new-app]/       # App mới đặt ở đây
├── packages/            # Shared packages
│   ├── shared/          # Types, utils, constants dùng chung
│   ├── ui/              # UI components dùng chung (nếu cần)
│   └── config/          # Config dùng chung (ESLint, TS, Tailwind)
├── docs/                # File context cho AI Agent
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

**Quy tắc:**

- App mới đặt trong `apps/` — không bao giờ đặt độc lập ngoài thư mục này
- Code dùng chung đặt trong `packages/`
- Mỗi app có `package.json`, `.env`, và build config riêng
- Khi sửa file trong `packages/`, phải ghi chú ảnh hưởng downstream đến **tất cả các app đang dùng**

### Các loại App

**React SPA (Vite):** Vite + `react-router-dom`, output ra `dist/`

**Next.js:** App Router (thư mục `app/`), Server Components là mặc định, chỉ dùng `"use client"` khi thật sự cần. API routes đặt trong `app/api/`. Components đặt trong `components/` (KHÔNG đặt trong `app/`).

**Backend (Node.js):** Express hoặc NestJS, theo pattern `controller → service → repository`, versioning API theo dạng `/api/v1/...`

> **Khởi tạo dự án mới?** Xem hướng dẫn từng bước trong **bootstrap-project skill**.

---

## Tổ chức Code

### Quy ước đặt tên file

| Loại                 | Quy ước                              | Ví dụ                    |
| -------------------- | ------------------------------------ | ------------------------ |
| React Components     | `PascalCase.tsx`                     | `UserProfile.tsx`        |
| Pages (React SPA)    | `PascalCase.tsx` + hậu tố `Page`     | `DashboardPage.tsx`      |
| Pages (Next.js)      | `page.tsx` trong thư mục route       | `app/dashboard/page.tsx` |
| Hooks                | `camelCase.ts` + tiền tố `use`       | `useAuth.ts`             |
| Context Providers    | `PascalCase.tsx` + hậu tố `Provider` | `AuthProvider.tsx`       |
| Utilities / Services | `camelCase.ts`                       | `apiClient.ts`           |
| Types                | `*.type.ts` hoặc `*.types.ts`        | `user.type.ts`           |
| Constants            | `*.constants.ts`                     | `routes.constants.ts`    |
| Stores               | `camelCase.ts` + hậu tố `Store`      | `authStore.ts`           |
| Tests                | `*.test.ts` hoặc `*.spec.ts`         | `UserProfile.test.tsx`   |
| Schemas              | `*.schema.ts`                        | `loginForm.schema.ts`    |

### Cấu trúc thư mục (React SPA)

```
src/
├── assets/          # Static assets
├── components/      # Components dùng chung / tái sử dụng
│   ├── ui/          # UI tùy chỉnh (ngoài design system)
│   └── common/      # Layout components (Header, Footer)
├── features/        # Module theo tính năng (components, hooks, types riêng)
├── hooks/           # Custom hooks toàn cục
├── lib/             # Config thư viện (axios, query client)
├── pages/           # Page / route components
├── services/        # API services
├── stores/          # Global state (Zustand)
├── types/           # TypeScript types dùng chung
├── utils/           # Utility functions
├── constants/       # Constants và enums toàn cục
├── locales/         # File translation i18n
└── schemas/         # Validation schemas (zod)
```

### Thứ tự import

Sắp xếp import theo thứ tự sau, phân cách bằng dòng trống:

1. React / Framework imports
2. Thư viện bên ngoài
3. Design system (`@ui/*` — từ `packages/ui`)
4. Internal modules (đường dẫn tuyệt đối / alias `@/`)
5. Relative imports (cùng feature/module)
6. Types (`import type`)
7. Styles / Assets

### Barrel Exports

- Chỉ dùng `index.ts` cho **feature modules** và **nhóm components**
- Giữ barrel file gọn — chỉ re-export, không có logic
- **Không bao giờ** dùng `export * from` trong các module lồng sâu — ảnh hưởng đến tree-shaking

```typescript
// ❌ Gây circular deps + phá tree-shaking
export * from "./components";
export * from "./hooks";
```

---

## Quy tắc TypeScript

- **Luôn bật strict mode** (`"strict": true`)
- **Không dùng `any`** — dùng `unknown` + type guards khi kiểu dữ liệu thật sự không xác định
- **`interface`** cho object shapes và props; **`type`** cho unions/intersections/utilities
- **`import type`** cho các import chỉ dùng kiểu dữ liệu
- **`as const`** cho literal types và readonly objects
- Export shared types từ các file `*.type.ts`

---

## Quy tắc Component

### Design System là ưu tiên số một

Luôn dùng design system dựa trên shadcn từ `packages/ui` thay vì tự xây dựng UI primitives. Components được thêm và quản lý qua `shadcn` CLI và tùy chỉnh trong monorepo.

```typescript
// Import từ internal UI package
import { Button } from "@ui/components/button";
import { Dialog } from "@ui/components/dialog";
```

CSS import bắt buộc tại entry point của app (`main.tsx` hoặc `app/layout.tsx`):

```typescript
import "@ui/styles/globals.css"; // design tokens + component styles
```

### Quy ước đặt tên

| Pattern   | Hậu tố / Tiền tố  | Ví dụ           |
| --------- | ----------------- | --------------- |
| Pages     | Hậu tố `Page`     | `DashboardPage` |
| Layouts   | Hậu tố `Layout`   | `MainLayout`    |
| Providers | Hậu tố `Provider` | `AuthProvider`  |
| Hooks     | Tiền tố `use`     | `useAuth`       |
| HOCs      | Tiền tố `with`    | `withAuth`      |

### Nguyên tắc

- Tách logic phức tạp ra custom hooks — giữ component tập trung vào UI
- Props khai báo bằng `interface` trong cùng file hoặc file `.type.ts` đi kèm
- Ưu tiên **composition** (`children`, render props) thay vì prop-drilling quá nhiều tầng
- Luôn nhận prop `className` để linh hoạt về styling, merge bằng `cn()`
- Tách UI components ra khỏi business logic (container/presenter pattern)

---

## Xử lý lỗi (Error Handling)

- Dùng **`react-error-boundary`** bọc các section quan trọng của app — cung cấp fallback UI thân thiện với người dùng
- Dùng **`toast.error()`** (từ design system) cho lỗi hiển thị với người dùng
- Xử lý đủ 3 trạng thái **loading**, **error**, và **empty** cho mọi thao tác bất đồng bộ
- Không bao giờ bỏ qua lỗi trong im lặng — luôn log hoặc hiển thị phản hồi
- Dùng typed `catch` blocks: kiểm tra `error instanceof AxiosError` trước khi truy cập response data

### Chiến lược Retry (TanStack Query)

```typescript
useQuery({
  retry: (failureCount, error) => {
    // Không retry với lỗi 404 — resource không tồn tại
    if (error instanceof AxiosError && error.response?.status === 404)
      return false;
    return failureCount < 2; // tối đa 2 lần retry cho lỗi network/server
  },
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // exponential backoff
});
```

### Quy ước Error Code

Định nghĩa trong `types/errors.types.ts` và dùng thống nhất toàn project:

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

> **Quy tắc cho Agent:** khi bắt lỗi, luôn log `error.code` hoặc `error.response?.data?.code` — không được chỉ dựa vào `error.message` vì không chuẩn hóa giữa các API.

---

## Quy tắc Styling

- **Utility-first** — dùng trực tiếp Tailwind classes trên element, tránh inline styles
- Dùng utility **`cn()`** (từ `packages/ui`) cho class điều kiện / merge class
- **Mobile-first** responsive design — style cơ bản cho mobile, `md:` / `lg:` cho màn hình lớn hơn
- **Dark mode** qua class `dark` trên root element
- **CSS variables** cho theming (định nghĩa trong `packages/ui/styles/globals.css`)
- Tránh dùng `@apply` trừ trường hợp thật sự cần — ưu tiên utility classes

---

## Quản lý State

| Loại State   | Giải pháp                       | Ví dụ                         |
| ------------ | ------------------------------- | ----------------------------- |
| UI State     | `useState` / Zustand            | Mở/đóng modal, toggle sidebar |
| Form State   | `useState` / React Hook Form    | Input form, validation        |
| Server State | TanStack Query                  | API data, cache, pagination   |
| URL State    | Router (React Router / Next.js) | Trang hiện tại, query params  |
| Global State | Zustand                         | Auth user, ngôn ngữ, theme    |

**Quy tắc:**

- Giữ state **càng local càng tốt** — bắt đầu với `useState`
- **Không bao giờ duplicate server state** vào client state — để TanStack Query quản lý caching
- Zustand chỉ dùng cho state thật sự global, chia sẻ giữa các component không liên quan nhau
- Derive computed values thay vì lưu vào state

---

## Quy tắc Form & Validation

- Dùng **React Hook Form** mặc định để quản lý form state; hạn chế tối đa dùng `useState` cho form nhiều field.
- **BẮT BUỘC**: Dùng schema validation với **Zod** để validate form data (kết hợp `@hookform/resolvers/zod`).
- Tách schemas ra file riêng trong thư mục `schemas/` (ví dụ: `loginForm.schema.ts`) hoặc đặt cùng chỗ cho form nhỏ. Luôn export kiểu inferred (`type LoginFormValues = z.infer<typeof loginSchema>`).
- Tận dụng các component hiển thị lỗi form từ Design System để đảm bảo UX nhất quán.

---

## Pattern sử dụng thư viện

### Axios

- Cấu hình `apiClient` dùng chung trong `lib/axios.ts` với interceptors (auth token, xử lý lỗi, refresh token)
- **Luôn dùng `apiClient`** — không bao giờ gọi `axios` trực tiếp
- Xử lý 401 (refresh token), 403 (từ chối truy cập), 500 (toast lỗi chung) trong response interceptor
- Timeout mặc định: 30s. Dùng `AbortController` cho các request có thể hủy

```typescript
// lib/axios.ts — skeleton
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});
apiClient.interceptors.request.use(/* đính kèm auth token */);
apiClient.interceptors.response.use(/* xử lý 401/403/500 */);
export default apiClient;
```

### TanStack Query

- **Query keys dạng mảng**: `['users']`, `['users', userId]`, `['users', { page, limit }]`
- **Custom hooks** cho mỗi query — không dùng `useQuery` trực tiếp trong components
- **`useMutation`** cho tất cả thao tác ghi (POST, PUT, DELETE)
- **Invalidate các query liên quan** sau khi mutation
- Cấu hình `staleTime` phù hợp với tần suất thay đổi của từng loại data

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

## Xử lý Data từ API

### Kiểu Response chuẩn

Định nghĩa trong `types/api.types.ts` (hoặc `packages/shared` cho monorepo):

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

### Quy tắc truy cập an toàn

- **Optional chaining (`?.`)** trên tất cả data từ API response
- **Nullish coalescing (`??`)** cho giá trị fallback khi hiển thị
- **Mặc định `[]`** trước khi gọi `.map()`, `.filter()`, `.find()`
- Xử lý đủ 4 trạng thái **loading → error → empty → data** trong mọi component tiêu thụ API data

---

## Quốc tế hóa (i18n)

- Dùng **`react-i18next`** cho tất cả nhu cầu i18n
- Chiến lược URL theo **path**: `/vi/about`, `/en/about` — locale mặc định không có prefix
- File translation đặt tại `locales/{lang}/{namespace}.json` (ví dụ: `locales/en/auth.json`)
- **Dot notation** cho keys: `auth.login.submitButton`
- **Không bao giờ hardcode chuỗi hiển thị** — luôn dùng `t('key')`
- Khi thêm hoặc sửa chuỗi UI, cập nhật **tất cả các file locale cùng lúc** — không để locale nào bị thiếu

---

## Quy tắc Bảo mật

- **Không bao giờ dùng `dangerouslySetInnerHTML`** mà không có `DOMPurify.sanitize()`
- **Không bao giờ lưu token** trong `localStorage`/`sessionStorage` — ưu tiên `httpOnly` cookies
- **Không bao giờ để lộ API keys** trong client code — dùng env vars hoặc server proxy
- **Validate tất cả dữ liệu bên ngoài** (URL params, query strings, form inputs) bằng `zod`
- HTTPS cho tất cả API calls; bảo vệ CSRF cho các thao tác thay đổi state

### Bảo mật Backend (Node.js)

- Cài đặt security headers qua **`helmet`** trên tất cả Express/NestJS apps
- Cấu hình **CORS** tường minh — không bao giờ dùng `origin: '*'` trong production
- Áp dụng **rate limiting** (`express-rate-limit` hoặc tương đương) trên tất cả public endpoints, đặc biệt là các route auth
- Sanitize và validate tất cả request bodies ở tầng controller trước khi chuyển xuống service
- Log các sự kiện liên quan bảo mật (đăng nhập thất bại, bị từ chối truy cập) bằng structured logging — không bao giờ log các field nhạy cảm (mật khẩu, token, PII)

---

## Biến môi trường (Environment Variables)

| Framework   | Prefix phía client | Ví dụ                 |
| ----------- | ------------------ | --------------------- |
| Vite        | `VITE_`            | `VITE_API_BASE_URL`   |
| Next.js     | `NEXT_PUBLIC_`     | `NEXT_PUBLIC_API_URL` |
| Server-only | (không có prefix)  | `DATABASE_URL`        |

- Luôn cung cấp **`.env.example`** với tất cả tên biến (không có giá trị thật)
- Không bao giờ commit file `.env` — thêm vào `.gitignore`
- Validate env vars lúc khởi động bằng `zod`
- Tách file theo môi trường: `.env.development`, `.env.production`

---

## Độ phức tạp & Kích thước Code

> Hướng dẫn mềm — cần cân nhắc đối với business logic phức tạp.

| Chỉ số                | Khuyến nghị | Ngưỡng cần review         |
| --------------------- | ----------- | ------------------------- |
| Độ dài file           | < 300 dòng  | > 500 dòng                |
| Độ dài hàm            | < 30 dòng   | > 50 dòng                 |
| Kích thước component  | < 200 dòng  | > 300 dòng                |
| Độ sâu lồng nhau      | ≤ 3 tầng    | > 4 tầng                  |
| Số tham số hàm        | ≤ 4         | > 4 → dùng options object |
| Cyclomatic complexity | < 10        | > 10                      |

**Khi file/hàm quá lớn:** tách thành sub-components, custom hooks, utility functions, hoặc file `.type.ts`. Ưu tiên lookup tables thay vì chuỗi if-else/switch dài. Dùng early returns để giảm độ sâu lồng nhau.

---

## Quy ước Git

- **Conventional commits**:
  ```
  feat: add user profile page
  fix: resolve dialog close animation
  refactor: extract auth logic into custom hook
  docs: update API integration guide
  chore: upgrade dependencies
  ```
- Mỗi commit tập trung vào một thay đổi cụ thể
- **Không bao giờ** commit thông tin nhạy cảm (API keys, credentials, tokens)
- **Không bao giờ** tự động thêm chữ ký AI vào commit message

---

## Linting, Formatting & Git Hooks

- Dùng **ESLint** và **Prettier** mặc định để đảm bảo chất lượng code và format nhất quán.
- Bắt buộc cài đặt và cấu hình **Husky** và **lint-staged** để tự động chạy linter và format code trước mỗi commit (hook `pre-commit`).
- Cấu hình hook `commit-msg` (ví dụ dùng `commitlint`) để enforce định dạng Conventional Commits.
- Yêu cầu script `lint` và `format` được cấu hình trong `package.json` để đảm bảo nhất quán giữa các môi trường.
- **Không bao giờ** bỏ qua git hooks bằng `--no-verify` khi commit, trừ trường hợp khẩn cấp tuyệt đối.

---

## Quy tắc Testing

> Có thể ghi đè bởi `ARCHITECTURE.md`. Nếu `ARCHITECTURE.md` nêu rõ không cần unit tests thì có thể bỏ qua. Nếu không có khai báo nào, **unit tests là BẮT BUỘC theo mặc định.**

- **Quy ước Testing**: Ưu tiên Vitest/Jest kết hợp React Testing Library. Viết tests cho `utils`, `hooks`, `services`, và các UI components dùng chung / phức tạp.
- **Cập nhật Tests**: Bất cứ khi nào code (logic hoặc UI) được sửa, developer/AI Agent PHẢI kiểm tra và cập nhật unit tests tương ứng để đảm bảo toàn bộ test suite vẫn pass.
- **Chạy Tests**: Phải có script local (ví dụ: `pnpm test`) để chạy test suite. Tất cả tests phải pass đầy đủ trước khi commit, push, hoặc tạo Pull Request.

### Quy ước đặt tên Test

Dùng pattern `describe / it` nhất quán. Tên test phải đọc được như một câu tiếng Anh hoàn chỉnh, diễn đạt **hành vi mong đợi**, không phải implementation.

```typescript
// ❌ Sai — mơ hồ, mô tả implementation chứ không phải behavior
describe("formatDate", () => {
  it("works correctly", () => { ... });
  it("handles edge case", () => { ... });
});

// ✅ Đúng — đọc như một câu, mô tả hành vi mong đợi
describe("formatDate", () => {
  it("returns DD/MM/YYYY format for a valid date string", () => { ... });
  it("returns an empty string when given an invalid date", () => { ... });
  it("handles timezone offset without shifting the displayed date", () => { ... });
});
```

> **Quy tắc cho Agent:** Mỗi block `it()` phải có tên hoàn chỉnh câu: _"it [tên]"_. Không bao giờ dùng `it('works')`, `it('handles it')`, hoặc `it('test 1')`.

### Chiến lược Mock

- **API calls** → mock ở tầng `apiClient` bằng `vi.mock('@/lib/axios')`
- **Thư viện bên ngoài** → mock ở tầng module (trong `vi.mock()`), không mock từng test
- **Browser APIs** → `vi.stubGlobal()` trong `beforeEach`, restore trong `afterEach`
- **Date/time** → dùng `vi.useFakeTimers()` — không bao giờ mock `Date` trực tiếp

### Ngưỡng Coverage (tối thiểu)

```typescript
// vitest.config.ts
coverage: {
  thresholds: { lines: 70, functions: 70, branches: 60 }
}
```

### Quy tắc đặt file Test

- Tests đặt **cạnh file mà chúng test** đối với code đặc thù của feature
- Tests cho shared utilities đặt trong `src/__tests__/`
- Mỗi file test bao gồm: happy path + ít nhất một trường hợp lỗi/edge case cho mỗi hàm được export

### Agent có thể tự verify vs Human mới verify được

Khi hoàn thành task, phân biệt rõ:

| Kiểm tra              | Ai verify                     |
| --------------------- | ----------------------------- |
| `pnpm typecheck` pass | Agent (phải chạy và xác nhận) |
| `pnpm lint` pass      | Agent (phải chạy và xác nhận) |
| `pnpm test` pass      | Agent (phải chạy và xác nhận) |
| UI hiển thị đúng      | Human reviewer                |
| UX flow hợp lý        | Human reviewer                |
| Business logic đúng   | Human reviewer                |

> AI agent **không được** tuyên bố task "done" chỉ dựa trên review code. Ba check mà agent có thể tự verify phải được thực sự chạy và pass.

---

## Quy tắc Comment Code

- **Code tự giải thích**: Dùng tên biến và tên hàm rõ ràng, mô tả để giảm tối đa nhu cầu comment giải thích "Code làm gì".
- **Inline Comments (`// ...`)**: Chỉ dùng để giải thích **TẠI SAO** một cách tiếp cận được chọn, logic nghiệp vụ phức tạp, hoặc workaround cần thiết. KHÔNG BAO GIỜ dùng để dịch code sang tiếng Anh.
- **JSDoc bắt buộc (`/** ... \*/`)**: Bắt buộc cho tất cả hàm, hooks, và custom utilities dùng chung (đặc biệt trong `utils/`, `hooks/`, và `services/`).
- **Định dạng JSDoc**: Mô tả ngắn gọn mục đích của hàm, dùng `@param` để giải thích ý nghĩa của tham số (TypeScript đã lo kiểu), và `@returns` cho giá trị trả về không rõ ràng. JSDoc đúng chuẩn giúp AI agents và IDE IntelliSense hiểu đúng intent của code.

### Ví dụ JSDoc (định dạng thân thiện với AI)

Tag `@example` là field quan trọng nhất cho AI agents — nó truyền đạt intent mà không cần agent đọc toàn bộ implementation.

```typescript
/**
 * Lấy danh sách user có phân trang với filter tùy chọn ở phía server.
 * Được dùng bởi admin dashboard và user picker component.
 *
 * @param filters - Filter tùy chọn áp dụng trước khi phân trang (ví dụ: role, status)
 * @param page - Số trang, đếm từ 1
 * @returns Response có phân trang chứa danh sách users và tổng số lượng
 *
 * @example
 * const { data } = useUsers({ role: 'admin' }, 1);
 * // data.data → User[]
 * // data.pagination.total → number
 */
export function useUsers(filters?: UserFilters, page = 1) { ... }
```

---

## Quy tắc Performance

> Ngăn chặn các regression về performance phổ biến do AI tạo ra, chỉ xuất hiện khi ở quy mô lớn.

- **Memoization** — dùng `useMemo` và `useCallback` chỉ khi có chi phí re-render đo lường được; không over-memoize các giá trị tầm thường
- **Lazy loading** — tất cả page-level components phải dùng `React.lazy()` + `Suspense`; không bao giờ import pages một cách eager trong router
- **Tối ưu hóa hình ảnh** — luôn chỉ định `width` và `height` trên thẻ `<img>` hoặc dùng `<Image>` của Next.js để tránh CLS (Cumulative Layout Shift)
- **Render danh sách** — luôn cung cấp prop `key` ổn định và duy nhất; không bao giờ dùng index mảng làm key cho danh sách có thể reorder hoặc filter
- **Bundle size** — ưu tiên named imports từ các thư viện lớn (ví dụ: `import { debounce } from 'lodash-es'`) thay vì default imports; không bao giờ import cả thư viện chỉ để dùng một utility
- **Tránh re-render không cần thiết** — không tạo object/array literal mới hoặc inline functions trong JSX props trừ khi được bọc trong `useMemo`/`useCallback`

---

## Quy tắc Accessibility (a11y)

> Accessibility tối thiểu bắt buộc — agent có thể enforce được.

- Tất cả các element tương tác (`button`, `a`, custom controls) phải có label hiển thị hoặc `aria-label`
- Hình ảnh phải có `alt` text mô tả; hình ảnh trang trí dùng `alt=""`
- Dùng semantic HTML elements (`nav`, `main`, `section`, `header`, `footer`) — không bao giờ dùng `div` cho interactive roles mà không có `role` + `aria-*` attributes
- Keyboard navigation phải hoạt động cho tất cả interactive flows — kiểm tra `Tab`, `Enter`, `Escape` hoạt động đúng
- Color contrast phải đạt tối thiểu WCAG AA (4.5:1 cho text thường, 3:1 cho text lớn)
- Không bao giờ chỉ dựa vào màu sắc để truyền đạt trạng thái (error, success, warning) — luôn kết hợp với icon hoặc text label

---

## Quy tắc Tài liệu

```
/
├── docs/              # File context cho AI Agent (tiếng Anh)
│   ├── RULES.md       # Quy tắc dùng chung (file này)
│   └── ARCHITECTURE.md
├── docs.vi/           # Bản dịch tiếng Việt
├── readme/            # Tài liệu tính năng & hướng dẫn kỹ thuật
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── FEATURES.md
│   └── CHANGELOG.md
└── README.md          # Tổng quan dự án (ngắn gọn, link đến readme/)
```

- `docs/` chỉ dành riêng cho **context của AI Agent**
- Tài liệu tính năng và tài liệu được generate đặt trong `readme/`
- Cập nhật docs **trước khi** refactor; thêm docs **sau khi** phát triển tính năng mới
- Dùng JSDoc cho các hàm, hooks, và logic phức tạp được export
- `ARCHITECTURE.md` và `RULES.md` chỉ được sửa bởi human developers — **AI agents tuyệt đối không được sửa**

---

## Hành vi AI Agent

> Section này quy định cách AI agents (Claude, Copilot, Cursor, v.v.) phải hành xử khi làm việc với codebase này. Developer là người thật cũng nên tuân theo các quy trình này khi đóng vai reviewer.

### Điều hướng Codebase — Thứ tự Onboarding

Khi bắt đầu bất kỳ task nào, đọc các file theo thứ tự sau trước khi viết bất kỳ code nào:

1. `docs/ARCHITECTURE.md` — ghi đè đặc thù theo dự án (luôn đọc trước)
2. `docs/RULES.md` — file này (quy ước baseline)
3. `index.ts` của feature folder — hiểu public API của feature
4. Các file `*.type.ts` liên quan — hiểu data shapes trước khi đụng vào logic
5. File `*.test.ts` cùng cấp — hiểu expected behavior trước khi thay đổi implementation

### Bảng tra cứu nhanh

| Đang tìm           | Vào đây                                             |
| ------------------ | --------------------------------------------------- |
| Global types       | `packages/shared/src/types/` hoặc `src/types/`      |
| API endpoints      | `src/services/` + `src/lib/axios.ts`                |
| Định nghĩa routes  | `src/constants/routes.constants.ts`                 |
| Logic auth         | `src/features/auth/` hoặc `src/stores/authStore.ts` |
| i18n keys          | `src/locales/{lang}/{namespace}.json`               |
| Validation schemas | `src/schemas/` hoặc `*.schema.ts` đặt cùng chỗ      |
| Config môi trường  | `.env.example` + `src/lib/env.ts`                   |

### Ưu tiên tải Context

Khi context window bị giới hạn, tải file theo thứ tự ưu tiên sau:

1. `ARCHITECTURE.md` (luôn luôn — chứa ghi đè đặc thù dự án)
2. `*.type.ts` / `api.types.ts` — hiểu data contracts trước
3. File đang sửa + các import trực tiếp của nó
4. File test cùng cấp (`*.test.ts`) — hiểu intent
5. Service hoặc hook liên quan — hiểu data flow

> Không bao giờ load `node_modules`, lock files (`pnpm-lock.yaml`), hoặc file được auto-generate vào context. Ưu tiên đọc barrel exports `index.ts` thay vì duyệt qua từng file trong một folder.

### Quy trình Nhận Task

1. **Đọc trước khi viết** — Luôn đọc `ARCHITECTURE.md` và các feature file liên quan trước khi thực hiện bất kỳ thay đổi nào
2. **Kiểm tra phạm vi** — Nếu task đụng đến hơn 3 file, liệt kê tất cả các file bị ảnh hưởng trước khi tiến hành
3. **Một task, một mối quan tâm** — Không bao giờ gộp các thay đổi không liên quan vào cùng một task hoặc PR
4. **Xác minh file tồn tại** — Không bao giờ giả sử một file hoặc export tồn tại mà không xác nhận trong context được cung cấp

### Bảng quyết định

| Tình huống                                         | Hành vi của Agent                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `RULES.md` xung đột với `ARCHITECTURE.md`          | `ARCHITECTURE.md` thắng — log xung đột trong một comment                          |
| Thiếu design spec cho UI                           | Mặc định dùng design system components — không bao giờ tự phát minh UI patterns   |
| Không có coverage target                           | Viết tests cho happy path + một trường hợp lỗi/edge case cho mỗi hàm export       |
| Yêu cầu mơ hồ                                      | Nêu rõ sự mơ hồ, đề xuất cách giải thích an toàn hơn, hỏi MỘT câu                 |
| Lệnh refactor không có tiêu chí cụ thể             | Chỉ áp dụng các quy tắc đặt tên và cấu trúc trong file này — không thay đổi logic |
| Task yêu cầu sửa `RULES.md` hoặc `ARCHITECTURE.md` | Đề xuất thay đổi trong comment hoặc mô tả PR — KHÔNG sửa file trực tiếp           |
| Phiên bản stack có vẻ lỗi thời so với codebase     | Ghi chú sự không khớp trong comment — KHÔNG tự động nâng cấp                      |

### Xử lý Mơ hồ

Khi mô tả task không rõ ràng, agent phải:

1. **Nêu rõ sự mơ hồ** — "Điều này có thể có nghĩa là X hoặc Y"
2. **Đề xuất cách giải thích an toàn hơn** — mặc định theo hướng ít phá hoại hơn
3. **Hỏi MỘT câu làm rõ** — không bao giờ gửi danh sách nhiều câu hỏi cùng lúc
4. **Không bao giờ đoán mò trong im lặng** — đưa ra giả định sai trên task mơ hồ gây hại nhiều hơn là dừng lại hỏi

### Hợp đồng Hoàn thành Task

Một task được coi là **done** chỉ khi tất cả các điều sau đây đều đúng:

**Agent phải thực thi và xác nhận:**

- [ ] `pnpm typecheck` — không có lỗi TypeScript
- [ ] `pnpm test` — tất cả tests pass
- [ ] `pnpm lint` — không có lỗi linting

**Human reviewer phải xác nhận:**

- [ ] Code changes tuân thủ tất cả quy ước trong file này
- [ ] Nếu chuỗi UI thay đổi → translation keys được thêm vào **tất cả** các file locale
- [ ] `readme/CHANGELOG.md` được cập nhật cho các thay đổi hiển thị với người dùng
- [ ] UI hiển thị đúng và UX flow hợp lý
- [ ] Business logic khớp với yêu cầu ban đầu

### Định dạng Output cho Thay đổi Code

Khi đề xuất hoặc giải thích thay đổi, luôn cấu trúc response theo dạng:

1. **Tại sao** — lý do thay đổi (1–2 câu)
2. **Thay đổi gì** — danh sách file bị thay đổi và thay đổi cụ thể trong từng file
3. **Rủi ro** — tác dụng phụ tiềm ẩn hoặc breaking changes (hoặc "không có")

---

## Anti-patterns (Những điều cấm làm)

> Danh sách tổng hợp các pattern mà AI agent (và tất cả developers) không bao giờ được tạo ra. Bổ sung cho các quy tắc đã có trong từng section ở trên.

### Anti-patterns về Code

| Anti-pattern                                      | Thay thế đúng                                  |
| ------------------------------------------------- | ---------------------------------------------- |
| Kiểu `any`                                        | `unknown` + type guard                         |
| `useEffect` để fetch data                         | TanStack Query (`useQuery`)                    |
| Gọi API inline trong components                   | Service layer (`src/services/`)                |
| `localStorage` / `sessionStorage` cho auth tokens | `httpOnly` cookies                             |
| `console.log` trong production code               | Structured logger hoặc xóa trước khi commit    |
| Hardcode chuỗi hiển thị trong JSX                 | `t('key')` qua `react-i18next`                 |
| `dangerouslySetInnerHTML` không có sanitize       | `DOMPurify.sanitize()` trước                   |
| Gọi `axios` trực tiếp                             | Luôn dùng `apiClient` dùng chung               |
| `export * from` trong module lồng sâu             | Chỉ dùng named exports tường minh              |
| Index mảng làm `key` prop trong danh sách động    | ID duy nhất ổn định từ data                    |
| Import eager tất cả page components trong router  | `React.lazy()` + `Suspense`                    |
| `it('works correctly')` hoặc `it('test 1')`       | Câu mô tả rõ: `it('returns X when Y')`         |
| `CORS origin: '*'` trong backend production       | Allowlist tường minh các origin được tin tưởng |

### Anti-patterns về Kiến trúc

- ❌ Business logic trong UI components → tách ra custom hooks hoặc service layer
- ❌ Mutate state trực tiếp ngoài Zustand store actions
- ❌ Circular imports giữa các feature modules
- ❌ Import từ `apps/` trong `packages/` — dependency phải chảy một chiều
- ❌ Duplicate server state trong Zustand — TanStack Query là nguồn sự thật cho remote data
- ❌ Lưu derived/computed values vào state — derive chúng lúc render thay thế
- ❌ Thiếu trạng thái `loading`, `error`, và `empty` trong components tiêu thụ async data

### Anti-patterns đặc thù cho AI

- ❌ **Tạo placeholder data có hình dạng như data thật** (ví dụ: fake UUIDs, mock email addresses trong production code)
- ❌ **Giả sử file hoặc export tồn tại** mà không xác minh trong context codebase được cung cấp
- ❌ **Sao chép pattern từ code cũ** mà không kiểm tra xem chúng có tuân thủ `RULES.md` hiện tại không
- ❌ **Tạo comment `// TODO`** mà không có issue reference đính kèm hoặc tên người chịu trách nhiệm
- ❌ **Tự động sửa linting errors làm thay đổi behavior** — chỉ các thay đổi formatting mới an toàn để tự apply
- ❌ **Xóa hoặc đổi tên files** mà không có lệnh tường minh
- ❌ **Thay đổi phiên bản package** mà không báo cáo các breaking changes tiềm ẩn cho developer
- ❌ **Sửa files trong `packages/`** mà không ghi chú ảnh hưởng downstream đến tất cả các app đang dùng
- ❌ **Gộp các thay đổi không liên quan** vào cùng một task hoặc PR
- ❌ **Tuyên bố task done** mà không thực sự chạy `typecheck`, `test`, và `lint`
- ❌ **Sửa trực tiếp `RULES.md` hoặc `ARCHITECTURE.md`** — chỉ đề xuất qua mô tả PR
- ❌ **Đặt tên test mơ hồ** — mỗi `it()` phải diễn đạt hành vi quan sát được rõ ràng
- ❌ **Tạo backend routes không có rate limiting hoặc input validation** trên public endpoints
