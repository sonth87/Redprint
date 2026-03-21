# Project Architecture

> **File này đặc thù cho từng dự án.** Mô tả kiến trúc, tính năng, và các quyết định kỹ thuật riêng của dự án.
> Có thể **override hoặc extend** các section từ `RULES.md` — xem cơ chế tại mục [Rules Reference](#rules-reference).
>
> **Version:** 1.0 | **Last updated:** YYYY-MM | **Updated by:** [Tên]
> **Changelog:** [Mô tả thay đổi lần cuối]

---

<!--
  ============================================================
  HƯỚNG DẪN SỬ DỤNG TEMPLATE NÀY
  ============================================================

  DÀNH CHO DEVELOPER (người điền template):
  - Mô tả dự án bằng ngôn ngữ tự nhiên → AI Agent sẽ tự điền vào đúng section
  - Hoặc điền thủ công vào từng section có đánh dấu [TODO]
  - Xóa các section không áp dụng cho dự án
  - Thêm section mới nếu dự án có đặc thù riêng

  DÀNH CHO AI AGENT (khi được yêu cầu cập nhật file này):
  - Chỉ điền thông tin đặc thù dự án — KHÔNG copy lại nội dung từ RULES.md
  - Phần "Rules Reference" chỉ được ghi khi dự án có override/extend thực sự
  - TUYỆT ĐỐI KHÔNG sửa RULES.md dù bất kỳ lý do gì
  - Khi thêm section mới, đặt ở vị trí logic — không append bừa vào cuối file
  - Sau khi cập nhật, bump "Last updated" và ghi ngắn vào "Changelog"
  ============================================================
-->

---

## Project Overview

**Project Name**: `[TODO: Tên dự án]`
**App Type**: `[TODO: React SPA (Vite) | Next.js | Backend Node.js | Monorepo]`
**Description**: [TODO: Mô tả ngắn — dự án làm gì, phục vụ ai, giải quyết vấn đề gì]

### Target Users

[TODO: Ai là người dùng cuối? Ví dụ: admin nội bộ, end-user B2C, developer qua API]

### Key Features

[TODO: Liệt kê 3–7 tính năng chính. Mỗi dòng một tính năng, mô tả đủ để agent hiểu scope]

- **[Tên tính năng]**: [Mô tả ngắn — làm gì, ảnh hưởng đến module nào]
- **[Tên tính năng]**: [Mô tả ngắn]

### Brand Assets

- **Favicon & Logo**: Luôn sử dụng các file `favicon` và `logo` nằm trong thư mục `assets` để làm favicon và logo chính thức cho dự án.

| File                      | Mục đích                                   |
| ------------------------- | ------------------------------------------ |
| `docs/assets/favicon.ico` | Icon tab trình duyệt                       |
| `docs/assets/logo.svg`    | Logo dự án — dùng trong header, login page |

---

## Rules Reference

<!--
  MỤC ĐÍCH: Cho agent biết ngay những điểm dự án này khác với RULES.md baseline.
  - Nếu dự án tuân thủ hoàn toàn RULES.md → để trống bảng, ghi "Không có override"
  - Chỉ ghi những gì THỰC SỰ khác — không giải thích lại rule gốc
  - Agent KHÔNG được tự thêm dòng vào đây trừ khi developer yêu cầu override cụ thể
-->

**RULES.md version đang áp dụng**: `2.0`
**Nguồn**: `docs/RULES.md`

### Active Overrides & Extensions

| Section trong RULES.md | Loại                | Nội dung override / extension |
| ---------------------- | ------------------- | ----------------------------- |
| [TODO: Tên section]    | OVERRIDES / EXTENDS | [Mô tả ngắn điều gì khác]     |

> Nếu không có override nào: xóa bảng trên và ghi **"Dự án tuân thủ hoàn toàn RULES.md v2.0 — không có override."**

---

## Architecture

### App Type & Pattern

**Loại app**: [TODO: React SPA / Next.js App Router / Express API / NestJS API / Monorepo]

**Pattern kiến trúc**: [TODO: Component-based / Feature-sliced / Module-based / MVC / v.v.]

```
[TODO: Vẽ sơ đồ phân tầng kiến trúc — ví dụ:]

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
[TODO: Mô tả luồng data chính — ví dụ:]
User Action → Component → Custom Hook → Service → apiClient → API
                                    ↓
                            TanStack Query Cache → UI Re-render
```

---

## Folder Structure

<!-- OVERRIDES RULES.md — chỉ khi cấu trúc thực tế khác default trong RULES.md -->

<!--
  Chỉ mô tả cấu trúc thực tế của dự án này.
  - Nếu giống default trong RULES.md → xóa section này đi, không cần lặp lại
  - Nếu khác → mô tả phần khác biệt, không cần liệt kê toàn bộ
  - Chỉ show top-level directories — không liệt kê từng file
-->

```
[TODO: Cấu trúc thực tế của dự án]
```

---

## Feature Modules

<!--
  QUAN TRỌNG cho Agent: Liệt kê các feature đã tồn tại để tránh tạo duplicate.
  Mỗi dòng = một thư mục trong src/features/
-->

| Feature             | Mô tả                               | Các entity chính   |
| ------------------- | ----------------------------------- | ------------------ |
| `auth`              | Đăng nhập, đăng ký, quản lý session | `User`, `Session`  |
| [TODO: tên feature] | [Mô tả ngắn]                        | [Entity liên quan] |

---

## Authentication Flow

<!--
  Agent đụng vào auth nhiều nhất và dễ implement sai nhất nếu thiếu context.
  Điền đủ để agent không cần đoán.
-->

- **Phương thức**: [TODO: JWT / OAuth2 / Session Cookie / API Key]
- **Lưu token**: [TODO: httpOnly cookie / memory / v.v.]
- **Refresh token**: [TODO: Có / Không — nếu có, endpoint là gì]
- **Login endpoint**: `[TODO: POST /api/v1/auth/login]`
- **Route guard**: [TODO: implement ở đâu — ví dụ: `src/features/auth/components/ProtectedRoute.tsx`]
- **Redirect sau login**: [TODO: về đâu]

---

## Key Dependencies

<!-- EXTENDS RULES.md — các package bổ sung ngoài base stack -->

<!--
  Chỉ liệt kê package NGOÀI base stack đã có trong RULES.md.
  Không cần liệt kê lại React, Axios, Zustand, v.v.
-->

| Package              | Version | Mục đích                |
| -------------------- | ------- | ----------------------- |
| [TODO: package-name] | x.x     | [Dùng để làm gì, ở đâu] |

---

## State Management

<!--
  Liệt kê các Zustand stores thực tế của dự án.
  TanStack Query handles server state — không cần liệt kê ở đây.
-->

| Store file     | Mục đích                      | State chính                |
| -------------- | ----------------------------- | -------------------------- |
| `authStore.ts` | Thông tin user đang đăng nhập | `user`, `isAuthenticated`  |
| [TODO: store]  | [Mục đích]                    | [Các state key quan trọng] |

---

## API Integration

### Cấu hình

- **Base URL env var**: `[TODO: VITE_API_BASE_URL / NEXT_PUBLIC_API_URL]`
- **Authentication header**: `[TODO: Bearer token / Cookie / v.v.]`
- **Format**: `[TODO: REST / GraphQL]`
- **API versioning**: `[TODO: /api/v1/... / không có]`

### Endpoints chính

<!--
  Liệt kê các endpoint quan trọng / không chuẩn.
  Endpoint CRUD thông thường không cần liệt kê — agent tự suy ra theo convention.
  Tập trung vào: auth endpoints, endpoints có behavior đặc biệt, endpoints có payload phức tạp.
-->

```
[TODO: Ví dụ]
POST  /api/v1/auth/login          # Body: { email, password } → { accessToken, user }
POST  /api/v1/auth/refresh        # Cookie: refreshToken → { accessToken }
POST  /api/v1/auth/logout         # Xóa session

GET   /api/v1/[resource]          # Có pagination: ?page=1&limit=20
```

### Known API Constraints

<!--
  QUAN TRỌNG: Những giới hạn thực tế của API hiện tại.
  Agent PHẢI biết để không generate code "đúng chuẩn nhưng sai với backend thực tế".
-->

[TODO: Ví dụ:]

- [ ] API chưa support pagination cho endpoint `/users` — hiện trả về toàn bộ danh sách
- [ ] Chưa có refresh token — khi token hết hạn, redirect về login
- [ ] Upload file giới hạn 5MB, backend trả 413 nếu vượt quá

---

## Routing

```typescript
// [TODO: Định nghĩa route constants thực tế của dự án]
const routes = {
  home: "/",
  auth: {
    login: "/login",
    register: "/register",
  },
  dashboard: "/dashboard",
};
```

### Phân loại route

- **Public** (không cần auth): [TODO: ví dụ `/`, `/login`, `/register`]
- **Protected** (cần đăng nhập): [TODO: ví dụ `/dashboard`, `/settings`]
- **Role-based**: [TODO: ví dụ `/admin` — chỉ role `admin`]

---

## Environment Variables

```env
# .env.example — [TODO: Điền tất cả biến môi trường thực tế]

# API
VITE_API_BASE_URL=

# App
VITE_APP_NAME=
VITE_APP_VERSION=

# [TODO: Thêm biến khác]
```

---

## Testing Strategy

<!-- OVERRIDES RULES.md — chỉ khi dự án có quy định khác mặc định -->

<!--
  Mặc định từ RULES.md: unit tests BẮT BUỘC, dùng Vitest + React Testing Library.
  Chỉ điền section này nếu dự án có EXCEPTION — ví dụ không cần unit tests, hoặc dùng framework khác.
  Nếu tuân thủ mặc định → XÓA section này đi.
-->

[TODO: Mô tả exception nếu có. Ví dụ: "Dự án này không yêu cầu unit tests — chỉ cần E2E tests với Playwright."]

---

## Deployment

| Environment | Branch    | URL    | Ghi chú               |
| ----------- | --------- | ------ | --------------------- |
| Development | `develop` | [TODO] | Auto-deploy khi merge |
| Staging     | `staging` | [TODO] | Manual trigger        |
| Production  | `main`    | [TODO] | Requires approval     |

### Build & Deploy

```bash
# [TODO: Các lệnh cần thiết]
pnpm build          # Build production
pnpm db:migrate     # Chạy migration (nếu có)
```

### CI/CD

[TODO: Mô tả ngắn pipeline — ví dụ: GitHub Actions, chạy lint + test + build trước khi merge]

---

## Known Constraints & Tech Debt

<!--
  QUAN TRỌNG cho Agent: Những điều agent PHẢI biết trước khi viết code.
  Không có section này, agent sẽ generate code "đúng chuẩn" nhưng conflict với thực tế.
-->

### Constraints hiện tại

[TODO: Ví dụ:]

- Backend chưa có endpoint X → tạm dùng mock data tại `src/mocks/`
- Module Y đang dùng thư viện cũ [tên] vì lý do Z — chưa migrate

### Tech Debt đã biết

[TODO: Ví dụ:]

- `src/features/legacy-module/` — code cũ, chưa refactor, không sửa khi không cần thiết
- API response của endpoint `/orders` không theo `ApiResponse<T>` chuẩn — có wrapper riêng tại `services/orderService.ts`

---

## Agent Quick Reference

<!--
  Bảng lookup đặc thù cho dự án này.
  Override lại bảng mặc định trong RULES.md nếu folder structure khác.
  Agent đọc bảng này TRƯỚC khi tìm file — tiết kiệm vòng lặp.
-->

| Đang tìm                         | Vào đây                             |
| -------------------------------- | ----------------------------------- |
| Auth logic                       | `src/features/auth/`                |
| Route constants                  | `src/constants/routes.constants.ts` |
| API base config                  | `src/lib/axios.ts`                  |
| Global stores                    | `src/stores/`                       |
| i18n keys                        | `src/locales/{lang}/`               |
| Validation schemas               | `src/schemas/`                      |
| Env config                       | `.env.example` + `src/lib/env.ts`   |
| [TODO: thêm nếu có path đặc thù] | [TODO]                              |

---

## Additional Notes

<!--
  Thông tin bổ sung không thuộc section nào ở trên.
  Ví dụ: lý do chọn một thư viện, integration bên thứ ba, quyết định kỹ thuật quan trọng.
-->

[TODO: Thêm nếu cần]
