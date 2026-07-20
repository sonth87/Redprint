# 02/05 — Layout variety: làm cho `layoutVariant` có tác dụng thật

> Phân loại: Cải tiến
> Ưu tiên: P3/P4
> Ước lượng: 3 ngày
> Phụ thuộc: [02/01](./01-preset-first-compiler.md) (preset-first giảm gánh cho variant code)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Hai trang generate từ 2 prompt khác nhau (hoặc cùng prompt chạy 2 lần) phải **nhìn khác nhau** ở mức layout,
không chỉ khác chữ và màu. Cho `layoutVariant`/`visualEmphasis` mà LLM đã trả về một ý nghĩa thực.

## 2. Hiện trạng & lý do

- `SectionPlan.layoutVariant` và `visualEmphasis` được schema chấp nhận và log — nhưng compiler
  gần như không đọc (`layoutVariant` chỉ xuất hiện trong fallback plan như string trang trí; `visualEmphasis`
  không được dùng ở bất kỳ nhánh compile nào).
- Mỗi section type có đúng 1 code path: hero luôn là grid 2 cột copy-trái/ảnh-phải; services luôn intro + gallery/cards;
  cta luôn centered band. → "mọi trang một khuôn".

## 3. Cách làm

1. **Định nghĩa variant enum cứng cho từng section type** (LLM chọn trong enum, không free-text):
   ```
   hero:        split-media-right | split-media-left | centered-stack | full-bleed-media
   services:    grid-cards | gallery-showcase | alternating-rows
   features:    grid-cards | icon-list | checklist-two-col
   testimonials: slider | quote-grid | single-spotlight
   pricing:     tier-cards | comparison-simple
   faq:         accordion | two-col-list
   cta:         centered-band | split-with-media
   ```
   Đưa vào `SectionPlanSchema` dạng `z.enum` theo type (refine sau parse: variant không hợp cho type → undefined).
2. **Compiler**: mỗi `compileXxxSection` nhận variant, tổ chức thành bảng
   `HERO_VARIANTS: Record<string, (plan, section, ctx) => AICommandSuggestion[]>` — mỗi variant là hàm nhỏ
   tái dùng các command helper hiện có (gridCommand, columnCommand, galleryPro…). Ưu tiên viết variant bằng
   **preset** khi catalog có ([02/01](./01-preset-first-compiler.md)).
3. **Chọn variant khi LLM không chỉ định**: seeded-random theo `jobId + section.type` trong tập variant hợp lệ —
   deterministic trong 1 job (retry cùng section ra cùng variant), khác nhau giữa các job.
4. **`visualEmphasis` mapping**: `media` → tăng tỉ trọng ảnh (media 60/40, thêm gallery item);
   `copy` → bỏ ảnh phụ; `conversion` → nhân đôi CTA (đầu + cuối section); `proof` → chèn stats row nếu plan có stats.
   Là modifier áp sau variant, không phải variant riêng.
5. **Section prompt**: liệt kê variant enum cho section type đó + 1 câu hướng dẫn chọn theo nội dung
   ("nhiều ảnh → gallery-showcase; quy trình → alternating-rows").
6. **Alternating rhythm page-level**: sau khi các section compile xong, pass cuối kiểm tra 2 section liền kề
   cùng "hình khối" (cùng variant class + cùng background) → đổi background section sau (đã có `sectionBackground`
  xen kẽ, mở rộng thêm đổi variant nếu trùng — chỉ khi variant do seed chọn, không ghi đè lựa chọn của LLM).
7. Test: snapshot số lượng/loại node cho từng variant; seed cố định → output ổn định; variant lạ từ LLM → về seed-choice.

## 4. Hướng thiết kế

- Variant là **enum đóng** — mở variant mới bằng cách thêm hàm + thêm enum (có test bắt enum ⊆ bảng hàm).
  Không cho LLM mô tả layout tự do (đó là con đường quay lại "LLM sinh command").
- Số lượng: bắt đầu 2–4 variant/section-type như bảng — đủ tạo cảm giác đa dạng, chưa bùng nổ tổ hợp QA.

## 5. Kết quả mong muốn

- [ ] Chạy cùng prompt 3 lần → ít nhất 2 bố cục hero khác nhau xuất hiện.
- [ ] `layoutVariant` trong log `section_ready` phản ánh đúng nhánh code đã chạy (thêm field `variantUsed`).
- [ ] Mỗi variant có test snapshot + đã xem tay trên playground desktop/mobile.
- [ ] Fallback pack cũng đi qua variant (fallback không còn duy nhất 1 khuôn).

## 6. Tình huống có thể xảy ra & corner cases

- **Variant cần component không available** (slider khi không có GalleryPro/GallerySlider) → bảng variant khai
  `requires: string[]`; seed-choice lọc theo availableTypes; LLM chọn variant thiếu điều kiện → hạ về variant
  mặc định của type.
- **Nội dung không hợp variant** (single-spotlight nhưng có 5 testimonials) → variant tự cắt còn 1 + đưa phần dư
  vào... không đâu cả (bỏ) — quy tắc: variant định nghĩa capacity, compiler cắt theo capacity, log warn.
- **Mobile**: mọi variant bắt buộc khai responsiveStyle mobile (checklist review + quality gate `missing_mobile_font`).
- **Retry section**: seed theo jobId+type → retry ra cùng variant, tránh nhảy layout giữa attempt (đã thiết kế).

## 7. Rủi ro & rollback

Trung bình: nhân số đường code compile lên ~2.5x → trả bằng cấu trúc bảng-hàm-nhỏ + test snapshot.
Flag `AI_LAYOUT_VARIETY=off` → luôn dùng variant đầu tiên (hành vi hiện tại).
