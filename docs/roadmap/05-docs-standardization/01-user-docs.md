# 05/01 — Bộ user docs tiếng Việt (`/docs/user-guide/`)

> Phân loại: Bổ sung mới (docs)
> Ưu tiên: P2
> Ước lượng: 1.5 ngày (đợt đầu đã thực hiện 2026-07-20)
> Trạng thái: Đợt đầu hoàn thành — duy trì theo [03-doc-governance.md](./03-doc-governance.md)

## 1. Mục đích

Người không đọc code (user cuối của editor, PM, dev mới) hiểu được trong 15 phút: dự án là gì,
có những chức năng nào, dùng ra sao — bằng tiếng Việt, có flow diagram, không thuật ngữ code-level.

## 2. Hiện trạng & lý do

Trước 2026-07-20, `/docs` chỉ chứa 2 tài liệu planning nội bộ (đã chuyển vào `docs/roadmap/legacy/`).
Toàn bộ tài liệu còn lại (`.claude/docs`, README) là đặc tả kỹ thuật tiếng Anh hướng AI/dev —
không có tài liệu nào cho người dùng.

## 3. Cấu trúc đã lập

```
docs/
  README.md                      # cổng vào: phân tầng docs, mục lục
  user-guide/
    01-gioi-thieu-tong-quan.md   # dự án là gì, kiến trúc 1 hình, tính năng chính
    02-giao-dien-editor.md       # canvas, panels, toolbar, overlay, minimap, dual-canvas
    03-property-panel.md         # 5 tab thuộc tính (Design/Events/Effects/Data/Advanced), Page Settings
    04-components-va-preset.md   # bảng component hiện có, preset/palette
    05-styling-va-hieu-ung.md    # bộ lọc ảnh, khung, đổ bóng, animation, hover, transform
    06-media-tai-nguyen.md       # Media Manager, gallery layouts, carousel config
    07-popup-modal.md            # popup system: kinds, trigger, campaign (mức user)
    08-su-kien-interactions.md   # events: trigger/action nào dùng được, ví dụ
    09-ai-assistant.md           # 3 cách dùng AI, flow generate, giới hạn
    10-phim-tat-thao-tac.md      # keyboard shortcuts, cử chỉ chuột, multi-select
    11-runtime-va-tich-hop.md    # render trang thật, nhúng vào app, popup runtime
  roadmap/                       # kế hoạch (tài liệu này)
```

> Ghi chú: đợt đầu (2026-07-20) khởi tạo 7 bài; đợt bổ sung ngay sau đó mở rộng thành **11 bài** để phủ
> hết các mảng editor trước bị bỏ sót (property panel 5 tab, 40+ bộ lọc ảnh, animation library, media
> manager, gallery/carousel config, phím tắt & cử chỉ).

## 4. Quy tắc viết (áp dụng khi bổ sung/duy trì)

1. Tiếng Việt, xưng "bạn", câu ngắn; thuật ngữ kỹ thuật giữ tiếng Anh kèm giải thích lần đầu (component, popup…).
2. Mỗi trang ≤ ~150 dòng; 1 mermaid diagram cho mỗi luồng quan trọng; bảng cho danh sách tính năng.
3. **Trung thực về trạng thái**: tính năng chưa chạy hết (vd action events đang "chết") phải ghi chú
   "đang hoàn thiện — xem roadmap" kèm link, không quảng cáo quá code.
4. Không dán code TypeScript/interface — ai cần code đi link sang `.claude/docs`.
5. Ảnh chụp màn hình: chưa dùng ở đợt đầu (dễ lỗi thời); cân nhắc sau khi UI ổn định.

## 5. Kết quả mong muốn

- [x] Đợt đầu: 8 file như cấu trúc trên, có mermaid flow cho AI generate / popup lifecycle / event flow.
- [ ] Người mới (không đọc code) mô tả lại đúng 5 chức năng chính sau khi đọc — kiểm chứng bằng 1 buổi review nội bộ.
- [ ] Mỗi release có tính năng user-facing mới → user-guide cập nhật cùng PR (governance).

## 6. Corner cases & lưu ý

- **Docs nói quá code** (lỗi của AI_ASSISTANT.md cũ) → quy tắc 4.3 + checklist governance.
- **Song ngữ về sau**: nếu cần bản EN cho user quốc tế → `docs/user-guide/en/` mirror, chỉ làm khi có nhu cầu thật.
- **Mermaid không render trên một số viewer** → giữ diagram đơn giản (flowchart/sequence cơ bản), có mô tả chữ đi kèm.
