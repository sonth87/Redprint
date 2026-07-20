# 04 — Popup / Modal / Drawer / Bottom Sheet

## Hiện trạng quan trọng cần nói thẳng

**Builder KHÔNG thiếu modal/drawer/bottom sheet.** Popup system trong code đã tới V6 và rất sâu
(`packages/builder-core/src/document/popups.ts`, `builder-renderer/src/RuntimeRenderer.tsx`,
`builder-editor/src/popups/*`):

- 5 kind: `modal | drawer | bottomSheet | bar | fullscreen`; placement, size, snap points, runtime drag/resize.
- Behavior đầy đủ: backdrop/blur, closeOnEscape/backdrop/outside, focus trap, restore focus, inert background,
  lock body scroll, reduced motion.
- Auto trigger: `manual | pageLoad(delay) | scrollDepth(%) | sectionVisible(node)`.
- V4–V6: goals + analytics events, A/B variants + experiment, targeting/scheduling/frequency, locales,
  campaigns (draft→published, conflict policy queue/suppress/replace/stack).
- Editor: PopupManagerPanel, PopupEditorSurface (chọn shell/content, preview animation khớp runtime),
  template registry client + server (`apps/api/src/data/popup-templates.json`, `popup.routes.ts`).
- Mở popup bằng event node: `click → showModal(popupId)` **đã chạy** ở runtime.

## Gap thật (từ audit)

1. **Kéo-thả component vào popup content chưa được wire** — `builder-editor/src/dragdrop/*` và `useClickToAdd`
   không có khái niệm popup (0 reference), dù BuilderEditor đã tính `activeRootNodeId` theo popup đang mở.
2. **AI mù popup** — context bị drop ([00/03](../00-bugfixes/03-popup-context-dropped.md)); `CREATE_POPUP` bị loại khỏi whitelist (chủ đích V2)
   nhưng chưa có đường thay thế nào cho AI tạo popup.
3. Thiếu trigger hành vi: **exit-intent**, idle — các trigger chuyển đổi quan trọng nhất của popup marketing.
4. UX EventsTab cho popup còn thô (id tay khi chưa có popup; không tạo popup tại chỗ).
5. Chưa có docs nào cho popup system (xử lý ở [05-docs-standardization](../05-docs-standardization/)).

## Hạng mục

| # | File | Nội dung | Phase | Effort |
|---|------|----------|-------|--------|
| 01 | [01-dragdrop-into-popup.md](./01-dragdrop-into-popup.md) | Kéo-thả/click-to-add vào popup content | P6 | 2–3 ngày |
| 02 | [02-open-popup-ux.md](./02-open-popup-ux.md) | UX "Open popup" trong EventsTab + tạo popup tại chỗ | P6 | 1 ngày |
| 03 | [03-exit-intent-idle.md](./03-exit-intent-idle.md) | Auto trigger exit-intent + idle | P6 | 1–1.5 ngày |
| 04 | [04-ai-popup-generation.md](./04-ai-popup-generation.md) | AI tạo popup qua template (`CREATE_POPUP_FROM_TEMPLATE`) | P6 | 2–3 ngày |

## Nguyên tắc giữ vững

- Popup là **document-level layer** (không phải node trong page tree) — kiến trúc này đúng, không đổi.
- Mọi thay đổi schema popup phải kèm migration (đã có tiền lệ V3→V6 migrations trong `builder-core/src/migration/`).
- AI không bao giờ sinh `PopupDefinition` tự do — chỉ chọn template + patch nội dung (cùng triết lý
  "intent, không phải cấu trúc" của pipeline page).
