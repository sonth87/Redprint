# 01/02 — Trigger vòng đời: mount / unmount / intersect

> Phân loại: Hoàn thiện tính năng
> Ưu tiên: P1
> Ước lượng: 1–1.5 ngày
> Phụ thuộc: [01/01](./01-runtime-dead-actions.md) (dùng chung hạ tầng action)
> Trạng thái: Chưa bắt đầu

## 1. Mục đích

Ba trigger đã tồn tại trong type (`mount`, `unmount`, `intersect` — `builder-core/src/document/interactions.ts:18-21`)
và 2 trong số đó đã hiện trong UI (`InteractionRow` có mount/unmount) phải chạy thật ở runtime.
Đây là nền cho use case phổ biến: tracking impression, animation-on-scroll qua action, auto-show khi section vào viewport.

## 2. Hiện trạng & lý do

`TRIGGER_TO_REACT_EVENT` (`builder-renderer/src/pipeline/InteractionBinder.ts:30-43`) chỉ map DOM event —
`mount`/`unmount`/`intersect` không có entry → `bindAll` bỏ qua (`if (!propName) continue`).
User chọn "mount" trong EventsTab → lưu vào document → không có gì xảy ra, không cảnh báo.

## 3. Cách làm

1. Tách interactions của node thành 2 nhóm trong `RuntimeNode`:
   ```ts
   const domInteractions = interactions.filter(i => TRIGGER_TO_REACT_EVENT[i.trigger]);
   const lifecycleInteractions = interactions.filter(i => ["mount","unmount","intersect"].includes(i.trigger));
   ```
2. **mount / unmount** — `useEffect` trong `RuntimeNode` (component đã là function component có hook):
   ```ts
   useEffect(() => {
     runInteractions(lifecycle("mount"));
     return () => runInteractions(lifecycle("unmount"));
   }, []); // chạy 1 lần theo vòng đời node
   ```
   `runInteractions` = cùng logic điều kiện + executeAction của `bindAll` — refactor phần thân handler của
   `bindAll` thành hàm dùng chung `runInteraction(interaction, variables, dispatch, event?)`.
3. **intersect** — tái dùng pattern IntersectionObserver đã có sẵn cho animation
   (`RuntimeRenderer.tsx:~90-109`): observer riêng threshold 0.1 (hoặc đọc từ interaction config mở rộng sau),
   bắn khi `isIntersecting` chuyển false→true. Mặc định **bắn mỗi lần vào viewport**; thêm tuỳ chọn
   `once?: boolean` vào `InteractionConfig` (optional, backward-compatible).
   - Cần element ref: dùng chung callback ref `elementRef` đã có cho animation (mở rộng điều kiện gắn ref:
     `hasAnimation || hasIntersectInteraction`).
4. **UI**: thêm `intersect` vào `triggerOptions` của `InteractionRow` (đang thiếu); thêm i18n key `events.intersect`
   cho `en.json` + `vi.json`.
5. Test (jsdom + mock IO): mount bắn 1 lần; unmount bắn khi node bị remove (toggleVisibility từ node khác);
   intersect bắn khi observer callback giả lập.

## 4. Hướng thiết kế

- Không đưa lifecycle vào `InteractionBinder` static map (binder thuần event-prop) — lifecycle thuộc về
  `RuntimeNode` vì cần hook. Binder chỉ giữ phần "chạy 1 interaction" dùng chung.
- SSR: `useEffect` không chạy server-side → mount interaction chỉ bắn client-side. Đây là hành vi đúng
  (side-effect không được chạy khi SSR).

## 5. Kết quả mong muốn

- [ ] `mount` + action `triggerApi` → gọi API tracking đúng 1 lần khi node xuất hiện.
- [ ] `intersect` + action `showModal` → popup mở khi section cuộn vào viewport (tương đương autoTrigger
      `sectionVisible` của popup nhưng ở chiều node chủ động).
- [ ] `unmount` bắn khi node bị toggleVisibility ẩn đi.
- [ ] Không regression animation-on-scroll hiện có (dùng chung ref).

## 6. Tình huống có thể xảy ra & corner cases

- **mount trong StrictMode dev** → effect chạy 2 lần (mount-unmount-mount). Chấp nhận ở dev; ghi chú docs.
  Nếu cần chặn: guard `hasFiredRef` cho mount-once.
- **Node trong popup**: mount bắn mỗi lần popup mở (popup content unmount khi đóng) — đây là tính năng
  (tracking popup impression per-open), ghi rõ docs.
- **intersect + node ẩn responsive** (`resolveVisibility` false) → node không render → không bắn; đúng kỳ vọng.
- **Hàng trăm node có intersect** → mỗi node 1 observer; tối ưu (shared observer theo threshold) chỉ làm khi
  đo thấy vấn đề — YAGNI, ghi chú lại.
- **`conditions` dựa trên variables thay đổi sau mount** → mount chỉ đánh giá tại thời điểm mount; không re-fire
  khi variable đổi (đó là việc của trigger khác). Ghi rõ semantics trong docs.
- **unmount khi cả trang unmount** (chuyển route SPA) → cleanup chạy, action async (fetch) vẫn kịp fire-and-forget;
  `navigate` trong unmount là anti-pattern — docs cảnh báo.

## 7. Rủi ro & rollback

Thấp. Tính năng cộng thêm, không đổi hành vi node không có lifecycle interaction.
Lưu ý perf: thêm 1 `useEffect` cho mọi node có lifecycle interaction — chỉ tạo khi mảng không rỗng.
