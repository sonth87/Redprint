# 07 — CSS Scope Isolation & Static HTML/CSS Export

> **Trạng thái:** ✅ Đã hoàn thành  
> **Ưu tiên:** 🟢 P3 (Chất lượng Production & SEO)  
> **Ước lượng:** 3–4 ngày  
> **Phạm vi tác động:** `packages/ui/src/styles/*`, `packages/builder-renderer/src/*`, `apps/website`

---

## 1. Hiện Trạng & Phân Tích Kỹ Thuật

### 1.1. Ô Nhiễm CSS Toàn Cục (Global CSS Collision & Pollution)
- **Hiện tượng:** `packages/ui` và `packages/builder-editor` export file CSS chứa các biến `:root` dùng chung của Tailwind/shadcn:
  ```css
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --border: 214.3 31.8% 91.4%;
  }
  ```
- **Nguy cơ thực tế khi nhúng vào ứng dụng khác (Host App):**
  - Nếu ứng dụng host cũng dùng Tailwind hoặc shadcn (rất phổ biến trong Next.js/Vite SaaS apps), việc nhúng `@ui-builder/builder-editor` hoặc `@ui-builder/builder-renderer` sẽ **ghi đè toàn bộ theme của host app**, làm biến dạng màu sắc của thanh navigation, nút bấm hoặc font chữ của sản phẩm chính.
  - Việc `RuntimeRenderer` chèn thẻ `<style>{ANIMATION_KEYFRAMES_CSS}</style>` trực tiếp vào DOM mà không có namespace cũng có thể làm xáo trộn các animation trùng tên của trang web.

### 1.2. Phụ Thuộc Client-Side Hydration & Điểm Yếu Về SEO
- **Hiện tượng:** Để hiển thị một trang được dựng bởi UI Builder, hiện tại bắt buộc phải nhúng component React `RuntimeRenderer` chạy hoàn toàn trên trình duyệt client.
- **Hệ lụy với Landing Page:**
  1. **SEO & Indexing:** Mặc dù Googlebot có thể render JS, nhưng nhiều bot mạng xã hội (Facebook, Zalo, Twitter OpenGraph scraper) không chạy JavaScript, dẫn đến việc không đọc được nội dung thẻ meta và text tĩnh.
  2. **Core Web Vitals:** Chỉ số **First Contentful Paint (FCP)** và **Largest Contentful Paint (LCP)** bị trễ đáng kể vì trình duyệt phải tải bundle JS, parse React runtime, sau đó mới vẽ nội dung ra màn hình.
  3. Một landing page đạt chuẩn thương mại cần có khả năng **xuất bản ra file HTML/CSS tĩnh thuần túy (Static Export)**, tải cực nhanh mà không cần bất kỳ framework JS nào chạy nền (zero JS runtime cho trang tĩnh).

---

## 2. Hướng Giải Quyết Kỹ Thuật

### 2.1. Đóng Gói CSS Namespace & Scoped Tokens
1. **Tiền tố hóa biến CSS (CSS Variables Prefixing):** Đổi toàn bộ biến trong hệ thống thiết kế từ `--primary` thành `--ub-primary`, `--background` thành `--ub-background`.
2. **Cô lập Scope bằng Container Class:**
   Thay vì khai báo ở `:root`, chuyển toàn bộ biến theme vào class scoped:
   ```css
   .ui-builder-scope,
   [data-ui-builder-theme] {
     --ub-background: 0 0% 100%;
     --ub-foreground: 222.2 84% 4.9%;
     /* ... */
   }
   ```
   Mọi component của editor và renderer đều được bọc trong container mang class `.ui-builder-scope`. Nhờ đó, host app hoàn toàn không bị ảnh hưởng phong cách giao diện.

### 2.2. Xây Dựng Trình Biên Dịch Tĩnh: Static HTML/CSS Compiler
Tạo hàm tiện ích `exportDocumentToStaticHtml` trong `packages/builder-renderer/src/compiler/`:

```ts
export interface StaticExportOptions {
  document: BuilderDocument;
  registry: ComponentRegistry;
  minify?: boolean;
  inlineCss?: boolean;
}

export interface StaticExportResult {
  html: string;        // HTML ngữ nghĩa thuần túy (semantic HTML)
  css: string;         // Stylesheet đã gom nhóm và loại bỏ trùng lặp
  combinedHtml: string;// Trang HTML hoàn chỉnh độc lập sẵn sàng host
}

export function exportDocumentToStaticHtml(options: StaticExportOptions): StaticExportResult {
  // 1. Duyệt cây node đệ quy, chuyển đổi từng BuilderNode thành HTML tag
  // 2. Chuyển đổi toàn bộ StyleConfig thành CSS classes và style rules tối ưu
  // 3. Render các dynamic components (như Grid, Section, Text) thành thẻ chuẩn
  // 4. Sinh mã HTML hoàn chỉnh kèm title, SEO meta tags
}
```

