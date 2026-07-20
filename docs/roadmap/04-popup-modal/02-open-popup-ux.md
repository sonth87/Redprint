# 04/02 — UX "Open popup" trong EventsTab + tạo popup tại chỗ

> Phân loại: Cải tiến UX
> Ưu tiên: P6
> Ước lượng: 1 ngày
> Phụ thuộc: Không (tốt hơn sau [01/04](../01-interactions-events/04-events-ui-upgrade.md))
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Luồng phổ biến nhất của popup — "bấm nút này thì mở popup" — phải làm được trong ≤3 click kể cả khi
popup chưa tồn tại, không bao giờ bắt user dán id.

## 2. Hiện trạng & lý do

`InteractionRow.tsx:131-168`: action `showModal`/`hideModal` đã có dropdown chọn popup **khi có popup**;
khi `popups.length === 0` rơi về ô input `popup-id` tự gõ — dead-end với user thường (không ai biết id).
Ngoài ra label action là "showModal" kỹ thuật, không nói được rằng đây là cách bật modal/drawer/bottom sheet.

## 3. Cách làm

1. **Đổi ngôn ngữ UI**: action label thành "Mở popup / Open popup" và "Đóng popup / Close popup" (i18n);
   mô tả phụ "modal, drawer, bottom sheet…". Giữ giá trị schema `showModal`/`hideModal` (không migration).
2. **Empty state có lối thoát**: khi chưa có popup, thay ô id bằng nút **"+ Tạo popup mới"** → mở flow tạo popup
   từ template (dùng PopupManagerPanel flow sẵn có / `CREATE_POPUP` + template picker thu gọn) →
   tạo xong tự điền `targetId` vào action và quay lại EventsTab.
3. **Dropdown popup giàu thông tin**: mỗi item hiện tên + badge kind (modal/drawer/…) + trạng thái disabled
   (mờ + chú thích "đang tắt" — vẫn chọn được).
4. **Nút phụ trên mỗi action đã chọn popup**: "Chỉnh sửa popup ↗" — nhảy sang popup editor (SET_ACTIVE_POPUP).
5. **Chiều ngược lại (discoverability)**: trong PopupPropertyPanel thêm mục read-only "Được mở bởi" —
   liệt kê node có interaction `showModal` trỏ popup này (quét document nodes' interactions) + click để chọn node.
6. **"Close popup" thông minh**: khi node nằm **bên trong** popup content, default targetId = popup chứa nó
   (dropdown pre-select "Popup hiện tại") — làm nút "Đóng" trong popup không cần nghĩ.
7. Test: tạo-popup-từ-EventsTab flow end-to-end; "Được mở bởi" liệt kê đúng sau khi wire 2 nút.

## 4. Hướng thiết kế

Không thêm action type mới, không đổi schema — thuần UX quanh `showModal`/`hideModal` hiện có.
Giữ một đường tạo popup duy nhất (template flow của PopupManagerPanel) để không phân kỳ.

## 5. Kết quả mong muốn

- [ ] User mới: từ nút bất kỳ → mở popup mới tạo, ≤3 click, không thấy id nào.
- [ ] Nút "Đóng" trong popup tự trỏ đúng popup chứa nó.
- [ ] Panel popup cho biết những đâu đang mở nó (đủ để dọn dẹp trước khi xoá popup).

## 6. Tình huống có thể xảy ra & corner cases

- **Xoá popup đang được N node trỏ tới** → DELETE_POPUP hiện không quét interactions; thêm cảnh báo trong
  confirm dialog: "3 phần tử đang mở popup này — interactions của chúng sẽ vô hiệu" (không tự xoá interaction,
  tránh side-effect ngầm; icon ⚠ từ [01/04](../01-interactions-events/04-events-ui-upgrade.md) sẽ hiển thị trên các node đó).
- **Node trong popup A mở popup B** → hợp lệ; hành vi runtime theo `stackMode` (single/multiple/replace) —
  tooltip nhắc stack mode hiện tại.
- **Popup thuộc campaign chưa published** → runtime có thể chặn mở theo campaign gating — dropdown badge
  thêm trạng thái campaign để user không tưởng là bug.
- **Template flow bị huỷ giữa chừng** → quay lại EventsTab, action giữ nguyên chưa có target (trạng thái cũ).

## 7. Rủi ro & rollback

Rất thấp — UI editor thuần. Điểm cần cẩn thận duy nhất: quét "Được mở bởi" phải lazy (chỉ khi mở panel)
để không tốn công trên document lớn.
