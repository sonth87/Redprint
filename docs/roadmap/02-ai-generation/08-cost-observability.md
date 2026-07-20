# 02/08 — Cost & observability: đo token/chi phí, config per-stage

> Phân loại: Cải tiến vận hành
> Ưu tiên: P4
> Ước lượng: 1 ngày
> Phụ thuộc: Không
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Biết mỗi job generate tốn bao nhiêu token/tiền, stage nào tốn nhất, và điều chỉnh được model/temperature
cho từng stage mà không sửa code — nền cho mọi quyết định tối ưu tiếp theo (không đo = không tối ưu được).

## 2. Hiện trạng & lý do

- `llm-client.ts` bỏ qua `usage` trong response của cả 3 provider (chỉ log cache tokens của Claude).
- `temperature: 0.7`, `max_tokens: 8192` hardcode cho **mọi** call — planner (cần chính xác, nhiệt thấp)
  và section copywriter (cần sáng tạo, nhiệt cao hơn) dùng chung.
- 1 model duy nhất `LLM_MODEL` cho mọi stage — không thể chạy planner bằng model rẻ, section bằng model tốt.
- Logger có `jobEvent` với elapsedMs nhưng không có tokens/cost.

## 3. Cách làm

1. **Trả usage từ llm-client**: đổi chữ ký nội bộ thành
   `callLLM(messages, opts): Promise<{ text: string; usage: { inputTokens, outputTokens, cacheReadTokens? } }>`
   — parse `usage`/`usageMetadata` của từng provider. Giữ wrapper cũ `callLLM(messages, jsonMode)` trả string
   để không phải sửa toàn bộ call site cùng lúc (deprecate dần).
2. **Options per-call**: `opts: { jsonMode?, temperature?, maxTokens?, model?, stage?: "planner"|"section"|"chat"|"repair" }`.
   Env override dạng: `LLM_MODEL_PLANNER`, `LLM_TEMPERATURE_SECTION`… (fallback về `LLM_MODEL`/0.7 như cũ).
3. **Cost table**: `apps/api/src/services/llm-pricing.ts` — map model → giá $/1M tokens (in/out), cập nhật tay;
   model lạ → cost null (vẫn log tokens).
4. **Job accounting**: gom usage per jobId (planner + N section + retries + repair) → log `jobEvent("complete")`
   thêm `{ totalInputTokens, totalOutputTokens, estimatedCostUsd, llmCalls, cacheHitTokens }`;
   SSE `complete` đính kèm bản rút gọn để UI có thể hiển thị ("~$0.04, 12 calls") — ẩn sau flag client.
5. **Latency per stage** đã có elapsedMs — bổ sung `llmMs` (thời gian riêng của call LLM) để tách LLM vs compile.
6. Test: mock provider trả usage → job complete log tổng đúng; env per-stage override được đọc đúng.

## 4. Hướng thiết kế

- Chỉ **đo và cấu hình** — không tự động hạ model/cắt prompt (auto-budgeting là Phase 6 plan cũ, cần data trước).
- Pricing table thủ công thay vì gọi API giá — đơn giản, sai số chấp nhận được cho mục đích quan sát.

## 5. Kết quả mong muốn

- [ ] Mỗi job generate có 1 dòng log tổng kết token + cost ước tính + số call.
- [ ] Đổi planner sang model rẻ chỉ bằng env, không release code.
- [ ] Sau 1 tuần dữ liệu: biết stage nào chiếm % token lớn nhất (đầu vào cho tối ưu tiếp).

## 6. Tình huống có thể xảy ra & corner cases

- **Provider không trả usage** (lỗi mạng giữa stream) → cộng phần có được, đánh dấu `usageIncomplete: true`.
- **Stream Claude**: usage nằm ở `message_delta` cuối — parser đã đọc được (hiện chỉ log cache), mở rộng giữ luôn in/out.
- **Model đổi giá** → bảng giá sai cho tới khi cập nhật; cost luôn ghi `estimated`.
- **Nhiều instance api** → accounting per-process là đủ (log-based, aggregate ở hệ log ngoài).

## 7. Rủi ro & rollback

Rất thấp — thuần đo đạc + env mới có fallback. Chú ý duy nhất: không log nội dung prompt kèm usage
(giữ quy tắc AI_PROMPT_DEBUG hiện có).
