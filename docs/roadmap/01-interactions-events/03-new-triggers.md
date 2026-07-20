# 01/03 — Bổ sung trigger mới (mouse chi tiết, longpress, exitIntent, delay, viewport)

> Phân loại: Bổ sung mới
> Ưu tiên: P6
> Ước lượng: 2 ngày
> Phụ thuộc: [01/01](./01-runtime-dead-actions.md), [01/02](./02-lifecycle-triggers.md)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Phủ đủ các sự kiện chuẩn của một landing page builder hiện đại: tương tác chuột chi tiết
(mousedown/mouseup/mouseover/mousemove), thiết bị cảm ứng (longpress), hành vi người dùng
(exit-intent, delay/timer), và viewport (đổi tên ngữ nghĩa cho intersect).

## 2. Hiện trạng & lý do

`InteractionTrigger` hiện có 15 giá trị, thiếu toàn bộ nhóm trên (xem bảng ở [README](./README.md)).
User đã nêu đích danh cần: *"click, hover, mousedown, mouseover, mouseleave…"* — click/hover/mouseleave có rồi,
mousedown/mouseover chưa. Ngoài ra `keydown`/`keyup` có trong type + binder nhưng **thiếu trong UI dropdown** — bổ sung luôn.

## 3. Cách làm

### 3.1 Nhóm map thẳng DOM (rẻ nhất — chỉ thêm entry)
Thêm vào `InteractionTrigger` type + `TRIGGER_TO_REACT_EVENT` + `triggerOptions` UI + i18n:

| Trigger mới | React prop |
|-------------|-----------|
| `mousedown` | `onMouseDown` |
| `mouseup` | `onMouseUp` |
| `mouseover` | `onMouseOver` |
| `mousemove` | `onMouseMove` |
| `touchstart` | `onTouchStart` |
| `touchend` | `onTouchEnd` |

### 3.2 `longpress` (tổng hợp)
- Không có DOM event tương ứng → implement trong `RuntimeNode`: `onPointerDown` đặt timer 500ms
  (config `pressMs?: number` optional trong InteractionConfig), `onPointerUp`/`onPointerLeave`/`onPointerMove`(>10px) huỷ.
- Bắn kèm `preventDefault` context-menu trên mobile nếu `preventDefault: true`.

### 3.3 `delay` (timer sau khi node mount)
- Mở rộng schema: `{ trigger: "delay", delayMs: number }` (field optional mới trên `InteractionConfig`).
- Implement cạnh lifecycle (`useEffect` + `setTimeout`, cleanup on unmount).
- Use case: hiện tooltip/highlight sau N giây, auto-mở popup có điều kiện phức tạp hơn `pageLoad` của popup.

### 3.4 `exitIntent` (page-level, đặc biệt)
- Bản chất là **page-level** chứ không phải node-level: mouse rời viewport phía trên.
- Node nào khai `exitIntent` thì `RuntimeRenderer` đăng ký **một** listener `document.mouseleave`
  (`clientY <= 0`) dùng chung, bắn cho mọi node đăng ký. Chỉ desktop; mobile không có khái niệm này
  (docs ghi rõ; sau này có thể thêm heuristic back-button/scroll-up nhanh).
- Đồng thời thêm `{ type: "exitIntent" }` vào `PopupAutoTrigger` — xem [04/03](../04-popup-modal/03-exit-intent-idle.md)
  (2 hạng mục dùng chung detector, đặt util trong `builder-renderer/src/pipeline/exitIntent.ts`).

### 3.5 `viewportEnter` / `viewportLeave`
- Alias ngữ nghĩa của `intersect` (enter) + chiều ra (leave), dùng chung IntersectionObserver từ [01/02](./02-lifecycle-triggers.md).
- Giữ `intersect` như alias legacy (map = viewportEnter) để không phá document cũ.

### 3.6 Việc chung
- Mỗi trigger mới: type (core) → binder/RuntimeNode (renderer) → UI dropdown + i18n (editor) → docs.
- `hover` hiện map một chiều `onMouseEnter` — bổ sung docs nói rõ; "hover đúng nghĩa" (enter áp / leave gỡ)
  thuộc [01/04](./04-events-ui-upgrade.md) (cần cặp action).
- Migration: **không cần** — chỉ thêm giá trị enum mới, document cũ không đổi.

## 4. Hướng thiết kế

- Trigger tổng hợp (longpress, delay, exitIntent) sống ở renderer, **không** ở binder static map —
  binder chỉ giữ map 1-1 DOM.
- Không thêm trigger nào vào UI trước khi runtime chạy được (bài học từ mount/unmount).
- Schema mở rộng bằng **optional fields** trên `InteractionConfig` (`delayMs`, `pressMs`, `once`) —
  backward/forward compatible, không cần bump schema version.

## 5. Kết quả mong muốn

- [ ] Bảng trigger trong README: mọi hàng ✅ ở cả 3 cột (type/UI/runtime).
- [ ] Playground demo: longpress trên mobile viewport (devtools), exit-intent mở popup, delay 3s hiện badge.
- [ ] Document cũ (chưa có field mới) load và chạy bình thường.

## 6. Tình huống có thể xảy ra & corner cases

- **mousemove bắn dồn dập** → không throttle mặc định (user tự chịu); nếu action là `triggerApi` thì đây là footgun —
  thêm cảnh báo trong UI khi chọn cặp mousemove+triggerApi (toast/hint). Cân nhắc `throttleMs` optional sau.
- **mouseover vs mouseenter**: mouseover bubble từ con → bắn lặp; docs giải thích khác biệt, khuyến nghị mouseenter.
- **longpress xung đột scroll trên mobile** → huỷ khi pointermove >10px (đã thiết kế); test thực máy.
- **exitIntent bắn nhiều lần** → mặc định once-per-session (sessionStorage key theo nodeId), config `once=false` để tắt.
- **delay + node unmount trước timeout** → cleanup clearTimeout (đã thiết kế).
- **2 trigger cùng bắn 1 action nặng** (exitIntent + delay cùng mở 1 popup) → popup stackMode xử lý (single = ok).
- **SSR**: mọi listener page-level đăng ký trong `useEffect` — an toàn.

## 7. Rủi ro & rollback

Thấp về kiến trúc; trung bình về QA (nhiều môi trường: touch, desktop, SSR). Chia PR theo nhóm 3.1 / 3.2-3.3 / 3.4-3.5
để review và rollback độc lập.
