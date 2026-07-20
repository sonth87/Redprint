# 03/06 — Section types mới: form/lead, video, logo-strip, team, contact

> Phân loại: Bổ sung mới (AI planning)
> Ưu tiên: P5
> Ước lượng: 2 ngày
> Phụ thuộc: [03/04](./04-form-primitives.md) (form section cần Form component); [03/05](./05-wave2-components.md) từng phần (video/logo-strip tốt hơn khi có component tương ứng nhưng có fallback)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Planner hiện chỉ biết 14 section type — thiếu các section quyết định chuyển đổi và niềm tin của landing thật:
khối thu lead (form), video giới thiệu, dải logo đối tác, đội ngũ, liên hệ/bản đồ. Bổ sung để plan ra
trang "đầy đủ tính năng của 1 landing thông thường".

## 2. Hiện trạng & lý do

- `SECTION_TYPES` (`apps/api/src/services/page-plan-generator.ts:20-35`):
  header, hero, services, features, trust, process, stats, gallery, testimonials, pricing, faq, cta, footer, custom.
- `PAGE_PATTERNS` không thể yêu cầu form vì không có type; goal `collect_leads` hiện chỉ ra CTA button —
  không có nơi thu lead thật trên trang.
- `sectionPriority` (ai.routes.ts:54-58), `defaultSection`, `candidateComponentsForSection`,
  `sectionSpacing`, `sectionBackground`, quality-gate… đều switch theo type → mỗi type mới phải chạm đủ các điểm này
  (checklist bên dưới để không sót).

## 3. Cách làm

### 3.1 Type mới & định nghĩa
| Type | Purpose mặc định | Layout mặc định | Component ưu tiên |
|------|------------------|-----------------|-------------------|
| `form` | Thu lead/đăng ký/liên hệ nhanh | 2 cột: copy + form card (variant: centered-card) | Form, Input, Textarea, Button |
| `video` | Demo/giới thiệu bằng video | centered 16:9 + heading | Video (fallback: Image + nút giả play → link) |
| `logo-strip` | Social proof đối tác/khách hàng | 1 hàng logo grayscale | LogoStrip (fallback: Grid + Image nhỏ) |
| `team` | Đội ngũ/người sáng lập | grid card ảnh + tên + vai trò | Grid + Image + Text (không cần component mới) |
| `contact` | Địa chỉ, giờ mở cửa, bản đồ, form ngắn | 2 cột: info + map/form | MapEmbed, Form (fallback: Text info) |

### 3.2 Checklist tích hợp cho MỖI type (template dùng lại về sau)
1. Thêm vào `SECTION_TYPES` + `PageSectionType` (server + client types).
2. `defaultSection`: title/purpose/layoutIntent mặc định (2 locale qua content pack [02/02](../02-ai-generation/02-industry-content-packs.md)).
3. `PAGE_PATTERNS`: cắm vào pattern phù hợp —
   - `collect_leads`/local-service: `form` **required**, đặt trước footer (thay vị trí cta hoặc sau cta);
   - saas: `logo-strip` recommended sau hero, `video` recommended;
   - portfolio: `team` recommended; mọi pattern: `contact` recommended thay/bổ sung footer khi prompt nhắc địa chỉ.
4. `sectionPriority` (thứ tự generate ưu tiên): form ngay sau hero (khối chuyển đổi quan trọng).
5. `candidateComponentsForSection` / sectionAffinity mapping.
6. Compiler: variant + fallback pack content cho type mới ([02/05](../02-ai-generation/05-layout-variety.md) bảng variant; fallback không phụ thuộc LLM).
7. Section prompt rules: item counts (form: 3–5 field đề xuất theo goal; team: 3–4 người, tên **giả rõ ràng**).
8. Client `PageGeneratorModal` outline icon/label cho type mới; i18n.
9. Quality gate: `empty_section`/`missing_mobile_font` áp dụng chung; thêm check `form_without_submit`.
10. Test: plan schema nhận type mới; pattern collect_leads sinh form section; fallback compile đủ node.

### 3.3 Nội dung nhạy cảm
- `team`: LLM không được bịa người thật — rule "use clearly fictional placeholder names, mark avatar as placeholder".
- `contact`: địa chỉ/điện thoại từ prompt nếu user cung cấp; không thì placeholder rõ ràng ("123 Đường ABC…")
  — quality gate **không** block placeholder cho riêng field địa chỉ contact (whitelist theo section type).

## 4. Hướng thiết kế

- Mở rộng bằng **enum + checklist** (10 điểm chạm là hiện thực của codebase hôm nay). Việc dài hạn
  "section type registry" data-driven chỉ đáng làm nếu type vượt ~25 — chưa cần, ghi backlog.
- `form` là type riêng thay vì biến thể của `cta` — vì priority, content model (fields) và quality gate khác hẳn.

## 5. Kết quả mong muốn

- [ ] Prompt "trang thu đăng ký khoá học yoga" (collect_leads) → trang có form section hoạt động, đặt trên footer.
- [ ] Prompt SaaS → logo-strip xuất hiện sau hero khi component available; không có → fallback grid logo im lặng.
- [ ] Plan không bao giờ sinh `form` khi Form component không available (candidate check) — hạ về `cta`.
- [ ] 14→19 type, tất cả điểm chạm có test đi kèm (checklist item 10).

## 6. Tình huống có thể xảy ra & corner cases

- **Form component chưa deploy nhưng type đã có** → normalizePagePlan thay `form` bằng `cta` khi
  `Form ∉ availableComponents` (guard trong normalize, có test).
- **LLM cũ (prompt cache) trả type cũ** → schema vẫn nhận type cũ, không breaking.
- **User prompt "không cần form"** → planner rule tôn trọng negation (thêm 1 câu vào planner rules);
  pattern required chỉ là mặc định, normalize không cưỡng chế khi brief nói ngược — sửa `normalizePagePlan`
  nhận `excludedTypes` từ brief (LLM điền).
- **2 form trên trang** (form + contact có form) → cho phép nhưng quality gate warn `duplicate_form`;
  compiler contact dùng form rút gọn (2 field).
- **Webhook chưa cấu hình khi generate** → Form sinh với `submitAction: "none"` + editor hint "Cấu hình nơi nhận
  dữ liệu trong Property panel" — không bao giờ sinh webhookUrl bịa.

## 7. Rủi ro & rollback

Thấp-trung bình: diện chạm rộng nhưng mỗi điểm nhỏ; enum mới không phá document cũ (section type chỉ tồn tại
trong plan, không lưu vào document). Rollback per-type: rút khỏi SECTION_TYPES là planner không sinh nữa.
