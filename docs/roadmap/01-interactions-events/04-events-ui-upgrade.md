# 01/04 — Nâng cấp UI Events (multi-action, conditions, picker, hover-pair)

> Phân loại: Cải tiến UX
> Ưu tiên: P6
> Ước lượng: 2–3 ngày
> Phụ thuộc: [01/01](./01-runtime-dead-actions.md) (action phải chạy trước khi làm UI đẹp cho nó)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

EventsTab hiện là UI "khung xương". Nâng lên mức dùng được cho non-dev: nhiều action mỗi trigger,
điều kiện, chọn target bằng picker thay vì dán id, và mô hình hover đúng nghĩa.

## 2. Hiện trạng & lý do

`InteractionRow` (`packages/builder-editor/src/panels/right/components/InteractionRow.tsx`):

- Chỉ đọc/ghi `interaction.actions[0]` — schema cho phép mảng action nhưng UI bóp còn 1;
  đổi action type là **thay cả mảng**, mất dữ liệu action cũ.
- `conditions` có trong schema + evaluator runtime (`InteractionBinder.evaluateCondition`) nhưng **không có UI nào**.
- `targetId` cho toggleVisibility/scrollTo là ô text tự gõ node-id — user thường không biết id.
- `stopPropagation`/`preventDefault` có trong schema, không có UI.
- Popup picker đã có cho showModal/hideModal (tốt) — mở rộng pattern này.

## 3. Cách làm

1. **Multi-action**: mỗi InteractionRow có danh sách action (thêm/xoá/kéo sắp xếp), chạy tuần tự theo thứ tự khai báo
   (runtime đã chạy tuần tự sẵn — `for (const action of interaction.actions)`).
2. **Condition builder**: mỗi condition = `variable` (dropdown từ các key `setState` đã dùng trong document +
   ô tự nhập), `operator` (eq/neq/gt/lt/gte/lte/contains/truthy/falsy), `value`. Nhiều condition = AND
   (đúng semantics runtime `every`). Hiển thị dạng chip có thể xoá.
3. **Node picker** cho `toggleVisibility`/`scrollTo`/`addClass`/`removeClass`:
   - Dropdown cây node của surface hiện tại (dùng dữ liệu layers panel sẵn có), hiển thị tên + type + icon.
   - Với `scrollTo` thêm mode "Anchor" liệt kê các `anchorId` có trong document (Section/Anchor props).
4. **Advanced toggles**: checkbox `stopPropagation`, `preventDefault`, và (khi [01/03](./03-new-triggers.md) xong)
   ô `delayMs`/`pressMs`/`once` hiện theo trigger tương ứng.
5. **Hover-pair**: preset "Hover style" — khi user chọn trigger `hover`, UI gợi ý tạo cặp
   (mouseenter → addClass X, mouseleave → removeClass X) bằng 1 click; lưu thành 2 InteractionConfig thường
   (không thêm khái niệm mới vào schema).
6. **Validation + cảnh báo trong UI**: icon ⚠ trên interaction khi targetId không còn tồn tại trong document
   (kiểm tra khi render tab); tooltip nêu lý do.
7. i18n đầy đủ en/vi cho toàn bộ label mới.

## 4. Hướng thiết kế

- Không đổi schema `InteractionConfig` (đã đủ tốt) — chỉ UI bắt kịp schema. Các field optional mới (delayMs…)
  do hạng mục 01/03 sở hữu.
- Giữ `UPDATE_INTERACTIONS` là lệnh duy nhất ghi thay đổi (cả mảng interactions mỗi lần) — đơn giản, undo trọn gói.
- Component tách nhỏ: `ActionEditor`, `ConditionEditor`, `NodePicker` (tái dùng cho AI review UI sau này).

## 5. Kết quả mong muốn

- [ ] Kịch bản không cần gõ id: "click nút → ẩn banner + scroll tới form + gọi API" cấu hình hoàn toàn bằng picker.
- [ ] Condition "chỉ chạy khi biến `submitted` falsy" cấu hình được và chạy đúng runtime.
- [ ] Xoá node đang được interaction khác trỏ tới → tab Events của node trỏ hiện cảnh báo.
- [ ] Không mất dữ liệu khi đổi action type (chỉ đổi type của action đó, giữ các action khác).

## 6. Tình huống có thể xảy ra & corner cases

- **Document cũ actions.length > 1** (tạo bằng AI/API): UI cũ chỉ hiện action đầu — UI mới hiện đủ; không cần migration.
- **Vòng lặp action**: click → toggleVisibility node A; node A mount → toggleVisibility node B… không giới hạn đệ quy
  trong runtime hiện tại; giới hạn thực tế thấp vì action đồng bộ hữu hạn — docs cảnh báo, không chặn cứng.
- **Condition variable chưa từng set** → `variables[x] === undefined` → truthy=false/falsy=true; ghi rõ trong tooltip.
- **Node trong popup trỏ node ngoài page** và ngược lại: cho phép (runtime dùng chung variables/popup API),
  picker hiển thị cả 2 cây có ghi nhãn surface.
- **Repeater/clone nodes**: `data-node-id` trùng giữa các bản sao → scrollTo nhắm bản đầu tiên; ghi chú docs.

## 7. Rủi ro & rollback

UI thuần editor, không đụng runtime/schema → rủi ro thấp, rollback theo PR. Điểm cần chú ý duy nhất:
đảm bảo `onInteractionsChange` vẫn phát đúng shape mảng cũ để undo/redo hoạt động.
