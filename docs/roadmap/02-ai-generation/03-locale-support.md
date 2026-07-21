# 02/03 — Locale end-to-end cho AI generation

> Phân loại: Bug fix / Cải tiến
> Ưu tiên: P3
> Ước lượng: 1 ngày
> Phụ thuộc: Nên đi cùng [02/02](./02-industry-content-packs.md)
> Trạng thái: Hoàn thành — 2026-07-21. `resolveLocale(request, brief?)` trong `section-plan-compiler.ts`
> (ưu tiên: `generationOptions.locale` tường minh → heuristic script prompt: dấu tiếng Việt rồi CJK
> ja/ko/zh → `en`). `isVietnamese()` **đã xoá** (grep 0). Locale nối vào planner prompt
> (`page-plan-generator.ts`) + section prompt (`section-plan-generator.ts`) qua `localeLabel()` ("write
> all content in <language>; structural values stay English"); chọn locale entry của content pack (02/02)
> — locale lạ dùng `_default` của pack còn LLM viết đúng ngôn ngữ yêu cầu. `COMPILER_STRINGS` (vi/en,
> fallback en) cho UI string compiler tự sinh (CollapsibleText expand/collapse, nav CTA "Đặt lịch"/"Book
> now"). UI: dropdown "Content Language" (Auto/Tiếng Việt/English) trong `PageGeneratorModal.tsx`; Auto gửi
> `i18n.language` hiện tại làm gợi ý. i18n key `ai.language*` cho en+vi. RTL (ar/he) chưa liệt kê (ngoài
> phạm vi, builder chưa hỗ trợ RTL). Test: `locale.test.ts` (9 — ưu tiên nguồn, không-dấu-vẫn-đúng khi
> chọn vi, CJK, planner-no-brief) + 2 test compiler (locale=vi/prompt-en → content vi; locale=en/prompt-vi
> → content en). Chưa làm: check ngôn ngữ heading ở quality gate (thuộc [02/04](./04-quality-gates.md)).

## 1. Mục đích

Ngôn ngữ nội dung generate là **lựa chọn tường minh** (hoặc suy ra đáng tin cậy), không phải đoán bằng regex dấu.

## 2. Hiện trạng & lý do

- `PageGenerationOptions.locale?: string` tồn tại trong type (`apps/api/src/types/ai.types.ts:210` và bản client) —
  nhưng **không nơi nào đọc**: planner prompt, section prompt, compiler đều không dùng.
- Thay vào đó `isVietnamese(brief)` (`section-plan-compiler.ts:696-698`) regex ký tự có dấu trên `rawPrompt`:
  - "lam trang landing cho tiem cat toc" (không dấu) → nhận nhầm là tiếng Anh.
  - Prompt tiếng Anh yêu cầu "generate in Vietnamese" → fallback vẫn ra tiếng Anh.
  - Mọi ngôn ngữ khác (ja, ko, fr…) không có đường nào.
- Chat path đã có rule tốt hơn ("Always respond in the same language the user uses") — chỉ generate-page bị.

## 3. Cách làm

1. **Nguồn locale, ưu tiên giảm dần**:
   1. `generationOptions.locale` do user chọn (UI: dropdown trong PageGeneratorModal — thêm control, default "Auto").
   2. Editor i18n language hiện tại (`i18n.language` — client gửi kèm như default khi user để Auto).
   3. Server detect từ prompt: giữ regex dấu tiếng Việt như một heuristic trong chuỗi detect, thêm CJK range;
      cuối cùng `en`.
2. **Truyền xuống**:
   - `generatePagePlan`: thêm dòng vào planner system prompt — `Write all brief and section content fields in <locale>.`
   - `generateSectionPlan`: tương tự trong rules — `All heading/body/items/faqs/testimonials MUST be written in <locale>.`
   - Compiler: `resolveLocale(request)` thay mọi call `isVietnamese(brief)` (12 chỗ) — trả `"vi" | "en" | ...`;
     content pack ([02/02](./02-industry-content-packs.md)) chọn locale entry theo giá trị này.
3. **UI labels compiler sinh** ("Xem thêm"/"Read more" của CollapsibleText, "Đặt lịch"/"Book now"…):
   gom vào bảng `COMPILER_STRINGS: Record<locale, {...}>` — 2 locale đầu tiên `vi`/`en`, fallback `en`.
4. Test: request locale vi + prompt tiếng Anh → fallback content tiếng Việt; prompt vi-không-dấu + locale Auto
   từ editor vi → tiếng Việt; locale ja (chưa có pack strings) → LLM content tiếng Nhật, compiler strings en.

## 4. Hướng thiết kế

- Locale ảnh hưởng **nội dung**, không ảnh hưởng structural identifiers (sectionType, layoutHint…) —
  giữ rule "structural values always English" như chat prompt hiện có.
- Không đưa thư viện detect ngôn ngữ nặng; heuristic + lựa chọn tường minh là đủ cho v1.

## 5. Kết quả mong muốn

- [ ] Dropdown ngôn ngữ trong Page Generator (Auto / Tiếng Việt / English — mở rộng dần).
- [ ] `isVietnamese()` bị xoá; grep 0 kết quả.
- [ ] 4 test matrix locale x prompt pass.

## 6. Tình huống có thể xảy ra & corner cases

- **User chọn vi nhưng viết prompt en chứa tên riêng en** → nội dung vi, tên riêng giữ nguyên (LLM tự xử; không can thiệp).
- **LLM trả sai ngôn ngữ dù được yêu cầu** → quality gate ([02/04](./04-quality-gates.md)) thêm check ngôn ngữ heading
  (heuristic script range) → tính là repairable error, retry section với hint.
- **Locale RTL (ar, he)** → ngoài phạm vi (builder chưa hỗ trợ RTL layout); chặn ở dropdown (chưa liệt kê) thay vì ra kết quả vỡ.
- **Mixed-locale document** (trang vi, user muốn thêm section en) → section-level AI dùng ngôn ngữ prompt của lượt đó
  (chat rule) — không đổi.

## 7. Rủi ro & rollback

Rất thấp. Thứ tự ưu tiên nguồn locale là quyết định duy nhất cần thống nhất — đề xuất như mục 3.1, đổi được dễ dàng.
