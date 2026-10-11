# 01 — Monorepo Build, Packaging & Dependencies

> **Trạng thái:** Chưa bắt đầu  
> **Ưu tiên:** 🔴 P0 (Khẩn cấp — Chặn toàn bộ quy trình CI/CD và Build)  
> **Ước lượng:** 1 ngày  
> **Phạm vi tác động:** `packages/builder-presets`, `packages/ui`, `packages/shared`, `packages/builder-components`, `packages/builder-editor`, `apps/website`, `apps/playground`

---

## 1. Hiện Trạng & Phân Tích Nguyên Nhân Gốc Rễ

### 1.1. Lỗi Build gãy tại `@ui-builder/builder-presets`
- **Hiện tượng:** Chạy `pnpm run build` gặp lỗi:
  ```text
  ✘ [ERROR] Could not resolve "uuid"
      src/components/SlotOverlays.tsx:6:29:
        6 │ import { v4 as uuidv4 } from "uuid";
  ```
- **Nguyên nhân:** File `packages/builder-presets/src/components/SlotOverlays.tsx` nhập hàm `uuidv4` từ package `uuid`, nhưng trong `packages/builder-presets/package.json` trường `dependencies` hoàn toàn không có `uuid`. Tsup/esbuild khi đóng gói không thể resolve module này.

### 1.2. Sai thứ tự Export Conditions trong các `package.json`
- **Hiện tượng:** Bundler tsup và esbuild in hàng loạt cảnh báo khi build:
  ```text
  ▲ [WARNING] The condition "types" here will never be used as it comes after both "import" and "require" [package.json]
      14 │ "types": "./dist/index.d.ts"
  ```
- **Nguyên nhân:** Các package (`shared`, `ui`, `builder-components`, `builder-editor`, `builder-presets`) đều cấu hình trường `exports` theo định dạng:
  ```json
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
  ```
  Theo đặc tả Node.js Subpath Exports và TypeScript NodeNext/Node16 resolution: Các điều kiện (`conditions`) được quét từ trên xuống dưới. Vì `"import"` và `"require"` khớp trước, trình biên dịch TypeScript sẽ không bao giờ duyệt tới `"types"`, dẫn đến việc người dùng ngoài monorepo khi cài đặt gói sẽ bị báo thiếu type declarations hoặc sai fallback.

### 1.3. Tồn dư file khóa ngoài luồng (`package-lock.json`)
- **Hiện tượng:** Trong thư mục `apps/website/` tồn tại file `package-lock.json` dung lượng 228KB.
- **Nguyên nhân:** Thành viên nhóm hoặc script đã chạy lệnh `npm install` thay vì `pnpm install` bên trong app này. Điều này phá vỡ tính nhất quán của pnpm workspace và có thể gây phân mảnh node_modules.

### 1.4. Tài nguyên tĩnh kích thước lớn lưu trữ trực tiếp trong repo
- **Hiện tượng:** File `apps/playground/figma-response.json` dung lượng 2.3MB được commit trực tiếp vào git.
- **Nguyên nhân:** Dùng làm mock fixture thử nghiệm cho tính năng Figma Import, nhưng không được nén hoặc chuyển vào thư mục test fixture phù hợp, gây nặng dung lượng clone repository.

---

## 2. Hướng Giải Quyết Kỹ Thuật

1. **Khắc phục Dependency `uuid`:** Bổ sung `uuid` (`^11.0.0`) vào `dependencies` và `@types/uuid` (`^10.0.0`) vào `devDependencies` của `packages/builder-presets`.
2. **Chuẩn hóa Export Conditions:** Cập nhật thứ tự các key trong `exports` của tất cả các package: `"types"` bắt buộc phải đứng **đầu tiên** trước `"import"` và `"require"`.
   ```json
   "exports": {
     ".": {
       "types": "./dist/index.d.ts",
       "import": "./dist/index.js",
       "require": "./dist/index.cjs"
     }
   }
   ```
