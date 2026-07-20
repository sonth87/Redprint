# 00/01 — Ảnh pet bị dùng cho mọi ngành trong card services/testimonials

> Phân loại: Bug fix
> Ưu tiên: P0
> Ước lượng: 0.5 ngày
> Phụ thuộc: Không
> Trạng thái: Hoàn thành — services/testimonials card giờ ưu tiên `mediaItems` của SectionPlan, fallback qua `mediaItemsFor()` (đã tự chọn pool đúng ngành). Test: `section-plan-compiler.test.ts` — "never uses pet fallback images for non-pet industries" + "still uses pet pool images... pet care".

## 1. Mục đích

Trang do AI generate cho bất kỳ ngành nào (SaaS, nhà hàng, portfolio…) không được hiển thị ảnh chó mèo
trong section Services/Testimonials.

## 2. Hiện trạng & lý do

Trong `compileGenericSection` tại `apps/api/src/services/section-plan-compiler.ts` (~dòng 1418–1423),
khi render card cho section `services`/`testimonials`, ảnh được lấy **trực tiếp từ `PET_IMAGES`**:

```ts
const imageSrc =
  section.type === "services" || section.type === "testimonials"
    ? PET_IMAGES[index % PET_IMAGES.length]   // ← luôn là ảnh pet, bất kể ngành
    : undefined;
```

Trong khi đó cùng file đã có sẵn hàm chọn pool đúng ngành: `fallbackImagePool(brief)` (dòng ~137) —
trả `PET_IMAGES` khi `isPetCare(brief)`, ngược lại trả `GENERIC_IMAGES`. Chỗ card này quên dùng nó.
Đây là tàn dư của giai đoạn demo pet-care.

**Hậu quả:** user gõ "landing page cho công ty phần mềm kế toán" → section Services hiện 4 ảnh chó mèo.
Mất niềm tin vào tính năng AI ngay lần dùng đầu.

## 3. Cách làm

1. Sửa đoạn trên thành ưu tiên **mediaItems từ SectionPlan** (LLM đã trả ảnh/alt riêng cho section), fallback về pool đúng ngành:
   ```ts
   const pool = fallbackImagePool(ctx.brief);
   const media = mediaItemsFor(plan, section, ctx.brief, { min: list.length, max: 6 });
   const imageSrc =
     section.type === "services" || section.type === "testimonials"
       ? (media[index]?.src ?? pool[index % pool.length])
       : undefined;
   ```
2. Rà toàn file tìm các chỗ khác dùng thẳng `PET_IMAGES` ngoài `fallbackImagePool` (grep `PET_IMAGES` — hiện có 2 vị trí: định nghĩa pool và chỗ bug này).
3. Thêm unit test vào `section-plan-compiler.test.ts`: brief SaaS (không pet keyword) → mọi `Image.props.src` trong output **không** nằm trong `PET_IMAGES`.

## 4. Hướng thiết kế

Ngắn hạn dùng `fallbackImagePool`. Dài hạn pool ảnh chuyển ra content pack theo ngành —
xem [02-ai-generation/02-industry-content-packs.md](../02-ai-generation/02-industry-content-packs.md). Fix này không chặn hướng đó.

## 5. Kết quả mong muốn

- [ ] Prompt SaaS/nhà hàng/portfolio → 0 ảnh pet trong output (test tự động).
- [ ] Prompt pet-care (có từ khoá pet/chó/mèo) → vẫn dùng `PET_IMAGES` như cũ.
- [ ] Section có `mediaItems` do LLM trả → ưu tiên ảnh đó thay vì pool.

## 6. Tình huống có thể xảy ra & corner cases

- **LLM trả `mediaItems` ít hơn số card** → phần thiếu lấy từ pool (đã xử lý bằng `?? pool[...]`).
- **LLM trả `src` không an toàn** (SSRF/private IP) → `mediaItemsFor` đã đi qua `safeMediaUrl`, giữ nguyên luồng đó, không bypass.
- **Ngành không có pool riêng** → `GENERIC_IMAGES` (ảnh văn phòng trung tính) là mặc định chấp nhận được; đừng để trống `src` vì `Image` yêu cầu prop `src` (REQUIRED_PROPS) — command sẽ bị validation gate drop.
- **`items.length > pool.length`** → dùng modulo như hiện tại, chấp nhận lặp ảnh.

## 7. Rủi ro & rollback

Rủi ro gần bằng 0 — thay nguồn URL ảnh, không đổi cấu trúc command. Rollback = revert 1 hunk.
