# 03/04 — Form primitives: Form, Input, Textarea, Select, Checkbox

> Phân loại: Bổ sung mới (lỗ hổng lớn nhất của bộ component)
> Ưu tiên: P5 (cao nhất trong nhóm component mới)
> Ước lượng: 4–5 ngày
> Phụ thuộc: [03/01](./01-ai-hints.md)+[03/02](./02-generic-adapter.md) nên có trước để form components sinh ra đã "AI-ready"; [01/01](../01-interactions-events/01-runtime-dead-actions.md) (triggerApi/submit)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Landing page tồn tại để **chuyển đổi** — thu lead, đăng ký, liên hệ. Builder hiện không có một input nào:
không thể làm form liên hệ, không thể làm popup lead-capture đúng nghĩa (popup templates hiện chỉ có nút/link).
Đây là khối chức năng bắt buộc trước khi nói đến "đầy đủ tính năng của 1 landing thông thường".

## 2. Hiện trạng & lý do

- 21 component đăng ký (builder-components/src/index.ts) — 0 form element.
- `InteractionTrigger` có `submit`/`change` và binder map `onSubmit`/`onChange` — hạ tầng event chờ sẵn nhưng
  không có component nào phát các event này.
- Popup system có goal type `"submit"` (`PopupGoal` — popups.ts:207) và analytics `popup_submit` — cũng đang chờ form.

## 3. Cách làm

### 3.1 Component set (package builder-components)
| Component | Vai trò | Props chính |
|-----------|---------|-------------|
| `Form` | container, phát submit | `submitAction: "webhook"\|"emit"\|"none"`, `webhookUrl`, `method`, `successMessage`, `errorMessage`, `resetOnSuccess` |
| `Input` | text/email/tel/number/date | `name` (bắt buộc), `inputType`, `label`, `placeholder`, `required`, `pattern?` |
| `Textarea` | văn bản dài | `name`, `label`, `placeholder`, `rows`, `required` |
| `SelectField` | dropdown | `name`, `label`, `options: {value,label}[]`, `required` (tên tránh đụng Select của packages/ui) |
| `Checkbox` | đồng ý/opt-in | `name`, `label` (richtext — link điều khoản), `required` |

- `Form` là container (`canContainChildren`, allowedChildTypes không giới hạn — cho phép Text/Button xen giữa);
  nút submit = `Button` thường đặt trong Form với prop mới `buttonType: "button"|"submit"` (default button —
  không phá Button hiện có).
- Style: theo design-token pipeline như component khác; trạng thái error/focus styling qua props đơn giản v1.

### 3.2 Runtime submit pipeline (builder-renderer)
1. `Form.runtimeRenderer` render `<form onSubmit>`: preventDefault → `new FormData(formEl)` → validate
   (required/pattern — dùng HTML5 validity trước, `reportValidity()`) →
2. theo `submitAction`:
   - `webhook`: POST JSON `{fields, meta: {pageUrl, timestamp}}` tới `webhookUrl` (qua guard scheme/private-IP
     như triggerApi [01/01](../01-interactions-events/01-runtime-dead-actions.md)); state máy `idle→submitting→success|error`; hiển thị success/errorMessage
     (thay nội dung form hoặc dưới nút — prop `successBehavior: "message"|"replace"|"none"`).
   - `emit`: `config.onFormSubmit?.(formName, fields)` — host app tự xử (thêm callback vào RendererConfig).
   - `none`: chỉ chạy interactions.
3. Sau submit thành công: chạy interactions trigger `submit` của node Form (đã bind sẵn — chú ý thứ tự:
   pipeline nội bộ trước, interactions sau); nếu form nằm trong popup → phát goal `popup_submit`
   (renderer đã có analytics emitter — nối `hideAfterSubmit` rule sẵn có của popup).
4. Editor mode: form không submit thật (chặn trong editor renderer), input hiển thị placeholder tĩnh.

### 3.3 AI awareness
- `aiHints` đầy đủ cho 5 component (`sectionAffinity: ["form","cta","footer"]`, contentSlots label/placeholder).
- Section type `form` mới → [03/06](./06-new-section-types.md); compiler adapter tay cho Form section (form là cấu trúc cha-con,
  generic adapter v1 không dựng children — xem giới hạn ở [03/02](./02-generic-adapter.md)).
- Popup template "Lead capture" mới trong `defaultPopupTemplates` + server `popup-templates.json` dùng Form thật.

### 3.4 Kiểm thử
- Unit: FormData thu đúng name/value từng field type; required chặn submit; webhook fail → error state.
- E2E playground: form 4 field + webhook mock; submit trong popup có `hideAfterSubmit` → popup đóng + analytics event.
- A11y: label gắn `htmlFor`, `aria-invalid`, focus ring — theo chuẩn ACCESSIBILITY.md hiện có.

## 4. Hướng thiết kế

- **Webhook-first, không backend form service**: builder là library — nơi nhận data là việc của người nhúng.
  `emit` callback là escape hatch cho CMS host. (Backend form storage = sản phẩm riêng, ngoài phạm vi.)
- `name` là khoá dữ liệu — editor cảnh báo trùng `name` trong cùng Form (validate khi save, DocumentValidator).
- Không kéo react-hook-form/zod vào runtime bundle — HTML5 validation + code tay đủ cho v1 (giữ bundle nhẹ).

## 5. Kết quả mong muốn

- [ ] Dựng form liên hệ hoàn chỉnh bằng kéo-thả, submit tới webhook.site nhận đúng JSON.
- [ ] Popup lead-capture từ template mới hoạt động end-to-end (mở bằng click → điền → submit → đóng + goal event).
- [ ] AI generate trang `collect_leads` chứa form section dùng được ngay ([03/06](./06-new-section-types.md) + [04/04](../04-popup-modal/04-ai-popup-generation.md)).
- [ ] SSR không vỡ (form render tĩnh, hydrate gắn handler).

## 6. Tình huống có thể xảy ra & corner cases

- **CORS webhook** → docs hướng dẫn; error state hiển thị rõ "Không gửi được".
- **Double submit** → disable nút khi `submitting`; idempotency là việc của endpoint.
- **Form lồng Form** → cấm qua `disallowedChildTypes: ["Form"]` (HTML cũng cấm).
- **Input nằm ngoài Form** → render được (standalone), submit không ai thu; editor hint nhẹ "Input nên nằm trong Form".
- **Sensitive data** (password): không làm `inputType: password` v1 — landing không cần, tránh rủi ro lưu/log.
- **Spam/bot** → v1 honeypot field ẩn (prop `honeypot: true` trên Form, tự thêm input ẩn, có giá trị → drop);
  captcha là tích hợp tương lai.
- **Repeater chứa Input** → name trùng giữa bản sao → FormData thành mảng; hành vi chuẩn HTML, ghi docs.

## 7. Rủi ro & rollback

Trung bình: component mới thuần cộng thêm (không đụng schema cũ), rủi ro tập trung ở submit pipeline
(bảo mật URL + trạng thái). Ship theo 2 PR: components+editor trước (submitAction none), pipeline webhook sau.
