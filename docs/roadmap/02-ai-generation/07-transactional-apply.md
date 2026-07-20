# 02/07 — Transactional apply: section nguyên tử + undo theo section

> Phân loại: Cải tiến
> Ưu tiên: P4
> Ước lượng: 2 ngày
> Phụ thuộc: Không
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

(1) Một section apply là **tất-cả-hoặc-không** — không bao giờ để lại section dở dang trên canvas khi có
command giữa chừng fail. (2) Một lần Ctrl+Z hoàn tác **cả trang generate** (hoặc cả section), không phải
undo từng node một trong hàng trăm command.

## 2. Hiện trạng & lý do

- `applyAICommandsProgressive` dispatch từng command, lỗi thì `console.warn` và **đi tiếp**
  (`packages/builder-editor/src/ai/applyAICommandsProgressive.ts:36-39, 71-77`) → command 12/40 fail là
  38 node còn lại vẫn vào, ra section khuyết (thiếu heading, card mồ côi…).
- Undo: mỗi dispatch là 1 entry history (CommandEngine) → full-page generate ~200 command = user phải
  Ctrl+Z 200 lần. Plan cũ mục 18.7/27 đã yêu cầu "Section apply atomic, undo full page hoặc từng section" — chưa làm.

## 3. Cách làm

1. **Khảo sát CommandEngine trước** (`packages/builder-core/src/commands/CommandEngine.ts` + `HistoryStack`):
   xác nhận có/chưa có khái niệm batch. Giả định chưa có → thêm **transaction API** ở core:
   ```ts
   // builder-core
   engine.beginBatch(label?: string): BatchHandle   // gom mọi dispatch tiếp theo
   engine.commitBatch(handle): void                 // 1 entry history duy nhất
   engine.rollbackBatch(handle): void               // revert các command đã apply trong batch
   ```
   Cách hiện thực rẻ nhất, ít xâm lấn: batch = snapshot document trước batch (structural clone /
   immutable ref nếu state đã immutable) — rollback = restore snapshot; history entry = {before, after}.
   Đổi lại tốn memory theo kích thước document (chấp nhận: document JSON thường < vài MB).
2. **builder-react**: expose `dispatchBatch(commands[], { label, validateAll })` từ `useBuilder()` —
   wrap begin/commit/rollback, giữ backwards-compat `dispatch` đơn lẻ.
3. **Sửa applyAICommandsProgressive**:
   - Mỗi **section** (hoặc mỗi lần gọi apply) = 1 batch, label = `AI: <section title>`.
   - Command fail → `rollbackBatch` + throw/return kết quả fail để caller (`usePageGenerator`) đánh dấu
     section failed và **dùng fallbackCommands** (đường section_failed đã có UI sẵn).
   - Progressive render 2 phase vẫn giữ **bên trong** batch (container phase 1, leaf phase 2 sau rAF,
     commit sau phase 2) — lưu ý: batch mở qua rAF frame; đảm bảo không có dispatch ngoài-AI chen giữa
     (editor đang ở trạng thái generating — chấp nhận rủi ro thấp này, hoặc queue dispatch ngoài batch
     lại đến khi commit; quyết định khi implement, ghi chú vào PR).
4. **Undo UX**: full-page generate = 1 batch/section + 1 batch skeleton → undo ~10 lần cho cả trang.
   Thêm nút "Undo generation" trong PageGeneratorModal khi phase=done: pop liên tiếp các batch có label
   prefix `AI:` của jobId hiện tại (lưu jobId trong label: `AI[job:xxxx]: Hero`).
5. Test: core — batch commit 1 entry, rollback trả state cũ (deep equal); editor — command thứ N fail →
   canvas không có node nào của section đó; undo sau generate 9 section = 10 bước về trạng thái ban đầu.

## 4. Hướng thiết kế

- Transaction đặt ở **core** (nơi sở hữu state + history) chứ không hack ở editor — mọi consumer
  (AI, figma import, paste nhiều node) hưởng chung API.
- Snapshot-based rollback thay vì inverse-command: đơn giản, đúng tuyệt đối, đủ nhanh; tối ưu
  structural-sharing để sau nếu đo thấy chậm.

## 5. Kết quả mong muốn

- [ ] Không còn khả năng xuất hiện section khuyết trên canvas (test injected failure).
- [ ] Undo cả trang generate ≤ số section + 1 lần Ctrl+Z; nút "Undo generation" hoạt động.
- [ ] Không regression undo/redo thao tác tay (test suite command hiện có pass).
- [ ] Dispatch đơn lẻ ngoài batch giữ nguyên hành vi (API cộng thêm, không phá).

## 6. Tình huống có thể xảy ra & corner cases

- **User thao tác trong lúc generate** (thêm node tay giữa 2 section) → mỗi section là batch riêng nên
  thao tác tay nằm giữa các entry history — thứ tự undo đúng tuần tự thời gian, chấp nhận.
- **Batch mở mà client crash/reload** → không sao: batch chỉ tồn tại trong memory, reload đọc document đã lưu
  (autosave nên tránh chạy giữa batch — kiểm tra điểm hook autosave, chỉ save sau commit).
- **REMOVE_NODE prelude (fullPageMode)** trong batch skeleton: rollback khôi phục cả trang cũ — đúng kỳ vọng
  (huỷ generate = trang cũ quay lại nguyên vẹn). Đây là cải thiện lớn so với hiện tại.
- **Batch lồng nhau** (AI trong tương lai gọi từ plugin đã mở batch) → v1 cấm: beginBatch khi đang có batch → throw;
  ghi docs API.
- **Memory với document lớn + 10 batch** → snapshot giữ tham chiếu ngắn hạn, release sau commit
  (history entry chỉ giữ before/after của batch, như 1 command to).

## 7. Rủi ro & rollback

Trung bình-cao (đụng core state). Giảm rủi ro: API thuần cộng thêm; AI path bật qua flag
`AI_TRANSACTIONAL_APPLY` phía editor (off = hành vi cũ) trong 1–2 release đầu.
