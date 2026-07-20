# 02/01 — Preset-first compiler: dùng PaletteCatalog làm khối xây

> Phân loại: Cải tiến lớn
> Ưu tiên: P3
> Ước lượng: 3 ngày
> Phụ thuộc: [02/02](./02-industry-content-packs.md) nên xong trước (nền sạch), không bắt buộc
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Trang AI generate đẹp và đa dạng hơn **mà không thêm LLM call nào**, bằng cách để compiler ưu tiên
instantiate các preset đã được thiết kế sẵn (PaletteCatalog) rồi chỉ thay content — thay vì tự dựng
style từ ~10 hàm `xxxCommand()` cứng.

## 2. Hiện trạng & lý do

- Client gửi `availablePresets` (đầy đủ props/style từng preset) + `availablePresetsCompact` trong request
  generate-page (`usePageGenerator.ts:129-141`) — nhưng grep `preset` trong `page-plan-generator.ts`,
  `section-plan-generator.ts`, `section-plan-compiler.ts` ra **0 kết quả**. Token gửi lên bị bỏ phí hoàn toàn.
- Pipeline v1 cũ từng có `presetId` trong outline schema — v2 bỏ mất khả năng này.
- Compiler hiện build style thủ công (`textCommand`, `buttonCommand`, `addCard`…) → mọi trang có đúng một
  "gu" thiết kế; preset của user (hoặc của bộ theme) không bao giờ xuất hiện trong trang generate.
- Server còn có palette library riêng (`apps/api/src/data/palette/*.json` + `palette.routes.ts`) — nguồn preset
  thứ hai chưa được pipeline dùng.

## 3. Cách làm

1. **Chuẩn hoá đầu vào**: định nghĩa `ResolvedPreset { id, name, componentType, props, style, tags }`
   trong `ai.types.ts`; build map `presetsById` + index theo `componentType` và `tags` từ
   `request.availablePresets` (đã đủ dữ liệu, không cần client đổi gì).
2. **Cho LLM chọn preset ở mức section intent**: thêm vào `SectionPlanSchema` field
   `presetRefs?: Array<{ role: string; presetId: string }>` (optional). System prompt section nhận danh sách
   preset **rút gọn theo candidate components của section đó** (id + name + componentType + tags —
   không gửi props/style, tiết kiệm token; compact string đã có sẵn từ `serializePresetsCompact`).
3. **Compiler instantiate**: hàm mới `presetCommand(id, parentId, preset, contentPatch)`:
   - `props = { ...preset.props, ...contentPatch.props }` (patch = text/label/src từ SectionPlan content).
   - `style = preset.style ?? {}` + design-token overrides (màu primary/accent thay các giá trị màu chủ đạo
     trong style preset — mapping đơn giản: các key `backgroundColor`, `color`, `borderColor` nếu preset đánh dấu
     tag `themable`).
   - Vẫn đi qua validation gate như mọi ADD_NODE.
4. **Fallback chain**: không có preset khớp → adapter cũ (hàm `xxxCommand` hiện tại). Không xoá code cũ.
5. **Chọn preset khi LLM không chỉ định**: compiler tự pick preset theo heuristic
   `componentType khớp + tag khớp section type` (vd tag `hero`, `pricing`), ưu tiên preset user-defined trước
   preset built-in; seed theo `jobId` để cùng prompt chạy lại có thể ra biến thể khác (đa dạng có kiểm soát).
6. **Card/list preset**: mở rộng cho cấu trúc con — preset componentType `Container` có tag `card` được dùng
   trong `addCard` thay cho container thủ công; content patch điền vào children theo slot text đầu tiên
   (phase 1 giữ đơn giản: chỉ patch preset **leaf** và **container 1 tầng**; container sâu hơn để phase sau).
7. **Logging**: job log thêm `presetUsed: string[]` per section — đo tỉ lệ preset được dùng.
8. Test: fixture catalog 5 preset → generate → command dùng props/style của preset; preset id không tồn tại
   trong catalog → bị lọc, dùng fallback; validation gate vẫn pass toàn bộ.

## 4. Hướng thiết kế

- LLM chỉ **tham chiếu** preset bằng id (như đã làm với componentIntents) — không bao giờ nhận props/style đầy đủ,
  giữ nguyên tắc "intent only" + token thấp.
- Preset là dữ liệu phía client gửi lên → pipeline vẫn stateless, không cần server lưu catalog
  (palette library server dùng làm nguồn bổ sung sau, không bắt buộc).
- Đây là bước đệm cho [03-component-platform/02-generic-adapter.md](../03-component-platform/02-generic-adapter.md) — generic adapter sẽ coi "preset instantiation"
  là chiến lược số 1, adapter code là số 2.

## 5. Kết quả mong muốn

- [ ] Với catalog có preset hero/pricing/card: 2 lần generate cùng prompt ra 2 biến thể nhìn khác nhau rõ rệt.
- [ ] ≥50% section trong trang generate dùng ít nhất 1 preset khi catalog đủ (đo bằng `presetUsed` log).
- [ ] Không regression khi `availablePresets` rỗng (đường fallback = hành vi hiện tại).
- [ ] Prompt tokens section tăng ≤ ~200 (danh sách preset rút gọn theo candidate).

## 6. Tình huống có thể xảy ra & corner cases

- **Preset có style xung đột design tokens** (preset nền tím, token primary đỏ) → quy tắc: token override
  chỉ áp cho preset tag `themable`; preset không tag giữ nguyên style gốc (tôn trọng thiết kế của preset).
- **LLM trả presetId bịa** → lọc theo `presetsById` (giống filterPreferredComponents), log decision.
- **Preset componentType không có trong availableComponents** (catalog lệch registry) → bỏ preset đó từ bước build index.
- **Preset props chứa URL ảnh chết** → đi qua `safeMediaUrl` + fallback pool như mediaItems.
- **Catalog rất lớn (500 preset)** → compact list theo section candidate + cap 30 preset/section prompt;
  phần còn lại compiler-side heuristic vẫn dùng được (không phụ thuộc prompt).
- **Undo**: preset instantiation vẫn là ADD_NODE thường → undo stack không đổi.

## 7. Rủi ro & rollback

Trung bình. Điểm rủi ro chính là content patch vào preset phức tạp (đa children) — đã giới hạn phase 1
ở leaf + container 1 tầng. Feature flag `AI_PRESET_FIRST` (env, mặc định bật) để tắt nhanh khi có sự cố;
tắt = compiler bỏ qua bước preset, về adapter cũ.
