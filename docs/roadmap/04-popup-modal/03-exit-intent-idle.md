# 04/03 — Auto trigger mới cho popup: exit-intent & idle

> Phân loại: Bổ sung mới
> Ưu tiên: P6
> Ước lượng: 1–1.5 ngày
> Phụ thuộc: Dùng chung detector với [01/03](../01-interactions-events/03-new-triggers.md) (nếu làm sau thì tách util dùng chung)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Bổ sung 2 trigger chuyển đổi quan trọng nhất còn thiếu của popup marketing: **exit-intent**
(giữ chân trước khi rời trang — popup giảm giá/lead capture) và **idle** (gợi ý khi user đứng im — hỗ trợ/chatbot).

## 2. Hiện trạng & lý do

`PopupAutoTrigger` (`packages/builder-core/src/document/popups.ts:69-73`) chỉ có:
`manual | pageLoad(delayMs) | scrollDepth(percent) | sectionVisible(targetNodeId, threshold)`.
Runtime xử lý các trigger này trong RuntimeRenderer (timers + observers, đã có cleanup). Editor
PopupPropertyPanel có UI chọn autoTrigger. Không có exit-intent/idle ở cả 3 tầng.

## 3. Cách làm

1. **Schema (core)** — thêm 2 biến thể:
   ```ts
   | { type: "exitIntent"; onceKey?: string }        // mặc định once-per-session
   | { type: "idle"; idleMs: number }                 // mặc định 30000
   ```
   Union mở rộng — document cũ không đổi, **không cần migration** (V7 chưa cần bump vì thuần additive;
   xác nhận DocumentValidator không strict-enum trigger type — nếu có, nới).
2. **Runtime (builder-renderer)**:
   - Util chung `createExitIntentDetector(cb)`: `document.addEventListener("mouseout")` với
     `relatedTarget == null && clientY <= 0`; chỉ desktop pointer (match media `(pointer: fine)`);
     once-per-session qua `sessionStorage` key (`rb-exit-intent:<popupId>` hoặc onceKey).
   - `createIdleDetector(idleMs, cb)`: timer reset theo `pointermove/keydown/scroll/touchstart`
     (passive listeners, throttle reset 1s); bắn 1 lần rồi tự huỷ (mở lại theo frequency rules nếu popup đóng —
     giữ đơn giản: 1 lần/lượt mount).
   - Cắm vào cùng chỗ RuntimeRenderer xử lý autoTrigger hiện tại; popup mở qua đường `openPopup(id)` chuẩn →
     tự hưởng frequency capping/targeting/scheduling/campaign arbitration sẵn có (V5/V6) — không viết lại rule nào.
3. **Editor (PopupPropertyPanel)**: 2 option mới trong trigger select + field `idleMs` (input số, giây trong UI,
   lưu ms); preview controller: nút "Thử trigger" giả lập (bắn cb tay) vì không thể mô phỏng exit-intent trong iframe editor.
4. **Editor preview lifecycle** (`usePopupPreviewLifecycle`): exitIntent/idle không auto-fire trong editor —
   như manual.
5. **Analytics**: `PopupAnalyticsEvent.triggerType` là string — giá trị mới `"exitIntent"|"idle"` tự đi qua,
   kiểm tra chỗ nào switch-case trigger để không rơi default lạ.
6. Test: unit 2 detector (jsdom event giả lập); popup exitIntent + frequency cap 1/session → lần 2 không mở;
   idle reset khi có tương tác.

## 4. Hướng thiết kế

- Detector là util thuần trong renderer, export cho [01/03](../01-interactions-events/03-new-triggers.md) dùng lại (node-level exitIntent trigger) —
  một nguồn logic, hai người dùng.
- Mobile không có exit-intent thật: **không** giả lập bằng back-button/scroll-up ở v1 (nhiều false positive);
  popup exitIntent trên mobile đơn giản không bắn — ghi rõ trong UI ("chỉ desktop") và docs.

## 5. Kết quả mong muốn

- [ ] Popup lead-capture với exitIntent: đưa chuột lên thanh URL → popup mở, 1 lần/session.
- [ ] Idle 30s không tương tác → popup mở; gõ phím trước đó → timer reset.
- [ ] Tôn trọng đầy đủ frequency/targeting/schedule/campaign (test với cap 1/day).
- [ ] Editor cấu hình được cả 2, có ghi chú desktop-only cho exitIntent.

## 6. Tình huống có thể xảy ra & corner cases

- **DevTools mở làm mouseout nhiễu** → điều kiện `relatedTarget == null && clientY <= 0` đã lọc phần lớn; chấp nhận.
- **iframe/embed trong trang** → mouseout vào iframe có relatedTarget ≠ null → không bắn nhầm (đúng).
- **2 popup cùng exitIntent** → cả 2 eligible cùng lúc → campaign conflictPolicy/stackMode phân xử (hệ có sẵn);
  test 1 case queue.
- **SSR** → detector chỉ đăng ký trong effect; server render không đụng `document`.
- **prefers-reduced-motion** → không liên quan trigger (chỉ animation) — behavior hiện có xử lý.
- **Idle + tab background** → `visibilitychange` pause timer (tab ẩn không tính idle) — thêm vào detector.

## 7. Rủi ro & rollback

Thấp: additive schema + runtime path mới. Popup dùng trigger mới trên client runtime cũ (chưa update
builder-renderer) → autoTrigger type lạ = không auto-fire (fallback im lặng như manual) — hành vi suy giảm an toàn.
