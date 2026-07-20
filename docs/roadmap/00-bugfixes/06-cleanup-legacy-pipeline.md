# 00/06 — Dọn pipeline AI v1 (dead code)

> Phân loại: Cải tiến (kỹ thuật, dọn dẹp)
> Ưu tiên: P0
> Ước lượng: 0.5 ngày
> Phụ thuộc: Không
> Trạng thái: Hoàn thành — xoá `outline-generator.ts`, `section-generator.ts`, `page-patterns.ts` (đã grep xác nhận 0 import bên ngoài trước khi xoá). Xoá `SectionOutline`/`PageOutline`/nhánh `outline_ready` khỏi `SSEEventType` trong `ai.types.ts` (server). Xoá nhánh xử lý SSE event `outline_ready` chết trong `usePageGenerator.ts` — giữ nguyên `SectionOutlineView` (type client-local, vẫn dùng thật cho outline UI, không liên quan `SectionOutline` phía server). `pnpm typecheck` + 43 test apps/api pass.

## 1. Mục đích

Codebase chỉ chứa **một** pipeline generate đang chạy; người đọc (và AI agent đọc code) không bị dẫn nhầm
sang pipeline cũ đã bị thay thế.

## 2. Hiện trạng & lý do

Pipeline v1 còn nguyên trong repo nhưng **không còn route nào import**:

- `apps/api/src/services/outline-generator.ts` (168 dòng) — Step 1 cũ, có Zod schema + `extractJSON` riêng (duplicate với `json-utils.ts`).
- `apps/api/src/services/section-generator.ts` (310 dòng) — sinh command trực tiếp từ LLM (mô hình cũ, trái nguyên tắc "LLM chỉ trả intent" hiện tại).
- `apps/api/src/services/page-patterns.ts` (141 dòng) — chỉ được `outline-generator` import.

Kiểm chứng: `ai.routes.ts` chỉ import từ `page-plan-generator` / `section-plan-generator` / `section-plan-compiler`.
Grep import `outline-generator|section-generator|page-patterns` → chỉ có `outline-generator → page-patterns`.

Tác hại: (1) đọc nhầm — tài liệu `docs/roadmap/legacy/AI_SYSTEM_PROJECT_OVERVIEW_AND_UPGRADE_PLAN.md` mục 16
mô tả v1 như "hiện tại"; (2) SSE event `outline_ready` vẫn được client xử lý (`usePageGenerator.ts:222-229`)
dù server không bao giờ phát; (3) 600+ dòng phải maintain vô ích.

## 3. Cách làm

1. Xoá 3 file v1 + test đi kèm nếu chỉ test code v1. Trước khi xoá, chạy:
   `grep -rn "outline-generator\|section-generator\|page-patterns" apps packages --include="*.ts*"` để chắc chắn 0 usage.
2. Xoá nhánh `outline_ready` trong `usePageGenerator.ts` + type `SectionOutline`/`PageOutline` trong
   `apps/api/src/types/ai.types.ts` nếu không còn ai dùng (types này chỉ phục vụ v1).
3. Giữ lịch sử: file đã có trong git history, **không cần** thư mục `legacy/` cho code (khác với docs).
4. Cập nhật docs: mục 16 của upgrade plan cũ đã chuyển vào `docs/roadmap/legacy/` kèm ghi chú "superseded";
   `.claude/docs/AI_ASSISTANT.md` không nhắc outline generator (kiểm tra lại khi refresh docs).

## 4. Hướng thiết kế

Xoá hẳn thay vì `@deprecated` — vì đây là app nội bộ (`apps/api`), không phải public package, không có consumer ngoài.

## 5. Kết quả mong muốn

- [ ] `pnpm build` + `pnpm test` xanh sau khi xoá.
- [ ] Grep 3 tên file cũ ra 0 kết quả trong `apps/` và `packages/`.
- [ ] `usePageGenerator` không còn nhánh `outline_ready`.

## 6. Tình huống có thể xảy ra & corner cases

- **Có test đang import code v1** (`page-plan-generator.test.ts` không đụng; kiểm tra `validate-chat-commands.test.ts`) →
  nếu test chỉ tồn tại để test v1 thì xoá cùng; nếu test dùng chung fixture thì tách fixture ra trước.
- **Ai đó có branch đang sửa v1** → thông báo trong PR description; conflict là tín hiệu tốt (họ đang sửa dead code).
- **Client cũ (bundle đã deploy) nhận SSE mới** → không liên quan, server không đổi event nào đang phát.

## 7. Rủi ro & rollback

Bằng 0 về runtime (code không được gọi). Rollback = `git revert`.