---

## 3. Kế Hoạch Triển Khai Từng Bước

### Bước 1: Namespace hóa CSS trong `packages/ui`
1. Cấu hình Tailwind trong `packages/ui/tailwind.config.js`:
   - Thêm tiền tố `prefix: "ub-"` hoặc bọc các tiện ích vào `@layer ui-builder-utilities`.
2. Cập nhật file `globals.css`:
   - Đổi tên biến sang dạng `--ub-*`.
   - Bọc toàn bộ định nghĩa màu sắc vào `.ui-builder-scope`.

### Bước 2: Bọc Container Scoped trong Editor & Renderer
1. Cập nhật `BuilderEditor.tsx`: Đảm bảo phần tử bọc ngoài cùng luôn có class `ui-builder-scope`.
2. Cập nhật `RuntimeRenderer.tsx`: Bọc toàn bộ cây render trong `<div className="ui-builder-scope">`.

### Bước 3: Hiện thực hóa Static HTML Compiler
1. Tạo thư mục `packages/builder-renderer/src/compiler/`:
   - `StaticStyleCompiler.ts`: Biên dịch `StyleConfig` của từng node thành CSS selector và rules tối ưu, tự động xử lý responsive media queries (`@media (max-width: 768px)`).
   - `StaticNodeCompiler.ts`: Biên dịch node thành chuỗi HTML semantic (thẻ `<section>`, `<nav>`, `<h1>`, `<p>`, `<img>`...).
   - `exportDocumentToStaticHtml.ts`: Hàm xuất bản tổng hợp.
2. Viết unit tests kiểm thử đầu ra:
   - Đảm bảo HTML sinh ra không chứa React synthetic attributes (`data-reactroot`, `react-key`).
   - Đảm bảo hình ảnh có thuộc tính `loading="lazy"`, `decoding="async"`, `srcset`.

### Bước 4: Tích hợp tính năng Export trong Playground
1. Thêm nút "Xuất bản HTML tĩnh" (Export Static HTML) trên thanh công cụ của Playground.
2. Cho phép người dùng tải về file `index.html` độc lập, có thể mở trực tiếp trên trình duyệt mà không cần Node.js hay React server.

---

## 4. Checklist Công Việc Chi Tiết

- [x] Cập nhật `packages/ui/src/styles/globals.css` chuyển toàn bộ biến sang `--ub-*`
- [x] Bọc các biến CSS vào selector `.ui-builder-scope`
- [x] Gán class `.ui-builder-scope` cho root container của `BuilderEditor` và `RuntimeRenderer`
- [x] Kiểm tra tính tương thích: App host nhúng editor không bị đổi màu nền hoặc font
- [x] Tạo `packages/builder-renderer/src/compiler/StaticStyleCompiler.ts`
- [x] Tạo `packages/builder-renderer/src/compiler/StaticNodeCompiler.ts`
- [x] Tạo `packages/builder-renderer/src/compiler/exportDocumentToStaticHtml.ts`
- [x] Viết unit tests cho Static Compiler (kiểm tra cấu trúc HTML, responsive CSS)
- [x] Thêm nút Export HTML tĩnh trong `apps/playground`
- [x] Kiểm tra file HTML xuất ra trên Lighthouse (Target: 100/100 Performance & SEO)

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. Nhúng `BuilderEditor` hoặc `RuntimeRenderer` vào một ứng dụng React bên ngoài không gây biến đổi bất kỳ style nào của ứng dụng host.
2. Hàm `exportDocumentToStaticHtml` tạo ra file HTML/CSS độc lập, hiển thị chính xác 100% so với bản preview trong editor.
3. Trang HTML tĩnh mở trực tiếp trên trình duyệt không báo bất kỳ lỗi console nào, đạt điểm Core Web Vitals tối đa.

---

## 6. Rủi Ro & Kế Hoạch Rollback

- **Rủi ro:** Khi thêm tiền tố `--ub-`, các class tiện ích trong `builder-editor` nếu gọi trực tiếp biến cũ có thể bị mất màu.
- **Khắc phục:** Sử dụng công cụ search & replace toàn diện kiểm tra mọi lần xuất hiện của `--primary`, `--background` trong `packages/*` để đảm bảo chuyển đổi đồng bộ 100%.
