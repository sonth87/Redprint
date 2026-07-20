# 02 — AI Generation (nâng chất lượng & độ phong phú)

## Bối cảnh (từ audit code)

Pipeline v2 hiện tại (`plan → section intent → deterministic compiler → validation gate → SSE`) là kiến trúc đúng.
Các hạng mục nhóm này **không thay kiến trúc** — chúng nâng chất lượng đầu ra và độ đa dạng, giải các điểm yếu đã xác nhận:

1. Compiler là strategy cố định theo section type → mọi trang cùng pattern trông na ná nhau.
2. Preset (`PaletteCatalog`) được client gửi lên nhưng pipeline v2 **không dùng byte nào** — bỏ phí nguồn layout đẹp nhất.
3. Fallback content hardcode pet-care/PawJoy trong compiler; ảnh fallback là 12 URL Unsplash cứng.
4. Ngôn ngữ đoán bằng regex dấu tiếng Việt; `generationOptions.locale` có trong type nhưng bị bỏ qua.
5. Không có quality gate sau generate; không có atomic apply per section; không đo token/chi phí per job.

## Hạng mục

| # | File | Nội dung | Phase | Effort |
|---|------|----------|-------|--------|
| 01 | [01-preset-first-compiler.md](./01-preset-first-compiler.md) | Compiler ưu tiên instantiate preset thay vì tự build style | P3 | 3 ngày |
| 02 | [02-industry-content-packs.md](./02-industry-content-packs.md) | Đưa fallback content + image pool ra data file theo ngành | P3 | 2 ngày |
| 03 | [03-locale-support.md](./03-locale-support.md) | Locale chính thức end-to-end | P3 | 1 ngày |
| 04 | [04-quality-gates.md](./04-quality-gates.md) | Quality gate sau compile (placeholder, contrast, trùng lặp, responsive) | P3 | 2 ngày |
| 05 | [05-layout-variety.md](./05-layout-variety.md) | `layoutVariant` có tác dụng thật — 2–3 biến thể layout mỗi section type | P3/P4 | 3 ngày |
| 06 | [06-media-pipeline.md](./06-media-pipeline.md) | Ảnh theo ngành: tích hợp search/generation, dùng `mediaPrompt` | P4 | 2–3 ngày |
| 07 | [07-transactional-apply.md](./07-transactional-apply.md) | Apply section nguyên tử + undo theo section | P4 | 2 ngày |
| 08 | [08-cost-observability.md](./08-cost-observability.md) | Token/cost logging per job, config nhiệt độ/model per stage | P4 | 1 ngày |

Thứ tự khuyến nghị trong nhóm: 02 → 03 → 01 → 04 → 05 → 07 → 08 → 06
(02+03 gỡ hardcode trước để 01/05 xây trên nền sạch).
