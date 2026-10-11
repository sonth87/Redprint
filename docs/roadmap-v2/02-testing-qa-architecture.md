# 02 — Testing & QA Architecture

> **Trạng thái:** Chưa bắt đầu  
> **Ưu tiên:** 🔴 P0 (Sửa lỗi crash test & regression) + 🟡 P1 (Xây dựng test suite)  
> **Ước lượng:** 3–4 ngày  
> **Phạm vi tác động:** `vitest.config.ts`, `packages/builder-core`, `packages/builder-components`, `packages/builder-react`, `packages/builder-renderer`, `packages/ui`

---

## 1. Hiện Trạng & Phân Tích Nguyên Nhân Gốc Rễ

### 1.1. Lỗ hổng Môi Trường Test (Vitest Node-only Gap)
- **Hiện tượng:** Root [`vitest.config.ts`](file:///Users/skyline/PROJECTS/my-builder/vitest.config.ts) cấu hình:
  ```ts
  test: {
    globals: true,
    environment: "node",
  }
  ```
- **Nguyên nhân & Hệ lụy:**
  - Vì môi trường chỉ là `node`, toàn bộ các bài test cần truy cập DOM (`document`, `window`, `HTMLElement`, `MutationObserver`) đều không thể chạy nếu không có môi trường giả lập.
  - Các developer trước đây đã né tránh việc viết test cho UI components và Renderer vì không có DOM.
  - `packages/builder-components` (chứa toàn bộ 17+ components then chốt của hệ thống) hiện có **0 bài test**.
  - `packages/builder-renderer` (file [`RuntimeRenderer.tsx`](file:///Users/skyline/PROJECTS/my-builder/packages/builder-renderer/src/RuntimeRenderer.tsx) dài **1.557 dòng** xử lý toàn bộ render của production) chỉ có duy nhất **1 file test 21 dòng** test 1 hàm toán tử boolean thuần `shouldHideAfterSubmit`.
  - `packages/builder-react` chỉ có 1 file test cô lập.

### 1.2. Crash ngay lập tức khi chạy `pnpm test` toàn monorepo
- **Hiện tượng:** Lệnh `pnpm test` từ root sập ngay lập tức:
  ```text
  RUN v3.2.4 packages/ui
  No test files found, exiting with code 1
  ELIFECYCLE Test failed.
  ```
- **Nguyên nhân:** Trong `packages/ui/package.json` có script `"test": "vitest run"`. Mặc định của Vitest là trả về mã lỗi 1 nếu không tìm thấy bất kỳ file test nào khớp với mẫu glob, trừ khi được cấu hình cờ `--passWithNoTests`. Việc này khiến Turbo dừng toàn bộ pipeline test song song của các package khác.

### 1.3. Regression Test đang tồn tại trong `packages/builder-core`
- **Hiện tượng:** Test file [`tests/popups/popups.integration.test.ts`](file:///Users/skyline/PROJECTS/my-builder/packages/builder-core/tests/popups/popups.integration.test.ts) bị FAIL ở case:
  ```text
  popup commands > updates modal shell size and offset through popup kindConfig with undo support
  AssertionError: expected { kind: 'modal', size: 'md', …(2) } to match object { kind: 'modal', …(2) }
  - Expected: "maxWidth": "640px"
  + Received: "maxWidth": "100%"
  ```
- **Nguyên nhân:** Khi thực hiện lệnh `UNDO` cho lệnh `UPDATE_POPUP`, giá trị khôi phục của `maxWidth` trong state của popup modal là `"100%"` (do giá trị mặc định được sinh ra khi tạo mới popup với `kind: "modal"` đã bị thay đổi trong một commit trước đó mà không đồng bộ lại assertion trong integration test).

---

## 2. Hướng Giải Quyết Kỹ Thuật

1. **Thiết lập Môi trường Test Linh hoạt (Per-package Environment):**
   - Giữ môi trường mặc định là `node` cho `builder-core` và `apps/api` (tối ưu tốc độ thực thi).
   - Thiết lập môi trường `happy-dom` (hoặc `jsdom`) cho các package frontend: `builder-components`, `builder-react`, `builder-editor`, `builder-renderer`, `ui`.
2. **Khắc phục Crash `packages/ui`:**
   - Cập nhật script test trong `packages/ui/package.json` thành `vitest run --passWithNoTests`.
   - Bổ sung ít nhất 1 smoke test kiểm tra các atomic components (Button, Dialog, Input).
3. **Sửa Regression Test `popups.integration.test.ts`:**
   - Khảo sát schema mặc định của `PopupModalConfig` trong `packages/builder-core/src/popups/types.ts`.
   - Đồng bộ giá trị khởi tạo giữa command handler và test assertion để việc `UNDO` trả về đúng giá trị chuẩn xác.
4. **Xây dựng Test Suite Chiến Lược cho Components & Renderer:**
   - **Tầng Components (`builder-components`):** Viết component rendering tests kiểm tra default props, prop schema validation, và custom CSS class generation cho các core blocks (Button, Section, Grid, Form, Input, Image, NavigationMenu).
   - **Tầng React Adapter (`builder-react`):** Viết integration tests cho `BuilderProvider`, `useBuilder`, `useSelection`, `useDocument`, `NodeRenderer`.
   - **Tầng Production Runtime (`builder-renderer`):** Viết tests cho `RuntimeRenderer` giả lập document schema thật: kiểm tra rendering hierarchy, popup trigger mở/đóng, tương tác toggle visibility, và responsive breakpoint switching.

---

## 3. Kế Hoạch Triển Khai Từng Bước

### Bước 1: Sửa các lỗi khẩn cấp để `pnpm test` xanh (P0)
1. Cập nhật `packages/ui/package.json`:
   ```json
   "scripts": {
     "test": "vitest run --passWithNoTests"
   }
   ```
2. Sửa file `packages/builder-core/tests/popups/popups.integration.test.ts`:
   - Xác minh giá trị `maxWidth` mặc định của `kind: "modal"`.
   - Cập nhật assertion hoặc command payload khởi tạo để test pass hoàn toàn.
3. Chạy `pnpm --filter @ui-builder/builder-core test` để xác nhận 22/22 test files và 265/265 tests của core đều PASS.

### Bước 2: Cài đặt `happy-dom` và cấu hình test environment (P0)
1. Cài đặt `happy-dom` và `@testing-library/react` vào devDependencies:
   ```bash
   pnpm add -w -D happy-dom @testing-library/react @testing-library/jest-dom
   ```
2. Cập nhật cấu hình Vitest trong `vitest.config.ts` hỗ trợ workspace overrides hoặc chỉ định `// @vitest-environment happy-dom` ở đầu các file test UI.

### Bước 3: Viết Test Suite cho `packages/builder-components` (P1)
1. Thêm script `"test": "vitest run"` vào `packages/builder-components/package.json`.
2. Tạo thư mục `packages/builder-components/tests/`:
   - `Section.test.tsx`: Test container background, padding, fluid width, slot containment.
   - `Grid.test.tsx`: Test grid-template-columns, gap, responsive spans.
   - `Button.test.tsx`: Test variant, size, click handlers, link href.
   - `Form.test.tsx` & `Input.test.tsx`: Test field rendering, placeholder, required attribute, name resolution.
   - `Image.test.tsx`: Test src, alt, aspect ratio, frame filters.
   - `NavigationMenu.test.tsx`: Test menu items, anchor links, responsive collapse.

### Bước 4: Viết Test Suite cho `packages/builder-react` (P1)
1. Tạo thư mục `packages/builder-react/tests/`:
   - `BuilderProvider.test.tsx`: Test khởi tạo state, cung cấp context cho các hook con.
   - `useSelection.test.tsx`: Test hook trả về đúng `selectedNodeIds`, cập nhật khi selection changed.
   - `useDocument.test.tsx`: Test hook trả về root node, lookup node theo ID.
   - `NodeRenderer.test.tsx`: Test render cây node đệ quy từ mock document.

### Bước 5: Viết Test Suite cho `packages/builder-renderer` (P1)
1. Tạo thư mục `packages/builder-renderer/tests/`:
   - `RuntimeRenderer.integration.test.tsx`:
     - Render một `BuilderDocument` mẫu gồm 1 Section + 1 Grid + 2 Buttons.
     - Kiểm tra style pipeline sinh đúng inline CSS/class.
     - Kiểm tra việc click vào button có interaction `openPopup` mở đúng popup trong `PopupStack`.
     - Kiểm tra logic `toggleVisibility` ẩn/hiện node trên DOM mà không mutate document gốc.

---

## 4. Checklist Công Việc Chi Tiết

- [x] Sửa script test trong `packages/ui/package.json` với `--passWithNoTests`
- [x] Sửa test case fail trong `packages/builder-core/tests/popups/popups.integration.test.ts`
- [x] Chạy `pnpm --filter @ui-builder/builder-core test` ➔ 100% pass
- [x] Cài đặt `happy-dom` và setup helper cho Vitest DOM
- [x] Cập nhật root `vitest.config.ts` hỗ trợ DOM testing
- [x] Bổ sung script `"test": "vitest run"` vào `packages/builder-components/package.json`
- [x] Viết bộ test `packages/builder-components/tests/Section.test.tsx`
- [x] Viết bộ test `packages/builder-components/tests/Button.test.tsx`
- [x] Viết bộ test `packages/builder-components/tests/Form.test.tsx`
- [x] Viết bộ test `packages/builder-components/tests/Grid.test.tsx`
- [x] Viết bộ test `packages/builder-react/tests/BuilderProvider.test.tsx`
- [x] Viết bộ test `packages/builder-react/tests/NodeRenderer.test.tsx`
- [x] Viết bộ test `packages/builder-renderer/tests/RuntimeRenderer.integration.test.tsx`
- [x] Chạy `pnpm test` toàn workspace ➔ Tất cả các package đều vượt qua test suite

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. Lệnh `pnpm test` chạy thành công trên toàn bộ monorepo (tất cả các package có script test đều pass 100%).
2. Không còn bất kỳ test nào bị fail hoặc bỏ qua do thiếu môi trường DOM.
3. Độ bao phủ kiểm thử (test coverage) của `builder-components` đạt tối thiểu 70% các component cơ bản.
4. `RuntimeRenderer` có integration test xác thực toàn bộ chu trình render document, interaction trigger và popup open/close.

---

## 6. Rủi Ro & Kế Hoạch Rollback

- **Rủi ro:** `happy-dom` có thể thiếu một số API trình duyệt phức tạp (như `IntersectionObserver`, `matchMedia`, `ResizeObserver`).
- **Khắc phục:** Sử dụng mock helper trong `vitest.setup.ts` cho các API này:
  ```ts
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  ```
- **Kế hoạch Rollback:** Nếu một test case phụ thuộc sâu vào browser canvas, cô lập test đó vào file e2e hoặc dùng `@vitest-environment node` cho các test pure-logic.
