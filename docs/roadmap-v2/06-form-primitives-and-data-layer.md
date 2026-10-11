# 06 — Form Primitives & Production Data Layer

> **Trạng thái:** ✅ Đã hoàn thành  
> **Ưu tiên:** 🟢 P3 (Hoàn thiện tính năng sản phẩm cốt lõi)  
> **Ước lượng:** 3–4 ngày  
> **Phạm vi tác động:** `packages/builder-core/src/validation/*`, `packages/builder-components/src/components/*`, `packages/builder-renderer/src/interactions/*`

---

## 1. Hiện Trạng & Phân Tích Khoảng Trống Nghiệp Vụ

### 1.1. Form Primitives Mới Dừng Ở Mức Khung Tĩnh
- **Hiện trạng:** Nhóm tác vụ Form Primitives gần đây đã hoàn thành việc tạo các component căn bản: `Form.tsx`, `Input.tsx`, `Textarea.tsx`, `Checkbox.tsx`, `SelectField.tsx`.
- **Khoảng trống thực tế:**
  1. **Không có Validation Schema linh hoạt:** Hiện tại các input chỉ nhận thuộc tính `required` HTML5 cơ bản. Không thể cấu hình định dạng Email, số điện thoại Việt Nam/Quốc tế, độ dài tối thiểu/tối đa, hoặc thông báo lỗi tùy biến (custom error message).
  2. **Trạng thái Form ở Runtime bị bỏ ngỏ:** Chưa có state machine quản lý vòng đời submit: `idle` ➔ `validating` ➔ `submitting` ➔ `success` / `error`.
  3. **Thiếu cơ chế hiển thị lỗi cho người dùng cuối:** Khi bấm Submit mà dữ liệu sai, form không hiển thị được dòng báo lỗi trực quan dưới chân từng input (Field Error Message).
  4. **Kênh Submit hạn chế:** Landing page trong thực tế đòi hỏi:
     - Gửi dữ liệu về Webhook URL (Make, Zapier, n8n, CRM backend).
     - Điều hướng sang trang cảm ơn (Thank You page).
     - Kích hoạt mở Popup cảm ơn (như Popup chúc mừng đã đăng ký).
  5. **Chống Spam (Spam Protection):** Thiếu cơ chế bẫy bot cơ bản (Honeypot field) hoặc tích hợp Cloudflare Turnstile / reCAPTCHA.

---

## 2. Hướng Giải Quyết Kỹ Thuật

Xây dựng hệ thống Form hoàn chỉnh theo tiêu chuẩn Production Landing Page:

```
┌────────────────────────────────────────────────────────┐
│                   Builder Form Node                    │
│   (Props: actionType, webhookUrl, redirectUrl, rules)  │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
   [Editor Configuration]       [Runtime Controller]
    - Field name inspector       - Form State: values, errors
    - Validation rule builder    - Pure validator engine
    - Submit action selector     - Anti-spam Honeypot
                                 - Webhook POST / Host Bridge
                                 - Success/Error Feedback UI
```

### 2.1. Pure Validation Engine trong `builder-core`
Tạo `packages/builder-core/src/validation/formValidator.ts` (không dính DOM, pure logic):
```ts
export interface FieldValidationRule {
  type: "required" | "email" | "phone" | "regex" | "minLength" | "maxLength";
  value?: string | number;
  message: string;
}

export function validateFormFields(
  values: Record<string, unknown>,
  rules: Record<string, FieldValidationRule[]>
): Record<string, string> {
  // Trả về map { [fieldName]: errorMessage }
}
```

### 2.2. Trạng Thái Form Runtime (`FormController`)
Tại `packages/builder-renderer`:
- Khi render component `Form`, bao bọc các trường input bên trong một `FormRuntimeContext`.
- Quản lý các biến trạng thái: `values`, `errors`, `touched`, `isSubmitting`, `submitStatus`.
- Khi người dùng `blur` khỏi input hoặc bấm nút `Submit`:
  - Kích hoạt validator kiểm tra lỗi.
  - Nếu có lỗi: tự động cuộn (scroll) tới trường lỗi đầu tiên và hiển thị `error-label` màu đỏ.
  - Nếu hợp lệ: thực thi action tương ứng:
    - `webhook`: Gửi POST request dạng `application/json` đến URL được cấu hình kèm timeout và retry.
    - `emit`: Gửi event thông qua `onFormSubmit` lên ứng dụng host.
    - `redirect`: Chuyển hướng trình duyệt sang URL cảm ơn.
    - `openPopup`: Tự động gọi `openPopup(successPopupId)` để hiển thị dialog cảm ơn.

