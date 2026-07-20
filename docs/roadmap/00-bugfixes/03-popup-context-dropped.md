# 00/03 — Popup context bị drop trước khi tới backend (AI "mù" popup)

> Phân loại: Bug fix
> Ưu tiên: P0
> Ước lượng: 0.5 ngày
> Phụ thuộc: Không — nhưng là điều kiện tiên quyết cho [04-popup-modal/04-ai-popup-generation.md](../04-popup-modal/04-ai-popup-generation.md) và [01-interactions-events/05-ai-event-wiring.md](../01-interactions-events/05-ai-event-wiring.md)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

AI chat phải **biết** trong document có những popup nào (id, tên, kind, trigger) và user đang edit surface nào
(page hay popup) — để có thể trả lời đúng câu như "gắn nút này mở popup khuyến mãi" hoặc "sửa nội dung popup đang mở".

## 2. Hiện trạng & lý do

Chuỗi dữ liệu bị đứt ở giữa:

1. `buildAIContext` **đã build đầy đủ** `activeSurface` (page/popup + selection shell/content) và `availablePopups`
   (id, name, enabled, kind, placement, rootNodeId, autoTrigger) —
   `packages/builder-editor/src/ai/buildAIContext.ts:196-213`.
2. Nhưng `sendAIMessage` / `streamAIMessage` khi dựng payload **không đưa 2 field này vào** `builderContext` —
   `packages/builder-editor/src/ai/AIService.ts:173-187` và `:230-243`.
3. Server `ChatRequest.builderContext` cũng **không khai báo** 2 field — `apps/api/src/types/ai.types.ts:141-170`,
   và `buildChatSystemPrompt` (`apps/api/src/routes/ai.routes.ts:284-352`) không render block popup nào.

Trong khi đó `.claude/docs/AI_ASSISTANT.md` (mục Command Whitelist) khẳng định *"AI context includes existing popups,
the active editing surface…"* — docs mô tả một hành vi không tồn tại. `UPDATE_INTERACTIONS` nằm trong whitelist nhưng
LLM không có popup id nào để điền vào `showModal.targetId` → tính năng chỉ chạy khi user tự dán id.

## 3. Cách làm

1. **Client** — thêm vào payload của cả 2 hàm trong `AIService.ts`:
   ```ts
   builderContext: {
     ...,
     activeSurface: context.activeSurface,
     availablePopups: context.availablePopups,
   }
   ```
2. **Server types** — thêm vào `ChatRequest["builderContext"]` (`ai.types.ts`):
   ```ts
   activeSurface?: { type: "page" } | { type: "popup"; popupId: string; rootNodeId: string; selection: "shell" | "content" | null };
   availablePopups?: Array<{ id: string; name: string; enabled: boolean; kind: string; placement: string; rootNodeId: string; autoTrigger: string }>;
   ```
3. **System prompt** — trong `buildChatSystemPrompt` thêm block (chỉ khi có popup, để không tốn token):
   ```
   ## Popups
   Active surface: page | popup "<name>" (id, editing shell|content)
   Available popups (use these ids for showModal/hideModal interaction targets):
   - id: "...", name: "...", kind: modal|drawer|bottomSheet|bar|fullscreen, trigger: manual|pageLoad|...
   ```
4. **COMMAND_REFERENCE** — mô tả tối thiểu shape `UPDATE_INTERACTIONS` với ví dụ `showModal` dùng popup id thật
   (chi tiết đầy đủ nằm ở hạng mục [01/05](../01-interactions-events/05-ai-event-wiring.md); ở đây chỉ cần 3–4 dòng ví dụ).
5. **Edit trong popup**: khi `activeSurface.type === "popup"`, hướng dẫn model dùng `rootNodeId` của popup làm parent
   thay vì root của page (thêm 1 câu trong system prompt).
6. Test: `validate-chat-commands.test.ts` thêm case — context có 1 popup, prompt "mở popup X khi bấm nút" →
   mock LLM trả `UPDATE_INTERACTIONS` với targetId đúng, đi qua gate không bị drop.

## 4. Hướng thiết kế

Chỉ gửi **summary** popup (7 field), không gửi cả `PopupDefinition` (V6 rất lớn: variants, campaigns, analytics…).
Nếu user hỏi sâu về 1 popup cụ thể → hạng mục tương lai có thể thêm cơ chế "focused popup" giống `pageNodesSummary`.

## 5. Kết quả mong muốn

- [ ] Chat: "thêm nút Đăng ký ở hero, bấm vào mở popup <tên popup có thật>" → command `ADD_NODE` + `UPDATE_INTERACTIONS`
      với `targetId` = popup id đúng, apply chạy được ở runtime.
- [ ] Đang edit popup content, chat "thêm 1 dòng mô tả dưới tiêu đề" → node mới nằm trong popup, không rơi ra page.
- [ ] Token tăng thêm < ~150 tokens khi có ≤5 popup (đo bằng logger).
- [ ] Docs AI_ASSISTANT.md giữ nguyên câu "popup-aware" nhưng giờ **đúng sự thật**.

## 6. Tình huống có thể xảy ra & corner cases

- **Document không có popup** → không render block Popups (tiết kiệm token, tránh model bịa id).
- **Popup disabled** → vẫn liệt kê kèm `enabled: false`; model được dặn không auto-trigger popup disabled nhưng
  vẫn có thể wire interaction (user sẽ bật sau).
- **Model bịa popup id** → validation gate hiện **không check** `UPDATE_INTERACTIONS` payload (chỉ check ADD_NODE).
  Corner case này xử lý triệt để ở [01/05](../01-interactions-events/05-ai-event-wiring.md) (validate targetId ∈ availablePopups);
  tạm thời chấp nhận vì runtime `openPopup(id)` với id sai chỉ no-op + log.
- **Nhiều variant/locale root** → `rootNodeId` gửi đi là root **base**; nếu user đang edit variant, `activeSurface.rootNodeId`
  đã là root của variant (BuilderEditor đã tính `activeRootNodeId` ưu tiên variant → locale → base). Dùng giá trị đó.
- **Backward compat**: field optional — backend cũ nhận payload mới bỏ qua field lạ; client cũ không gửi → server render như hiện tại.

## 7. Rủi ro & rollback

Thấp — thêm field optional 2 đầu. Rollback: bỏ 2 dòng client là hệ thống về trạng thái cũ.
