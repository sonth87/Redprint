# 03 — Architectural Alignment & Documentation Standardization

> **Trạng thái:** Chưa bắt đầu  
> **Ưu tiên:** 🟡 P1 (Chuẩn hóa kiến trúc & tài liệu)  
> **Ước lượng:** 1 ngày  
> **Phạm vi tác động:** `README.md`, `.claude/ARCHITECTURE.md`, `.claude/RULES.md`, `.claude.vi/*`, `packages/builder-core/package.json`, `packages/builder-components/package.json`

---

## 1. Hiện Trạng & Phân Tích Sự Bất Nhất Kiến Trúc

### 1.1. Cam kết "Zero Runtime Dependencies" vs Thực tế
- **Trong tài liệu (`README.md`, line 45):**  
  *"Key Constraint: builder-core has zero runtime dependencies."*
- **Trong mã nguồn thực tế (`packages/builder-core/package.json`):**  
  Phụ thuộc trực tiếp vào `zod` (`^3.24.0`) và `uuid` (`^11.0.0`).
- **Phân tích:** `zod` là thư viện schema validation phục vụ validate document/node, còn `uuid` sinh ID duy nhất cho các node trong command. Đây là các thư viện tiện ích logic thuần (pure JS), hoàn toàn không phụ thuộc vào DOM hay Node.js runtime. Tuy nhiên, việc ghi "zero runtime dependencies" là sai sự thật kỹ thuật, gây tranh cãi khi audit code.

### 1.2. Mâu thuẫn ranh giới Framework của `builder-components`
- **Trong tài liệu (`ARCHITECTURE.md`, line 129 & 148):**  
  *"builder-components depends on builder-core only (NO React/DOM in runtime)"*  
  *"builder-components depends ONLY on builder-core — no DOM or browser APIs in component logic"*
- **Trong mã nguồn thực tế:**  
  `packages/builder-components` chứa các file `.tsx` render React JSX, phụ thuộc vào `@types/react`, `lucide-react`, `swiper`, `dompurify`, và khai báo `peerDependencies: react >= 18`.
- **Phân tích:** Ban đầu nhóm kiến trúc dự định tách định nghĩa component (`ComponentDefinition` thuần schema) khỏi React view. Nhưng trong quá trình hiện thực hóa, để đạt tốc độ phát triển nhanh, toàn bộ 17+ components đã được viết trực tiếp dưới dạng React Functional Components. Việc tài liệu giữ nguyên nhận định cũ khiến các AI Agent và lập trình viên mới bối rối về ranh giới phụ thuộc.

---

## 2. Hướng Giải Quyết Kỹ Thuật

Chuẩn hóa lại mô hình phân tầng kiến trúc chính thức và cập nhật đồng bộ toàn bộ tài liệu:

```
┌─────────────────────────────────────────────────────────────┐
│                    Consumer Application                     │
├─────────────────────────────────────────────────────────────┤
│  @ui-builder/builder-editor  │  @ui-builder/builder-renderer │
│       (Visual Editor)        │      (Production Runtime)    │
├──────────────────────────────┴──────────────────────────────┤
│                 @ui-builder/builder-presets                 │
│         (Component Catalog & Preset Configuration)          │
├─────────────────────────────────────────────────────────────┤
│                @ui-builder/builder-components               │
│          (Official React Component Implementations)         │
├─────────────────────────────────────────────────────────────┤
│                  @ui-builder/builder-react                  │
│             (React Adapter: Context, Hooks, Wire)           │
├─────────────────────────────────────────────────────────────┤
│                  @ui-builder/builder-core                   │
│   (Headless Engine: State, Commands, History, Events, Zod)  │
└─────────────────────────────────────────────────────────────┘
```

### Định Nghĩa Lại Các Ranh Giới (Formal Architectural Contracts):
1. **`@ui-builder/builder-core` (Headless Engine)**:
   - **Bản chất:** Framework-agnostic (Chạy được trong Node.js, WebWorker, mọi framework JS).
   - **Ràng buộc:** Tuyệt đối KHÔNG có React, DOM (`document`, `window`), hay browser-specific API.
   - **Phụ thuộc:** Chỉ cho phép các thư viện pure JS/TS logic không dính DOM (hiện tại: `zod` cho schema và `uuid` cho ID generation). Sửa tài liệu từ *"zero runtime dependencies"* thành *"zero DOM & browser dependencies"*.
