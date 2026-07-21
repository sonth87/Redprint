# 02/02 — Industry content packs: đưa fallback content/ảnh ra data file

> Phân loại: Cải tiến
> Ưu tiên: P3 (làm đầu tiên trong nhóm 02)
> Ước lượng: 2 ngày
> Phụ thuộc: Không
> Trạng thái: Hoàn thành — 2026-07-21. `apps/api/src/data/content-packs/` (index + `_generic` + `pet-care`
> + `saas` + `restaurant` + `loader.ts` Zod). PawJoy/pet literals + `PET_IMAGES`/`GENERIC_IMAGES`/`isPetCare`
> gỡ khỏi compiler (grep `PawJoy|Tắm thơm|PET_IMAGES` trong `src/**/*.ts` = 0, chỉ còn trong comment mô tả
> + JSON). `CompileContext` thêm `pack`+`locale` (resolve 1 lần trong `buildCompileContext` qua
> `matchContentPack` + `resolvePackLocale`). Content/nav/media/marquee/accent-shape đọc từ pack; merge sâu
> 1 tầng trên `_generic`. `{industry}` placeholder nội suy từ brief. Locale hiện suy từ `isVietnamese`
> (`resolvePackLocale`) — 02/03 sẽ thay bằng `generationOptions.locale`. Build: thêm bước `copy-data`
> (dependency-free, dùng `fs.cpSync`) copy JSON `data/palette` + `data/content-packs` vào `dist` — đồng thời
> vá luôn lỗi tồn tại: `tsc` không copy JSON nên palette JSON trước đây thiếu trong prod. Test:
> `content-packs/loader.test.ts` (8 — matcher 4 ngành, schema completeness, merge over generic, restaurant
> không rò rỉ copy pet). 13 test compiler cũ vẫn pass (hành vi fallback giữ nguyên).

## 1. Mục đích

Fallback content (khi LLM fail) và pool ảnh mặc định phải **đúng ngành** và **mở rộng được bằng cách thêm data,
không sửa code**. Xoá demo-bias "PawJoy pet care" khỏi engine.

## 2. Hiện trạng & lý do

Trong `apps/api/src/services/section-plan-compiler.ts`:

- `buildFallbackSectionPlan` chứa ~120 dòng nội dung tiếng Việt hardcode cho thương hiệu giả "PawJoy Pet Care"
  (dòng ~999-1080) — chỉ kích hoạt khi `pet && vi`, mọi ngành khác nhận content generic tiếng Anh.
- `defaultItems`, `defaultNavItems`, `defaultMediaItems` cũng phân nhánh pet/vi cứng.
- Pool ảnh: `PET_IMAGES` (6 URL) + `GENERIC_IMAGES` (6 URL) hardcode Unsplash.
- Nhận diện ngành: `isPetCare()` regex; `inferPattern()` trong `page-plan-generator.ts` có 5 pattern
  nhưng mapping ngành → content không tồn tại (chỉ ngành → cấu trúc section).

Hậu quả: (1) provider lỗi giữa chừng → trang SaaS nhận fallback content pet hoặc generic nhạt;
(2) thêm ngành mới (nhà hàng, bất động sản…) = sửa compiler; (3) file compiler phình 1.600 dòng khó đọc.

## 3. Cách làm

1. **Cấu trúc data** — noi theo pattern có sẵn của `apps/api/src/data/palette/`:
   ```
   apps/api/src/data/content-packs/
     index.json            # danh sách pack + keywords nhận diện
     _generic.json         # pack mặc định (bắt buộc có đủ mọi section type)
     pet-care.json         # chuyển nội dung PawJoy vào đây
     saas.json
     restaurant.json
     ecommerce.json
     portfolio.json
     loader.ts             # load + validate bằng Zod khi server start
   ```
2. **Schema pack** (Zod trong `loader.ts`):
   ```ts
   interface ContentPack {
     id: string;
     keywords: string[];                    // dùng cho matcher
     imagePool: string[];                   // >= 4 URL
     locales: Record<string, {              // "vi", "en", "_default"
       brandPlaceholder: string;
       sections: Partial<Record<PageSectionType, {
         heading: string; body: string; eyebrow?: string;
         ctaLabel?: string; secondaryCtaLabel?: string;
         items?: SectionPlanItem[]; faqs?: SectionPlanItem[];
         testimonials?: SectionPlanItem[]; mediaCaptions?: string[];
       }>>;
       navItems: Array<{ label: string; href: string }>;
     }>;
   }
   ```
3. **Matcher**: `matchContentPack(brief, prompt): ContentPack` — score theo keywords trên
   `rawPrompt + inferredIndustry + targetAudience`; hoà → `_generic`. Giữ `inferPattern` (cấu trúc) độc lập
   với content pack (nội dung) — 2 trục khác nhau.
4. **Refactor compiler**: `buildFallbackSectionPlan(section, brief)` → `buildFallbackSectionPlan(section, brief, pack, locale)`;
   `defaultItems/defaultNavItems/defaultMediaItems/fallbackImagePool` đọc từ pack. Xoá toàn bộ literal PawJoy/pet khỏi code.
5. **Validate khi start**: pack thiếu section type nào → warn + dùng `_generic` bù từng phần (merge sâu 1 tầng).
6. Test: matcher (5 prompt mẫu → đúng pack); mọi pack pass schema; fallback full-page với pack restaurant
  không chứa chuỗi nào từ pack pet.

## 4. Hướng thiết kế

- Data-driven, cùng repo (không DB) — pack là JSON được review qua PR như code.
- Locale trong pack khớp cơ chế [02/03](./03-locale-support.md) (`vi`, `en`, `_default`).
- Về sau content pack có thể sinh bằng LLM offline (script tạo pack cho ngành mới) — nằm ngoài phạm vi.

## 5. Kết quả mong muốn

- [ ] Grep `PawJoy|Tắm thơm|PET_IMAGES` trong `*.ts` của services → 0 (chỉ còn trong JSON pack).
- [ ] Thêm ngành mới = thêm 1 file JSON + 1 dòng index, không đổi TS nào.
- [ ] Fallback cho prompt "quán cà phê" ra nội dung cà phê (pack restaurant/cafe), không ra pet/generic-office.
- [ ] Server start log số pack load được; pack hỏng schema không làm crash server (skip + warn).

## 6. Tình huống có thể xảy ra & corner cases

- **Prompt đa ngành** ("phần mềm quản lý spa") → score keywords có thể chọn spa thay vì saas; chấp nhận —
  fallback chỉ chạy khi LLM fail, sai ngành nhẹ vẫn hơn pet-mặc-định. Matcher ưu tiên keyword xuất hiện sớm trong prompt.
- **Locale không có trong pack** (user Nhật) → `_default` (tiếng Anh); [02/03](./03-locale-support.md) xử lý chiều rộng locale.
- **Ảnh Unsplash chết theo thời gian** → pack tách riêng giúp thay URL không cần release code; cân nhắc
  self-host ảnh fallback trong hạng mục [02/06](./06-media-pipeline.md).
- **Hai pack cùng keywords** → validate index khi load: keyword trùng giữa 2 pack → warn để maintainer sửa.
- **Kích thước**: pack load 1 lần vào memory khi start (vài chục KB) — không đáng kể.

## 7. Rủi ro & rollback

Thấp — refactor thuần cấu trúc dữ liệu, hành vi giữ nguyên với pet/vi (nội dung PawJoy chuyển vào pack pet-care
locale vi, snapshot test so sánh trước/sau). Rollback theo PR.