### 2.3. Bổ Sung Cơ Chế Chống Bot (Honeypot Protection)
- Tự động chèn một trường ẩn không nhìn thấy bằng mắt thường: `<input type="text" name="_hp_company_field" style="display:none" tabIndex={-1} />`.
- Nếu bot tự động điền vào trường này, form sẽ âm thầm drop submission mà không gửi về server.

---

## 3. Kế Hoạch Triển Khai Từng Bước

### Bước 1: Mở rộng PropSchema cho Form & Input
1. Cập nhật `packages/builder-components/src/components/Form.tsx`:
   - Thêm cấu hình `submitAction`: `"emit" | "webhook" | "redirect" | "openPopup"`.
   - Thêm `webhookUrl?: string`, `redirectUrl?: string`, `successPopupId?: string`.
2. Cập nhật `Input.tsx`, `Textarea.tsx`, `SelectField.tsx`:
   - Bổ sung cấu hình `validationRules: FieldValidationRule[]`.
   - Bổ sung prop `errorMessage?: string` hiển thị khi form có lỗi.

### Bước 2: Hiện thực hóa Pure Validator trong `builder-core`
1. Viết `packages/builder-core/src/validation/formValidator.ts`.
2. Viết unit tests toàn diện trong `packages/builder-core/tests/validation/formValidator.test.ts`:
   - Kiểm tra validate email hợp lệ/không hợp lệ.
   - Kiểm tra số điện thoại, độ dài min/max, custom regex.

### Bước 3: Nâng cấp Runtime Controller trong `builder-renderer`
1. Tạo component `packages/builder-renderer/src/interactions/FormController.tsx`.
2. Xử lý logic gửi webhook an toàn (chống CORS leak, bẫy lỗi HTTP 4xx/5xx).
3. Kết nối liên thông với hệ thống Popup: submit form thành công ➔ tự động kích hoạt `openPopup("thank-you-popup")` và xóa trắng form.

### Bước 4: Nâng cấp Inspector Panel trong Editor
1. Tại `packages/builder-editor/src/panels/right/PropertyPanel.tsx`:
   - Bổ sung tab cấu hình "Hành động gửi form" (Form Submission Settings).
   - Cho phép chọn popup thành công từ danh sách popup hiện có của document.

---

## 4. Checklist Công Việc Chi Tiết

- [x] Tạo `packages/builder-core/src/validation/formValidator.ts`
- [x] Viết unit tests cho `formValidator.ts` đạt 100% test coverage
- [x] Cập nhật schema của `Form`, `Input`, `Textarea`, `SelectField`
- [x] Xây dựng `FormRuntimeContext` & pipeline trong `builder-components` và `builder-renderer`
- [x] Bổ sung cơ chế Honeypot field chống spam
- [x] Hỗ trợ hành động `openPopup` sau khi submit thành công
- [x] Hỗ trợ gửi dữ liệu qua Webhook URL kèm xử lý lỗi mạng
- [x] Hiển thị thông báo lỗi trực quan (Field Error Label) dưới chân từng input
- [x] Cập nhật giao diện PropertyPanel cho Form trong editor
- [x] Viết integration test cho toàn bộ luồng: Nhập liệu sai ➔ Báo lỗi ➔ Sửa đúng ➔ Submit thành công ➔ Mở popup

---

## 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. Người dùng có thể kéo một Form vào trang, thiết lập trường Email là bắt buộc, nhập sai định dạng ➔ Hiển thị thông báo lỗi chính xác khi submit.
2. Form hỗ trợ gửi dữ liệu tới một Webhook test (như webhook.site) nhận đủ payload JSON của các trường.
3. Khi submit thành công, nếu cấu hình mở popup thành công ➔ Popup tương ứng được hiển thị mượt mà.
4. Trường Honeypot chặn thành công spam submission.

---

## 6. Rủi Ro & Kế Hoạch Rollback

- **Rủi ro:** Khi gửi webhook từ trình duyệt, có thể gặp lỗi CORS nếu server đích không cho phép gọi cross-origin.
- **Khắc phục:** Bổ sung hướng dẫn người dùng về cấu hình CORS header cho webhook server, hoặc cung cấp fallback gửi qua proxy của host application (`onFormSubmit`).
