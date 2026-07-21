# Đề xuất sửa `.claude/ARCHITECTURE.md` và `.claude/RULES.md`

> AI agent không tự sửa `.claude/ARCHITECTURE.md` hoặc `.claude/RULES.md` trực tiếp — cả hai đều ghi
> rõ điều này trong chính nội dung của chúng (`RULES.md`: *"AI agents must never modify
> ARCHITECTURE.md or RULES.md directly — propose changes via a dedicated PR"*), và
> `docs/roadmap/legacy/AI_GENERATION_V2_ARCHITECTURE_PROPOSAL.md` áp dụng quy tắc tương tự. File này
> liệt kê các thay đổi cần maintainer tự áp, phát sinh từ việc triển khai
> [05/02](./02-ai-docs-refresh.md) và [05/03](./03-doc-governance.md).
>
> Trạng thái: Chờ maintainer duyệt — 2026-07-20

---

## Đề xuất 1 — Xoá note "deferred (P2)" đã lỗi thời

**Vị trí:** dòng 504–506, cuối mục "AI Generation Subsystem" → "Client config".

**Hiện tại:**
```markdown
> **Note:** `streamingEnabled` chat "streaming" is currently a client-side simulation (the chat
> endpoint returns JSON); only `/generate-page` is true SSE. Real chat token-streaming and
> closed-loop LLM repair are deferred (P2).
```

**Vấn đề:** Note này tự mâu thuẫn với chính changelog v2.0 của file (dòng 8, ngay đầu file):

> v2.0 — **AI P2: Real streaming + closed-loop repair** (`apps/api` + `builder-editor/src/ai`): Added
> `POST /api/ai/chat/stream` — a real SSE endpoint that streams LLM tokens via `callLLMStream()`
> [...] Added **closed-loop repair** in `repairDroppedCommands()` (ai.routes.ts) [...]

Cả `/api/ai/chat/stream` (SSE thật, không phải simulation) và `repairDroppedCommands()` đều đã tồn
tại và đang chạy trong code hiện tại — đã xác nhận lại khi viết `.claude/docs/AI_ASSISTANT.md`
(2026-07-20): `apps/api/src/routes/ai.routes.ts` có route `POST /chat/stream` (dòng 641) dùng
`callLLMStream()` thật của `llm-client.ts`, và `repairDroppedCommands`/`REPAIR_HINTS` được dùng ở cả
`/chat` và `/chat/stream`.

**Đề xuất:** xoá toàn bộ block note trên. Không cần thay bằng note khác — hành vi P2 giờ là hành vi
mặc định, không phải một trạng thái tạm thời cần cảnh báo.

```diff
 `AIConfig` (`builder-editor/src/ai/types.ts`): `backendUrl`, `backendAuthToken` (bearer for the
 perimeter). Auth header is built once via `buildBackendHeaders()` and reused by both fetch sites
 (`AIService.ts`, `page-generator/usePageGenerator.ts`).

-> **Note:** `streamingEnabled` chat "streaming" is currently a client-side simulation (the chat
-> endpoint returns JSON); only `/generate-page` is true SSE. Real chat token-streaming and
-> closed-loop LLM repair are deferred (P2).
-
 ---
```

---

## Đề xuất 2 — Đường dẫn tới 2 file docs đã chuyển vào legacy

**Kiểm tra:** grep `AI_SYSTEM_PROJECT_OVERVIEW` và `AI_GENERATION_V2_ARCHITECTURE` trong
`ARCHITECTURE.md` → **0 kết quả**. File này không tham chiếu 2 file đó — không cần sửa gì ở đây.

(Mục này được liệt kê trong roadmap gốc [05/02](./02-ai-docs-refresh.md#24-architecturemd--chỉ-đề-xuất-không-tự-sửa)
như một hạng mục cần kiểm tra; xác nhận không áp dụng, ghi lại để tránh kiểm tra lại lần sau.)

---

## Đề xuất 3 (phát sinh khi rà soát) — Câu về `.claude.vi/` trong `CLAUDE.md`

**Không thuộc `ARCHITECTURE.md`** nhưng cùng loại thay đổi (maintainer-owned) nên ghi chung ở đây theo
đúng ghi chú corner-case trong [05/02, mục 4](./02-ai-docs-refresh.md#4-corner-cases--lưu-ý):
`CLAUDE.md` từng có câu "Vietnamese translations available in `.claude.vi/`" — thư mục này không tồn
tại trong repo. Đã sửa trực tiếp trong `CLAUDE.md` khi 2026-07-20 restructuring diễn ra (thay bằng
bảng 3-tầng docs: `.claude/docs` / `/docs/user-guide` / `docs/roadmap`) — `CLAUDE.md` **không** nằm
trong danh sách file bị khoá (chỉ `ARCHITECTURE.md` và `RULES.md` bị khoá, xem đầu file này). Ghi
lại ở đây chỉ để maintainer biết thay đổi đã xảy ra, không cần hành động thêm.

---

## Đề xuất 4 — Chép "what-changed → what-docs" matrix vào `RULES.md`

**Bối cảnh:** [05/03 (doc governance)](./03-doc-governance.md) đề xuất ma trận "sửa gì → cập nhật docs
nào" được lưu ở cả `CLAUDE.md` và `RULES.md`. `CLAUDE.md` đã được cập nhật trực tiếp (file không bị
khoá) — xem mục "What-changed → what-docs matrix" mới trong đó. `RULES.md` bị khoá nên chỉ đề xuất ở
đây.

**Đề xuất:** thêm một mục ngắn vào `RULES.md` (ví dụ ngay sau "Override Policy") trỏ sang bảng đã có
trong `CLAUDE.md` thay vì lặp lại nội dung — `RULES.md` tự nhận là "shared across all projects", nên
một ma trận đặc thù cho *dự án này* (đường dẫn `apps/api`, `command-reference.ts`, ...) hợp lý hơn khi
nằm ở `CLAUDE.md` (per-project) chứ không phải `RULES.md` (baseline dùng chung). Gợi ý nội dung thêm
vào `RULES.md`:

```markdown
## Docs Governance

Every project should maintain a "what-changed → what-docs" matrix mapping common code changes to the
docs that must be updated in the same PR. See the current project's `CLAUDE.md` for its matrix.
Run the project's docs-check script (if any) before committing docs changes.
```

Đây là gợi ý, không phải bắt buộc — maintainer quyết định có đáng thêm baseline-level guidance này vào
`RULES.md` hay để mỗi project tự quyết như `my-builder` đã làm.

---

## Tổng kết hành động cho maintainer

- [ ] Áp dụng Đề xuất 1 (xoá 3 dòng note lỗi thời trong `ARCHITECTURE.md`).
- [ ] Đề xuất 2: không cần hành động (đã xác nhận không áp dụng).
- [ ] Đề xuất 3: không cần hành động (đã tự sửa ở `CLAUDE.md`, chỉ để tham khảo).
- [ ] Đề xuất 4 (tuỳ chọn): cân nhắc thêm mục "Docs Governance" ngắn vào `RULES.md`.