3. **Thanh lọc Lockfile & Workspace Clean:**
   - Xóa bỏ hoàn toàn `apps/website/package-lock.json`.
   - Bổ sung quy tắc trong `.gitignore` chặn mọi file `package-lock.json` và `yarn.lock` trong monorepo.
4. **Tối ưu Fixture Figma:**
   - Chuyển `apps/playground/figma-response.json` vào `apps/playground/src/fixtures/figma/` hoặc nén thành fixture nhỏ gọn (chỉ giữ lại các frame mẫu đại diện < 200KB).

---

## 3. Kế Hoạch Triển Khai Từng Bước

### Bước 1: Vá dependency cho `packages/builder-presets`
- Chỉnh sửa `packages/builder-presets/package.json`:
  - Thêm `"uuid": "^11.0.0"` vào `dependencies`.
  - Thêm `"@types/uuid": "^10.0.0"` vào `devDependencies`.
- Chạy `pnpm install` từ root để liên kết package.

### Bước 2: Chuẩn hóa export map cho 5 packages
- Cập nhật `package.json` cho:
  - `packages/shared/package.json`
  - `packages/ui/package.json`
  - `packages/builder-components/package.json`
  - `packages/builder-editor/package.json`
  - `packages/builder-presets/package.json`
- Kiểm tra các subpath exports đặc thù (như `./styles` trong `ui` và `builder-editor`) đảm bảo đúng đường dẫn phân phối.

### Bước 3: Dọn dẹp lockfiles và mock data
- Xóa `apps/website/package-lock.json`.
- Cập nhật root `.gitignore`:
  ```gitignore
  package-lock.json
  yarn.lock
  ```
- Rút gọn `apps/playground/figma-response.json` thành fixture phục vụ test mock gọn nhẹ, loại bỏ các payload rác không cần thiết.

### Bước 4: Kiểm tra xác thực quy trình Build
- Chạy `pnpm run clean` để dọn các thư mục `dist`.
- Chạy `pnpm run build` toàn workspace để xác thực tất cả 8 packages và 4 apps build thành công sạch sẽ (exit code 0, không có warning về types condition).

---

## 4. Checklist Công Việc Chi Tiết

- [x] `packages/builder-presets/package.json`: Thêm `uuid` và `@types/uuid`
- [x] Chạy `pnpm install` cập nhật `pnpm-lock.yaml`
- [x] `packages/shared/package.json`: Đổi vị trí `"types"` lên đầu trong `exports`
- [x] `packages/ui/package.json`: Đổi vị trí `"types"` lên đầu trong `exports`
- [x] `packages/builder-components/package.json`: Đổi vị trí `"types"` lên đầu trong `exports`
- [x] `packages/builder-editor/package.json`: Đổi vị trí `"types"` lên đầu trong `exports`
- [x] `packages/builder-presets/package.json`: Đổi vị trí `"types"` lên đầu trong `exports`
- [x] Xóa `apps/website/package-lock.json`
- [x] Bổ sung chặn `package-lock.json` trong `.gitignore`
- [x] Rút gọn hoặc nén fixture `apps/playground/figma-response.json`
- [x] Kiểm tra lệnh `pnpm run build` chạy thành công toàn bộ không lỗi

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. Lệnh `pnpm run build` thực thi hoàn tất với exit code 0 trên toàn bộ workspace.
2. Không còn cảnh báo `The condition "types" here will never be used` trong output của tsup/esbuild.
3. Không tồn tại file `package-lock.json` trong bất kỳ thư mục con nào của monorepo.
4. Kiểm tra gói sau khi build: `packages/builder-presets/dist/index.d.ts` và `index.js` được tạo đầy đủ.

---

## 6. Rủi Ro & Kế Hoạch Rollback

- **Rủi ro:** Khi đổi thứ tự `"types"` lên đầu, một số bundler cổ điển có thể cần kiểm tra độ tương thích.
- **Kế hoạch Rollback:** Chuẩn `"types"` đứng đầu là chuẩn chính thức của TypeScript (TS 4.7+ và Node.js spec). Nếu phát sinh vấn đề cục bộ, git revert commit tương ứng và kiểm tra lại tsconfig target của package đó.
