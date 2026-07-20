# 00/04 — Chat assistant không có lịch sử hội thoại

> Phân loại: Bug fix / Cải tiến nhỏ
> Ưu tiên: P0
> Ước lượng: 0.5–1 ngày
> Phụ thuộc: Không
> Trạng thái: Hoàn thành — thêm state `messages: AIMessage[]` trong `AIAssistant.tsx`, giữ tối đa `MAX_CHAT_TURNS=6` lượt (12 message) gửi lên backend. `applyAndClose` tách thành `applyResponse(response, { closeDialog })`: full-page mode vẫn đóng dialog như cũ (không dùng thread), chat thường không đóng + đẩy assistant message vào thread. Thread reset khi đổi `document.rootNodeId` hoặc bấm "Clear". UI thread hiển thị trên textarea, chỉ khi có message. Thêm i18n key `ai.conversation/clearConversation/appliedChangesCount/noChanges` (en+vi). Chưa làm: hint "trust Page Structure over history" trong system prompt — ghi corner case, có thể bổ sung nếu thấy model bị nhầm giữa transcript và document thật.

## 1. Mục đích

Chat assistant hoạt động như hội thoại thật: user có thể nói "đổi màu nút vừa thêm sang đỏ" và model hiểu
"nút vừa thêm" là gì từ lượt trước.

## 2. Hiện trạng & lý do

- `handleGenerate` trong `packages/builder-editor/src/ai/AIAssistant.tsx:154-158` tạo `userMessage` mới và gọi
  `sendAIMessage([userMessage], ...)` / `streamAIMessage([userMessage], ...)` — **mảng chỉ có 1 phần tử**.
- Type `AIConversation { messages, isLoading, error }` tồn tại trong `types.ts` nhưng không được dùng để giữ thread.
- Backend `/api/ai/chat` đã hỗ trợ mảng messages nhiều lượt (`body.messages.filter(m => m.role !== "system")`) —
  tức là **server sẵn sàng, client không gửi**.
- Sau khi apply command, dialog tự đóng (`applyAndClose`) → không có nơi hiển thị thread.

Docs `AI_ASSISTANT.md` gọi đây là "conversational interface" — hiện chưa đúng.

## 3. Cách làm

1. Thêm state `messages: AIMessage[]` trong `AIAssistant` (hoặc dùng lại `AIConversation`).
   Mỗi lượt: push user message → gọi API với **toàn bộ mảng** → push assistant message (chỉ giữ `message`,
   không giữ raw JSON commands trong content để tránh phình token).
2. Giới hạn cửa sổ: gửi tối đa **6 lượt gần nhất** (12 messages) — đủ ngữ cảnh, tránh phình prompt;
   hằng số `MAX_CHAT_TURNS` có thể config.
3. UI: sau khi apply command **không đóng dialog** nữa; hiển thị thread + badge "Đã áp dụng N thay đổi" mỗi lượt.
   Nút "Clear" để reset thread. (Đóng dialog vẫn giữ thread trong state cho tới khi Clear/unmount editor —
   quyết định giữ hay bỏ tuỳ UX, mặc định: giữ trong phiên editor.)
4. **Đồng bộ context mỗi lượt**: `builderContext` phải build lại tại thời điểm gửi (node vừa được thêm ở lượt trước
   phải xuất hiện trong `pageNodes`) — hiện `context` là prop truyền vào từ BuilderEditor, cần đảm bảo nó được
   rebuild theo state mới nhất (kiểm tra `useMemo` deps ở nơi gọi `buildAIContext`).
5. Full-page mode giữ hành vi cũ (one-shot qua SSE pipeline, không cần thread).

## 4. Hướng thiết kế

Giữ **stateless server** (client gửi cả thread mỗi lượt) — không thêm session storage phía API.
Assistant message lưu vào thread chỉ phần `message` văn bản; command đã apply được phản ánh qua
`pageNodes` trong context lượt sau (nguồn sự thật là document, không phải transcript).

## 5. Kết quả mong muốn

- [ ] Kịch bản 2 lượt: "thêm nút CTA vào hero" → "đổi nút đó sang màu đỏ" — lượt 2 model dùng đúng nodeId
      của nút vừa tạo (nhờ history + pageNodes mới).
- [ ] Prompt tokens lượt sau không tăng quá ~1.5x lượt đầu với thread 6 lượt (system prompt được cache phía Claude).
- [ ] Clear thread hoạt động; đóng/mở dialog không mất thread trong cùng phiên.

## 6. Tình huống có thể xảy ra & corner cases

- **User undo giữa 2 lượt** → transcript nói "đã thêm nút" nhưng document không còn nút. Nguồn sự thật là
  `pageNodes`; model có thể bối rối — chấp nhận, vì system prompt luôn nói trạng thái hiện tại. Có thể thêm dòng
  "Trust the Page Structure block over the conversation history when they conflict" vào system prompt.
- **Thread quá dài** → cắt cửa sổ 6 lượt; không summarize (tránh phức tạp sớm).
- **Streaming đứt giữa chừng** → không push assistant message rỗng; hiển thị lỗi, user gửi lại (mảng messages không đổi).
- **Đổi document/khởi tạo lại builder** → reset thread (key theo `document.rootNodeId`).
- **2 dialog AI mở song song** (chat + section popover) → mỗi cái thread riêng, không chia sẻ state.

## 7. Rủi ro & rollback

Trung bình-thấp: đổi UX dialog (không auto-close) cần user làm quen. Feature-flag đơn giản:
nếu muốn hành vi cũ, set `MAX_CHAT_TURNS = 1` + auto-close. Rollback dễ.
