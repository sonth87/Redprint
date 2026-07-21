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

| # | File | Nội dung | Phase | Trạng thái |
|---|------|----------|-------|-----------|
| 01 | [01-preset-first-compiler.md](./01-preset-first-compiler.md) | Compiler ưu tiên instantiate preset thay vì tự build style | P3 | ✅ Hoàn thành (Phase 1) |
| 02 | [02-industry-content-packs.md](./02-industry-content-packs.md) | Đưa fallback content + image pool ra data file theo ngành | P3 | ✅ Hoàn thành |
| 03 | [03-locale-support.md](./03-locale-support.md) | Locale chính thức end-to-end | P3 | ✅ Hoàn thành |
| 04 | [04-quality-gates.md](./04-quality-gates.md) | Quality gate sau compile (placeholder, contrast, trùng lặp, responsive) | P3 | ✅ Hoàn thành |
| 05 | [05-layout-variety.md](./05-layout-variety.md) | `layoutVariant` có tác dụng thật — 2–3 biến thể layout mỗi section type | P3/P4 | ✅ Hoàn thành (Phase 1) |
| 06 | [06-media-pipeline.md](./06-media-pipeline.md) | Ảnh theo ngành: tích hợp search/generation, dùng `mediaPrompt` | P4 | ✅ Hoàn thành (v1 Unsplash) |
| 07 | [07-transactional-apply.md](./07-transactional-apply.md) | Apply section nguyên tử + undo theo section | P4 | ✅ Hoàn thành |
| 08 | [08-cost-observability.md](./08-cost-observability.md) | Token/cost logging per job, config nhiệt độ/model per stage | P4 | ✅ Hoàn thành |

**Toàn bộ nhóm 02 hoàn thành 2026-07-21.** Thứ tự đã làm: 08 → 02 → 03 → 04 → 01 → 05 → 06 → 07.
Các phần "phase sau" còn lại (ghi trong từng file): 01 container/section-template preset; 05 variant cho
features/testimonials/pricing/faq + page-level rhythm; 06 Pexels/generation + chat `search_image` +
self-host ảnh; 07 nút "Undo generation". Không chặn — đều là mở rộng trên nền đã có.
