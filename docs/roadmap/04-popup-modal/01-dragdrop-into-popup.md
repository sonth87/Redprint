# 04/01 — Kéo-thả & click-to-add vào popup content

> Phân loại: Hoàn thiện tính năng
> Ưu tiên: P6
> Ước lượng: 2–3 ngày
> Phụ thuộc: Không
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Khi user đang mở popup trong editor, thao tác thêm component phải giống hệt page: kéo từ palette thả vào
popup, click-to-add rơi vào popup, kéo sắp xếp node bên trong popup. Đây là "cơ chế hoạt động, kéo thả trên
modal" mà hiện còn thiếu.

## 2. Hiện trạng & lý do

- `BuilderEditor.tsx:250-262` đã tính đúng `activeRootNodeId` (variant root → locale root → popup root → page root).
- Nhưng subsystem drag-drop (`dragdrop/DragCoordinator.ts`, `DropTargetResolver.ts`) và `hooks/useClickToAdd.ts`
  **không nhận biết surface** — grep "popup" trong 2 thư mục = 0 kết quả. Hệ quả cần xác minh chính xác khi làm
  (hành vi hiện tại có thể là: drop bị từ chối, hoặc tệ hơn — node rơi vào page root phía sau popup).
- PopupEditorSurface render content qua `NodeRenderer` — node trong popup có `data-node-id` như page,
  nên hit-testing về nguyên tắc dùng lại được.

## 3. Cách làm

1. **Khảo sát 0.5 ngày trước khi code**: xác định chính xác đường đi hiện tại của (a) drop từ palette,
   (b) click-to-add, (c) drag reorder khi popup đang mở — ghi vào PR description làm baseline.
2. **Đưa surface vào DropTargetResolver**:
   - Thêm `surfaceRootId: string` vào context resolver (thay các chỗ giả định `document.rootNodeId`).
   - Hit-testing giới hạn trong cây của `surfaceRootId` khi popup mở: node ngoài popup (page phía sau backdrop)
     **không bao giờ** là drop target — kể cả khi pointer nằm ngoài khung popup (drop ngoài khung = huỷ, không rơi xuyên).
3. **Ràng buộc cấu trúc** (validate ở resolver + DocumentValidator):
   - Không cho `Section` vào popup (Section là khái niệm page-band; popup dùng Container/Grid/Column).
   - Tôn trọng `ContainerConfig.allowedChildTypes/disallowedChildTypes` của `PopupContent` — kiểm tra định nghĩa
     hiện tại của PopupContent, bổ sung `disallowedChildTypes: ["Section"]` nếu chưa có.
   - `MOVE_NODE` giữa 2 surface (kéo node từ page vào popup và ngược lại): **v1 chặn** — cross-surface move
     tạo nhiều hệ quả (goals trỏ node, variant ownership); hiển thị toast giải thích. V2 mở nếu có nhu cầu thật.
4. **useClickToAdd**: parent mặc định = selection hiện tại trong popup (nếu là container) → ngược lại
   `activeRootNodeId`. Cùng quy tắc validate.
5. **Overlay/placeholder**: FlowDropPlaceholderLayer render trong coordinate space của popup frame
   (popup có transform/position riêng — kiểm tra offset; nhiều khả năng phải tính từ popupFrameRef).
6. **Layers panel**: xác nhận cây layers khi popup active hiển thị cây popup (đã có `activeRootNodeId` — kiểm tra);
   drag-reorder trong layers panel áp cùng ràng buộc.
7. Test: unit resolver (surface bound, Section bị chặn, cross-surface bị chặn); test tay ma trận
   {modal, drawer, bottomSheet} × {drop palette, click-to-add, reorder} × {shell được chọn, content được chọn}.

## 4. Hướng thiết kế

Không xây "chế độ kéo-thả riêng cho popup" — chỉ tham số hoá surface root cho hệ hiện có. Popup editing
là **cùng một editor, khác root** — nguyên tắc này giữ code path duy nhất, tránh phân kỳ hành vi về sau.

## 5. Kết quả mong muốn

- [ ] Kéo Text/Button/Image/Form từ palette thả vào popup đang mở — node vào đúng popup content, undo hoạt động.
- [ ] Không thể thả Section vào popup; không thể thả "xuyên" ra page khi popup đang mở.
- [ ] Reorder node trong popup bằng cả canvas lẫn layers panel.
- [ ] Đóng popup editor → thao tác kéo thả trên page trở lại bình thường (không giữ surface cũ).

## 6. Tình huống có thể xảy ra & corner cases

- **Popup nhỏ, component to** (GalleryPro vào modal sm) → cho phép (user tự chịu trách nhiệm layout),
  nhưng min-height của component có thể tràn — popup đã có maxHeight + scroll content; xác nhận scroll hoạt động.
- **Drop khi đang preview mode của popup** (`previewMode: true`) → chặn drop (preview là read-only), toast nhẹ.
- **Variant/locale root đang active** → surface root là root của variant/locale (đã có trong chain
  `activeRootNodeId`) — node thêm vào variant không được ảnh hưởng base: xác nhận ownership rule
  (variant root là cây riêng) trước khi ship; test riêng cho variant đang active.
- **Kéo từ palette nhưng nhả ra ngoài popup frame** → huỷ thao tác (không thêm node) — hành vi rõ ràng hơn là
  đoán ý định.
- **bottomSheet có snap drag** (usePopupShellDrag) → phân biệt drag-shell với drag-node bằng vùng bắt sự kiện
  (shell drag chỉ từ header/handle) — kiểm tra xung đột sự kiện pointer.
- **Repeater trong popup** → hoạt động như page; test 1 case.

## 7. Rủi ro & rollback

Trung bình: đụng DragCoordinator/DropTargetResolver là code nhạy cảm nhất của editor (đã có test suite
`dragdrop/__tests__/` — chạy đủ). Tham số hoá surface root mặc định = page root nên hành vi page không đổi;
regression risk tập trung ở nhánh popup mới.
