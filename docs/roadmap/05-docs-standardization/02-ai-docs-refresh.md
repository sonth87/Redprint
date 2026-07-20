# 05/02 — Refresh `.claude/docs`: sửa drift + bổ sung POPUPS.md

> Phân loại: Cải tiến (docs cho AI/maintainer)
> Ưu tiên: P2
> Ước lượng: 1 ngày
> Phụ thuộc: Làm sau [00-bugfixes](../00-bugfixes/) để không đặc tả lại hành vi lỗi
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

`.claude/docs` là nguồn context chính cho AI agent làm việc trên repo — docs sai làm agent sửa code sai.
Đưa toàn bộ file về khớp code, bổ sung đặc tả cho popup system (tính năng lớn nhất chưa có docs).

## 2. Việc cụ thể theo file

### 2.1 `AI_ASSISTANT.md` (drift nặng nhất — viết lại các mục sau)
- **Xoá** mục "Provider Adapters" (client-side OpenAI/Gemini/Claude) + "Adding a New Provider" 5 bước cũ →
  thay bằng mục "Backend LLM providers" mô tả `apps/api/src/services/llm-client.ts`
  (env `LLM_PROVIDER`/`LLM_MODEL`/`LLM_API_KEY`, default models đúng theo code: gpt-4o / gemini-2.0-flash /
  claude-sonnet-4-5, timeout `LLM_TIMEOUT_MS`, prompt caching Claude) + hướng dẫn thêm provider mới ở backend.
- **Sửa** mục System Prompt: backend sở hữu (`buildChatSystemPrompt` trong ai.routes.ts); `config.systemPrompt`
  client là legacy không dùng — đánh dấu deprecated trong cả types.ts.
- **Sửa** Command Whitelist: danh sách 12 lệnh + ghi chú nguồn duy nhất `allowedCommands.ts` (sau [00/05](../00-bugfixes/05-command-whitelist-mismatch.md)).
- **Sửa** mô tả chat: auto-apply (không còn "Apply button"); bổ sung mục **Repair loop** (`repairDroppedCommands`,
  `REPAIR_HINTS`, 1 retry) và `/chat/stream` SSE — hiện chỉ có trong ARCHITECTURE changelog.
- **Điều kiện hoá** câu popup-awareness theo trạng thái [00/03](../00-bugfixes/03-popup-context-dropped.md) (viết đúng những field thực gửi).
- **Bổ sung** mục ai-tools (rewrite/tone) + ai-section popover: mô tả config file, prompt templates.

### 2.2 `POPUPS.md` (file mới — đặc tả popup system V6)
Nội dung tối thiểu:
- Data model: `PopupDefinition` và các types con (kind configs, behavior, animation, rules) — trỏ file
  `builder-core/src/document/popups.ts` thay vì copy toàn bộ interface.
- Content ownership rules (variant/locale rootNodeId — cascade delete, deep clone) — quy tắc quan trọng nhất, dễ phá.
- Lifecycle runtime: open/close flow, stack modes, campaign arbitration (queue/suppress/replace/stack),
  frequency/targeting/schedule gating — kèm 1 mermaid sequence.
- Analytics events contract + goal types.
- Editor surfaces: shell vs content selection, template registry (client + server routes).
- Migration lịch sử V3→V6 (`builder-core/src/migration/popupV*.ts`) + quy tắc "đổi schema = viết migration".
- Command list popup (`CREATE_POPUP`… `SET_CAMPAIGN_STATUS`) — bảng từ `commands/built-in.ts`.

### 2.3 Các file khác — quét nhanh một lượt
- `DATA_MODEL.md`: xác nhận có `interactions` field + popup fields của BuilderDocument; bổ sung nếu thiếu.
- `RUNTIME.md`: bổ sung trạng thái thực của InteractionBinder (action nào chạy — cập nhật lại sau [01/01](../01-interactions-events/01-runtime-dead-actions.md)).
- `SPECIFICATION.md` + README gốc: thêm link sang `/docs` user-guide và `docs/roadmap/`; bảng env AI đầy đủ
  (`AI_MAX_SECTION_ATTEMPTS`, `AI_SECTION_CONCURRENCY`, `AI_DEBUG`, `AI_PROMPT_DEBUG`, `AI_API_KEY`,
  `AI_RATE_LIMIT_*`, `LLM_TIMEOUT_MS`).
- Mỗi file `.claude/docs/*` thêm 1 dòng header chuẩn:
  `> Audience: AI agents & maintainers. User-facing overview: /docs/user-guide/<trang tương ứng>`.

### 2.4 `ARCHITECTURE.md` — chỉ đề xuất, không tự sửa
Quy định hiện hành: AI agent không edit `.claude/ARCHITECTURE.md` trực tiếp. Tạo file đề xuất
`docs/roadmap/05-docs-standardization/architecture-md-proposals.md` khi thực hiện, liệt kê:
(1) xoá note "P2 deferred" đã lỗi thời ở cuối mục AI Generation Subsystem; (2) cập nhật đường dẫn
2 file docs đã chuyển vào `docs/roadmap/legacy/`. Maintainer tự áp.

## 3. Kết quả mong muốn

- [ ] Đọc `AI_ASSISTANT.md` từ đầu đến cuối không gặp câu nào mô tả code không tồn tại (review chéo với code).
- [ ] `POPUPS.md` đủ để một agent mới implement được 1 popup feature nhỏ không cần đọc toàn bộ source.
- [ ] Mọi file `.claude/docs` có header audience + link user-guide.
- [ ] File đề xuất cho ARCHITECTURE.md được tạo và gửi maintainer.

## 4. Corner cases & lưu ý

- **Docs viết trước khi roadmap items hoàn thành** → mô tả hành vi HIỆN TẠI, không mô tả hành vi tương lai;
  chỗ nào có roadmap item liên quan thì thêm 1 dòng `> Planned: see docs/roadmap/...` — phân biệt rõ đặc tả vs kế hoạch.
- **Tránh copy interface dài vào docs** → trỏ file:line; interface đổi thì docs không phải đổi theo từng field.
- `.claude.vi/` (bản dịch tiếng Việt của .claude — CLAUDE.md có nhắc): hiện không tồn tại trong repo;
  quyết định: **không tạo** — user-facing tiếng Việt đã có `/docs/user-guide`; đề xuất maintainer bỏ câu đó
  khỏi CLAUDE.md (ghi vào file đề xuất 2.4).