2. **`@ui-builder/builder-react` (React Adapter)**:
   - Cung cấp cầu nối giữa `builder-core` và React (`BuilderProvider`, `useBuilder`, `useSelection`, `useDocument`, `NodeRenderer`).
3. **`@ui-builder/builder-components` (React Component Suite)**:
   - Là **bộ triển khai React chính thức (Official React Built-ins)** của 17+ components.
   - Phụ thuộc vào `builder-core`, `react`, và các thư viện UI bổ trợ (`swiper`, `lucide-react`, `dompurify`).
   - Xóa bỏ phát biểu không đúng *"NO React in runtime"* trong tài liệu.

---

## 3. Kế Hoạch Triển Khai Từng Bước

### Bước 1: Cập nhật tài liệu kiến trúc chính thức
1. Chỉnh sửa [`README.md`](file:///Users/skyline/PROJECTS/my-builder/README.md):
   - Cập nhật bảng so sánh các package: nêu rõ `builder-components` là bộ component React dựng sẵn.
   - Sửa ghi chú về `builder-core`: *"Zero DOM / browser API dependencies (Pure headless logic)"*.
2. Chỉnh sửa [`.claude/ARCHITECTURE.md`](file:///Users/skyline/PROJECTS/my-builder/.claude/ARCHITECTURE.md):
   - Cập nhật mục **Package Dependency Rules**:
     ```text
     builder-core           ← pure headless logic (zod, uuid) - NO React/DOM
     builder-react          ← depends on builder-core + React peer dependency
     builder-components     ← official React components (depends on builder-core + React)
     builder-presets        ← depends on builder-core, builder-react, builder-components, builder-renderer
     builder-editor         ← visual editor application/package
     builder-renderer       ← production runtime renderer
     ```
   - Cập nhật changelog lên phiên bản kiến trúc `v2.1`.
3. Cập nhật bản dịch tiếng Việt tại `.claude.vi/ARCHITECTURE.md` và `.claude.vi/RULES.md`.

### Bước 2: Rà soát và khóa lỏng lẻo trong Codebase
1. Kiểm tra toàn bộ imports trong `packages/builder-core`:
   - Đảm bảo không có bất kỳ dòng `import ... from "react"` hoặc truy cập trực tiếp `window.` / `document.`.
   - Thêm quy tắc ESLint cấm import React trong `builder-core`:
     ```js
     // packages/builder-core/eslint config
     "no-restricted-imports": ["error", { "paths": ["react", "react-dom"] }]
     ```

---

## 4. Checklist Công Việc Chi Tiết

- [x] `README.md`: Sửa mô tả về `builder-core` và `builder-components`
- [x] `.claude/ARCHITECTURE.md`: Đồng bộ bảng phân tầng package và xóa bỏ ràng buộc sai thực tế
- [x] `.claude/RULES.md`: Xác nhận quy tắc kiểm soát phụ thuộc cho core
- [x] `.claude.vi/ARCHITECTURE.md`: Đồng bộ bản dịch tiếng Việt
- [x] `packages/builder-core`: Quét mã nguồn kiểm tra 100% không có React/DOM leak
- [x] Bổ sung eslint rule cấm import React/DOM trong `packages/builder-core`

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. Tài liệu và mã nguồn thực tế khớp nhau 100% về vai trò, phụ thuộc và trách nhiệm của từng package.
2. AI Agent và lập trình viên khi đọc `README.md` và `ARCHITECTURE.md` nắm bắt chính xác: `builder-core` là headless logic, `builder-components` là React UI components.
3. Không có bất kỳ cảnh báo hoặc lỗi lint nào trong `builder-core` liên quan đến React/DOM.

---

## 6. Rủi Ro & Kế Hoạch Rollback

- Không có rủi ro về mặt logic runtime vì đây là công việc chuẩn hóa tài liệu và khóa quy tắc tĩnh (linting).
- Có thể rollback tài liệu bằng git commit nếu cần điều chỉnh câu chữ.
