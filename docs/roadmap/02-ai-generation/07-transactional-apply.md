# 02/07 — Transactional apply: section nguyên tử + undo theo section

> Phân loại: Cải tiến
> Ưu tiên: P4
> Ước lượng: 0.5–1 ngày (giảm từ 2 ngày sau khi khảo sát — xem mục 2)
> Phụ thuộc: Không
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Hai mục tiêu **độc lập** (đừng gộp — chúng cần cơ chế khác nhau):

- **(A) Undo cả trang bằng ít lần Ctrl+Z**: một lần undo hoàn tác cả section (hoặc cả trang generate),
  không phải bấm Ctrl+Z hàng trăm lần cho từng node.
- **(B) Atomic apply**: nếu một command giữa chừng fail, không để lại section dở dang trên canvas —
  hoặc cả section vào, hoặc không có gì (rồi dùng fallback).

## 2. Hiện trạng & lý do — QUAN TRỌNG: đã khảo sát code, khác giả định roadmap gốc

**Phát hiện then chốt (2026-07-20):** `CommandEngine` + `HistoryStack` **đã có sẵn cơ chế `groupId`
coalescing** — roadmap bản gốc (viết trước khi đọc code) đề xuất thêm "snapshot transaction API" mới,
nhưng thực tế không cần cho mục tiêu (A):

- `Command` có field `groupId` optional; `HistoryStack.coalesce()`
  (`packages/builder-core/src/history/HistoryStack.ts:49-55`) và `HistoryStack.undo()/redo()`
  (`:63-113`) **gom mọi entry cùng `groupId` thành một khối undo/redo atomic**. Đã serializable, đã test
  (`tests/history/undoRedo.integration.test.ts`). Dùng cho drag-gesture coalescing hiện tại.
- Nghĩa là mục tiêu (A) chỉ cần: **gán cùng một `groupId` cho mọi command của một section (hoặc cả job)**
  khi dispatch — không cần snapshot document, không tốn memory clone, không thêm API mới vào core.

⚠️ **Nhưng `groupId` KHÔNG giải quyết mục tiêu (B).** Mỗi command vẫn được commit ngay khi dispatch
(`CommandEngine.dispatch` không có "chưa commit"). Nếu command 12/40 fail, 11 command đầu đã vào document
rồi. `groupId` chỉ giúp undo chúng cùng lúc **sau khi apply xong** — không ngăn section dở dang xuất hiện
tạm thời, và không tự rollback. (B) cần một cơ chế riêng ở client.

**Hiện trạng cụ thể:**
- `applyAICommandsProgressive` dispatch từng command, lỗi thì `console.warn` và **đi tiếp**
  (`packages/builder-editor/src/ai/applyAICommandsProgressive.ts` — 2 vòng dispatch, catch chỉ warn).
- Command AI hiện **không set `groupId`** → mỗi node là 1 entry history riêng → full-page generate
  ~200 command = ~200 lần Ctrl+Z.

## 3. Cách làm

### 3.1 Mục tiêu (A) — undo theo section, dùng `groupId` (nhẹ, không đụng core)

1. Trong `usePageGenerator` / `AIAssistant` khi gọi `applyAICommandsProgressive`: truyền thêm một
   `groupId` ổn định cho batch — mỗi **section** một `groupId` (VD `ai-<jobId>-<sectionId>`), hoặc cả job
   một `groupId` nếu muốn "undo cả trang một phát" (quyết định UX — xem 3.3).
2. `normalizeAICommands` / `applyAICommandsProgressive` gắn `groupId` đó vào từng command trước khi
   `dispatch({ type, payload, groupId })`. `CommandEngine.dispatch` đã đọc `command.groupId` và
   `HistoryStack.coalesce` xử lý phần còn lại — **không sửa gì trong core**.
3. Lưu ý coalescing hiện tại: `coalesce()` chỉ **thay `command`** của entry top cùng groupId, giữ
   `inverseCommand` **đầu tiên** (thiết kế cho gesture: nhiều bước → 1 undo về trạng thái trước gesture).
   Với AI, mỗi command là ADD_NODE **khác node** — không phải cùng node bị sửa nhiều lần. Cần kiểm tra:
   coalesce theo groupId có gộp đúng nhiều ADD_NODE khác nhau không, hay chỉ giữ inverse của node đầu
   (làm undo chỉ xoá 1 node)? **Đây là điểm phải verify bằng test trước khi tin** — nếu coalesce không
   hợp cho multi-node, thì cần: hoặc (a) mở rộng `HistoryStack` để một groupId giữ **mảng** inverse
   (undo chạy ngược tất cả), hoặc (b) `undo()` grouped đã pop tất cả entry cùng groupId — nghĩa là
   **đừng coalesce, cứ push nhiều entry cùng groupId** và để `undo()` gom lại (đọc lại `:76-84`: grouped
   undo pop mọi entry cùng groupId → đây mới là đường đúng cho AI, không phải coalesce).
   → **Kết luận thiết kế:** AI commands push **nhiều entry cùng groupId** (không coalesce), `undo()` sẵn
   có gom cả nhóm. Coalesce chỉ dành cho gesture (cùng node). Cần đảm bảo `dispatch` không nhầm sang
   nhánh coalesce — kiểm tra: coalesce chỉ chạy khi top entry **cùng groupId**, nên command AI thứ 2
   cùng groupId sẽ bị coalesce nhầm với command thứ 1. **Phải xử lý:** thêm cờ phân biệt
   "gesture-coalesce" vs "batch-group" — đơn giản nhất: một field `coalesce?: boolean` trên Command
   (default false), `dispatch` chỉ gọi `coalesce()` khi `command.coalesce === true`. Gesture set true,
   AI set false. Đây là thay đổi **nhỏ, an toàn** ở core (thêm 1 điều kiện), khác hẳn snapshot API lớn.

