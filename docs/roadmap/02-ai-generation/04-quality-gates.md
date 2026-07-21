# 02/04 — Quality gates sau compile (Phase 5 của plan cũ)

> Phân loại: Bổ sung mới
> Ưu tiên: P3
> Ước lượng: 2 ngày
> Phụ thuộc: Không (chạy tốt hơn sau [02/02](./02-industry-content-packs.md)/[02/03](./03-locale-support.md))
> Trạng thái: Hoàn thành — 2026-07-21. Module mới `apps/api/src/services/quality-gate.ts`
> (`runQualityGate`, `partitionByMode`, `contrastRatio`, `plainText`). 7 check v1: `placeholder_content`
> (strong→block/weak→warn), `empty_section` (block), `low_contrast`/`missing_mobile_font`/
> `overlong_heading`/`duplicate_heading`/`wrong_language` (warn). Env `AI_QUALITY_GATE=block|warn|off`
> (default block) + `AI_QG_DISABLE=code,...`. **generate-page**: block → throw `quality_block`
> (classifier mới, retryable) → retry-with-hint sẵn có → fallback pack; warn → `section_ready.qualityWarnings`
> + đếm vào log `complete` (`qualityWarnings`/`qualityGateMode`). Fallback chạy gate với `exemptBlock:true`
> (block→warn, không bao giờ để section trắng). **chat + chat/stream**: gate scope theo command lượt đó,
> block+warn đều trả về `qualityWarnings` (không ép re-ask). Test: `quality-gate.test.ts` (23, gồm 2 test
> fallback pack vi/en sạch block) + 1 test classifier `quality_block`. Docs: AI_ASSISTANT (bảng check +
> SSE field + env) + README cập nhật cùng task.
> Chưa làm: LLM-as-critic (Phase 6, ngoài phạm vi v1); client hiển thị icon ⚠ trên outline (BE đã phát
> `qualityWarnings`, phần UI thuộc editor — làm sau nếu cần).

## 1. Mục đích

Chặn các lỗi "trang xấu/ngớ ngẩn" mà validation gate hiện tại (cấu trúc/props) không nhìn thấy:
nội dung placeholder, heading trùng lặp giữa các section, chữ trắng trên nền trắng, thiếu responsive tối thiểu.
Đây là Phase 5 trong `legacy/AI_SYSTEM_PROJECT_OVERVIEW_AND_UPGRADE_PLAN.md` — chưa từng được làm.

## 2. Hiện trạng & lý do

`validateCompiledCommandsWithReport` chỉ check: type tồn tại, parent hợp lệ, không leaf-parent, required props,
enum, duplicate id. Không có check nào về **chất lượng**:

- LLM đôi khi trả "Your headline here", "Lorem ipsum", heading = section title y nguyên.
- Design tokens tự do → có thể ra `color === backgroundColor` (đã thấy compiler tự bảo vệ vài chỗ nhưng
  section plan style từ chat path thì không).
- Section giống nhau: services và features cùng 3 card na ná khi LLM lười.
- Chat path có thể sinh node Text không có responsive font → tràn mobile.

## 3. Cách làm

1. **Vị trí**: module mới `apps/api/src/services/quality-gate.ts`, chạy sau compile, trước khi stream:
   ```ts
   interface QualityIssue { code: string; severity: "block" | "warn"; sectionId?: string; nodeId?: string; detail: string }
   function runQualityGate(commands: AICommandSuggestion[], plan: PagePlan, tokens: DesignTokens): QualityIssue[]
   ```
2. **Các check v1** (thuần deterministic, không LLM):
   | Code | Mức | Logic |
   |------|-----|-------|
   | `placeholder_content` | block | regex `lorem ipsum|your (headline|text|content) here|tiêu đề của bạn|\bTBD\b|xxx+` trên mọi props.text/label |
   | `duplicate_heading` | warn | 2 section có heading normalize giống nhau (case/space-insensitive) |
   | `low_contrast` | warn | với cặp `color`/`backgroundColor` trên cùng node (hoặc node vs section bg): WCAG ratio < 3.0 — dùng công thức luminance đơn giản, chỉ parse hex/rgb |
   | `missing_mobile_font` | warn | Text tag h1/h2 fontSize > 40px mà không có responsiveStyle.mobile.fontSize |
   | `empty_section` | block | Section skeleton không nhận được bất kỳ child command nào (đếm theo parent chain) |
   | `overlong_heading` | warn | heading > 120 ký tự |
   | `wrong_language` | warn | (sau [02/03](./03-locale-support.md)) heading script khác locale yêu cầu |
3. **Hành xử**:
   - `block` trong generate-page → coi như lỗi repairable của section: retry với hint
     (`section_retrying` reason = issue detail) — tận dụng vòng retry sẵn có; hết attempt → fallback pack.
   - `warn` → vẫn stream, đính kèm vào SSE `section_ready.qualityWarnings` + log; client hiển thị icon ⚠
     trên section trong outline panel (tooltip chi tiết).
   - Chat path: `block` → đưa vào repair loop hiện có (thêm reason codes vào `REPAIR_HINTS`);
     `warn` → trả kèm response, toast nhẹ.
4. **Config**: `AI_QUALITY_GATE=block|warn|off` (default `block`); từng check tắt được qua env list
   (`AI_QG_DISABLE=low_contrast,...`) để vận hành linh hoạt khi 1 check false-positive hàng loạt.
5. Test: mỗi check ≥2 case (pass/fail); case tổng hợp trang fallback pack pass toàn bộ gate
   (fallback phải luôn sạch — nếu fallback fail gate là bug của pack).

## 4. Hướng thiết kế

- **Deterministic trước, LLM-judge sau**: v1 không gọi LLM chấm điểm (đắt, chậm, khó test).
  LLM-as-critic là bước sau nếu cần (Phase 6 plan cũ).
- Quality gate là **module riêng** — không nhét thêm vào `section-plan-compiler.ts` (đã 1.600 dòng).
- Severity 2 mức duy nhất; không chấm điểm số (tránh bikeshedding threshold).

## 5. Kết quả mong muốn

- [ ] Prompt bất kỳ → 0 placeholder text trong output (block hiệu quả).
- [ ] Section trùng heading hiển thị cảnh báo trong outline UI.
- [ ] Retry-with-hint sửa được ≥50% block issues ngay attempt 2 (đo qua log `section_retrying reason`).
- [ ] Thời gian gate < 10ms/section (thuần regex/parse — đo bằng log elapsed).

## 6. Tình huống có thể xảy ra & corner cases

- **False positive contrast**: gradient/áo màu qua CSS var không parse được → skip check khi giá trị
  không phải hex/rgb thuần (đừng đoán).
- **Placeholder regex bắt nhầm nội dung thật** ("XXX Steakhouse") → word-boundary + chỉ block khi match ≥1 pattern
  mạnh (lorem/your-headline); pattern yếu (xxx) hạ xuống warn.
- **Retry vòng lặp vô hạn** cùng issue → maxAttempts sẵn có chặn (2); hint phải kèm nội dung cụ thể bị chặn.
- **Fallback pack fail gate** (dev sửa pack ẩu) → gate coi fallback là exempt-block (chỉ warn) để không bao giờ
  trắng section; test riêng đảm bảo pack chuẩn sạch.
- **Chat sửa 1 node lẻ** → chỉ chạy check trên node bị đụng, không quét cả trang (scope theo commands).

## 7. Rủi ro & rollback

Trung bình-thấp: rủi ro chính là chặn quá tay làm tăng retry/latency → env off/warn có sẵn.
Theo dõi tỉ lệ block per check trong tuần đầu để tinh chỉnh.
