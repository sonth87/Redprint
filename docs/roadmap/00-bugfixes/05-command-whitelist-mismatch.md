# 00/05 — Ba danh sách lệnh AI cho phép lệch nhau

> Phân loại: Bug fix
> Ưu tiên: P0
> Ước lượng: 0.25 ngày
> Phụ thuộc: Không
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Một nguồn sự thật duy nhất cho câu hỏi "AI được phép dispatch những command nào" — LLM được dạy gì thì client
phải cho phép đúng cái đó, và docs mô tả đúng danh sách đó.

## 2. Hiện trạng & lý do

Ba nơi định nghĩa lệch nhau:

| Nơi | Vị trí | Danh sách |
|-----|--------|-----------|
| `COMMAND_REFERENCE` (dạy LLM) | `apps/api/src/services/command-reference.ts` | 12 lệnh: ADD_NODE, UPDATE_STYLE, UPDATE_PROPS, RENAME_NODE, UPDATE_RESPONSIVE_STYLE, UPDATE_RESPONSIVE_PROPS, **TOGGLE_RESPONSIVE_HIDDEN**, **RESET_RESPONSIVE_STYLE**, DUPLICATE_NODE, UPDATE_CANVAS_CONFIG, UPDATE_INTERACTIONS (+ REMOVE_NODE nội bộ) |
| `ALLOWED_COMMANDS` (page generator) | `packages/builder-editor/src/ai/page-generator/usePageGenerator.ts:46-59` | 12 lệnh (khớp trên + REMOVE_NODE) |
| `ALLOWED_AI_COMMANDS` (chat) | `packages/builder-editor/src/ai/AIAssistant.tsx:33-44` | **10 lệnh — thiếu TOGGLE_RESPONSIVE_HIDDEN, RESET_RESPONSIVE_STYLE** |

Hậu quả: LLM trả lệnh responsive-hidden theo đúng tài liệu được dạy → chat path lọc **im lặng** (filter trong
`applyAICommandsProgressive`), user thấy "AI nói đã ẩn trên mobile" nhưng không có gì xảy ra.
Docs `.claude/docs/AI_ASSISTANT.md` lại ghi danh sách 10 lệnh (bản cũ).

## 3. Cách làm

1. Tạo **một hằng số chia sẻ** trong `packages/builder-editor/src/ai/allowedCommands.ts`:
   ```ts
   export const ALLOWED_AI_COMMANDS = new Set([
     "ADD_NODE", "UPDATE_PROPS", "UPDATE_STYLE",
     "UPDATE_RESPONSIVE_PROPS", "UPDATE_RESPONSIVE_STYLE",
     "TOGGLE_RESPONSIVE_HIDDEN", "RESET_RESPONSIVE_STYLE",
     "RENAME_NODE", "DUPLICATE_NODE", "REMOVE_NODE",
     "UPDATE_CANVAS_CONFIG", "UPDATE_INTERACTIONS",
   ]);
   ```
   `AIAssistant.tsx` và `usePageGenerator.ts` cùng import — xoá 2 bản copy nội bộ.
2. Thêm comment trỏ chéo trong `command-reference.ts` (server) ↔ `allowedCommands.ts` (client):
   "khi thêm lệnh vào file này phải thêm vào file kia" (2 package không share code trực tiếp vì api không depend
   builder-editor — chấp nhận đồng bộ bằng convention + test).
3. Viết **contract test** phía client: parse `COMMAND_REFERENCE` từ một fixture copy (hoặc export danh sách lệnh dạng
   mảng từ server rồi snapshot vào shared test data) — đảm bảo mọi lệnh trong reference ⊆ allowed set.
   Tối thiểu: unit test hard-code danh sách kỳ vọng ở cả 2 phía để CI đỏ khi ai đó sửa lệch.
4. Cập nhật `.claude/docs/AI_ASSISTANT.md` mục Command Whitelist về danh sách 12 lệnh
   (thuộc hạng mục [05-docs-standardization/02-ai-docs-refresh.md](../05-docs-standardization/02-ai-docs-refresh.md), nhưng sửa luôn trong PR này cho trọn vẹn).

## 4. Hướng thiết kế

Filter phía client vẫn giữ (defense-in-depth: backend validation gate + client whitelist), chỉ thống nhất nội dung.
Cân nhắc tương lai: chuyển whitelist vào `packages/shared` để cả api (nếu sau này validate lệnh ngoài ADD_NODE)
và editor cùng import — chưa cần ngay.

## 5. Kết quả mong muốn

- [ ] Chat prompt "ẩn section này trên mobile" → `TOGGLE_RESPONSIVE_HIDDEN` được apply thật.
- [ ] Chỉ còn 1 định nghĩa whitelist phía editor; grep `ALLOWED_AI_COMMANDS|ALLOWED_COMMANDS` ra đúng 1 file định nghĩa.
- [ ] Test đồng bộ chạy trong CI.

## 6. Tình huống có thể xảy ra & corner cases

- **Lệnh nguy hiểm không bao giờ vào whitelist**: `REMOVE_NODES`, `MOVE_NODE`, nhóm `*_POPUP`, `SET_THEME_COLORS` —
  ghi rõ thành comment "deny-by-default, thêm mới phải review" để người sau không tiện tay thêm.
- **REMOVE_NODE**: giữ trong whitelist (fullPageMode cần), nhưng lưu ý nó cho phép chat LLM xoá node bất kỳ nếu model
  trả về — hành vi hiện tại đã vậy; validation gate không chặn REMOVE_NODE. Nếu muốn siết: chỉ cho REMOVE_NODE khi
  `fullPageMode=true` (thêm 1 nhánh filter theo context) — quyết định trong PR.
- **Command mới trong tương lai** (vd `CREATE_POPUP_FROM_TEMPLATE` ở [04/04](../04-popup-modal/04-ai-popup-generation.md)) → quy trình: thêm reference → thêm whitelist → thêm test → cập nhật docs, trong **cùng một PR**.

## 7. Rủi ro & rollback

Không đáng kể. Mở rộng whitelist chat thêm 2 lệnh responsive vốn đã được phép ở page-generator path.