### 3.2 Mục tiêu (B) — atomic apply (rollback khi fail), client-side

1. Trong `applyAICommandsProgressive`, đổi từ "warn và đi tiếp" sang: nếu một command fail (dispatch trả
   `success: false` hoặc throw), **dừng batch section đó** và rollback các command đã apply của **chính
   section đó**.
2. Rollback client-side tận dụng chính history: các command đã dispatch trong section này đều cùng
   `groupId` (từ 3.1) → gọi một `undo()` sẽ gỡ sạch cả nhóm đã-apply-dở. Cần API nhỏ: cho phép caller
   "undo nhóm groupId X" (không phải undo top of stack) — hoặc đơn giản hơn: vì section đang apply là
   nhóm mới nhất trên stack, `engine.undo()` một lần là gỡ đúng nhóm dở dang.
   → **Thiết kế v1 tối giản:** khi section fail giữa chừng, gọi `undo()` một lần (gỡ nhóm dở), rồi apply
   `fallbackCommands` của section đó (đường `section_failed` đã có sẵn UI + fallback). Không cần
   `rollbackBatch` API riêng.
3. Progressive 2-phase (container trước, leaf sau rAF): giữ nguyên. Nếu fail ở phase 2 (leaf), undo nhóm
   cũng gỡ luôn container phase 1 (cùng groupId). Đúng kỳ vọng.

### 3.3 Undo UX

- Mỗi section = 1 groupId → undo cả trang generate ≈ (số section + 1 skeleton) lần Ctrl+Z. Đủ tốt.
- Tuỳ chọn: nút "Undo generation" trong PageGeneratorModal khi `phase=done` — pop liên tiếp các nhóm
  có groupId prefix `ai-<jobId>-`. Cần lưu danh sách groupId của job. **Optional, làm sau nếu cần.**

### 3.4 Test

- Core: command cùng groupId (coalesce=false) push nhiều entry; `undo()` gỡ cả nhóm; gesture
  (coalesce=true) vẫn coalesce như cũ (không regression `undoRedo.integration.test.ts`).
- Editor: inject 1 command fail giữa section → sau apply, canvas không có node nào của section đó
  (đã rollback), và fallback được apply.
- Undo sau generate N section = N (+1) bước về trạng thái ban đầu.

## 4. Hướng thiết kế

- **Tận dụng `groupId` có sẵn thay vì snapshot API mới** — không clone document, không tốn memory, không
  thêm surface API lớn vào core. Thay đổi core duy nhất: thêm field `coalesce?: boolean` để tách
  gesture-coalesce khỏi batch-group (một điều kiện `if`).
- Rollback client-side qua `undo()` thay vì restore snapshot — dùng đúng cơ chế inverse-command đã có,
  đúng tuyệt đối, không nhân đôi logic revert.

## 5. Kết quả mong muốn

- [ ] Không còn section khuyết tồn tại sau khi apply (test injected failure → rollback + fallback).
- [ ] Undo cả trang generate ≤ (số section + 1) lần Ctrl+Z.
- [ ] Không regression undo/redo thao tác tay + gesture coalescing (`undoRedo.integration.test.ts` pass).
- [ ] Dispatch đơn lẻ (không groupId) giữ nguyên hành vi.

## 6. Tình huống có thể xảy ra & corner cases

- **coalesce nhầm command AI thứ 2 với thứ 1** (nếu quên tách `coalesce` flag) → undo chỉ gỡ 1 node.
  Đây là bug tiềm ẩn chính — test phải bắt: 3 ADD_NODE cùng groupId, undo 1 lần → cả 3 biến mất.
- **User thao tác tay giữa 2 section** → thao tác tay là entry không-groupId (hoặc groupId khác) → nằm
  giữa các nhóm; undo tuần tự đúng thời gian. Chấp nhận.
- **Autosave chạy giữa lúc apply** → document ở trạng thái dở. Kiểm tra hook autosave: nên debounce/skip
  khi đang generating (nếu có autosave); nếu không có autosave thì bỏ qua.
- **REMOVE_NODE prelude (fullPageMode)** cùng groupId skeleton → undo skeleton khôi phục trang cũ. Đúng
  kỳ vọng (huỷ generate = trang cũ về nguyên). Xác nhận REMOVE_NODE có inverse handler (thêm lại node) —
  **phải verify**: nếu REMOVE_NODE không có inverseHandler thì undo không khôi phục được node cũ. Kiểm tra
  `commands/handlers.ts`.
- **fail ở phase 1 (container)** trước khi có leaf → undo nhóm chỉ có container, sạch.
- **`undo()` khi stack rỗng** (section đầu tiên fail ngay command 1) → `undo()` trả "Nothing to undo",
  no-op an toàn; chỉ cần apply fallback.

## 7. Rủi ro & rollback

Trung bình (đụng `CommandEngine.dispatch` thêm 1 điều kiện `coalesce` + `applyAICommandsProgressive`).
Thấp hơn nhiều so với thiết kế snapshot gốc (không đụng state management, không clone document).
Flag `AI_TRANSACTIONAL_APPLY` phía editor: off = hành vi cũ (warn-và-đi-tiếp, không groupId). Field
`coalesce` trên Command là additive — command cũ không set = false = không coalesce (an toàn cho AI;
gesture phải set true explicit — **kiểm tra mọi nơi tạo gesture command đã set coalesce:true** trước khi
đổi default, nếu không gesture coalescing sẽ hỏng). Cân nhắc: giữ default coalesce theo hành vi cũ
(coalesce khi có groupId) và AI set `coalesce:false` explicit — an toàn hơn cho gesture, chỉ cần AI opt-out.
